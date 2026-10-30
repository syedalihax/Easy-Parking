import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  { id: 'customers', label: 'Customers', filters: ['status'] },
  { id: 'active-vehicles', label: 'Active vehicles' },
  { id: 'pending-dues', label: 'Pending dues' },
  { id: 'outstanding-balances', label: 'Outstanding balances' },
  { id: 'payment-history', label: 'Payment history', filters: ['startDate', 'endDate', 'method'] },
  { id: 'daily-parking-history', label: 'Daily parking history', filters: ['startDate', 'endDate'] },
  { id: 'customer-statement', label: 'Customer statement', filters: ['customerId'] },
];

const actionLinks = [
  ['Add customer', '/app/customers'],
  ['Add vehicle', '/app/customers'],
  ['Receive payment', '/app/payments'],
  ['Search customer', '/app/customers'],
  ['Search vehicle', '/app/vehicles'],
  ['View pending payments', '/app/dues'],
  ['View payment history', '/app/payments'],
  ['Daily parking entry', '/app/daily-parking'],
];

function DashboardWorkspace({ parkingId }) {
  const [summary, setSummary] = useState(null);
  const [reminders, setReminders] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([apiGetDashboard(parkingId), apiGetDashboardReminders(parkingId)])
      .then(([nextSummary, nextReminders]) => {
        if (!active) return;
        setSummary(nextSummary);
        setReminders(nextReminders);
      })
      .catch((error) => {
        if (active) setErrorMessage(error.message || 'Could not load dashboard');
      });
    return () => { active = false; };
  }, [parkingId]);

  const cards = summary ? [
    ['Active vehicles', summary.totalActiveVehicles],
    ['Active customers', summary.totalActiveCustomers],
    ['Customers with dues', summary.customersWithPendingDues],
    ['Over 7 days due', summary.customersWithOverdueDues],
    ['Outstanding amount', money(summary.totalOutstandingAmount)],
    ['Payments this month', money(summary.paymentsReceivedThisPeriod)],
    ['Currently parked', summary.dailyVehiclesCurrentlyParked],
  ] : [];

  return (
    <div className="operations-workspace">
      <header className="workspace-heading"><div><p className="eyebrow">Overview</p><h2>Dashboard</h2></div></header>
      {errorMessage && <p className="error-text" role="alert">{errorMessage}</p>}
      {!summary ? <p className="muted-text">Loading dashboard...</p> : (
        <>
          <section className="stats-grid" aria-label="Parking overview">
            {cards.map(([label, value]) => (
              <article className="stat-card" key={label}><span>{label}</span><strong>{value}</strong></article>
            ))}
          </section>
          <section className="panel">
            <div className="panel-header"><h3>Quick actions</h3></div>
            <div className="quick-actions">
              {actionLinks.map(([label, to]) => <Link className="quick-action" to={to} key={label}>{label}</Link>)}
              <Link className="quick-action" to="/app/reports">Reports</Link>
            </div>
          </section>
          {reminders && (
            <section className="reminder-grid">
              {[
                ['Pending dues', reminders.pendingDues, (item) => item.customerId],
                ['Over 7 days due', reminders.overdueDues, (item) => item.customerId],
                ['Partial payments', reminders.partialPayments, (item) => item.customerId],
                ['Upcoming billing periods', reminders.upcomingBillingPeriods, (item) => item.customerId],
              ].map(([title, items, getCustomer]) => (
                <article className="panel reminder-panel" key={title}>
                  <div className="panel-header"><h3>{title}</h3></div>
                  {items.length === 0 ? <p className="muted-text">Nothing to show.</p> : (
                    <div className="list-stack">
                      {items.slice(0, 8).map((item) => {
                        const customer = getCustomer(item);
                        const customerId = typeof customer === 'object' ? customer?._id : customer;
                        const displayName = typeof customer === 'object' ? customer?.fullName : '';
                        return (
                          <Link className="reminder-item" to={customerId ? `/app/customers/${customerId}` : '/app/customers'} key={item._id}>
                            <strong>{displayName || item.vehicleId?.registrationNumber || 'Customer'}</strong>
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

const renderValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value)) return date(value);
  return String(value);
};

function ReportsWorkspace({ parkingId }) {
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
      .catch((error) => setErrorMessage(error.message || 'Could not load customers'));
  }, [parkingId]);

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
          setErrorMessage(error.message || 'Could not load report');
        }
      });
    return () => { active = false; };
  }, [activeReport, filters.customerId, parkingId, reportFilters, requestKey]);

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
      setErrorMessage(error.message || 'Could not export report');
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
      <header className="workspace-heading"><div><p className="eyebrow">Parking records</p><h2>Reports</h2></div></header>
      {errorMessage && <p className="error-text" role="alert">{errorMessage}</p>}
      <nav className="workspace-tabs report-tabs" aria-label="Available reports">
        {reports.map((report) => (
          <button key={report.id} type="button" className={report.id === activeReport.id ? 'workspace-tab is-active' : 'workspace-tab'} onClick={() => selectReport(report)}>{report.label}</button>
        ))}
      </nav>
      <section className="panel">
        <div className="report-toolbar">
          <h3>{activeReport.label}</h3>
          <div className="filter-row report-filters">
            {activeReport.filters?.includes('status') && (
              <label className="field"><span>Status</span><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            )}
            {activeReport.filters?.includes('startDate') && (
              <label className="field"><span>From</span><input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} /></label>
            )}
            {activeReport.filters?.includes('endDate') && (
              <label className="field"><span>To</span><input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} /></label>
            )}
            {activeReport.filters?.includes('method') && (
              <label className="field"><span>Method</span><select value={filters.method} onChange={(event) => setFilters({ ...filters, method: event.target.value })}><option value="">All methods</option><option value="cash">Cash</option><option value="easypaisa">Easypaisa</option><option value="jazzcash">JazzCash</option></select></label>
            )}
            {activeReport.filters?.includes('customerId') && (
              <label className="field"><span>Customer</span><select value={filters.customerId} onChange={(event) => setFilters({ ...filters, customerId: event.target.value })}><option value="">Select a customer</option>{customers.map((customer) => <option key={customer._id} value={customer._id}>{customer.fullName} · {customer.primaryPhone}</option>)}</select></label>
            )}
            <button type="button" className="secondary-button" disabled={isExporting || (activeReport.id === 'customer-statement' && !filters.customerId)} onClick={exportCsv}>{isExporting ? 'Exporting...' : 'Export CSV'}</button>
          </div>
        </div>
        {isLoading ? <p className="muted-text">Loading report...</p> : visibleRows.length === 0 ? <div className="empty-state"><p>No report records found.</p></div> : (
          <div className="report-table-wrap">
            <table className="report-table">
              <thead><tr>{Object.keys(visibleRows[0]).filter((key) => key !== '_id').map((key) => <th key={key}>{key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</th>)}</tr></thead>
              <tbody>{visibleRows.map((row, index) => (
                <tr key={row._id || row.customerId || row.dueId || row.paymentId || row.recordId || index}>
                  {Object.entries(row).filter(([key]) => key !== '_id').map(([key, value]) => <td className={/amount|fee|rate/i.test(key) ? 'report-money' : ''} key={key}>{renderValue(value)}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export { DashboardWorkspace, ReportsWorkspace };
