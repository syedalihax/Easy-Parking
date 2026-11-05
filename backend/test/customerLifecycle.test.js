const test = require('node:test');
const assert = require('node:assert/strict');

const { activateCustomer, createCustomer, deleteCustomer } = require('../src/controllers/customerController');
const { activateVehicle, deleteVehicle } = require('../src/controllers/vehicleController');

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('customer activation marks an inactive profile as active', async () => {
  const Customer = require('../src/models/Customer');
  const originalFindOne = Customer.findOne;
  Customer.findOne = async () => ({
    _id: 'customer-1',
    parkingId: 'parking-1',
    status: 'inactive',
    save: async function save() {
      this.status = 'active';
      return this;
    },
  });

  try {
    const response = createResponse();
    await activateCustomer({ params: { parkingId: 'parking-1', customerId: 'customer-1' } }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.customer.status, 'active');
  } finally {
    Customer.findOne = originalFindOne;
  }
});

test('customer creation persists CNIC/ID card information', async () => {
  const Customer = require('../src/models/Customer');
  const originalCreate = Customer.create;
  let createdPayload;

  Customer.create = async (payload) => {
    createdPayload = payload;
    return payload;
  };

  try {
    const response = createResponse();
    await createCustomer({
      params: { parkingId: 'parking-1' },
      user: { id: 'user-1' },
      body: {
        fullName: 'Ali Khan',
        primaryPhone: '03001234567',
        cnic: '42101-1234567-1',
      },
    }, response);

    assert.equal(response.statusCode, 201);
    assert.equal(createdPayload.cnic, '42101-1234567-1');
  } finally {
    Customer.create = originalCreate;
  }
});

test('inactive vehicle activation restores the vehicle to active status', async () => {
  const Vehicle = require('../src/models/Vehicle');
  const originalFindOne = Vehicle.findOne;
  let callCount = 0;
  Vehicle.findOne = async () => {
    callCount += 1;
    if (callCount === 1) {
      return {
        _id: 'vehicle-1',
        parkingId: 'parking-1',
        customerId: 'customer-1',
        registrationNumber: 'ABC-123',
        status: 'inactive',
        save: async function save() {
          this.status = 'active';
          return this;
        },
      };
    }
    return null;
  };

  try {
    const response = createResponse();
    await activateVehicle({ params: { parkingId: 'parking-1', customerId: 'customer-1', vehicleId: 'vehicle-1' } }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.vehicle.status, 'active');
  } finally {
    Vehicle.findOne = originalFindOne;
  }
});

test('inactive customer deletion removes the inactive member record', async () => {
  const Customer = require('../src/models/Customer');
  const Vehicle = require('../src/models/Vehicle');
  const ParkingSubscription = require('../src/models/ParkingSubscription');
  const monthlyDueModel = require('../src/models/MonthlyDue');

  const originalFindOne = Customer.findOne;
  const originalDeleteOne = Customer.deleteOne;
  const originalDeleteMany = Vehicle.deleteMany;
  const originalDeleteSub = ParkingSubscription.deleteMany;
  const originalDeleteDue = monthlyDueModel.deleteMany;

  Customer.findOne = () => ({
    select() { return this; },
    lean() {
      return {
        _id: 'customer-1',
        parkingId: 'parking-1',
        status: 'inactive',
      };
    },
  });
  Customer.deleteOne = async () => ({ deletedCount: 1 });
  Vehicle.deleteMany = async () => ({ deletedCount: 2 });
  ParkingSubscription.deleteMany = async () => ({ deletedCount: 2 });
  monthlyDueModel.deleteMany = async () => ({ deletedCount: 4 });

  try {
    const response = createResponse();
    await deleteCustomer({ params: { parkingId: 'parking-1', customerId: 'customer-1' } }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.deleted, true);
  } finally {
    Customer.findOne = originalFindOne;
    Customer.deleteOne = originalDeleteOne;
    Vehicle.deleteMany = originalDeleteMany;
    ParkingSubscription.deleteMany = originalDeleteSub;
    monthlyDueModel.deleteMany = originalDeleteDue;
  }
});

test('inactive vehicle deletion removes an inactive vehicle record', async () => {
  const Vehicle = require('../src/models/Vehicle');
  const ParkingSubscription = require('../src/models/ParkingSubscription');
  const monthlyDueModel = require('../src/models/MonthlyDue');

  const originalFindOne = Vehicle.findOne;
  const originalDeleteOne = Vehicle.deleteOne;
  const originalDeleteSub = ParkingSubscription.deleteMany;
  const originalDeleteDue = monthlyDueModel.deleteMany;

  Vehicle.findOne = () => ({
    select() { return this; },
    lean() {
      return {
        _id: 'vehicle-1',
        parkingId: 'parking-1',
        customerId: 'customer-1',
        status: 'inactive',
      };
    },
  });
  Vehicle.deleteOne = async () => ({ deletedCount: 1 });
  ParkingSubscription.deleteMany = async () => ({ deletedCount: 1 });
  monthlyDueModel.deleteMany = async () => ({ deletedCount: 3 });

  try {
    const response = createResponse();
    await deleteVehicle({ params: { parkingId: 'parking-1', customerId: 'customer-1', vehicleId: 'vehicle-1' } }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.deleted, true);
  } finally {
    Vehicle.findOne = originalFindOne;
    Vehicle.deleteOne = originalDeleteOne;
    ParkingSubscription.deleteMany = originalDeleteSub;
    monthlyDueModel.deleteMany = originalDeleteDue;
  }
});
