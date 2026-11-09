import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import StatusBadge from './StatusBadge';
import { useToast } from './ToastProvider';
import {
  apiCreateDailyParkingEntry,
  apiGetActiveDailyParking,
  apiGetDailyParkingHistory,
  apiGetDailyRate,
  apiRecordDailyParkingExit,
  apiRecordDailyParkingPayment,
  apiUpdateRateCard,
} from '../api';
import { formatDateTime } from '../lib/format';

const emptyEntry = {
  vehicleNumber: '',
  vehicleType: '',
  customerName: '',
  customerPhone: '',
  fee: '',
  notes: '',
};

const pad = (value) => String(value).padStart(2, '0');
const localDateValue = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const todayValue = () => localDateValue(new Date());

const isoFromDate = (dateValue) => {
  if (!dateValue) return '';
  const [year, month, day] = dateValue.split('-').map(Number);
  const now = new Date();
  return new Date(
    year,
    month - 1,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  ).toISOString();
};

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
const dateTime = (value) => formatDateTime(value);
const elapsed = (value) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
};

function DailyParkingWorkspace({ parkingId }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [entry, setEntry] = useState(emptyEntry);
  const [entryDate, setEntryDate] = useState(todayValue());
  const [exitDate, setExitDate] = useState('');
  const [entryTypeError, setEntryTypeError] = useState('');
  const [rate, setRate] = useState(0);
  const [rateInput, setRateInput] = useState('0');
  const [rateCard, setRateCard] = useState([]);
  const [cardRows, setCardRows] = useState([]);
  const [editingRate, setEditingRate] = useState(false);
  const [activeRecords, setActiveRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '', paymentStatus: '' });
  const [screen, setScreen] = useState('entry');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const feeForType = (type) => {
    const key = String(type || '').trim().toLowerCase();
    const match = rateCard.find((row) => String(row.vehicleType).trim().toLowerCase() === key);
    return match ? Number(match.rate || 0) : Number(rate || 0);
  };

  const loadActive = useCallback(async () => {
    const response = await apiGetActiveDailyParking(parkingId);
    setActiveRecords(response.records);
  }, [parkingId]);

  const loadHistory = useCallback(async () => {
    const response = await apiGetDailyParkingHistory(parkingId, dateFilter);
    setHistory(response.records);
  }, [dateFilter, parkingId]);

  useEffect(() => {
    if (statusMessage) {
      showToast({ type: 'success', message: statusMessage });
    }
  }, [showToast, statusMessage]);

  useEffect(() => {
    if (errorMessage) {
      showToast({ type: 'error', message: errorMessage });
    }
  }, [errorMessage, showToast]);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiGetDailyRate(parkingId),
      apiGetActiveDailyParking(parkingId),
      apiGetDailyParkingHistory(parkingId, dateFilter),
    ])
      .then(([rateResponse, activeResponse, historyResponse]) => {
        if (!active) return;
        setRate(rateResponse.dailyParkingRate ?? 0);
        setRateInput(String(rateResponse.dailyParkingRate ?? 0));
        setRateCard(rateResponse.rates || []);
        setActiveRecords(activeResponse.records);
        setHistory(historyResponse.records);
      })
      .catch((error) => {
        if (active) setErrorMessage(error.message || t('errors.couldNotLoad'));
      });
    return () => { active = false; };
  }, [dateFilter, parkingId, t]);

  const openRateEditor = () => {
    setCardRows(rateCard.length ? rateCard.map((row) => ({ vehicleType: row.vehicleType, rate: String(row.rate) })) : []);
    setRateInput(String(rate));
    setEditingRate(true);
  };

  const updateCardRow = (index, field, value) => {
    setCardRows((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addCardRow = () => setCardRows((rows) => [...rows, { vehicleType: '', rate: '' }]);
  const removeCardRow = (index) => setCardRows((rows) => rows.filter((_, i) => i !== index));

  const cardRowError = (row) => {
    if (!String(row.vehicleType || '').trim()) return 'Vehicle type is required';
    if (String(row.rate ?? '').trim() === '') return 'Rate is required';
    const value = Number(row.rate);
    if (!Number.isFinite(value) || value < 0) return 'Rate must be a valid non-negative amount';
    return '';
  };
  const cardIsIncomplete = cardRows.length === 0 || cardRows.some((row) => cardRowError(row));

  const saveRate = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setStatusMessage('');
    const fallback = Number(rateInput);
    if (!Number.isFinite(fallback) || fallback < 0) {
      setErrorMessage(t('daily.invalidRate'));
      return;
    }
    if (cardIsIncomplete) return;
    const rows = cardRows.map((row) => ({
      vehicleType: String(row.vehicleType).trim(),
      rate: Number(row.rate),
    }));
    setIsLoading(true);
    try {
      const response = await apiUpdateRateCard(parkingId, { dailyParkingRate: fallback, rates: rows });
      setRate(response.dailyParkingRate ?? 0);
      setRateCard(response.rates || []);
      setEditingRate(false);
      setStatusMessage(t('daily.rateUpdated'));
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotSave'));
    } finally {
      setIsLoading(false);
    }
  };

  const submitEntry = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setStatusMessage('');
    setEntryTypeError('');
    const vehicleType = String(entry.vehicleType || '').trim();
    if (!vehicleType) {
      setEntryTypeError(t('daily.typeRequired'));
      return;
    }

    const feeValue = Number(entry.fee);
    if (!Number.isFinite(feeValue) || feeValue < 0) {
      setErrorMessage(t('daily.invalidRate'));
      return;
    }

    const entryDateTime = isoFromDate(entryDate || todayValue());
    let exitDateTime = '';
    if (exitDate && exitDate >= (entryDate || todayValue())) {
      exitDateTime = isoFromDate(exitDate);
      if (new Date(exitDateTime) < new Date(entryDateTime)) exitDateTime = entryDateTime;
    }

    setIsLoading(true);
    try {
      await apiCreateDailyParkingEntry(parkingId, {
        ...entry,
        vehicleType,
        fee: feeValue,
        entryDateTime,
        ...(exitDateTime ? { exitDateTime } : {}),
      });
      setEntry(emptyEntry);
      setEntryDate(todayValue());
      setExitDate('');
      setStatusMessage(t('daily.entryRegistered'));
      await Promise.all([loadActive(), loadHistory()]);
      setScreen('active');
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

  const today = todayValue();
  const showExitDate = Boolean(entryDate) && entryDate < today;

  return (
    <section className="daily-workspace">
      <header className="workspace-heading">
        <div><p className="eyebrow">{t('daily.walkIn')}</p><h2>{t('daily.title')}</h2></div>
        <div className="daily-rate">
          <strong dir="ltr">{t('daily.rate', { amount: money(rate) })}</strong>
          {!editingRate && <button className="text-button" type="button" onClick={openRateEditor}>{t('daily.editRate')}</button>}
        </div>
      </header>

      {!editingRate && rateCard.length > 0 && (
        <div className="rate-card-chips">
          {rateCard.map((row) => (
            <span className="rate-chip" key={row.vehicleType}>
              {row.vehicleType}
              <strong dir="ltr">{money(row.rate)}</strong>
            </span>
          ))}
        </div>
      )}

      {editingRate && (
        <form className="panel daily-rate-form" onSubmit={saveRate}>
          <div className="panel-header">
            <h3>{t('daily.rateCard')}</h3>
            <p className="muted-text">Configure vehicle type pricing</p>
          </div>

          <div className="rate-card-rows">
            {cardRows.map((row, index) => {
              const rowError = cardRowError(row);
              return (
                <div className="rate-card-row-group" key={`row-${index}`}>
                  <div className="rate-card-row">
                    <input
                      value={row.vehicleType}
                      onChange={(event) => updateCardRow(index, 'vehicleType', event.target.value)}
                      placeholder={t('daily.vehicleType')}
                      aria-label={t('daily.vehicleType')}
                      aria-invalid={Boolean(rowError)}
                      required
                    />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      dir="ltr"
                      value={row.rate}
                      onChange={(event) => updateCardRow(index, 'rate', event.target.value)}
                      placeholder="0"
                      aria-label={`${t('daily.rate')} · ${row.vehicleType || index + 1}`}
                      aria-invalid={Boolean(rowError)}
                      required
                    />
                    <button type="button" className="secondary-button rate-card-remove" onClick={() => removeCardRow(index)} aria-label={`Remove ${row.vehicleType || index + 1}`}>×</button>
                  </div>
                  {rowError && <p className="error-text" role="alert">{rowError}</p>}
                </div>
              );
            })}
          </div>

          <div className="action-row">
            <button type="button" className="secondary-button" onClick={addCardRow}>Add type</button>
          </div>

          <label className="field">
            <span>Default daily rate</span>
            <input type="number" min="0" step="any" value={rateInput} onChange={(event) => setRateInput(event.target.value)} required />
          </label>

          <div className="action-row">
            <button type="submit" className="primary-button" disabled={isLoading || cardIsIncomplete}>Save rate card</button>
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

      {screen === 'entry' && (
        <form className="panel form-grid daily-entry-form" onSubmit={submitEntry}>
          <div className="panel-header">
            <h3>{t('daily.newEntry')}</h3>
            <p className="muted-text">Entry fee is captured per vehicle and can be overridden.</p>
          </div>

          <label className="field daily-primary-field">
            <span>{t('daily.vehicleNumber')} *</span>
            <input autoFocus value={entry.vehicleNumber} onChange={(event) => setEntry({ ...entry, vehicleNumber: event.target.value })} placeholder={t('daily.vehicleNumberPlaceholder')} required />
          </label>

          <label className="field daily-date-field">
            <span>{t('daily.entryDate')} *</span>
            <input
              type="date"
              dir="ltr"
              value={entryDate}
              max={today}
              required
              onChange={(event) => {
                const value = event.target.value;
                setEntryDate(value);
                if (exitDate && exitDate < value) setExitDate('');
              }}
            />
          </label>

          {showExitDate && (
            <label className="field daily-date-field">
              <span>{t('daily.exitDate')} {t('daily.optional')}</span>
              <input
                type="date"
                dir="ltr"
                value={exitDate}
                min={entryDate}
                max={today}
                onChange={(event) => setExitDate(event.target.value)}
              />
            </label>
          )}

          <label className="field">
            <span>{t('daily.vehicleType')} *</span>
            {rateCard.length > 0 ? (
              <select
                value={entry.vehicleType}
                onChange={(event) => {
                  const nextType = event.target.value;
                  setEntry({ ...entry, vehicleType: nextType, fee: entry.fee || String(feeForType(nextType)) });
                  setEntryTypeError('');
                }}
                aria-required="true"
                aria-invalid={Boolean(entryTypeError)}
              >
                <option value="">{t('daily.vehicleType')}…</option>
                {rateCard.map((row) => (
                  <option key={row.vehicleType} value={row.vehicleType}>{row.vehicleType}</option>
                ))}
              </select>
            ) : (
              <input
                value={entry.vehicleType}
                onChange={(event) => {
                  const nextType = event.target.value;
                  setEntry({ ...entry, vehicleType: nextType, fee: entry.fee || String(feeForType(nextType)) });
                  setEntryTypeError('');
                }}
                placeholder={t('daily.vehicleType')}
                aria-required="true"
                aria-invalid={Boolean(entryTypeError)}
              />
            )}
            {entryTypeError && <span className="error-text" role="alert">{entryTypeError}</span>}
          </label>

          <label className="field">
            <span>Daily fee (Rs.) *</span>
            <input
              type="number"
              min="0"
              step="any"
              value={entry.fee}
              onChange={(event) => setEntry({ ...entry, fee: event.target.value })}
              required
            />
          </label>

          <label className="field"><span>{t('daily.customerName')} {t('daily.optional')}</span><input value={entry.customerName} onChange={(event) => setEntry({ ...entry, customerName: event.target.value })} /></label>
          <label className="field"><span>{t('daily.customerPhone')} {t('daily.optional')}</span><input value={entry.customerPhone} onChange={(event) => setEntry({ ...entry, customerPhone: event.target.value })} /></label>
          <label className="field daily-notes-field"><span>{t('daily.notes')} {t('daily.optional')}</span><textarea rows="2" value={entry.notes} onChange={(event) => setEntry({ ...entry, notes: event.target.value })} /></label>
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
                    <StatusBadge status={record.paymentStatus === 'paid' ? 'received' : 'due'} label={record.paymentStatus === 'paid' ? t('daily.received') : t('daily.unpaid')} />
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
                  <div className="daily-history-settlement">
                    <strong className="money-figure" dir="ltr">{money(record.fee)}</strong>
                    <p>{record.paymentStatus === 'paid' ? `${t('daily.received')}${record.paymentMethod ? ` · ${t(`daily.${record.paymentMethod}`)}` : ''}` : t('daily.unpaid')}</p>
                    {record.paymentStatus === 'unpaid' && record.fee > 0 && (
                      <select aria-label={`${t('daily.payment')} · ${record.vehicleNumber}`} defaultValue="" onChange={(event) => event.target.value && updateRecord(record._id, event.target.value)}>
                        <option value="" disabled>{t('daily.markPaid')}</option>
                        <option value="cash">{t('daily.cash')}</option>
                        <option value="easypaisa">{t('daily.easypaisa')}</option>
                        <option value="jazzcash">{t('daily.jazzcash')}</option>
                      </select>
                    )}
                  </div>
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
