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

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
const date = (value) => value ? new Date(value).toLocaleDateString() : '';

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
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.allSettled([apiGetDashboard(parkingId), apiGetDashboardReminders(parkingId)])
      .then(([summaryResult, remindersResult]) => {
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
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [parkingId, reloadKey, t]);

  const cards = summary ? [
    { label: t('dashboard.outstanding'), detail: t('dashboard.outstandingHelp'), value: money(summary.totalOutstandingAmount), Icon: 'wallet', kind: 'financial' },
    { label: t('dashboard.paymentsThisMonth'), detail: t('dashboard.paymentsThisMonthHelp'), value: money(summary.paymentsReceivedThisPeriod), Icon: 'payments', kind: 'financial' },
    { label: t('dashboard.activeCustomers'), detail: t('dashboard.activePeopleHelp'), value: summary.totalActiveCustomers, Icon: 'groups', tone: 'green' },
    { label: t('dashboard.activeVehicles'), detail: t('dashboard.activeVehiclesHelp'), value: summary.totalActiveVehicles, Icon: 'directions_car', tone: 'green' },
    { label: t('dashboard.customersWithDues'), detail: t('dashboard.peopleWithDuesHelp'), value: summary.customersWithPendingDues, Icon: 'error', tone: 'amber' },
    { label: t('dashboard.overSevenDays'), detail: t('dashboard.overSevenDaysHelp'), value: summary.customersWithOverdueDues, Icon: 'schedule', tone: 'rose' },
    { label: t('dashboard.currentlyParked'), detail: t('dashboard.currentlyParkedHelp'), value: summary.dailyVehiclesCurrentlyParked, Icon: 'local_parking', tone: 'green' },
  ] : [];

  return (
    <div className="operations-workspace">
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">{t('dashboard.overview')}</p>
          <h2>{t('nav.dashboard')}</h2>
          <p className="workspace-hint">{t('dashboard.subtitle')}</p>
        </div>
      </header>
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
        <>
          <section className="stats-grid dashboard-financial-stats" aria-label={t('dashboard.outstanding')}>
            {cards.filter((card) => card.kind === 'financial').map(({ label, detail, value, Icon }) => (
              <article className="stat-card stat-card-financial" key={label}>
                <div className="stat-card-top">
                  <span>{label}</span>
                  <span className="stat-card-icon"><GoogleIcon name={Icon} size={19} /></span>
                </div>
                <strong>{value}</strong>
                <small>{detail}</small>
              </article>
            ))}
          </section>
          <section className="stats-grid dashboard-operations-stats" aria-label={t('dashboard.overview')}>
            {cards.filter((card) => card.kind !== 'financial').map(({ label, detail, value, Icon, tone }) => (
              <article className={`stat-card stat-card-operations stat-card-${tone}`} key={label}>
                <div className="stat-card-top">
                  <span>{label}</span>
                  <span className="stat-card-icon"><GoogleIcon name={Icon} size={19} /></span>
                </div>
                <strong>{value}</strong>
                <small>{detail}</small>
              </article>
            ))}
          </section>
          <section className="panel">
            <div className="panel-header"><h3>{t('dashboard.quickActions')}</h3></div>
            <div className="quick-actions">
              {actionLinks.map(({ key, to, Icon }) => (
                <Link className="quick-action" to={to} key={key}>
                  <span className="quick-action-icon"><GoogleIcon name={Icon} size={18} /></span>
                  <span>{t(key)}</span>
                  <GoogleIcon name="north_east" className="quick-action-arrow" size={15} />
                </Link>
              ))}
            </div>
          </section>
          {reminders && (
            <section className="reminder-grid">
              {[
                [t('dashboard.pendingDues'), reminders.pendingDues, (item) => item.customerId],
                [t('dashboard.overdueDues'), reminders.overdueDues, (item) => item.customerId],
                [t('dashboard.partialPayments'), reminders.partialPayments, (item) => item.customerId],
                [t('dashboard.upcomingBilling'), reminders.upcomingBillingPeriods, (item) => item.customerId],
              ].map(([title, items, getCustomer]) => (
                <article className="panel reminder-panel" key={title}>
                  <div className="panel-header"><h3>{title}</h3></div>
                  {items.length === 0 ? <p className="muted-text">{t('dashboard.nothing')}</p> : (
                    <div className="list-stack">
                      {items.slice(0, 8).map((item) => {
                        const customer = getCustomer(item);
                        const customerId = typeof customer === 'object' ? customer?._id : customer;
                        const displayName = typeof customer === 'object' ? customer?.fullName : '';
                        return (
                          <Link className="reminder-item" to={customerId ? `/app/customers/${customerId}` : '/app/customers'} key={item._id}>
                            <strong>{displayName || item.vehicleId?.registrationNumber || t('reports.customer')}</strong>
                            <span>{item.currentPeriod ? `Period ends ${date(item.currentPeriod.end)}` : money(item.outstandingAmount)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </article>
              ))}
            </section>
          )}
        </>
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
  if (key === 'paymentStatus') return t(`daily.${value}`);
  if (key === 'method' || key === 'paymentMethod') return t(`daily.${value}`);
  if (key === 'eventType') {
    if (value === 'due') return t('customer.due');
    if (value === 'payment') return t('customer.paymentStatus.active');
    if (value === 'payment_reversed') return t('customer.paymentStatus.reversed');
  }
  if (typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value)) {
    return key.toLowerCase().includes('time') ? new Date(value).toLocaleString() : date(value);
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

export { DashboardWorkspace, MoreWorkspace, ReportsWorkspace };
