import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import StatusBadge from './StatusBadge';
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
  const { t } = useTranslation();
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
        if (active) setErrorMessage(error.message || t('errors.couldNotLoad'));
      });
    return () => { active = false; };
  }, [dateFilter, parkingId, t]);

  const submitEntry = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setStatusMessage('');
    setIsLoading(true);
    try {
      await apiCreateDailyParkingEntry(parkingId, entry);
      setEntry(emptyEntry);
      setStatusMessage(t('daily.entryRegistered'));
      await Promise.all([loadActive(), loadHistory()]);
      setScreen('active');
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotSave'));
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
      setErrorMessage(t('daily.invalidRate'));
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiUpdateDailyRate(parkingId, value);
      setRate(response.dailyParkingRate);
      setEditingRate(false);
      setStatusMessage(t('daily.rateUpdated'));
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotSave'));
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
      setStatusMessage(action === 'exit' ? t('daily.exitRecorded') : t('daily.paymentRecorded'));
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotSave'));
    }
  };

  const updateDateFilter = (field, value) => {
    setDateFilter((current) => ({ ...current, [field]: value }));
  };

  return (
    <section className="daily-workspace">
      <header className="workspace-heading">
        <div><p className="eyebrow">{t('daily.walkIn')}</p><h2>{t('daily.title')}</h2></div>
        <div className="daily-rate">
          <strong dir="ltr">{t('daily.rate', { amount: money(rate) })}</strong>
          {!editingRate && <button className="text-button" type="button" onClick={() => setEditingRate(true)}>{t('daily.editRate')}</button>}
        </div>
      </header>

      {editingRate && (
        <form className="form-grid panel daily-rate-form" onSubmit={saveRate}>
          <label className="field">
            <span>{t('daily.fixedRate')}</span>
            <input type="number" min="0" step="any" value={rateInput} onChange={(event) => setRateInput(event.target.value)} required />
          </label>
          <div className="action-row">
            <button type="submit" className="primary-button" disabled={isLoading}>{t('daily.saveRate')}</button>
            <button type="button" className="secondary-button" onClick={() => setEditingRate(false)}>{t('app.cancel')}</button>
          </div>
        </form>
      )}

      <nav className="workspace-tabs" aria-label={t('daily.title')}>
        {[
          ['entry', t('daily.registerEntry')],
          ['active', t('daily.activeVehicles', { count: activeRecords.length })],
          ['history', t('daily.history')],
        ].map(([value, label]) => (
          <button key={value} type="button" className={screen === value ? 'workspace-tab is-active' : 'workspace-tab'} onClick={() => setScreen(value)}>{label}</button>
        ))}
      </nav>

      {errorMessage && <p className="error-text" role="alert">{errorMessage}</p>}
      {statusMessage && <p className="success-text" role="status">{statusMessage}</p>}
      {screen === 'entry' && (
        <form className="panel form-grid daily-entry-form" onSubmit={submitEntry}>
          <div className="panel-header"><h3>{t('daily.newEntry')}</h3><p className="muted-text">{t('daily.feeNotice', { amount: money(rate) })}</p></div>
          <label className="field daily-primary-field">
            <span>{t('daily.vehicleNumber')} *</span>
            <input autoFocus value={entry.vehicleNumber} onChange={(event) => setEntry({ ...entry, vehicleNumber: event.target.value })} placeholder={t('daily.vehicleNumberPlaceholder')} required />
          </label>
          <label className="field"><span>{t('daily.vehicleType')} {t('daily.optional')}</span><input value={entry.vehicleType} onChange={(event) => setEntry({ ...entry, vehicleType: event.target.value })} /></label>
          <label className="field"><span>{t('daily.customerName')} {t('daily.optional')}</span><input value={entry.customerName} onChange={(event) => setEntry({ ...entry, customerName: event.target.value })} /></label>
          <label className="field"><span>{t('daily.customerPhone')} {t('daily.optional')}</span><input value={entry.customerPhone} onChange={(event) => setEntry({ ...entry, customerPhone: event.target.value })} /></label>
          <label className="field"><span>{t('daily.notes')} {t('daily.optional')}</span><textarea rows="2" value={entry.notes} onChange={(event) => setEntry({ ...entry, notes: event.target.value })} /></label>
          <button type="submit" className="primary-button" disabled={isLoading}>{t('daily.register')}</button>
        </form>
      )}

      {screen === 'active' && (
        <section className="panel">
          <div className="panel-header"><h3>{t('daily.parked')}</h3></div>
          {activeRecords.length === 0 ? <div className="empty-state"><p>{t('daily.noParked')}</p></div> : (
            <div className="list-stack">
              {activeRecords.map((record) => (
                <article className="list-item daily-record" key={record._id}>
                  <div>
                    <strong>{record.vehicleNumber}</strong>
                    <p>{record.vehicleType || t('daily.vehicleType')} · <span dir="ltr">{dateTime(record.entryDateTime)}</span> · {elapsed(record.entryDateTime)}</p>
                    <p>{record.customerName || t('daily.walkInCustomer')} · <span dir="ltr">{money(record.fee)}</span></p>
                  </div>
                  <div className="action-row">
                    <StatusBadge status={record.paymentStatus === 'paid' ? 'received' : 'due'} label={record.paymentStatus === 'paid' ? t('daily.received') : t('daily.due')} />
                    <button className="secondary-button" type="button" onClick={() => updateRecord(record._id, 'exit')}>{t('daily.recordExit')}</button>
                    {record.paymentStatus === 'unpaid' && (
                      <select aria-label={`${t('daily.payment')} · ${record.vehicleNumber}`} defaultValue="" onChange={(event) => event.target.value && updateRecord(record._id, event.target.value)}>
                        <option value="" disabled>{t('daily.markPaid')}</option>
                        <option value="cash">{t('daily.cash')}</option><option value="easypaisa">{t('daily.easypaisa')}</option><option value="jazzcash">{t('daily.jazzcash')}</option>
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
          <div className="panel-header"><h3>{t('daily.historyTitle')}</h3></div>
          <div className="filter-row daily-filters">
            <label className="field"><span>{t('daily.from')}</span><input type="date" value={dateFilter.startDate} onChange={(event) => updateDateFilter('startDate', event.target.value)} /></label>
            <label className="field"><span>{t('daily.to')}</span><input type="date" value={dateFilter.endDate} onChange={(event) => updateDateFilter('endDate', event.target.value)} /></label>
            <label className="field"><span>{t('daily.payment')}</span><select value={dateFilter.paymentStatus} onChange={(event) => updateDateFilter('paymentStatus', event.target.value)}><option value="">{t('daily.all')}</option><option value="unpaid">{t('daily.unpaid')}</option><option value="paid">{t('daily.paid')}</option></select></label>
          </div>
          {history.length === 0 ? <div className="empty-state"><p>{t('daily.noHistory')}</p></div> : (
            <div className="list-stack">
              {history.map((record) => (
                <article className="list-item daily-record" key={record._id}>
                  <div><strong>{record.vehicleNumber}</strong><p>{record.customerName || t('daily.walkInCustomer')} · {record.vehicleType || t('daily.vehicleType')}</p><p dir="ltr">{dateTime(record.entryDateTime)}{record.exitDateTime ? ` – ${dateTime(record.exitDateTime)}` : ` · ${t('daily.stillParked')}`}</p></div>
                  <div><strong className="money-figure" dir="ltr">{money(record.fee)}</strong><p>{record.paymentStatus === 'paid' ? `${t('daily.received')} · ${t(`daily.${record.paymentMethod}`)}` : t('daily.due')}</p><StatusBadge status={record.paymentStatus === 'paid' ? 'received' : 'due'} label={record.paymentStatus === 'paid' ? t('daily.received') : t('daily.due')} /></div>
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
