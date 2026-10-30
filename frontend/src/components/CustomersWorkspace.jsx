import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StatusBadge from './StatusBadge';
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
  const { t } = useTranslation();
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
        if (isCurrent) setErrorMessage(error.message || t('errors.couldNotLoad'));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };
    fetchCustomer();
    return () => { isCurrent = false; };
  }, [loadBilling, parkingId, routeCustomerId, t]);

  useEffect(() => {
    if (!routeVehicleId) return undefined;
    let isCurrent = true;
    apiGetVehicle(parkingId, routeVehicleId)
      .then(({ vehicle }) => {
        if (isCurrent) setSelectedVehicle(vehicle);
      })
      .catch((error) => {
        if (isCurrent) setErrorMessage(error.message || t('errors.couldNotLoad'));
      });
    return () => { isCurrent = false; };
  }, [parkingId, routeVehicleId, t]);

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
        if (isCurrent) setErrorMessage(error.message || t('errors.couldNotLoad'));
      }
    }, 250);
    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [customer, parkingId, paymentForm.amount, paymentForm.manual, paymentForm.manualDueOrder, t]);

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
      setErrorMessage(error.message || t('errors.couldNotLoad'));
    } finally {
      setIsLoading(false);
    }
  }, [parkingId, statusFilter, customerSearch, t]);

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
          setErrorMessage(error.message || t('errors.couldNotLoad'));
        }
      }
    };

    fetchCustomers();
    return () => {
      isCurrent = false;
    };
  }, [parkingId, statusFilter, customerSearch, t]);

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
      setErrorMessage(error.message || t('errors.couldNotLoad'));
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
      setErrorMessage(error.message || t('errors.couldNotLoad'));
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
        setStatusMessage(t('customer.customerUpdated'));
      } else {
        const response = await apiCreateCustomer(parkingId, customerForm);
        setStatusMessage(t('customer.customerAdded'));
        setCustomer(response.customer);
        navigate(`/app/customers/${response.customer._id}`);
      }
      setShowCustomerForm(false);
      await loadCustomers(pagination.page);
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotSave'));
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
        setStatusMessage(t('customer.vehicleReplaced'));
      } else if (editingVehicleId) {
        await apiUpdateVehicle(parkingId, customer._id, editingVehicleId, vehicleForm);
        setStatusMessage(t('customer.vehicleUpdated'));
      } else {
        await apiCreateVehicle(parkingId, customer._id, {
          ...vehicleForm,
          monthlyRate: Number(vehicleForm.monthlyRate),
        });
        setStatusMessage(t('customer.vehicleAdded'));
      }
      const response = await apiGetCustomer(parkingId, customer._id);
      setCustomer(response.customer);
      await loadBilling(customer._id);
      setShowVehicleForm(false);
      setEditingVehicleId('');
      setReplacingVehicleId('');
      setVehicleForm(emptyVehicle);
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotSave'));
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
      setStatusMessage(t('customer.rateUpdated'));
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotSave'));
    } finally {
      setIsLoading(false);
    }
  };

  const endSubscription = async (subscription) => {
    if (!window.confirm(t('customer.confirmEndSubscription'))) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      await apiEndSubscription(parkingId, customer._id, subscription._id);
      await loadBilling(customer._id);
      setStatusMessage(t('customer.subscriptionEnded'));
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotSave'));
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
          ? t('customer.paymentRecordedUnallocated', { amount: response.unallocatedAmount })
          : t('customer.paymentRecordedAllocated'),
      );
      setPaymentForm({ amount: '', method: 'cash', referenceNumber: '', notes: '', manualDueOrder: [], manual: false });
      setPaymentConfirmation(false);
      await loadBilling(customer._id);
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotSave'));
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
      setErrorMessage(error.message || t('errors.couldNotLoad'));
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
        ? t('customer.correctionPendingOwner')
        : t('customer.sentToOwner'));
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotSave'));
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
      setStatusMessage(approve ? t('customer.correctionApproved') : t('customer.correctionRejected'));
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotSave'));
    } finally {
      setIsLoading(false);
    }
  };

  const deactivateCustomer = async () => {
    if (!customer || !window.confirm(t('customer.confirmDeactivateCustomer', { name: customer.fullName }))) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await apiDeactivateCustomer(parkingId, customer._id);
      setCustomer(response.customer);
      setStatusMessage(t('customer.customerDeactivated'));
      await loadCustomers(pagination.page);
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotSave'));
    } finally {
      setIsLoading(false);
    }
  };

  const deactivateVehicle = async (vehicle) => {
    if (!window.confirm(t('customer.confirmDeactivateVehicle', { number: vehicle.registrationNumber }))) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      await apiDeactivateVehicle(parkingId, customer._id, vehicle._id);
      const response = await apiGetCustomer(parkingId, customer._id);
      setCustomer(response.customer);
      setStatusMessage(t('customer.vehicleDeactivated'));
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotSave'));
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
        <h3>{t(editingCustomer ? 'customer.editCustomer' : 'customer.add')}</h3>
      </div>
      <label className="field">
        <span>{t('auth.fullName')}</span>
        <input required value={customerForm.fullName} onChange={(event) => setCustomerForm({ ...customerForm, fullName: event.target.value })} />
      </label>
      <label className="field">
        <span>{t('customer.primaryPhone')}</span>
        <input required value={customerForm.primaryPhone} onChange={(event) => setCustomerForm({ ...customerForm, primaryPhone: event.target.value })} />
      </label>
      <label className="field">
        <span>{t('customer.secondaryPhone')}</span>
        <input value={customerForm.secondaryPhone} onChange={(event) => setCustomerForm({ ...customerForm, secondaryPhone: event.target.value })} />
      </label>
      <label className="field">
        <span>{t('customer.address')}</span>
        <input value={customerForm.address} onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })} />
      </label>
      <label className="field">
        <span>{t('customer.registrationDate')}</span>
        <input type="date" value={customerForm.registrationDate} onChange={(event) => setCustomerForm({ ...customerForm, registrationDate: event.target.value })} />
      </label>
      <label className="field">
        <span>{t('customer.notes')}</span>
        <textarea rows="3" value={customerForm.notes} onChange={(event) => setCustomerForm({ ...customerForm, notes: event.target.value })} />
      </label>
      {errorMessage && <p className="error-text">{errorMessage}</p>}
      <div className="action-row">
        <button className="primary-button" type="submit" disabled={isLoading}>{isLoading ? t('app.saving') : t('customer.saveCustomer')}</button>
        <button className="secondary-button" type="button" onClick={() => setShowCustomerForm(false)}>{t('app.cancel')}</button>
      </div>
    </form>
  );

  const renderVehicleForm = () => (
    <form className="form-grid panel" onSubmit={saveVehicle}>
      <div className="panel-header">
        <h3>{t(replacingVehicleId ? 'customer.vehicleReplacement' : editingVehicleId ? 'customer.editVehicle' : 'customer.addVehicle')}</h3>
      </div>
      <label className="field">
        <span>{t('customer.registrationNumber')}</span>
        <input required value={vehicleForm.registrationNumber} onChange={(event) => setVehicleForm({ ...vehicleForm, registrationNumber: event.target.value })} />
      </label>
      <label className="field">
        <span>{t('customer.type')}</span>
        <input value={vehicleForm.vehicleType} onChange={(event) => setVehicleForm({ ...vehicleForm, vehicleType: event.target.value })} placeholder={t('customer.carBikePlaceholder')} />
      </label>
      <label className="field">
        <span>{t('customer.makeModel')}</span>
        <input value={vehicleForm.makeModel} onChange={(event) => setVehicleForm({ ...vehicleForm, makeModel: event.target.value })} />
      </label>
      <label className="field">
        <span>{t('customer.color')}</span>
        <input value={vehicleForm.color} onChange={(event) => setVehicleForm({ ...vehicleForm, color: event.target.value })} />
      </label>
      <label className="field">
        <span>{t('customer.parkingStartDate')}</span>
        <input required type="date" disabled={Boolean(editingVehicleId)} value={vehicleForm.parkingStartDate} onChange={(event) => setVehicleForm({ ...vehicleForm, parkingStartDate: event.target.value })} />
      </label>
      {!editingVehicleId && !replacingVehicleId && (
        <label className="field">
          <span>{t('customer.monthlyRate')}</span>
          <input required type="number" min="0" step="any" value={vehicleForm.monthlyRate} onChange={(event) => setVehicleForm({ ...vehicleForm, monthlyRate: event.target.value })} />
        </label>
      )}
      {replacingVehicleId && (
        <p className="muted-text">{t('customer.replacementSubscription')}</p>
      )}
      <label className="field">
        <span>{t('customer.notes')}</span>
        <textarea rows="3" value={vehicleForm.notes} onChange={(event) => setVehicleForm({ ...vehicleForm, notes: event.target.value })} />
      </label>
      {errorMessage && <p className="error-text">{errorMessage}</p>}
      <div className="action-row">
        <button className="primary-button" type="submit" disabled={isLoading}>{isLoading ? t('app.saving') : replacingVehicleId ? t('customer.replaceVehicle') : t('customer.saveVehicle')}</button>
        <button className="secondary-button" type="button" onClick={() => setShowVehicleForm(false)}>{t('app.cancel')}</button>
      </div>
    </form>
  );

  return (
    <section className="customers-workspace">
      {errorMessage && !showCustomerForm && !showVehicleForm && <p className="error-text">{errorMessage}</p>}
      {statusMessage && <p className="success-text">{statusMessage}</p>}

      {screen === 'vehicle-detail' && selectedVehicle && (
        <>
          <Link to="/app/vehicles" className="text-button" onClick={() => setSelectedVehicle(null)}>{t('customer.backToVehicleSearch')}</Link>
          <section className="panel vehicle-detail-panel">
            <div className="workspace-heading">
              <div>
                <p className="eyebrow">{t('customer.vehicleRecord')}</p>
                <h2>{selectedVehicle.registrationNumber}</h2>
              </div>
              <StatusBadge status={selectedVehicle.status === 'active' ? 'active' : 'inactive'} label={t(`app.${selectedVehicle.status}`)} />
            </div>
            <div className="vehicle-detail-grid">
              <div><span>{t('reports.customer')}</span><Link to={`/app/customers/${selectedVehicle.customer?._id}`}>{selectedVehicle.customer?.fullName || t('app.customerProfile')}</Link></div>
              <div><span>{t('customer.phone')}</span><strong>{selectedVehicle.customer?.primaryPhone || t('app.notProvided')}</strong></div>
              <div><span>{t('customer.type')}</span><strong>{selectedVehicle.vehicleType || t('app.notProvided')}</strong></div>
              <div><span>{t('customer.makeModel')}</span><strong>{selectedVehicle.makeModel || t('app.notProvided')}</strong></div>
              <div><span>{t('customer.color')}</span><strong>{selectedVehicle.color || t('app.notProvided')}</strong></div>
              <div><span>{t('customer.parkingStartDate')}</span><strong dir="ltr">{new Date(selectedVehicle.parkingStartDate).toLocaleDateString()}</strong></div>
              {selectedVehicle.notes && <div className="vehicle-notes"><span>{t('customer.notes')}</span><strong>{selectedVehicle.notes}</strong></div>}
            </div>
          </section>
        </>
      )}

      {(screen === 'dues' || screen === 'payments') && !customer && (
        <>
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">{t('customer.monthlyBilling')}</p>
              <h2>{t(screen === 'dues' ? 'nav.dues' : 'nav.payments')}</h2>
            </div>
          </div>
          <p className="muted-text">{t('customer.chooseCustomer')}</p>
          {isLoading ? <p className="muted-text">{t('customer.loading')}</p> : customers.length === 0 ? (
            <div className="empty-state"><p>{t('customer.noCustomers')}</p></div>
          ) : (
            <div className="customer-grid">
              {customers.map((item) => (
                <button key={item._id} className="customer-card" type="button" onClick={() => openCustomer(item._id)}>
                  <span className="customer-name">{item.fullName}</span>
                  <span className="customer-phone">{item.primaryPhone}</span>
                  <span className="customer-count">{t('customer.open', { screen: t(screen === 'dues' ? 'nav.dues' : 'nav.payments') })}</span>
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
              <p className="eyebrow">{t('customer.parkingRecords')}</p>
              <h2>{t('nav.customers')}</h2>
            </div>
            <button type="button" className="primary-button" onClick={() => {
              setEditingCustomer(false);
              setCustomerForm(emptyCustomer);
              setShowCustomerForm(true);
            }}>{t('customer.add')}</button>
          </div>

          {showCustomerForm && renderCustomerForm()}

          <label className="field customer-search">
            <span>{t('customer.searchNamePhone')}</span>
            <input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder={t('customer.searchPlaceholder')} />
          </label>

          <div className="filter-row" aria-label={t('customer.statusFilter')}>
            {['active', 'inactive', 'all'].map((status) => (
              <button key={status} type="button" className={statusFilter === status ? 'filter-chip is-active' : 'filter-chip'} onClick={() => setStatusFilter(status)}>
                {t(`app.${status}`)}
              </button>
            ))}
          </div>

          {isLoading ? <p className="muted-text">{t('customer.loading')}</p> : customers.length === 0 ? (
            <div className="empty-state"><h3>{t('customer.noCustomers')}</h3><p>{t('customer.adjustSearch')}</p></div>
          ) : (
            <div className="customer-grid">
              {customers.map((item) => (
                <button key={item._id} className="customer-card" type="button" onClick={() => openCustomer(item._id)}>
                  <span className="customer-name">{item.fullName}</span>
                  <span className="customer-phone">{item.primaryPhone}</span>
                  <span className="customer-count">{t('customer.vehicleCount', { count: item.vehicleCount })}</span>
                </button>
              ))}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="pagination-row">
              <button className="secondary-button" type="button" disabled={pagination.page <= 1} onClick={() => loadCustomers(pagination.page - 1)}>{t('customer.previous')}</button>
              <span>{t('customer.page', { current: pagination.page, total: pagination.pages })}</span>
              <button className="secondary-button" type="button" disabled={pagination.page >= pagination.pages} onClick={() => loadCustomers(pagination.page + 1)}>{t('customer.next')}</button>
            </div>
          )}
        </>
      )}

      {screen === 'profile' && customer && (
        <>
          <Link to="/app/customers" className="text-button" onClick={() => setCustomer(null)}>{t('customer.back')}</Link>
          <section className="panel profile-header">
            <div>
              <p className="eyebrow">{t('customer.profile')}</p>
              <h2>{customer.fullName}</h2>
              <p className="customer-phone">{customer.primaryPhone}</p>
              {customer.secondaryPhone && <p className="customer-phone">{customer.secondaryPhone}</p>}
              {customer.address && <p className="muted-text">{customer.address}</p>}
              {customer.notes && <p className="muted-text">{customer.notes}</p>}
              <StatusBadge status={customer.status === 'active' ? 'active' : 'inactive'} label={t(`app.${customer.status}`)} />
            </div>
            <div className="action-row">
              <button type="button" className="secondary-button" onClick={beginCustomerEdit}>{t('customer.edit')}</button>
              {customer.status === 'active' && <button type="button" className="danger-button" onClick={deactivateCustomer}>{t('customer.deactivate')}</button>}
            </div>
          </section>

          {showCustomerForm && renderCustomerForm()}

          <section className="panel">
            <div className="panel-header vehicle-header">
              <div><h3>{t('customer.vehicles')}</h3><p className="muted-text">{t('customer.vehicleHistory')}</p></div>
              <button type="button" className="primary-button" onClick={() => beginVehicleForm()}>{t('customer.addVehicle')}</button>
            </div>
            {showVehicleForm && renderVehicleForm()}
            {customer.vehicles?.length ? (
              <div className="vehicle-list">
                {customer.vehicles.map((vehicle) => (
                  <article key={vehicle._id} className="vehicle-card">
                    <div className="vehicle-summary">
                      <Link className="vehicle-registration-link" to={`/app/vehicles/${vehicle._id}`}>{vehicle.registrationNumber}</Link>
                      <StatusBadge status={vehicle.status === 'active' ? 'active' : 'inactive'} label={t(`app.${vehicle.status}`)} />
                      <p>{[vehicle.vehicleType, vehicle.makeModel, vehicle.color].filter(Boolean).join(' · ') || t('customer.vehicleDetailsMissing')}</p>
                      <p className="muted-text">{t('customer.since', { date: new Date(vehicle.parkingStartDate).toLocaleDateString() })}</p>
                    </div>
                    {vehicle.status === 'active' && (
                      <div className="action-row">
                        <button className="secondary-button" type="button" onClick={() => beginVehicleForm(vehicle)}>{t('customer.edit')}</button>
                        <button className="secondary-button" type="button" onClick={() => beginVehicleForm(vehicle, true)}>{t('customer.replaceVehicle')}</button>
                        <button className="danger-button" type="button" onClick={() => deactivateVehicle(vehicle)}>{t('customer.deactivate')}</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : <div className="empty-state"><p>{t('customer.noVehicles')}</p></div>}
          </section>

          <section className="panel">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="eyebrow">{t('customer.billing')}</p>
                <h3 className="m-0 text-xl font-bold">{t('customer.subscriptionsDues')}</h3>
                <p className="muted-text">{t('customer.outstandingTotal')} <strong dir="ltr">Rs. {outstandingTotal.toLocaleString()}</strong></p>
              </div>
              <button type="button" className="primary-button" onClick={() => {
                setPaymentDetail(null);
                document.getElementById('receive-payment')?.scrollIntoView({ behavior: 'smooth' });
              }}>{t('customer.receivePayment')}</button>
            </div>

            {subscriptions.length > 0 && (
              <div className="mt-4 grid gap-3">
                {subscriptions.map((subscription) => {
                  const registration = customer.vehicles?.find((vehicle) => vehicle._id === subscription.vehicleId?._id)?.registrationNumber;
                  return (
                    <article key={subscription._id} className="rounded-xl border border-border bg-surface p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <strong>{registration || t('customer.vehicleSubscription')}</strong>
                          <p className="muted-text"><span dir="ltr">Rs. {subscription.monthlyRate.toLocaleString()}</span> / {t('customer.month')} · {t(`customer.subscriptionStatus.${subscription.status}`)}</p>
                          {subscription.pendingRateChange && <p className="muted-text">{t('customer.nextRate', { amount: subscription.pendingRateChange.newRate.toLocaleString() })}</p>}
                        </div>
                        {subscription.status === 'active' && (
                          <div className="action-row">
                            <button type="button" className="secondary-button" onClick={() => setRateForm({
                              subscriptionId: subscription._id,
                              monthlyRate: String(subscription.monthlyRate),
                              timing: 'next_cycle',
                            })}>{t('customer.changeRate')}</button>
                            <button type="button" className="danger-button" onClick={() => endSubscription(subscription)}>{t('customer.endSubscriptionButton')}</button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {rateForm.subscriptionId && (
              <form className="form-grid mt-4 rounded-xl bg-primary-light p-4" onSubmit={changeRate}>
                <h4 className="m-0">{t('customer.rateChangeTitle')}</h4>
                <label className="field">
                  <span>{t('customer.newMonthlyRate')}</span>
                  <input required type="number" min="0" step="any" value={rateForm.monthlyRate} onChange={(event) => setRateForm({ ...rateForm, monthlyRate: event.target.value })} />
                </label>
                <label className="field">
                  <span>{t('customer.whenApply')}</span>
                  <select value={rateForm.timing} onChange={(event) => setRateForm({ ...rateForm, timing: event.target.value })}>
                    <option value="next_cycle">{t('customer.nextCycle')}</option>
                    <option value="immediate">{t('customer.immediately')}</option>
                  </select>
                </label>
                <div className="action-row">
                  <button className="primary-button" type="submit" disabled={isLoading}>{t('customer.saveRate')}</button>
                  <button className="secondary-button" type="button" onClick={() => setRateForm({ subscriptionId: '', monthlyRate: '', timing: 'next_cycle' })}>{t('app.cancel')}</button>
                </div>
              </form>
            )}

            <div className="mt-5 grid gap-3">
              <h4 className="m-0">{t('customer.monthlyDues')}</h4>
              {dues.length === 0 ? <p className="muted-text">{t('customer.noCompletedPeriods')}</p> : dues.map((due) => (
                <article key={due._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                  <div>
                    <strong dir="ltr">{new Date(due.billingPeriodStart).toLocaleDateString()} – {new Date(due.billingPeriodEnd).toLocaleDateString()}</strong>
                    <p className="muted-text">{due.vehicleId?.registrationNumber || t('customer.vehicle')} · <span dir="ltr">Rs. {due.amountDue.toLocaleString()}</span> {t('customer.due')}</p>
                  </div>
                  <div className="text-end">
                    <strong dir="ltr">Rs. {due.outstandingAmount.toLocaleString()}</strong>
                    <StatusBadge status={due.status === 'paid' ? 'received' : 'due'} label={due.status === 'paid' ? t('customer.received') : t('customer.due')} />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel" id="receive-payment">
            <div className="panel-header">
              <h3>{t('customer.receivePayment')}</h3>
              <p className="muted-text">{t('customer.paymentAllocationNote')}</p>
            </div>
            <form className="form-grid" onSubmit={(event) => { event.preventDefault(); setPaymentConfirmation(true); }}>
              <label className="field">
                <span>{t('customer.paymentAmount')}</span>
                <input required type="number" min="0.01" step="any" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} />
              </label>
              <fieldset className="grid gap-2 border-0 p-0">
                <legend className="mb-2 text-sm font-bold">{t('customer.paymentMethod')}</legend>
                <div className="flex flex-wrap gap-2">
                  {['cash', 'easypaisa', 'jazzcash'].map((method) => (
                    <button key={method} type="button" className={paymentForm.method === method ? 'workspace-tab is-active' : 'workspace-tab'} onClick={() => setPaymentForm({ ...paymentForm, method })}>
                      {t(`daily.${method}`)}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="field">
                <span>{t('customer.referenceNumber')}</span>
                <input value={paymentForm.referenceNumber} onChange={(event) => setPaymentForm({ ...paymentForm, referenceNumber: event.target.value })} />
              </label>
              <label className="field">
                <span>{t('customer.notes')} {t('daily.optional')}</span>
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
                {t('customer.manualAllocation')}
              </label>
              <div className="grid gap-2 rounded-xl bg-background p-4">
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
                {dues.every((due) => due.outstandingAmount <= 0) && <p className="muted-text">{t('customer.noOutstanding')}</p>}
                {paymentPreview?.customerId === customer._id && paymentPreview.amount === Number(paymentForm.amount) && (
                  <p className="muted-text">
                    {paymentForm.manual ? t('customer.manualAllocationPreview') : t('customer.oldestAllocationPreview')}
                    {paymentPreview.unallocatedAmount > 0 && ` ${t('customer.willRemainUnallocated', { amount: paymentPreview.unallocatedAmount.toLocaleString() })}`}
                  </p>
                )}
              </div>
              <button className="primary-button" type="submit" disabled={isLoading}>{t('customer.reviewPayment')}</button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-header"><h3>{t('customer.paymentHistory')}</h3></div>
            {payments.length === 0 ? <p className="muted-text">{t('customer.noPayments')}</p> : (
              <div className="list-stack">
                {payments.map((payment) => (
                  <button type="button" key={payment._id} className="list-item text-start" onClick={() => openPaymentDetail(payment._id)}>
                    <div>
                      <strong dir="ltr">Rs. {payment.amount.toLocaleString()} · {t(`daily.${payment.method}`)}</strong>
                      <p><span dir="ltr">{new Date(payment.paymentDate).toLocaleDateString()}</span> · {t('customer.receivedBy', { name: payment.receivedBy?.fullName || t('customer.teamMember') })} · {t('customer.dueCount', { count: payment.allocations?.length || 0 })}</p>
                    </div>
                    <StatusBadge status={payment.status === 'active' ? 'active' : 'reversed'} label={t(`customer.paymentStatus.${payment.status}`)} />
                  </button>
                ))}
              </div>
            )}
          </section>

          {paymentDetail && (
            <section className="panel grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">{t('customer.paymentDetail')}</p>
                  <h3 className="m-0 text-xl" dir="ltr">Rs. {paymentDetail.payment.amount.toLocaleString()} · {t(`daily.${paymentDetail.payment.method}`)}</h3>
                  <p className="muted-text"><span dir="ltr">{new Date(paymentDetail.payment.paymentDate).toLocaleString()}</span> · {t(`customer.paymentStatus.${paymentDetail.payment.status}`)}</p>
                </div>
                <button className="secondary-button" type="button" onClick={() => setPaymentDetail(null)}>{t('customer.close')}</button>
              </div>
              <div className="grid gap-2">
                <strong>{t('customer.allocationHistory')}</strong>
                {paymentDetail.payment.allocations.map((allocation) => (
                  <p className="muted-text" key={allocation._id}>
                    {allocation.monthlyDueId
                      ? `${new Date(allocation.monthlyDueId.billingPeriodStart).toLocaleDateString()} – ${new Date(allocation.monthlyDueId.billingPeriodEnd).toLocaleDateString()}`
                      : t('customer.dueRecord')} · <span dir="ltr">Rs. {allocation.allocatedAmount.toLocaleString()}</span>
                  </p>
                ))}
                {paymentDetail.corrections?.map((correction) => (
                  <article key={correction._id} className="rounded-xl border border-warning bg-warning-bg p-4">
                    <p><strong>{t('customer.correction')} {t(`customer.correctionStatus.${correction.newValue?.approvalStatus}`)}</strong> · {t('customer.correctAmount')} <span dir="ltr">{correction.newValue?.correctedAmount}</span></p>
                    <p>{correction.reason}</p>
                    {parkingRole === 'owner' && correction.newValue?.approvalStatus === 'pending' && (
                      <div className="action-row">
                        <button className="primary-button" type="button" disabled={isLoading} onClick={() => decideCorrection(correction._id, true)}>{t('customer.approveReplace')}</button>
                        <button className="secondary-button" type="button" disabled={isLoading} onClick={() => decideCorrection(correction._id, false)}>{t('customer.reject')}</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
              {paymentDetail.payment.status === 'active' && (
                <form className="form-grid border-t border-border pt-4" onSubmit={requestCorrection}>
                  <h4 className="m-0">{t('customer.requestCorrection')}</h4>
                  <label className="field">
                    <span>{t('customer.correctAmount')}</span>
                    <input required type="number" min="0.01" step="any" value={correctionForm.correctedAmount} onChange={(event) => setCorrectionForm({ ...correctionForm, correctedAmount: event.target.value })} />
                  </label>
                  <label className="field">
                    <span>{t('customer.reason')}</span>
                    <textarea required rows="2" value={correctionForm.reason} onChange={(event) => setCorrectionForm({ ...correctionForm, reason: event.target.value })} />
                  </label>
                  <button className="secondary-button" type="submit" disabled={isLoading}>{t('customer.sendCorrection')}</button>
                </form>
              )}
            </section>
          )}
        </>
      )}

      {screen === 'vehicle-search' && (
        <>
          <div className="workspace-heading">
            <div><p className="eyebrow">{t('customer.findCustomer')}</p><h2>{t('customer.searchVehiclesTitle')}</h2></div>
          </div>
          <form className="search-form" onSubmit={searchVehicles}>
            <label className="field">
              <span>{t('customer.registrationNumber')}</span>
              <input value={vehicleSearch} onChange={(event) => setVehicleSearch(event.target.value)} placeholder={t('customer.vehicleSearchPlaceholder')} />
            </label>
            <button className="primary-button" type="submit" disabled={isLoading}>{t('customer.searchVehicles')}</button>
          </form>
          <div className="vehicle-list">
            {vehicleResults.map((vehicle) => (
              <Link key={vehicle._id} className="vehicle-search-result" to={`/app/vehicles/${vehicle._id}`}>
                <strong>{vehicle.registrationNumber}</strong>
                <span>{vehicle.customer?.fullName || t('reports.customer')}</span>
                <span className="customer-phone">{vehicle.customer?.primaryPhone || ''}</span>
                <StatusBadge status={vehicle.status === 'active' ? 'active' : 'inactive'} label={t(`app.${vehicle.status}`)} />
              </Link>
            ))}
          </div>
        </>
      )}

      {paymentConfirmation && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="presentation">
          <section className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-md" role="dialog" aria-modal="true" aria-labelledby="payment-confirmation-title">
            <p className="eyebrow">{t('customer.confirmAction')}</p>
            <h2 id="payment-confirmation-title" className="mt-0 text-2xl font-bold" dir="ltr">{t('customer.recordAmount', { amount: Number(paymentForm.amount || 0).toLocaleString() })}</h2>
            <p>{t('customer.methodLabel', { method: t(`daily.${paymentForm.method}`) })}</p>
            <p>{paymentForm.manual
              ? t('customer.manualDueCount', { count: paymentForm.manualDueOrder.length })
              : t('customer.oldestAllocationConfirm')}</p>
            {paymentPreview?.customerId === customer?._id && paymentPreview.amount === Number(paymentForm.amount) && (
              <>
                <p dir="ltr">{t('customer.preview', {
                  allocated: (Number(paymentForm.amount) - paymentPreview.unallocatedAmount).toLocaleString(),
                  count: paymentPreview.allocations.length,
                  unallocated: paymentPreview.unallocatedAmount.toLocaleString(),
                })}</p>
                <ul className="list-disc ps-5 text-sm">
                  {paymentPreview.allocations.map((allocation) => {
                    const due = dues.find((item) => item._id === String(allocation.monthlyDueId));
                    return (
                      <li key={String(allocation.monthlyDueId)}>
                        {due
                          ? `${new Date(due.billingPeriodStart).toLocaleDateString()} – ${new Date(due.billingPeriodEnd).toLocaleDateString()}`
                          : t('customer.due')}: Rs. {allocation.allocatedAmount.toLocaleString()}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <div className="action-row mt-5">
              <button className="primary-button" type="button" disabled={isLoading} onClick={receivePayment}>{isLoading ? t('customer.recording') : t('customer.confirmRecordPayment')}</button>
              <button className="secondary-button" type="button" disabled={isLoading} onClick={() => setPaymentConfirmation(false)}>{t('customer.goBack')}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default CustomersWorkspace;
