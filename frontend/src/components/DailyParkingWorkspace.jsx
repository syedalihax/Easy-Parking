import { useCallback, useEffect, useState } from 'react';
import {
  apiCreateDailyParkingEntry,
  apiGetActiveDailyParking,
  apiGetDailyParkingHistory,
  apiGetDailyRate,
  apiRecordDailyParkingExit,
  apiRecordDailyParkingPayment,
  apiUpdateDailyRate,
} from '../api';

const emptyEntry = {
  vehicleNumber: '',
  vehicleType: '',
  customerName: '',
  customerPhone: '',
  notes: '',
};

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
const dateTime = (value) => new Date(value).toLocaleString();
const elapsed = (value) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
};

function DailyParkingWorkspace({ parkingId }) {
  const [entry, setEntry] = useState(emptyEntry);
  const [rate, setRate] = useState(0);
  const [rateInput, setRateInput] = useState('');
  const [editingRate, setEditingRate] = useState(false);
  const [activeRecords, setActiveRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '', paymentStatus: '' });
  const [screen, setScreen] = useState('entry');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const loadActive = useCallback(async () => {
    const response = await apiGetActiveDailyParking(parkingId);
    setActiveRecords(response.records);
  }, [parkingId]);

  const loadHistory = useCallback(async () => {
    const response = await apiGetDailyParkingHistory(parkingId, dateFilter);
    setHistory(response.records);
  }, [dateFilter, parkingId]);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiGetDailyRate(parkingId),
      apiGetActiveDailyParking(parkingId),
      apiGetDailyParkingHistory(parkingId, dateFilter),
    ])
      .then(([rateResponse, activeResponse, historyResponse]) => {
        if (!active) return;
        setRate(rateResponse.dailyParkingRate);
        setRateInput(String(rateResponse.dailyParkingRate));
        setActiveRecords(activeResponse.records);
        setHistory(historyResponse.records);
      })
      .catch((error) => {
        if (active) setErrorMessage(error.message || 'Could not load daily parking data');
      });
    return () => { active = false; };
  }, [dateFilter, parkingId]);

  const submitEntry = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setStatusMessage('');
    setIsLoading(true);
    try {
      await apiCreateDailyParkingEntry(parkingId, entry);
      setEntry(emptyEntry);
      setStatusMessage('Vehicle entry registered');
      await Promise.all([loadActive(), loadHistory()]);
      setScreen('active');
    } catch (error) {
      setErrorMessage(error.message || 'Could not register vehicle entry');
    } finally {
      setIsLoading(false);
    }
  };

  const saveRate = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setStatusMessage('');
    const value = Number(rateInput);
    if (!Number.isFinite(value) || value < 0) {
      setErrorMessage('Enter a non-negative daily rate');
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiUpdateDailyRate(parkingId, value);
      setRate(response.dailyParkingRate);
      setEditingRate(false);
      setStatusMessage('Daily rate updated. Existing entries keep their recorded fee.');
    } catch (error) {
      setErrorMessage(error.message || 'Could not update daily rate');
    } finally {
      setIsLoading(false);
    }
  };

  const updateRecord = async (recordId, action) => {
    setErrorMessage('');
    setStatusMessage('');
    try {
      if (action === 'exit') await apiRecordDailyParkingExit(parkingId, recordId);
      else await apiRecordDailyParkingPayment(parkingId, recordId, action);
      await Promise.all([loadActive(), loadHistory()]);
      setStatusMessage(action === 'exit' ? 'Vehicle exit recorded' : 'Payment recorded');
    } catch (error) {
      setErrorMessage(error.message || 'Could not update daily parking record');
    }
  };

  const updateDateFilter = (field, value) => {
    setDateFilter((current) => ({ ...current, [field]: value }));
  };

  return (
    <section className="daily-workspace">
      <header className="workspace-heading">
        <div><p className="eyebrow">Walk-in parking</p><h2>Daily parking</h2></div>
        <div className="daily-rate">
          <strong>Daily rate: {money(rate)}</strong>
          {!editingRate && <button className="text-button" type="button" onClick={() => setEditingRate(true)}>Edit rate</button>}
        </div>
      </header>

      {editingRate && (
        <form className="form-grid panel daily-rate-form" onSubmit={saveRate}>
          <label className="field">
            <span>Fixed daily rate (Rs.)</span>
            <input type="number" min="0" step="any" value={rateInput} onChange={(event) => setRateInput(event.target.value)} required />
          </label>
          <div className="action-row">
            <button type="submit" className="primary-button" disabled={isLoading}>Save rate</button>
            <button type="button" className="secondary-button" onClick={() => setEditingRate(false)}>Cancel</button>
          </div>
        </form>
      )}

      <nav className="workspace-tabs" aria-label="Daily parking sections">
        {[
          ['entry', 'Register entry'],
          ['active', `Currently parked (${activeRecords.length})`],
          ['history', 'History'],
        ].map(([value, label]) => (
          <button key={value} type="button" className={screen === value ? 'workspace-tab is-active' : 'workspace-tab'} onClick={() => setScreen(value)}>{label}</button>
        ))}
      </nav>

      {errorMessage && <p className="error-text" role="alert">{errorMessage}</p>}
      {statusMessage && <p className="success-text" role="status">{statusMessage}</p>}
      {screen === 'entry' && (
        <form className="panel form-grid daily-entry-form" onSubmit={submitEntry}>
          <div className="panel-header"><h3>New vehicle entry</h3><p className="muted-text">This entry will be charged {money(rate)}.</p></div>
          <label className="field daily-primary-field">
            <span>Vehicle number *</span>
            <input autoFocus value={entry.vehicleNumber} onChange={(event) => setEntry({ ...entry, vehicleNumber: event.target.value })} placeholder="ABC 123" required />
          </label>
          <label className="field"><span>Vehicle type (optional)</span><input value={entry.vehicleType} onChange={(event) => setEntry({ ...entry, vehicleType: event.target.value })} /></label>
          <label className="field"><span>Customer name (optional)</span><input value={entry.customerName} onChange={(event) => setEntry({ ...entry, customerName: event.target.value })} /></label>
          <label className="field"><span>Customer phone (optional)</span><input value={entry.customerPhone} onChange={(event) => setEntry({ ...entry, customerPhone: event.target.value })} /></label>
          <label className="field"><span>Notes (optional)</span><textarea rows="2" value={entry.notes} onChange={(event) => setEntry({ ...entry, notes: event.target.value })} /></label>
          <button type="submit" className="primary-button" disabled={isLoading}>Register entry</button>
        </form>
      )}

      {screen === 'active' && (
        <section className="panel">
          <div className="panel-header"><h3>Currently parked</h3></div>
          {activeRecords.length === 0 ? <div className="empty-state"><p>No vehicles are currently parked.</p></div> : (
            <div className="list-stack">
              {activeRecords.map((record) => (
                <article className="list-item daily-record" key={record._id}>
                  <div>
                    <strong>{record.vehicleNumber}</strong>
                    <p>{record.vehicleType || 'Vehicle'} · Entered {dateTime(record.entryDateTime)} · {elapsed(record.entryDateTime)}</p>
                    <p>{record.customerName || 'Walk-in'} · {money(record.fee)} · {record.paymentStatus}</p>
                  </div>
                  <div className="action-row">
                    <button className="secondary-button" type="button" onClick={() => updateRecord(record._id, 'exit')}>Record exit</button>
                    {record.paymentStatus === 'unpaid' && (
                      <select aria-label={`Payment method for ${record.vehicleNumber}`} defaultValue="" onChange={(event) => event.target.value && updateRecord(record._id, event.target.value)}>
                        <option value="" disabled>Mark paid...</option>
                        <option value="cash">Cash</option><option value="easypaisa">Easypaisa</option><option value="jazzcash">JazzCash</option>
                      </select>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {screen === 'history' && (
        <section className="panel">
          <div className="panel-header"><h3>Daily parking history</h3></div>
          <div className="filter-row daily-filters">
            <label className="field"><span>From</span><input type="date" value={dateFilter.startDate} onChange={(event) => updateDateFilter('startDate', event.target.value)} /></label>
            <label className="field"><span>To</span><input type="date" value={dateFilter.endDate} onChange={(event) => updateDateFilter('endDate', event.target.value)} /></label>
            <label className="field"><span>Payment</span><select value={dateFilter.paymentStatus} onChange={(event) => updateDateFilter('paymentStatus', event.target.value)}><option value="">All</option><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></label>
          </div>
          {history.length === 0 ? <div className="empty-state"><p>No daily parking records found.</p></div> : (
            <div className="list-stack">
              {history.map((record) => (
                <article className="list-item daily-record" key={record._id}>
                  <div><strong>{record.vehicleNumber}</strong><p>{record.customerName || 'Walk-in'} · {record.vehicleType || 'Vehicle'}</p><p>{dateTime(record.entryDateTime)}{record.exitDateTime ? ` – ${dateTime(record.exitDateTime)}` : ' · Still parked'}</p></div>
                  <div><strong className="money-figure">{money(record.fee)}</strong><p>{record.paymentStatus === 'paid' ? `Received · ${record.paymentMethod}` : 'Due'}</p></div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}

export default DailyParkingWorkspace;
