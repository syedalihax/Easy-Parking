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
  apiUpdateDailyRate,
  apiUpdateRateCard,
} from '../api';
import { formatDateTime } from '../lib/format';

const emptyEntry = {
  vehicleNumber: '',
  vehicleType: '',
  customerName: '',
  customerPhone: '',
  notes: '',
};

const pad = (value) => String(value).padStart(2, '0');

// Local YYYY-MM-DD — never toISOString(), which would shift the day for
// managers east/west of UTC.
const localDateValue = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const todayValue = () => localDateValue(new Date());

// Pairs the picked calendar day with the current local clock time, so a
// backdated entry keeps a sensible time-of-day instead of jumping timezones.
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
  const [entryDate, setEntryDate] = useState(todayValue);
  const [exitDate, setExitDate] = useState('');
  const [entryTypeError, setEntryTypeError] = useState('');
  const [rate, setRate] = useState(0);
  const [rateInput, setRateInput] = useState('');
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
        setRate(rateResponse.dailyParkingRate);
        setRateInput(String(rateResponse.dailyParkingRate));
        setRateCard(rateResponse.rates || []);
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
    setEntryTypeError('');
    const vehicleType = String(entry.vehicleType || '').trim();
    if (!vehicleType) {
      setEntryTypeError(t('daily.typeRequired'));
      return;
    }
    const entryDateTime = isoFromDate(entryDate || todayValue());
    let exitDateTime = '';
    // The exit picker is only offered for backdated entries; ignore anything
    // that would place the exit before the entry.
    if (exitDate && exitDate >= (entryDate || todayValue())) {
      exitDateTime = isoFromDate(exitDate);
      if (new Date(exitDateTime) < new Date(entryDateTime)) exitDateTime = entryDateTime;
    }
    setIsLoading(true);
    try {
      await apiCreateDailyParkingEntry(parkingId, {
        ...entry,
        vehicleType,
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

  const openRateEditor = () => {
    setCardRows(rateCard.length
      ? rateCard.map((row) => ({ vehicleType: row.vehicleType, rate: String(row.rate) }))
      : [
        { vehicleType: 'Motorcycle', rate: '40' },
        { vehicleType: 'Rickshaw', rate: '50' },
        { vehicleType: 'Car', rate: '100' },
      ]);
    setRateInput(String(rate));
    setEditingRate(true);
  };

  const updateCardRow = (index, field, value) => {
    setCardRows((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addCardRow = () => setCardRows((rows) => [...rows, { vehicleType: '', rate: '' }]);
  const removeCardRow = (index) => setCardRows((rows) => rows.filter((_, i) => i !== index));

  // Every row is priced explicitly: no blank type, no blank/negative rate.
  const cardRowError = (row) => {
    if (!String(row.vehicleType || '').trim()) return t('daily.typeRequired');
    if (String(row.rate ?? '').trim() === '') return t('daily.rateRequired');
    const value = Number(row.rate);
    if (!Number.isFinite(value) || value < 0) return t('daily.rateRequired');
    return '';
  };
  const cardIsIncomplete = cardRows.length === 0 || cardRows.some((row) => cardRowError(row));

  // The entry is priced by its type; anything not on the card falls back to the default.
  const feeForType = (type) => {
    const key = String(type || '').trim().toLowerCase();
    const match = rateCard.find((row) => String(row.vehicleType).trim().toLowerCase() === key);
    return match ? match.rate : rate;
  };

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
      setRate(response.dailyParkingRate);
      setRateCard(response.rates || []);
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

  const today = todayValue();
  // A backdated entry can also be closed in the same step; today's entries stay open.
  const showExitDate = Boolean(entryDate) && entryDate < today;

  return (
    <section className="daily-workspace">
      <header className="workspace-heading">
        <div><p className="eyebrow">{t('daily.walkIn')}</p><h2>{t('daily.title')}</h2></div>
        <div className="daily-rate">
          <strong dir={rateCard.length ? undefined : 'ltr'}>
            {rateCard.length ? t('daily.rateCard') : t('daily.rate', { amount: money(rate) })}
          </strong>
          {!editingRate && <button className="text-button" type="button" onClick={openRateEditor}>{t('daily.editRate')}</button>}
        </div>
      </header>

      {!editingRate && rateCard.length > 0 && (
        <div className="rate-card-chips">
          {rateCard.map((row) => (
            <span className="rate-chip" key={row.vehicleType}>
              {row.vehicleType}
              <strong dir="ltr">{money(feeForType(row.vehicleType))}</strong>
            </span>
          ))}
        </div>
      )}

      {editingRate && (
        <form className="panel daily-rate-form" onSubmit={saveRate}>
          <div className="panel-header">
            <h3>{t('daily.rateCard')}</h3>
            <p className="muted-text">{t('daily.rateCardHelp')}</p>
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
                      aria-label={`${t('daily.rateLabel')} · ${row.vehicleType || index + 1}`}
                      aria-invalid={Boolean(rowError)}
                      required
                    />
                    <button type="button" className="secondary-button rate-card-remove" onClick={() => removeCardRow(index)} aria-label={`${t('daily.removeType')} ${row.vehicleType || index + 1}`}>×</button>
                  </div>
                  {rowError && <p className="error-text" role="alert">{`${row.vehicleType || `#${index + 1}`} — ${rowError}`}</p>}
                </div>
              );
            })}
          </div>

          {cardRows.length === 0 && <p className="error-text" role="alert">{t('daily.rateCardRequired')}</p>}

          <div className="action-row">
            <button type="button" className="secondary-button" onClick={addCardRow}>{t('daily.addType')}</button>
          </div>

          <label className="field">
            <span>{t('daily.defaultRate')}</span>
            <input type="number" min="0" step="any" value={rateInput} onChange={(event) => setRateInput(event.target.value)} required />
          </label>

          <div className="action-row">
            <button type="submit" className="primary-button" disabled={isLoading || cardIsIncomplete}>{t('daily.saveRate')}</button>
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
            {entry.vehicleType && <p className="muted-text">{t('daily.feeNotice', { amount: money(feeForType(entry.vehicleType)) })}</p>}
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
                aria-describedby="daily-exit-date-help"
                onChange={(event) => setExitDate(event.target.value)}
              />
              <small id="daily-exit-date-help" className="muted-text">{t('daily.exitDateHelp')}</small>
            </label>
          )}
          <label className="field">
            <span>{t('daily.vehicleType')} *</span>
            {rateCard.length > 0 ? (
              <select
                value={entry.vehicleType}
                onChange={(event) => {
                  setEntry({ ...entry, vehicleType: event.target.value });
                  setEntryTypeError('');
                }}
                aria-required="true"
                aria-invalid={Boolean(entryTypeError)}
                aria-describedby={entryTypeError ? 'daily-vehicle-type-error' : undefined}
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
                  setEntry({ ...entry, vehicleType: event.target.value });
                  setEntryTypeError('');
                }}
                placeholder={t('daily.vehicleType')}
                aria-required="true"
                aria-invalid={Boolean(entryTypeError)}
                aria-describedby={entryTypeError ? 'daily-vehicle-type-error' : undefined}
              />
            )}
            {entryTypeError && <span id="daily-vehicle-type-error" className="error-text" role="alert">{entryTypeError}</span>}
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
                    <p>{record.paymentStatus === 'paid'
                      ? `${t('daily.received')}${record.paymentMethod ? ` · ${t(`daily.${record.paymentMethod}`)}` : ''}`
                      : t('daily.unpaid')}</p>
                    {record.paymentStatus === 'unpaid' && record.fee > 0 && (
                      <select
                        aria-label={`${t('daily.payment')} · ${record.vehicleNumber}`}
                        defaultValue=""
                        onChange={(event) => event.target.value && updateRecord(record._id, event.target.value)}
                      >
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
