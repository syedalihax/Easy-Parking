import { useCallback, useEffect, useState } from 'react';
import {
  apiCreateCustomer,
  apiCreateVehicle,
  apiDeactivateCustomer,
  apiDeactivateVehicle,
  apiGetCustomer,
  apiGetCustomers,
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
};

function CustomersWorkspace({ parkingId, initialScreen = 'customers' }) {
  const [screen, setScreen] = useState(initialScreen);
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState('active');
  const [customerSearch, setCustomerSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleResults, setVehicleResults] = useState([]);
  const [customer, setCustomer] = useState(null);
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
      setScreen('profile');
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
        setScreen('profile');
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
        await apiCreateVehicle(parkingId, customer._id, vehicleForm);
        setStatusMessage('Vehicle added');
      }
      const response = await apiGetCustomer(parkingId, customer._id);
      setCustomer(response.customer);
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
        <input required type="date" value={vehicleForm.parkingStartDate} onChange={(event) => setVehicleForm({ ...vehicleForm, parkingStartDate: event.target.value })} />
      </label>
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
          <button type="button" className="text-button" onClick={() => { setCustomer(null); setScreen('customers'); }}>Back to customers</button>
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
                      <strong>{vehicle.registrationNumber}</strong>
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

          {/* Subscription and payment history sections are added in later phases. */}
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
              <button key={vehicle._id} className="vehicle-search-result" type="button" onClick={() => openCustomer(vehicle.customer?._id)}>
                <strong>{vehicle.registrationNumber}</strong>
                <span>{vehicle.customer?.fullName || 'Customer'}</span>
                <span className="customer-phone">{vehicle.customer?.primaryPhone || ''}</span>
                <span className={vehicle.status === 'active' ? 'status-label is-active' : 'status-label'}>{vehicle.status}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default CustomersWorkspace;
