import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  apiCreateCustomer,
  apiCreateVehicle,
  apiCreatePayment,
  apiDeactivateCustomer,
  apiDeactivateVehicle,
  apiGetDues,
  apiGetPayments,
  apiGetPayment,
  apiGetSubscriptions,
  apiGetVehicle,
  apiPreviewPayment,
  apiGetCustomer,
  apiGetCustomers,
  apiChangeSubscriptionRate,
  apiEndSubscription,
  apiApprovePaymentCorrection,
  apiRejectPaymentCorrection,
  apiRequestPaymentCorrection,
  apiReplaceVehicle,
  apiSearchVehicles,
  apiUpdateCustomer,
  apiUpdateVehicle,
} from '../api';

const emptyCustomer = {
  fullName: '',
  primaryPhone: '',
  secondaryPhone: '',
  address: '',
  notes: '',
  registrationDate: new Date().toISOString().slice(0, 10),
};

const emptyVehicle = {
  registrationNumber: '',
  vehicleType: '',
  makeModel: '',
  color: '',
  parkingStartDate: new Date().toISOString().slice(0, 10),
  notes: '',
  monthlyRate: '',
};

function CustomersWorkspace({ parkingId, parkingRole = 'manager', initialScreen = 'customers' }) {
  const navigate = useNavigate();
  const { customerId: routeCustomerId, vehicleId: routeVehicleId } = useParams();
  const screen = routeCustomerId ? 'profile' : routeVehicleId ? 'vehicle-detail' : initialScreen;
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState('active');
  const [customerSearch, setCustomerSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleResults, setVehicleResults] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState('');
  const [replacingVehicleId, setReplacingVehicleId] = useState('');
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [dues, setDues] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [outstandingTotal, setOutstandingTotal] = useState(0);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'cash',
    referenceNumber: '',
    notes: '',
    manualDueOrder: [],
    manual: false,
  });
  const [paymentConfirmation, setPaymentConfirmation] = useState(false);
  const [paymentPreview, setPaymentPreview] = useState(null);
  const [paymentDetail, setPaymentDetail] = useState(null);
  const [correctionForm, setCorrectionForm] = useState({ correctedAmount: '', reason: '' });
  const [rateForm, setRateForm] = useState({ subscriptionId: '', monthlyRate: '', timing: 'next_cycle' });

  const loadBilling = useCallback(async (customerId) => {
    const [dueResult, paymentResult, subscriptionResult] = await Promise.all([
      apiGetDues(parkingId, customerId),
      apiGetPayments(parkingId, customerId),
      apiGetSubscriptions(parkingId, customerId),
    ]);
    setDues(dueResult.dues || []);
    setOutstandingTotal(dueResult.outstandingTotal || 0);
    setPayments(paymentResult.payments || []);
    setSubscriptions(subscriptionResult.subscriptions || []);
  }, [parkingId]);

  useEffect(() => {
    if (!routeCustomerId) return undefined;
    let isCurrent = true;
    const fetchCustomer = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const [customerResult] = await Promise.all([
          apiGetCustomer(parkingId, routeCustomerId),
          loadBilling(routeCustomerId),
        ]);
        if (isCurrent) setCustomer(customerResult.customer);
      } catch (error) {
        if (isCurrent) setErrorMessage(error.message || 'Could not load customer profile');
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };
    fetchCustomer();
    return () => { isCurrent = false; };
  }, [loadBilling, parkingId, routeCustomerId]);

  useEffect(() => {
    if (!routeVehicleId) return undefined;
    let isCurrent = true;
    apiGetVehicle(parkingId, routeVehicleId)
      .then(({ vehicle }) => {
        if (isCurrent) setSelectedVehicle(vehicle);
      })
      .catch((error) => {
        if (isCurrent) setErrorMessage(error.message || 'Could not load vehicle details');
      });
    return () => { isCurrent = false; };
  }, [parkingId, routeVehicleId]);

  useEffect(() => {
    if (!customer || !paymentForm.amount || !Number.isFinite(Number(paymentForm.amount)) || Number(paymentForm.amount) <= 0) {
      return undefined;
    }

    let isCurrent = true;
    const timer = window.setTimeout(async () => {
      try {
        const result = await apiPreviewPayment(
          parkingId,
          customer._id,
          Number(paymentForm.amount),
          paymentForm.manual ? paymentForm.manualDueOrder : undefined,
        );
        if (!isCurrent) return;
        setPaymentPreview({ ...result, amount: Number(paymentForm.amount), customerId: customer._id });
      } catch (error) {
        if (isCurrent) setErrorMessage(error.message || 'Could not preview payment allocation');
      }
    }, 250);
    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [customer, parkingId, paymentForm.amount, paymentForm.manual, paymentForm.manualDueOrder]);

  const loadCustomers = useCallback(async (page = 1) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await apiGetCustomers(parkingId, {
        search: customerSearch,
        status: statusFilter,
        page,
      });
      setCustomers(response.customers || []);
      setPagination(response.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      setErrorMessage(error.message || 'Could not load customers');
    } finally {
      setIsLoading(false);
    }
  }, [parkingId, statusFilter, customerSearch]);

  useEffect(() => {
    let isCurrent = true;

    const fetchCustomers = async () => {
      try {
        const response = await apiGetCustomers(parkingId, {
          search: customerSearch,
          status: statusFilter,
          page: 1,
        });

        if (!isCurrent) return;
        setCustomers(response.customers || []);
        setPagination(response.pagination || { page: 1, pages: 1, total: 0 });
        setErrorMessage('');
      } catch (error) {
        if (isCurrent) {
          setErrorMessage(error.message || 'Could not load customers');
        }
      }
    };

    fetchCustomers();
    return () => {
      isCurrent = false;
    };
  }, [parkingId, statusFilter, customerSearch]);

  const openCustomer = async (customerId) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await apiGetCustomer(parkingId, customerId);
      setCustomer(response.customer);
      await loadBilling(customerId);
      navigate(`/app/customers/${customerId}`);
      setShowCustomerForm(false);
      setShowVehicleForm(false);
    } catch (error) {
      setErrorMessage(error.message || 'Could not load customer profile');
    } finally {
      setIsLoading(false);
    }
  };

  const searchVehicles = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await apiSearchVehicles(parkingId, vehicleSearch);
      setVehicleResults(response.vehicles || []);
    } catch (error) {
      setErrorMessage(error.message || 'Could not search vehicles');
    } finally {
      setIsLoading(false);
    }
  };

  const saveCustomer = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      if (editingCustomer && customer) {
        const response = await apiUpdateCustomer(parkingId, customer._id, customerForm);
        setCustomer((current) => ({ ...current, ...response.customer }));
        setStatusMessage('Customer details updated');
      } else {
        const response = await apiCreateCustomer(parkingId, customerForm);
        setStatusMessage('Customer added');
        setCustomer(response.customer);
        navigate(`/app/customers/${response.customer._id}`);
      }
      setShowCustomerForm(false);
      await loadCustomers(pagination.page);
    } catch (error) {
      setErrorMessage(error.message || 'Could not save customer');
    } finally {
      setIsLoading(false);
    }
  };

  const saveVehicle = async (event) => {
    event.preventDefault();
    if (!customer) return;
    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      if (replacingVehicleId) {
        await apiReplaceVehicle(parkingId, customer._id, replacingVehicleId, vehicleForm);
        setStatusMessage('Vehicle replaced. The previous vehicle record is preserved.');
      } else if (editingVehicleId) {
        await apiUpdateVehicle(parkingId, customer._id, editingVehicleId, vehicleForm);
        setStatusMessage('Vehicle details updated');
      } else {
        await apiCreateVehicle(parkingId, customer._id, {
          ...vehicleForm,
          monthlyRate: Number(vehicleForm.monthlyRate),
        });
        setStatusMessage('Vehicle added');
      }
      const response = await apiGetCustomer(parkingId, customer._id);
      setCustomer(response.customer);
      await loadBilling(customer._id);
      setShowVehicleForm(false);
      setEditingVehicleId('');
      setReplacingVehicleId('');
      setVehicleForm(emptyVehicle);
    } catch (error) {
      setErrorMessage(error.message || 'Could not save vehicle');
    } finally {
      setIsLoading(false);
    }
  };

  const changeRate = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    try {
      await apiChangeSubscriptionRate(
        parkingId,
        customer._id,
        rateForm.subscriptionId,
        { monthlyRate: Number(rateForm.monthlyRate), timing: rateForm.timing },
      );
      await loadBilling(customer._id);
      setRateForm({ subscriptionId: '', monthlyRate: '', timing: 'next_cycle' });
      setStatusMessage('Subscription rate updated');
    } catch (error) {
      setErrorMessage(error.message || 'Could not change subscription rate');
    } finally {
      setIsLoading(false);
    }
  };

  const endSubscription = async (subscription) => {
    if (!window.confirm('End this subscription? The current billing period remains payable in full.')) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      await apiEndSubscription(parkingId, customer._id, subscription._id);
      await loadBilling(customer._id);
      setStatusMessage('Subscription ended. The final completed billing period will still be charged.');
    } catch (error) {
      setErrorMessage(error.message || 'Could not end subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const receivePayment = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const payload = {
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        referenceNumber: paymentForm.referenceNumber,
        notes: paymentForm.notes,
        ...(paymentForm.manual ? { manualDueOrder: paymentForm.manualDueOrder } : {}),
      };
      const response = await apiCreatePayment(parkingId, customer._id, payload);
      setStatusMessage(
        response.unallocatedAmount > 0
          ? `Payment recorded. Rs. ${response.unallocatedAmount} could not be allocated because there are no outstanding dues.`
          : 'Payment recorded and allocated successfully.',
      );
      setPaymentForm({ amount: '', method: 'cash', referenceNumber: '', notes: '', manualDueOrder: [], manual: false });
      setPaymentConfirmation(false);
      await loadBilling(customer._id);
    } catch (error) {
      setErrorMessage(error.message || 'Could not record payment');
      setPaymentConfirmation(false);
    } finally {
      setIsLoading(false);
    }
  };

  const openPaymentDetail = async (paymentId) => {
    setErrorMessage('');
    try {
      const response = await apiGetPayment(parkingId, customer._id, paymentId);
      setPaymentDetail(response);
    } catch (error) {
      setErrorMessage(error.message || 'Could not load payment');
    }
  };

  const requestCorrection = async (event) => {
    event.preventDefault();
    if (!paymentDetail) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      await apiRequestPaymentCorrection(parkingId, paymentDetail.payment._id, {
        correctedAmount: Number(correctionForm.correctedAmount),
        reason: correctionForm.reason,
      });
      setCorrectionForm({ correctedAmount: '', reason: '' });
      await openPaymentDetail(paymentDetail.payment._id);
      setStatusMessage(parkingRole === 'owner'
        ? 'Correction request submitted. Review it below to approve or reject.'
        : 'Sent to Owner for approval.');
    } catch (error) {
      setErrorMessage(error.message || 'Could not submit correction request');
    } finally {
      setIsLoading(false);
    }
  };

  const decideCorrection = async (auditLogId, approve) => {
    if (!paymentDetail) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      if (approve) {
        await apiApprovePaymentCorrection(parkingId, paymentDetail.payment._id, auditLogId);
      } else {
        await apiRejectPaymentCorrection(parkingId, paymentDetail.payment._id, auditLogId);
      }
      await loadBilling(customer._id);
      await openPaymentDetail(paymentDetail.payment._id);
      setStatusMessage(approve ? 'Correction approved; the original payment was reversed and replaced.' : 'Correction request rejected.');
    } catch (error) {
      setErrorMessage(error.message || 'Could not update correction request');
    } finally {
      setIsLoading(false);
    }
  };

  const deactivateCustomer = async () => {
    if (!customer || !window.confirm(`Deactivate ${customer.fullName}? Their record will be kept.`)) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await apiDeactivateCustomer(parkingId, customer._id);
      setCustomer(response.customer);
      setStatusMessage('Customer deactivated. The record has been kept.');
      await loadCustomers(pagination.page);
    } catch (error) {
      setErrorMessage(error.message || 'Could not deactivate customer');
    } finally {
      setIsLoading(false);
    }
  };

  const deactivateVehicle = async (vehicle) => {
    if (!window.confirm(`Deactivate vehicle ${vehicle.registrationNumber}? Its history will be kept.`)) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      await apiDeactivateVehicle(parkingId, customer._id, vehicle._id);
      const response = await apiGetCustomer(parkingId, customer._id);
      setCustomer(response.customer);
      setStatusMessage('Vehicle deactivated. Its record has been kept.');
    } catch (error) {
      setErrorMessage(error.message || 'Could not deactivate vehicle');
    } finally {
      setIsLoading(false);
    }
  };

  const beginCustomerEdit = () => {
    setEditingCustomer(true);
    setCustomerForm({
      fullName: customer.fullName || '',
      primaryPhone: customer.primaryPhone || '',
      secondaryPhone: customer.secondaryPhone || '',
      address: customer.address || '',
      notes: customer.notes || '',
      registrationDate: customer.registrationDate
        ? new Date(customer.registrationDate).toISOString().slice(0, 10)
        : '',
    });
    setShowCustomerForm(true);
  };

  const beginVehicleForm = (vehicle = null, replace = false) => {
    setEditingVehicleId(vehicle && !replace ? vehicle._id : '');
    setReplacingVehicleId(vehicle && replace ? vehicle._id : '');
    setVehicleForm(vehicle && !replace
      ? {
          registrationNumber: vehicle.registrationNumber || '',
          vehicleType: vehicle.vehicleType || '',
          makeModel: vehicle.makeModel || '',
          color: vehicle.color || '',
          parkingStartDate: vehicle.parkingStartDate
            ? new Date(vehicle.parkingStartDate).toISOString().slice(0, 10)
            : '',
          notes: vehicle.notes || '',
        }
      : emptyVehicle);
    setShowVehicleForm(true);
  };

  const renderCustomerForm = () => (
    <form className="form-grid panel" onSubmit={saveCustomer}>
      <div className="panel-header">
        <h3>{editingCustomer ? 'Edit customer' : 'Add customer'}</h3>
      </div>
      <label className="field">
        <span>Full name</span>
        <input required value={customerForm.fullName} onChange={(event) => setCustomerForm({ ...customerForm, fullName: event.target.value })} />
      </label>
      <label className="field">
        <span>Primary phone</span>
        <input required value={customerForm.primaryPhone} onChange={(event) => setCustomerForm({ ...customerForm, primaryPhone: event.target.value })} />
      </label>
      <label className="field">
        <span>Secondary phone</span>
        <input value={customerForm.secondaryPhone} onChange={(event) => setCustomerForm({ ...customerForm, secondaryPhone: event.target.value })} />
      </label>
      <label className="field">
        <span>Address</span>
        <input value={customerForm.address} onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })} />
      </label>
      <label className="field">
        <span>Registration date</span>
        <input type="date" value={customerForm.registrationDate} onChange={(event) => setCustomerForm({ ...customerForm, registrationDate: event.target.value })} />
      </label>
      <label className="field">
        <span>Notes</span>
        <textarea rows="3" value={customerForm.notes} onChange={(event) => setCustomerForm({ ...customerForm, notes: event.target.value })} />
      </label>
      {errorMessage && <p className="error-text">{errorMessage}</p>}
      <div className="action-row">
        <button className="primary-button" type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save customer'}</button>
        <button className="secondary-button" type="button" onClick={() => setShowCustomerForm(false)}>Cancel</button>
      </div>
    </form>
  );

  const renderVehicleForm = () => (
    <form className="form-grid panel" onSubmit={saveVehicle}>
      <div className="panel-header">
        <h3>{replacingVehicleId ? 'Replace vehicle' : editingVehicleId ? 'Edit vehicle' : 'Add vehicle'}</h3>
      </div>
      <label className="field">
        <span>Registration number</span>
        <input required value={vehicleForm.registrationNumber} onChange={(event) => setVehicleForm({ ...vehicleForm, registrationNumber: event.target.value })} />
      </label>
      <label className="field">
        <span>Vehicle type</span>
        <input value={vehicleForm.vehicleType} onChange={(event) => setVehicleForm({ ...vehicleForm, vehicleType: event.target.value })} placeholder="Car, bike..." />
      </label>
      <label className="field">
        <span>Make / model</span>
        <input value={vehicleForm.makeModel} onChange={(event) => setVehicleForm({ ...vehicleForm, makeModel: event.target.value })} />
      </label>
      <label className="field">
        <span>Color</span>
        <input value={vehicleForm.color} onChange={(event) => setVehicleForm({ ...vehicleForm, color: event.target.value })} />
      </label>
      <label className="field">
        <span>Parking start date</span>
        <input required type="date" disabled={Boolean(editingVehicleId)} value={vehicleForm.parkingStartDate} onChange={(event) => setVehicleForm({ ...vehicleForm, parkingStartDate: event.target.value })} />
      </label>
      {!editingVehicleId && !replacingVehicleId && (
        <label className="field">
          <span>Monthly rate (Rs.)</span>
          <input required type="number" min="0" step="any" value={vehicleForm.monthlyRate} onChange={(event) => setVehicleForm({ ...vehicleForm, monthlyRate: event.target.value })} />
        </label>
      )}
      {replacingVehicleId && (
        <p className="muted-text">The replacement subscription starts next billing cycle and carries over the current rate.</p>
      )}
      <label className="field">
        <span>Notes</span>
        <textarea rows="3" value={vehicleForm.notes} onChange={(event) => setVehicleForm({ ...vehicleForm, notes: event.target.value })} />
      </label>
      {errorMessage && <p className="error-text">{errorMessage}</p>}
      <div className="action-row">
        <button className="primary-button" type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : replacingVehicleId ? 'Replace vehicle' : 'Save vehicle'}</button>
        <button className="secondary-button" type="button" onClick={() => setShowVehicleForm(false)}>Cancel</button>
      </div>
    </form>
  );

  return (
    <section className="customers-workspace">
      {errorMessage && !showCustomerForm && !showVehicleForm && <p className="error-text">{errorMessage}</p>}
      {statusMessage && <p className="success-text">{statusMessage}</p>}

      {screen === 'vehicle-detail' && selectedVehicle && (
        <>
          <Link to="/app/vehicles" className="text-button" onClick={() => setSelectedVehicle(null)}>Back to vehicle search</Link>
          <section className="panel vehicle-detail-panel">
            <div className="workspace-heading">
              <div>
                <p className="eyebrow">Vehicle record</p>
                <h2>{selectedVehicle.registrationNumber}</h2>
              </div>
              <span className={selectedVehicle.status === 'active' ? 'status-label is-active' : 'status-label'}>{selectedVehicle.status}</span>
            </div>
            <div className="vehicle-detail-grid">
              <div><span>Customer</span><Link to={`/app/customers/${selectedVehicle.customer?._id}`}>{selectedVehicle.customer?.fullName || 'Customer profile'}</Link></div>
              <div><span>Phone</span><strong>{selectedVehicle.customer?.primaryPhone || 'Not provided'}</strong></div>
              <div><span>Vehicle type</span><strong>{selectedVehicle.vehicleType || 'Not provided'}</strong></div>
              <div><span>Make / model</span><strong>{selectedVehicle.makeModel || 'Not provided'}</strong></div>
              <div><span>Color</span><strong>{selectedVehicle.color || 'Not provided'}</strong></div>
              <div><span>Parking start date</span><strong>{new Date(selectedVehicle.parkingStartDate).toLocaleDateString()}</strong></div>
              {selectedVehicle.notes && <div className="vehicle-notes"><span>Notes</span><strong>{selectedVehicle.notes}</strong></div>}
            </div>
          </section>
        </>
      )}

      {(screen === 'dues' || screen === 'payments') && !customer && (
        <>
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">Monthly billing</p>
              <h2>{screen === 'dues' ? 'Dues' : 'Payments'}</h2>
            </div>
          </div>
          <p className="muted-text">Choose a customer to review their billing and payment history.</p>
          {isLoading ? <p className="muted-text">Loading customers...</p> : customers.length === 0 ? (
            <div className="empty-state"><p>No customers found.</p></div>
          ) : (
            <div className="customer-grid">
              {customers.map((item) => (
                <button key={item._id} className="customer-card" type="button" onClick={() => openCustomer(item._id)}>
                  <span className="customer-name">{item.fullName}</span>
                  <span className="customer-phone">{item.primaryPhone}</span>
                  <span className="customer-count">Open {screen}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {screen === 'customers' && !customer && (
        <>
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">Parking records</p>
              <h2>Customers</h2>
            </div>
            <button type="button" className="primary-button" onClick={() => {
              setEditingCustomer(false);
              setCustomerForm(emptyCustomer);
              setShowCustomerForm(true);
            }}>Add customer</button>
          </div>

          {showCustomerForm && renderCustomerForm()}

          <label className="field customer-search">
            <span>Search by name or phone</span>
            <input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Type a name or phone number" />
          </label>

          <div className="filter-row" aria-label="Customer status filter">
            {['active', 'inactive', 'all'].map((status) => (
              <button key={status} type="button" className={statusFilter === status ? 'filter-chip is-active' : 'filter-chip'} onClick={() => setStatusFilter(status)}>
                {status === 'all' ? 'All' : status[0].toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {isLoading ? <p className="muted-text">Loading customers...</p> : customers.length === 0 ? (
            <div className="empty-state"><h3>No customers found</h3><p>Add a customer or adjust your search.</p></div>
          ) : (
            <div className="customer-grid">
              {customers.map((item) => (
                <button key={item._id} className="customer-card" type="button" onClick={() => openCustomer(item._id)}>
                  <span className="customer-name">{item.fullName}</span>
                  <span className="customer-phone">{item.primaryPhone}</span>
                  <span className="customer-count">{item.vehicleCount} {item.vehicleCount === 1 ? 'vehicle' : 'vehicles'}</span>
                </button>
              ))}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="pagination-row">
              <button className="secondary-button" type="button" disabled={pagination.page <= 1} onClick={() => loadCustomers(pagination.page - 1)}>Previous</button>
              <span>Page {pagination.page} of {pagination.pages}</span>
              <button className="secondary-button" type="button" disabled={pagination.page >= pagination.pages} onClick={() => loadCustomers(pagination.page + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {screen === 'profile' && customer && (
        <>
          <Link to="/app/customers" className="text-button" onClick={() => setCustomer(null)}>Back to customers</Link>
          <section className="panel profile-header">
            <div>
              <p className="eyebrow">Customer profile</p>
              <h2>{customer.fullName}</h2>
              <p className="customer-phone">{customer.primaryPhone}</p>
              {customer.secondaryPhone && <p className="customer-phone">{customer.secondaryPhone}</p>}
              {customer.address && <p className="muted-text">{customer.address}</p>}
              {customer.notes && <p className="muted-text">{customer.notes}</p>}
              <span className={customer.status === 'active' ? 'status-label is-active' : 'status-label'}>{customer.status}</span>
            </div>
            <div className="action-row">
              <button type="button" className="secondary-button" onClick={beginCustomerEdit}>Edit</button>
              {customer.status === 'active' && <button type="button" className="danger-button" onClick={deactivateCustomer}>Deactivate</button>}
            </div>
          </section>

          {showCustomerForm && renderCustomerForm()}

          <section className="panel">
            <div className="panel-header vehicle-header">
              <div><h3>Vehicles</h3><p className="muted-text">Vehicle records and history stay with this customer.</p></div>
              <button type="button" className="primary-button" onClick={() => beginVehicleForm()}>Add vehicle</button>
            </div>
            {showVehicleForm && renderVehicleForm()}
            {customer.vehicles?.length ? (
              <div className="vehicle-list">
                {customer.vehicles.map((vehicle) => (
                  <article key={vehicle._id} className="vehicle-card">
                    <div className="vehicle-summary">
                      <Link className="vehicle-registration-link" to={`/app/vehicles/${vehicle._id}`}>{vehicle.registrationNumber}</Link>
                      <span className={vehicle.status === 'active' ? 'status-label is-active' : 'status-label'}>{vehicle.status}</span>
                      <p>{[vehicle.vehicleType, vehicle.makeModel, vehicle.color].filter(Boolean).join(' · ') || 'Vehicle details not added'}</p>
                      <p className="muted-text">Since {new Date(vehicle.parkingStartDate).toLocaleDateString()}</p>
                    </div>
                    {vehicle.status === 'active' && (
                      <div className="action-row">
                        <button className="secondary-button" type="button" onClick={() => beginVehicleForm(vehicle)}>Edit</button>
                        <button className="secondary-button" type="button" onClick={() => beginVehicleForm(vehicle, true)}>Replace vehicle</button>
                        <button className="danger-button" type="button" onClick={() => deactivateVehicle(vehicle)}>Deactivate</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : <div className="empty-state"><p>No vehicles added yet.</p></div>}
          </section>

          <section className="panel">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="eyebrow">Billing</p>
                <h3 className="m-0 text-xl font-bold">Subscriptions & dues</h3>
                <p className="muted-text">Outstanding total: <strong>Rs. {outstandingTotal.toLocaleString()}</strong></p>
              </div>
              <button type="button" className="primary-button" onClick={() => {
                setPaymentDetail(null);
                document.getElementById('receive-payment')?.scrollIntoView({ behavior: 'smooth' });
              }}>Receive payment</button>
            </div>

            {subscriptions.length > 0 && (
              <div className="mt-4 grid gap-3">
                {subscriptions.map((subscription) => {
                  const registration = customer.vehicles?.find((vehicle) => vehicle._id === subscription.vehicleId?._id)?.registrationNumber;
                  return (
                    <article key={subscription._id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <strong>{registration || 'Vehicle subscription'}</strong>
                          <p className="muted-text">Rs. {subscription.monthlyRate.toLocaleString()} / month · {subscription.status}</p>
                          {subscription.pendingRateChange && <p className="muted-text">Next rate: Rs. {subscription.pendingRateChange.newRate.toLocaleString()}</p>}
                        </div>
                        {subscription.status === 'active' && (
                          <div className="action-row">
                            <button type="button" className="secondary-button" onClick={() => setRateForm({
                              subscriptionId: subscription._id,
                              monthlyRate: String(subscription.monthlyRate),
                              timing: 'next_cycle',
                            })}>Change rate</button>
                            <button type="button" className="danger-button" onClick={() => endSubscription(subscription)}>End subscription</button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {rateForm.subscriptionId && (
              <form className="form-grid mt-4 rounded-xl bg-emerald-50 p-4" onSubmit={changeRate}>
                <h4 className="m-0">Change monthly rate</h4>
                <label className="field">
                  <span>New monthly rate (Rs.)</span>
                  <input required type="number" min="0" step="any" value={rateForm.monthlyRate} onChange={(event) => setRateForm({ ...rateForm, monthlyRate: event.target.value })} />
                </label>
                <label className="field">
                  <span>When should it apply?</span>
                  <select value={rateForm.timing} onChange={(event) => setRateForm({ ...rateForm, timing: event.target.value })}>
                    <option value="next_cycle">From next billing cycle</option>
                    <option value="immediate">Apply immediately</option>
                  </select>
                </label>
                <div className="action-row">
                  <button className="primary-button" type="submit" disabled={isLoading}>Save rate</button>
                  <button className="secondary-button" type="button" onClick={() => setRateForm({ subscriptionId: '', monthlyRate: '', timing: 'next_cycle' })}>Cancel</button>
                </div>
              </form>
            )}

            <div className="mt-5 grid gap-3">
              <h4 className="m-0">Monthly dues</h4>
              {dues.length === 0 ? <p className="muted-text">No completed billing periods yet.</p> : dues.map((due) => (
                <article key={due._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                  <div>
                    <strong>{new Date(due.billingPeriodStart).toLocaleDateString()} – {new Date(due.billingPeriodEnd).toLocaleDateString()}</strong>
                    <p className="muted-text">{due.vehicleId?.registrationNumber || 'Vehicle'} · Rs. {due.amountDue.toLocaleString()} due</p>
                  </div>
                  <div className="text-right">
                    <strong>Rs. {due.outstandingAmount.toLocaleString()}</strong>
                    <span className={`ml-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${due.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {due.status === 'paid' ? 'Received' : 'Due'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel" id="receive-payment">
            <div className="panel-header">
              <h3>Receive payment</h3>
              <p className="muted-text">Payments are recorded in PKR and allocated to existing dues only.</p>
            </div>
            <form className="form-grid" onSubmit={(event) => { event.preventDefault(); setPaymentConfirmation(true); }}>
              <label className="field">
                <span>Amount received (Rs.)</span>
                <input required type="number" min="0.01" step="any" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} />
              </label>
              <fieldset className="grid gap-2 border-0 p-0">
                <legend className="mb-2 text-sm font-bold">Payment method</legend>
                <div className="flex flex-wrap gap-2">
                  {['cash', 'easypaisa', 'jazzcash'].map((method) => (
                    <button key={method} type="button" className={paymentForm.method === method ? 'workspace-tab is-active' : 'workspace-tab'} onClick={() => setPaymentForm({ ...paymentForm, method })}>
                      {method === 'easypaisa' ? 'Easypaisa' : method === 'jazzcash' ? 'JazzCash' : 'Cash'}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="field">
                <span>Reference number (optional)</span>
                <input value={paymentForm.referenceNumber} onChange={(event) => setPaymentForm({ ...paymentForm, referenceNumber: event.target.value })} />
              </label>
              <label className="field">
                <span>Notes (optional)</span>
                <textarea rows="2" value={paymentForm.notes} onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })} />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={paymentForm.manual} onChange={(event) => setPaymentForm({
                  ...paymentForm,
                  manual: event.target.checked,
                  manualDueOrder: event.target.checked
                    ? (paymentPreview?.customerId === customer._id && paymentPreview.amount === Number(paymentForm.amount)
                      ? paymentPreview.allocations.map((allocation) => String(allocation.monthlyDueId))
                      : [])
                    : paymentForm.manualDueOrder,
                })} />
                Choose dues manually instead of oldest-first allocation
              </label>
              <div className="grid gap-2 rounded-xl bg-slate-50 p-4">
                {dues.filter((due) => due.outstandingAmount > 0).map((due) => (
                  <label key={due._id} className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      disabled={!paymentForm.manual}
                      checked={paymentForm.manual
                        ? paymentForm.manualDueOrder.includes(due._id)
                        : paymentPreview?.customerId === customer._id && paymentPreview.amount === Number(paymentForm.amount)
                          && paymentPreview.allocations.some((allocation) => String(allocation.monthlyDueId) === due._id)}
                      onChange={(event) => setPaymentForm({
                        ...paymentForm,
                        manualDueOrder: event.target.checked
                          ? [...paymentForm.manualDueOrder, due._id]
                          : paymentForm.manualDueOrder.filter((id) => id !== due._id),
                      })}
                    />
                    {new Date(due.billingPeriodStart).toLocaleDateString()} – {new Date(due.billingPeriodEnd).toLocaleDateString()} · Rs. {due.outstandingAmount.toLocaleString()} outstanding
                  </label>
                ))}
                {dues.every((due) => due.outstandingAmount <= 0) && <p className="muted-text">There are no outstanding dues to select.</p>}
                {paymentPreview?.customerId === customer._id && paymentPreview.amount === Number(paymentForm.amount) && (
                  <p className="muted-text">
                    {paymentForm.manual ? 'Selected dues can be allocated in the order checked.' : 'Oldest outstanding dues are selected automatically.'}
                    {paymentPreview.unallocatedAmount > 0 && ` Rs. ${paymentPreview.unallocatedAmount.toLocaleString()} will remain unallocated.`}
                  </p>
                )}
              </div>
              <button className="primary-button" type="submit" disabled={isLoading}>Review payment</button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-header"><h3>Payment history</h3></div>
            {payments.length === 0 ? <p className="muted-text">No payments recorded.</p> : (
              <div className="list-stack">
                {payments.map((payment) => (
                  <button type="button" key={payment._id} className="list-item text-left" onClick={() => openPaymentDetail(payment._id)}>
                    <div>
                      <strong>Rs. {payment.amount.toLocaleString()} · {payment.method}</strong>
                      <p>{new Date(payment.paymentDate).toLocaleDateString()} · Received by {payment.receivedBy?.fullName || 'team member'} · {payment.allocations?.length || 0} due(s)</p>
                    </div>
                    <span className={`status-label ${payment.status === 'active' ? 'is-active' : ''}`}>{payment.status}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {paymentDetail && (
            <section className="panel grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Payment detail</p>
                  <h3 className="m-0 text-xl">Rs. {paymentDetail.payment.amount.toLocaleString()} · {paymentDetail.payment.method}</h3>
                  <p className="muted-text">{new Date(paymentDetail.payment.paymentDate).toLocaleString()} · {paymentDetail.payment.status}</p>
                </div>
                <button className="secondary-button" type="button" onClick={() => setPaymentDetail(null)}>Close</button>
              </div>
              <div className="grid gap-2">
                <strong>Allocation history</strong>
                {paymentDetail.payment.allocations.map((allocation) => (
                  <p className="muted-text" key={allocation._id}>
                    {allocation.monthlyDueId
                      ? `${new Date(allocation.monthlyDueId.billingPeriodStart).toLocaleDateString()} – ${new Date(allocation.monthlyDueId.billingPeriodEnd).toLocaleDateString()}`
                      : 'Due record'} · Rs. {allocation.allocatedAmount.toLocaleString()}
                  </p>
                ))}
                {paymentDetail.corrections?.map((correction) => (
                  <article key={correction._id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p><strong>Correction {correction.newValue?.approvalStatus}</strong> · Correct amount Rs. {correction.newValue?.correctedAmount}</p>
                    <p>{correction.reason}</p>
                    {parkingRole === 'owner' && correction.newValue?.approvalStatus === 'pending' && (
                      <div className="action-row">
                        <button className="primary-button" type="button" disabled={isLoading} onClick={() => decideCorrection(correction._id, true)}>Approve & replace</button>
                        <button className="secondary-button" type="button" disabled={isLoading} onClick={() => decideCorrection(correction._id, false)}>Reject</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
              {paymentDetail.payment.status === 'active' && (
                <form className="form-grid border-t border-slate-200 pt-4" onSubmit={requestCorrection}>
                  <h4 className="m-0">Request correction</h4>
                  <label className="field">
                    <span>Correct amount (Rs.)</span>
                    <input required type="number" min="0.01" step="any" value={correctionForm.correctedAmount} onChange={(event) => setCorrectionForm({ ...correctionForm, correctedAmount: event.target.value })} />
                  </label>
                  <label className="field">
                    <span>Reason</span>
                    <textarea required rows="2" value={correctionForm.reason} onChange={(event) => setCorrectionForm({ ...correctionForm, reason: event.target.value })} />
                  </label>
                  <button className="secondary-button" type="submit" disabled={isLoading}>Send correction request</button>
                </form>
              )}
            </section>
          )}
        </>
      )}

      {screen === 'vehicle-search' && (
        <>
          <div className="workspace-heading">
            <div><p className="eyebrow">Find a customer</p><h2>Vehicle search</h2></div>
          </div>
          <form className="search-form" onSubmit={searchVehicles}>
            <label className="field">
              <span>Registration number</span>
              <input value={vehicleSearch} onChange={(event) => setVehicleSearch(event.target.value)} placeholder="Enter registration number" />
            </label>
            <button className="primary-button" type="submit" disabled={isLoading}>Search vehicles</button>
          </form>
          <div className="vehicle-list">
            {vehicleResults.map((vehicle) => (
              <Link key={vehicle._id} className="vehicle-search-result" to={`/app/vehicles/${vehicle._id}`}>
                <strong>{vehicle.registrationNumber}</strong>
                <span>{vehicle.customer?.fullName || 'Customer'}</span>
                <span className="customer-phone">{vehicle.customer?.primaryPhone || ''}</span>
                <span className={vehicle.status === 'active' ? 'status-label is-active' : 'status-label'}>{vehicle.status}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {paymentConfirmation && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="presentation">
          <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="payment-confirmation-title">
            <p className="eyebrow">Confirm important action</p>
            <h2 id="payment-confirmation-title" className="mt-0 text-2xl font-bold">Record Rs. {Number(paymentForm.amount || 0).toLocaleString()}?</h2>
            <p>Method: {paymentForm.method === 'cash' ? 'Cash' : paymentForm.method === 'easypaisa' ? 'Easypaisa' : 'JazzCash'}.</p>
            <p>{paymentForm.manual
              ? `${paymentForm.manualDueOrder.length} selected due(s); any remainder will be reported as unallocated.`
              : 'The payment will be allocated to the oldest outstanding dues first.'}</p>
            {paymentPreview?.customerId === customer?._id && paymentPreview.amount === Number(paymentForm.amount) && (
              <>
                <p>Preview: Rs. {(Number(paymentForm.amount) - paymentPreview.unallocatedAmount).toLocaleString()} allocated across {paymentPreview.allocations.length} due(s); Rs. {paymentPreview.unallocatedAmount.toLocaleString()} unallocated.</p>
                <ul className="list-disc pl-5 text-sm">
                  {paymentPreview.allocations.map((allocation) => {
                    const due = dues.find((item) => item._id === String(allocation.monthlyDueId));
                    return (
                      <li key={String(allocation.monthlyDueId)}>
                        {due
                          ? `${new Date(due.billingPeriodStart).toLocaleDateString()} – ${new Date(due.billingPeriodEnd).toLocaleDateString()}`
                          : 'Due'}: Rs. {allocation.allocatedAmount.toLocaleString()}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <div className="action-row mt-5">
              <button className="primary-button" type="button" disabled={isLoading} onClick={receivePayment}>{isLoading ? 'Recording...' : 'Confirm & record payment'}</button>
              <button className="secondary-button" type="button" disabled={isLoading} onClick={() => setPaymentConfirmation(false)}>Go back</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default CustomersWorkspace;
