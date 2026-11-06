import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import GoogleIcon from './GoogleIcon';
import {
  apiDownloadReport,
  apiGetCustomers,
  apiGetDashboard,
  apiGetDashboardReminders,
  apiGetReport,
} from '../api';
import { formatDate, formatDateTime, formatMethod, shortId } from '../lib/format';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
const date = (value) => formatDate(value);

const reports = [
  { id: 'customers', labelKey: 'reports.customers', filters: ['status'] },
  { id: 'active-vehicles', labelKey: 'reports.activeVehicles' },
  { id: 'pending-dues', labelKey: 'reports.pendingDues' },
  { id: 'outstanding-balances', labelKey: 'reports.outstandingBalances' },
  { id: 'payment-history', labelKey: 'reports.paymentHistory', filters: ['startDate', 'endDate', 'method'] },
  { id: 'daily-parking-history', labelKey: 'reports.dailyHistory', filters: ['startDate', 'endDate'] },
  { id: 'customer-statement', labelKey: 'reports.customerStatement', filters: ['customerId'] },
];

const actionLinks = [
  { key: 'dashboard.addCustomer', to: '/app/customers', Icon: 'person_add' },
  { key: 'nav.receivePayment', to: '/app/payments', Icon: 'payments' },
  { key: 'dashboard.pendingPayments', to: '/app/dues', Icon: 'wallet' },
  { key: 'nav.dailyParking', to: '/app/daily-parking', Icon: 'local_parking' },
];

const moreLinks = [
  { to: '/app/vehicles', label: 'nav.vehicles', detail: 'more.vehiclesDetail', Icon: 'directions_car' },
  { to: '/app/dues', label: 'nav.dues', detail: 'more.duesDetail', Icon: 'description' },
  { to: '/app/reports', label: 'nav.reports', detail: 'more.reportsDetail', Icon: 'bar_chart' },
  { to: '/app/team', label: 'menu.parkingAccess', detail: 'more.accessDetail', Icon: 'groups' },
  { to: '/app/settings', label: 'menu.parkingSettings', detail: 'more.settingsDetail', Icon: 'settings' },
  { to: '/app/profile', label: 'menu.profile', detail: 'more.profileDetail', Icon: 'person' },
];

function MoreWorkspace() {
  const { t } = useTranslation();
  return (
    <div className="operations-workspace">
      <header className="workspace-heading">
        <div><p className="eyebrow">{t('more.eyebrow')}</p><h2>{t('nav.more')}</h2></div>
      </header>
      <p className="muted-text more-intro">{t('more.intro')}</p>
      <nav className="more-links" aria-label={t('nav.more')}>
        {moreLinks.map(({ to, label, detail, Icon }) => (
          <Link className="more-link" to={to} key={to}>
            <span className="more-link-icon"><GoogleIcon name={Icon} size={19} /></span>
            <span className="more-link-copy"><strong>{t(label)}</strong><small>{t(detail)}</small></span>
            <GoogleIcon name="north_east" className="more-link-arrow" size={17} />
          </Link>
        ))}
      </nav>
    </div>
  );
}

function DashboardWorkspace({ parkingId }) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [reminders, setReminders] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const summaryPromise = apiGetDashboard(parkingId);
    const remindersPromise = apiGetDashboardReminders(parkingId);
    const paymentHistoryPromise = apiGetReport(parkingId, 'payment-history', {
      startDate: monthStart.toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
    });

    Promise.allSettled([summaryPromise, remindersPromise, paymentHistoryPromise])
      .then(([summaryResult, remindersResult, paymentHistoryResult]) => {
        if (!active) return;

        if (summaryResult.status === 'fulfilled') {
          setSummary(summaryResult.value);
        } else {
          setSummary(null);
          setErrorMessage(summaryResult.reason.message || t('errors.couldNotLoad'));
        }

        if (remindersResult.status === 'fulfilled') {
          setReminders(remindersResult.value);
        } else {
          setReminders(null);
          setErrorMessage(remindersResult.reason.message || t('errors.couldNotLoad'));
        }

        if (paymentHistoryResult.status === 'fulfilled') {
          setPaymentHistory(Array.isArray(paymentHistoryResult.value) ? paymentHistoryResult.value.slice(0, 3) : []);
        } else {
          setPaymentHistory([]);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [parkingId, reloadKey, t]);

  const quickActions = [
    { labelKey: 'dashboard.addCustomer', to: '/app/customers', Icon: 'person_add', tone: 'green' },
    { labelKey: 'nav.receivePayment', to: '/app/payments', Icon: 'payments', tone: 'orange' },
    { labelKey: 'dashboard.pendingPayments', to: '/app/dues', Icon: 'wallet', tone: 'orange' },
    { labelKey: 'nav.dailyParking', to: '/app/daily-parking', Icon: 'local_parking', tone: 'blue' },
    { labelKey: 'nav.vehicles', to: '/app/vehicles', Icon: 'directions_car', tone: 'blue' },
    { labelKey: 'nav.reports', to: '/app/reports', Icon: 'bar_chart', tone: 'orange' },
    { labelKey: 'menu.parkingAccess', to: '/app/team', Icon: 'groups', tone: 'green' },
    { labelKey: 'menu.profile', to: '/app/profile', Icon: 'person', tone: 'green' },
    { labelKey: 'nav.more', to: '/app/more', Icon: 'more_horiz', tone: 'blue' },
  ];

  const summaryCards = summary ? [
    {
      label: t('dashboard.paymentsThisMonth'),
      value: money(summary.paymentsReceivedThisPeriod),
      tone: 'primary',
      icon: 'payments',
      detail: t('dashboard.paymentsThisMonthHelp'),
    },
    {
      label: t('dashboard.customersWithDues'),
      value: summary.customersWithPendingDues || 0,
      tone: 'neutral',
      icon: 'groups',
      detail: t('dashboard.peopleWithDuesHelp'),
    },
    {
      label: t('dashboard.outstanding'),
      value: money(summary.totalOutstandingAmount),
      tone: 'accent',
      icon: 'wallet',
      detail: summary.dailyOutstandingAmount > 0
        ? `${money(summary.dailyOutstandingAmount)} ${t('daily.walkIn')}`
        : t('dashboard.outstandingHelp'),
    },
  ] : [];

  return (
    <div className="operations-workspace">
      {errorMessage && summary && <p className="error-text" role="alert">{errorMessage}</p>}

      {isLoading ? (
        <section className="dashboard-loading" aria-label={t('dashboard.loading')} aria-busy="true">
          <span /><span /><span />
        </section>
      ) : !summary ? (
        <div className="dashboard-error-state" role="alert">
          <GoogleIcon name="error" size={22} />
          <p>{errorMessage || t('errors.couldNotLoad')}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setErrorMessage('');
              setIsLoading(true);
              setReloadKey((key) => key + 1);
            }}
          >
            {t('errors.retry')}
          </button>
        </div>
      ) : (
        <div className="dashboard-wallet-shell">
          <section className="wallet-cards" aria-label={t('dashboard.overview')}>
            {summaryCards.map(({ label, value, detail, tone, icon }) => (
              <article key={label} className={`wallet-card wallet-card--${tone}`}>
                <div className="wallet-card-head">
                  <span className="wallet-card-label">{label}</span>
                  <span className="wallet-card-icon" aria-hidden="true"><GoogleIcon name={icon} size={19} /></span>
                </div>
                <strong className="wallet-card-value">{value}</strong>
                <span className="wallet-card-note">{detail}</span>
              </article>
            ))}
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section-head">
              <h3>{t('dashboard.quickActions')}</h3>
            </div>
            <nav className="quick-grid" aria-label={t('dashboard.quickActions')}>
              {quickActions.map(({ labelKey, to, Icon }) => (
                <Link key={labelKey} to={to} className="quick-tile">
                  <span className="quick-tile-icon" aria-hidden="true"><GoogleIcon name={Icon} size={20} /></span>
                  <span>{t(labelKey)}</span>
                </Link>
              ))}
            </nav>
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section-head">
              <h3>{t('reports.paymentHistory')}</h3>
              <Link to="/app/payment-history" className="dashboard-see-all">{t('app.seeAll')}</Link>
            </div>
            <div className="dashboard-history-strip">
              {paymentHistory.length === 0 ? (
                <p className="muted-text">{t('dashboard.noRecentPayments')}</p>
              ) : (
                paymentHistory.map((item) => (
                  <article key={item.paymentId || item._id} className="dashboard-payment-card">
                    <div className="dashboard-payment-icon"><GoogleIcon name="sync_alt" size={18} /></div>
                    <div className="dashboard-payment-main">
                      <strong>{item.customerName || 'Member payment'}</strong>
                      <span>{formatDate(item.paymentDate)} · {formatMethod(t, item.method)}</span>
                    </div>
                    <div className="dashboard-payment-amount">+ {money(item.amount)}</div>
                  </article>
                ))
              )}
            </div>
          </section>

          {reminders && (
            <section className="dashboard-section">
              <div className="dashboard-section-head">
                <h3>{t('dashboard.followUp')}</h3>
              </div>
              {(() => {
                const groups = [
                  [t('dashboard.pendingDues'), reminders.pendingDues],
                  [t('dashboard.overdueDues'), reminders.overdueDues],
                  [t('dashboard.partialPayments'), reminders.partialPayments],
                ].filter(([, items]) => items.length > 0);

                if (groups.length === 0) return <p className="muted-text">{t('dashboard.nothingToday')}</p>;

                return (
                  <div className="attention-rows">
                    {groups.map(([title, items]) => (
                      <div key={title} className="attention-row">
                        <span className="attention-label">{title}</span>
                        <div className="attention-items">
                          {items.slice(0, 3).map((item) => (
                            <span key={item._id} className="attention-item">
                              {item.customerId?.fullName || t('dashboard.member')} <strong>{money(item.outstandingAmount)}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentHistoryWorkspace({ parkingId }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    apiGetReport(parkingId, 'payment-history', {
      startDate: monthStart.toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
    })
      .then((response) => {
        if (!active) return;
        setRows(Array.isArray(response) ? response : []);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(error.message || t('errors.couldNotLoad'));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [parkingId, t]);

  return (
    <div className="operations-workspace">
      <header className="workspace-heading dashboard-header">
        <div>
          <p className="eyebrow">{t('nav.payments')}</p>
          <h2>{t('reports.paymentHistory')}</h2>
        </div>
      </header>

      {errorMessage && <p className="error-text" role="alert">{errorMessage}</p>}

      {isLoading ? (
        <section className="dashboard-loading" aria-label={t('dashboard.loading')} aria-busy="true">
          <span /><span /><span />
        </section>
      ) : rows.length === 0 ? (
        <div className="dashboard-empty-state">{t('dashboard.noRecentPayments')}</div>
      ) : (
        <section className="payment-history-list">
          {rows.map((item) => (
            <article key={item.paymentId || item._id} className="payment-history-item">
              <div className="payment-history-icon"><GoogleIcon name="sync_alt" size={18} /></div>
              <div className="payment-history-copy">
                <strong>{item.customerName || t('dashboard.memberPayment')}</strong>
                <span>{formatDate(item.paymentDate)} · {formatMethod(t, item.method)}</span>
              </div>
              <div className="payment-history-amount">{money(item.amount)}</div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

const renderValue = (value, key, t) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  if (key === 'status') {
    if (['pending', 'partially_paid'].includes(value)) return t('customer.due');
    if (value === 'paid') return t('customer.received');
    if (value === 'active' || value === 'inactive') return t(`app.${value}`);
    if (value === 'reversed') return t('customer.paymentStatus.reversed');
  }
  if (key === 'paymentStatus') return value ? t(`daily.${value}`) : '—';
  if (key === 'method' || key === 'paymentMethod') return value ? t(`daily.${value}`) : '—';
  // Ids are shown short; the CSV export keeps the full value.
  if (/Id$/.test(key) && typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value)) {
    return shortId(value);
  }
  if (key === 'eventType') {
    if (value === 'due') return t('customer.due');
    if (value === 'payment') return t('customer.paymentStatus.active');
    if (value === 'payment_reversed') return t('customer.paymentStatus.reversed');
  }
  if (typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value)) {
    return key.toLowerCase().includes('time') ? formatDateTime(value) : formatDate(value);
  }
  return String(value);
};

function ReportsWorkspace({ parkingId }) {
  const { t } = useTranslation();
  const [activeReport, setActiveReport] = useState(reports[0]);
  const [filters, setFilters] = useState({ status: 'all', startDate: '', endDate: '', method: '', customerId: '' });
  const [customers, setCustomers] = useState([]);
  const [rows, setRows] = useState([]);
  const [loadedReportKey, setLoadedReportKey] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    apiGetCustomers(parkingId, { status: 'active', page: 1, limit: 100 })
      .then((response) => setCustomers(response.customers))
      .catch((error) => setErrorMessage(error.message || t('errors.couldNotLoad')));
  }, [parkingId, t]);

  const reportFilters = useMemo(() => Object.fromEntries(
    (activeReport.filters || []).map((filter) => [filter, filters[filter] || '']),
  ), [activeReport, filters]);
  const requestKey = `${parkingId}:${activeReport.id}:${JSON.stringify(reportFilters)}`;

  useEffect(() => {
    if (activeReport.id === 'customer-statement' && !filters.customerId) {
      return;
    }
    let active = true;
    const reportName = activeReport.id === 'customer-statement'
      ? `customer-statement/${encodeURIComponent(filters.customerId)}`
      : activeReport.id;
    apiGetReport(parkingId, reportName, reportFilters)
      .then((response) => {
        if (active) {
          setRows(response);
          setLoadedReportKey(requestKey);
        }
      })
      .catch((error) => {
        if (active) {
          setRows([]);
          setLoadedReportKey(requestKey);
          setErrorMessage(error.message || t('errors.couldNotLoad'));
        }
      });
    return () => { active = false; };
  }, [activeReport, filters.customerId, parkingId, reportFilters, requestKey, t]);

  const visibleRows = activeReport.id === 'customer-statement' && !filters.customerId ? [] : rows;
  const isLoading = !(activeReport.id === 'customer-statement' && !filters.customerId)
    && loadedReportKey !== requestKey;

  const exportCsv = async () => {
    setIsExporting(true);
    setErrorMessage('');
    try {
      const reportName = activeReport.id === 'customer-statement'
        ? `customer-statement/${encodeURIComponent(filters.customerId)}`
        : activeReport.id;
      await apiDownloadReport(parkingId, reportName, reportFilters);
    } catch (error) {
      setErrorMessage(error.message || t('errors.couldNotLoad'));
    } finally {
      setIsExporting(false);
    }
  };

  const selectReport = (report) => {
    setActiveReport(report);
    setErrorMessage('');
  };

  return (
    <div className="operations-workspace">
      <header className="workspace-heading"><div><p className="eyebrow">{t('reports.eyebrow')}</p><h2>{t('reports.title')}</h2></div></header>
      {errorMessage && <p className="error-text" role="alert">{errorMessage}</p>}
      <nav className="workspace-tabs report-tabs" aria-label={t('reports.title')}>
        {reports.map((report) => (
          <button key={report.id} type="button" className={report.id === activeReport.id ? 'workspace-tab is-active' : 'workspace-tab'} onClick={() => selectReport(report)}>{t(report.labelKey)}</button>
        ))}
      </nav>
      <section className="panel">
        <div className="report-toolbar">
          <h3>{t(activeReport.labelKey)}</h3>
          <div className="filter-row report-filters">
            {activeReport.filters?.includes('status') && (
              <label className="field"><span>{t('reports.status')}</span><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="all">{t('reports.all')}</option><option value="active">{t('reports.active')}</option><option value="inactive">{t('reports.inactive')}</option></select></label>
            )}
            {activeReport.filters?.includes('startDate') && (
              <label className="field"><span>{t('daily.from')}</span><input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} /></label>
            )}
            {activeReport.filters?.includes('endDate') && (
              <label className="field"><span>{t('daily.to')}</span><input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} /></label>
            )}
            {activeReport.filters?.includes('method') && (
              <label className="field"><span>{t('reports.method')}</span><select value={filters.method} onChange={(event) => setFilters({ ...filters, method: event.target.value })}><option value="">{t('reports.allMethods')}</option><option value="cash">{t('daily.cash')}</option><option value="easypaisa">{t('daily.easypaisa')}</option><option value="jazzcash">{t('daily.jazzcash')}</option></select></label>
            )}
            {activeReport.filters?.includes('customerId') && (
              <label className="field"><span>{t('reports.customer')}</span><select value={filters.customerId} onChange={(event) => setFilters({ ...filters, customerId: event.target.value })}><option value="">{t('reports.selectCustomer')}</option>{customers.map((customer) => <option key={customer._id} value={customer._id}>{customer.fullName} · {customer.primaryPhone}</option>)}</select></label>
            )}
            <button type="button" className="secondary-button" disabled={isExporting || (activeReport.id === 'customer-statement' && !filters.customerId)} onClick={exportCsv}>{isExporting ? t('reports.exporting') : t('reports.export')}</button>
          </div>
        </div>
        {isLoading ? <p className="muted-text">{t('reports.loading')}</p> : visibleRows.length === 0 ? <div className="empty-state"><p>{t('reports.empty')}</p></div> : (
          <div className="report-table-wrap">
            <table className="report-table">
              <thead><tr>{Object.keys(visibleRows[0]).filter((key) => key !== '_id').map((key) => <th key={key}>{t(`reports.columns.${key}`, { defaultValue: key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`) })}</th>)}</tr></thead>
              <tbody>{visibleRows.map((row, index) => (
                <tr key={row._id || row.customerId || row.dueId || row.paymentId || row.recordId || index}>
                  {Object.entries(row).filter(([key]) => key !== '_id').map(([key, value]) => <td className={/amount|fee|rate/i.test(key) ? 'report-money' : ''} dir={/amount|fee|rate|date|number/i.test(key) ? 'ltr' : undefined} key={key}>{renderValue(value, key, t)}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export { DashboardWorkspace, MoreWorkspace, PaymentHistoryWorkspace, ReportsWorkspace };
