require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const Customer = require('../src/models/Customer');
const Membership = require('../src/models/Membership');
const MonthlyDue = require('../src/models/MonthlyDue');
const Parking = require('../src/models/Parking');
const ParkingSubscription = require('../src/models/ParkingSubscription');
const Payment = require('../src/models/Payment');
const PaymentAllocation = require('../src/models/PaymentAllocation');
const User = require('../src/models/User');
const Vehicle = require('../src/models/Vehicle');
const { getCompletedBillingPeriods } = require('../src/utils/billingPeriods');

const defaultFile = path.join(__dirname, '..', 'data', 'easyParking_50_Customers_Demo_Data.json');
const args = process.argv.slice(2);
const optionValue = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};
const filePath = path.resolve(optionValue('--file') || defaultFile);
const requestedParkingId = optionValue('--parking-id');
const applyImport = args.includes('--apply');
const allowRemote = args.includes('--allow-remote');

const parseDate = (value, label) => {
  if (typeof value !== 'string') throw new Error(`${label} must be a date string`);
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} is not a valid date`);
  return date;
};

const requiredNumber = (value, label) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }
  return value;
};

const mapStatus = (value, label) => {
  const status = String(value).toLowerCase();
  if (!['active', 'inactive'].includes(status)) throw new Error(`${label} has unsupported status "${value}"`);
  return status;
};

const uniqueMap = (records, idKey, collectionName) => {
  const result = new Map();
  for (const record of records) {
    const id = record[idKey];
    if (typeof id !== 'string' || !id || result.has(id)) {
      throw new Error(`${collectionName} contains a missing or duplicate ${idKey}`);
    }
    result.set(id, record);
  }
  return result;
};

const validateData = (data) => {
  if (data.metadata?.datasetType !== 'synthetic_demo_data') {
    throw new Error('Only the supplied synthetic demo dataset can be imported');
  }
  if (data.metadata.currency !== 'PKR'
    || !data.metadata.rates
    || !Array.isArray(data.customers)
    || !Array.isArray(data.vehicles)
    || !Array.isArray(data.monthlyDues)
    || !Array.isArray(data.payments)
    || !Array.isArray(data.paymentAllocations)) {
    throw new Error('Dataset metadata or required record collections are invalid');
  }
  if (data.customers.length !== data.metadata.customerCount
    || data.vehicles.length !== data.metadata.vehicleCount) {
    throw new Error('Customer or vehicle count does not match dataset metadata');
  }

  const customers = uniqueMap(data.customers, 'Customer ID', 'customers');
  const vehicles = uniqueMap(data.vehicles, 'Vehicle ID', 'vehicles');
  const dues = uniqueMap(data.monthlyDues, 'Due ID', 'monthlyDues');
  const payments = uniqueMap(data.payments, 'Payment ID', 'payments');
  uniqueMap(data.paymentAllocations, 'Allocation ID', 'paymentAllocations');

  const customerPhones = new Set();
  for (const [customerId, customer] of customers) {
    if (typeof customer['Customer Name'] !== 'string' || !customer['Customer Name'].trim()
      || typeof customer['Phone (demo)'] !== 'string' || !customer['Phone (demo)'].trim()) {
      throw new Error(`${customerId} is missing a customer name or phone`);
    }
    if (customerPhones.has(customer['Phone (demo)'])) throw new Error(`Duplicate demo phone ${customer['Phone (demo)']}`);
    customerPhones.add(customer['Phone (demo)']);
    mapStatus(customer.Status, customerId);
    parseDate(customer['Registration Date'], `${customerId} registration date`);
  }

  const registrations = new Set();
  const duesByVehicle = new Map();
  for (const [vehicleId, vehicle] of vehicles) {
    const customer = customers.get(vehicle['Customer ID']);
    if (!customer || customer['Customer Name'] !== vehicle['Customer Name']) {
      throw new Error(`${vehicleId} references a missing or mismatched customer`);
    }
    if (!['Car', 'Rakhsha'].includes(vehicle['Vehicle Type'])
      || requiredNumber(vehicle['Monthly Fee (PKR)'], `${vehicleId} monthly fee`)
        !== data.metadata.rates[vehicle['Vehicle Type']]) {
      throw new Error(`${vehicleId} has an unsupported vehicle type or rate`);
    }
    const registration = String(vehicle['Registration Number (demo)']).toUpperCase();
    if (registrations.has(registration)) throw new Error(`Duplicate demo registration ${registration}`);
    registrations.add(registration);
    mapStatus(vehicle.Status, vehicleId);
    parseDate(vehicle['Subscription Start Date'], `${vehicleId} subscription start date`);
    duesByVehicle.set(vehicleId, []);
  }

  const allocationsByDue = new Map();
  const allocationsByPayment = new Map();
  for (const allocation of data.paymentAllocations) {
    const payment = payments.get(allocation['Payment ID']);
    const due = dues.get(allocation['Due ID']);
    if (!payment || !due
      || allocation['Customer ID'] !== payment['Customer ID']
      || allocation['Customer ID'] !== due['Customer ID']
      || allocation['Vehicle ID'] !== due['Vehicle ID']) {
      throw new Error(`${allocation['Allocation ID']} references mismatched or missing records`);
    }
    const amount = requiredNumber(allocation['Allocated Amount (PKR)'], `${allocation['Allocation ID']} amount`);
    allocationsByDue.set(allocation['Due ID'], (allocationsByDue.get(allocation['Due ID']) || 0) + amount);
    allocationsByPayment.set(allocation['Payment ID'], (allocationsByPayment.get(allocation['Payment ID']) || 0) + amount);
  }

  for (const [dueId, due] of dues) {
    const vehicle = vehicles.get(due['Vehicle ID']);
    if (!vehicle || due['Customer ID'] !== vehicle['Customer ID']
      || due['Registration Number'] !== vehicle['Registration Number (demo)']) {
      throw new Error(`${dueId} references a missing or mismatched vehicle`);
    }
    const start = parseDate(due['Period Start'], `${dueId} period start`);
    const end = parseDate(due['Period End'], `${dueId} period end`);
    const amountDue = requiredNumber(due['Due Amount (PKR)'], `${dueId} amount due`);
    const amountPaid = requiredNumber(due['Paid Amount (PKR)'], `${dueId} amount paid`);
    const outstanding = requiredNumber(due['Outstanding (PKR)'], `${dueId} outstanding amount`);
    if (amountDue !== vehicle['Monthly Fee (PKR)']
      || amountPaid + outstanding !== amountDue
      || (allocationsByDue.get(dueId) || 0) !== amountPaid) {
      throw new Error(`${dueId} has inconsistent amounts or payment allocations`);
    }
    duesByVehicle.get(due['Vehicle ID']).push({ source: due, start, end });
  }

  const asOfDate = parseDate(`${data.metadata.asOfDate}T00:00:00`, 'dataset as-of date');
  for (const [vehicleId, vehicle] of vehicles) {
    const periods = getCompletedBillingPeriods(
      parseDate(vehicle['Subscription Start Date'], `${vehicleId} subscription start date`),
      null,
      asOfDate,
    );
    const vehicleDues = duesByVehicle.get(vehicleId).sort((a, b) => a.start - b.start);
    if (periods.length !== vehicleDues.length
      || periods.some((period, index) => period.start.getTime() !== vehicleDues[index].start.getTime()
        || period.end.getTime() !== vehicleDues[index].end.getTime())) {
      throw new Error(`${vehicleId} monthly dues do not match completed billing periods`);
    }
  }

  const allowedMethods = new Set(['cash', 'easypaisa', 'jazzcash']);
  for (const [paymentId, payment] of payments) {
    if (!customers.has(payment['Customer ID'])) throw new Error(`${paymentId} references a missing customer`);
    const method = String(payment.Method).toLowerCase();
    if (!allowedMethods.has(method)) throw new Error(`${paymentId} has unsupported method "${payment.Method}"`);
    const amount = requiredNumber(payment['Amount (PKR)'], `${paymentId} amount`);
    if ((allocationsByPayment.get(paymentId) || 0) > amount) {
      throw new Error(`${paymentId} is over-allocated`);
    }
    parseDate(payment['Payment Date'], `${paymentId} payment date`);
  }

};

const getParking = async () => {
  if (requestedParkingId) {
    const parking = await Parking.findById(requestedParkingId);
    if (!parking) throw new Error(`Parking "${requestedParkingId}" was not found`);
    return parking;
  }
  const parkings = await Parking.find().limit(2);
  if (parkings.length !== 1) {
    throw new Error('Specify --parking-id when the configured database does not contain exactly one parking');
  }
  return parkings[0];
};

const getCreatorId = async (parking, session) => {
  if (parking.createdBy && await User.exists({ _id: parking.createdBy }).session(session)) {
    return parking.createdBy;
  }
  const membership = await Membership.findOne({
    parkingId: parking._id,
    role: 'owner',
    status: 'active',
  }).session(session);
  if (membership && await User.exists({ _id: membership.userId }).session(session)) return membership.userId;
  throw new Error(`Parking "${parking.name}" has no active owner user for payment attribution`);
};

const checkForConflicts = async (parkingId, data, session) => {
  const customerPhones = data.customers.map((customer) => customer['Phone (demo)']);
  const registrations = data.vehicles.map((vehicle) => vehicle['Registration Number (demo)'].toUpperCase());
  const [customers, vehicles] = await Promise.all([
    Customer.find({ parkingId, primaryPhone: { $in: customerPhones } }).select('primaryPhone').session(session).lean(),
    Vehicle.find({ parkingId, registrationNumber: { $in: registrations } }).select('registrationNumber').session(session).lean(),
  ]);
  if (customers.length || vehicles.length) {
    throw new Error(`Import aborted to avoid duplicates: ${customers.length} customer phone(s) and ${vehicles.length} vehicle registration(s) already exist in this parking`);
  }
};

const insertData = async (parkingId, source) => {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const parking = await Parking.findById(parkingId).session(session);
      if (!parking) throw new Error(`Parking "${parkingId}" no longer exists`);
      if (parking.currency !== source.metadata.currency) {
        throw new Error(`Dataset currency ${source.metadata.currency} does not match parking currency ${parking.currency}`);
      }
      await checkForConflicts(parkingId, source, session);
      const createdBy = await getCreatorId(parking, session);

      const customerDocs = source.customers.map((customer) => ({
        parkingId,
        fullName: customer['Customer Name'],
        primaryPhone: customer['Phone (demo)'],
        notes: customer.Notes || '',
        registrationDate: parseDate(customer['Registration Date'], `${customer['Customer ID']} registration date`),
        status: mapStatus(customer.Status, customer['Customer ID']),
        createdBy,
      }));
      const createdCustomers = await Customer.insertMany(customerDocs, { session, ordered: true });
      const customerIds = new Map(source.customers.map((customer, index) => [
        customer['Customer ID'],
        createdCustomers[index]._id,
      ]));

      const vehicleDocs = source.vehicles.map((vehicle) => ({
        parkingId,
        customerId: customerIds.get(vehicle['Customer ID']),
        registrationNumber: vehicle['Registration Number (demo)'],
        vehicleType: vehicle['Vehicle Type'],
        makeModel: vehicle['Make / Model'],
        color: vehicle.Color,
        parkingStartDate: parseDate(vehicle['Subscription Start Date'], `${vehicle['Vehicle ID']} start date`),
        status: mapStatus(vehicle.Status, vehicle['Vehicle ID']),
      }));
      const createdVehicles = await Vehicle.insertMany(vehicleDocs, { session, ordered: true });
      const vehicleIds = new Map(source.vehicles.map((vehicle, index) => [
        vehicle['Vehicle ID'],
        createdVehicles[index]._id,
      ]));

      const subscriptionDocs = source.vehicles.map((vehicle) => {
        const startDate = parseDate(vehicle['Subscription Start Date'], `${vehicle['Vehicle ID']} start date`);
        return {
          parkingId,
          customerId: customerIds.get(vehicle['Customer ID']),
          vehicleId: vehicleIds.get(vehicle['Vehicle ID']),
          monthlyRate: vehicle['Monthly Fee (PKR)'],
          startDate,
          billingCycleDay: startDate.getUTCDate(),
          status: 'active',
          createdBy,
        };
      });
      const createdSubscriptions = await ParkingSubscription.insertMany(subscriptionDocs, { session, ordered: true });
      const subscriptionIds = new Map(source.vehicles.map((vehicle, index) => [
        vehicle['Vehicle ID'],
        createdSubscriptions[index]._id,
      ]));

      const dueDocs = source.monthlyDues.map((due) => {
        const amountDue = due['Due Amount (PKR)'];
        const amountPaid = due['Paid Amount (PKR)'];
        const outstandingAmount = due['Outstanding (PKR)'];
        return {
          parkingId,
          customerId: customerIds.get(due['Customer ID']),
          vehicleId: vehicleIds.get(due['Vehicle ID']),
          subscriptionId: subscriptionIds.get(due['Vehicle ID']),
          billingPeriodStart: parseDate(due['Period Start'], `${due['Due ID']} period start`),
          billingPeriodEnd: parseDate(due['Period End'], `${due['Due ID']} period end`),
          dueDate: parseDate(due['Period End'], `${due['Due ID']} due date`),
          amountDue,
          amountPaid,
          outstandingAmount,
          status: outstandingAmount === 0
            ? 'paid'
            : amountPaid > 0 ? 'partially_paid' : 'pending',
        };
      });
      const createdDues = await MonthlyDue.insertMany(dueDocs, { session, ordered: true });
      const dueIds = new Map(source.monthlyDues.map((due, index) => [
        due['Due ID'],
        createdDues[index]._id,
      ]));

      const paymentDocs = source.payments.map((payment) => ({
        parkingId,
        customerId: customerIds.get(payment['Customer ID']),
        amount: payment['Amount (PKR)'],
        paymentDate: parseDate(payment['Payment Date'], `${payment['Payment ID']} date`),
        method: String(payment.Method).toLowerCase(),
        receivedBy: createdBy,
        notes: payment.Notes || '',
        status: 'active',
      }));
      const createdPayments = await Payment.insertMany(paymentDocs, { session, ordered: true });
      const paymentIds = new Map(source.payments.map((payment, index) => [
        payment['Payment ID'],
        createdPayments[index]._id,
      ]));

      const allocationDocs = source.paymentAllocations.map((allocation) => ({
        parkingId,
        paymentId: paymentIds.get(allocation['Payment ID']),
        monthlyDueId: dueIds.get(allocation['Due ID']),
        allocatedAmount: allocation['Allocated Amount (PKR)'],
      }));
      const createdAllocations = await PaymentAllocation.insertMany(allocationDocs, { session, ordered: true });

      return {
        counts: {
          customers: createdCustomers.length,
          vehicles: createdVehicles.length,
          subscriptions: createdSubscriptions.length,
          monthlyDues: createdDues.length,
          payments: createdPayments.length,
          paymentAllocations: createdAllocations.length,
        },
      };
    });
  } finally {
    await session.endSession();
  }
};

const main = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/easyparking?replicaSet=rs0';
  const parsedUri = new URL(uri);
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(parsedUri.hostname);
  if (!isLocal && !allowRemote) {
    throw new Error('Refusing to write to a remote database without the explicit --allow-remote flag');
  }
  const source = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  validateData(source);
  await mongoose.connect(uri);
  try {
    const parking = await getParking();
    if (parking.currency !== source.metadata.currency) {
      throw new Error(`Dataset currency ${source.metadata.currency} does not match parking currency ${parking.currency}`);
    }
    await checkForConflicts(parking._id, source);
    const summary = {
      database: mongoose.connection.name,
      parkingId: parking._id.toString(),
      parkingName: parking.name,
      mode: applyImport ? 'apply' : 'dry-run',
      counts: {
        customers: source.customers.length,
        vehicles: source.vehicles.length,
        subscriptions: source.vehicles.length,
        monthlyDues: source.monthlyDues.length,
        payments: source.payments.length,
        paymentAllocations: source.paymentAllocations.length,
      },
    };
    if (applyImport) {
      const result = await insertData(parking._id, source);
      console.log(JSON.stringify({ ...summary, mode: 'imported', counts: result.counts }, null, 2));
    } else {
      console.log(JSON.stringify(summary, null, 2));
      console.log('No records were written. Re-run with --apply to import this dataset.');
    }
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error(`Demo data import failed: ${error.message}`);
  process.exitCode = 1;
});
