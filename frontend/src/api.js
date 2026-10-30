import i18n from './i18n';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const offlineMessage = () => i18n.t('errors.offline');

const ensureOnline = () => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error(offlineMessage());
  }
};

const authHeaders = () => {
  const token = localStorage.getItem('easyparking_token');

  return token ? { Authorization: `Bearer ${token}` } : {};
};

const jsonRequest = async (endpoint, options = {}) => {
  ensureOnline();
  const headers = {
    ...(options.headers || {}),
  };

  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...authHeaders(),
        ...headers,
      },
    });
  } catch (error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error(offlineMessage());
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 429) throw new Error(i18n.t('errors.tooManyRequests'));
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

export const apiSignup = (payload) => jsonRequest('/auth/signup', {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const apiLogin = (payload) => jsonRequest('/auth/login', {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const apiGetMe = () => jsonRequest('/auth/me');

export const apiUpdatePreferredLanguage = (preferredLanguage) => jsonRequest('/auth/me', {
  method: 'PATCH',
  body: JSON.stringify({ preferredLanguage }),
});

export const apiGetMyParkings = () => jsonRequest('/parkings/my');

export const apiGetDailyRate = (parkingId) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/daily-rate`,
);

export const apiGetDashboard = (parkingId) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/dashboard`,
);

export const apiGetDashboardReminders = (parkingId) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/dashboard/reminders`,
);

export const apiGetReport = (parkingId, reportName, filters = {}) => {
  const params = new URLSearchParams(Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined),
  ));
  const query = params.toString();
  return jsonRequest(
    `/parkings/${encodeURIComponent(parkingId)}/reports/${reportName}${query ? `?${query}` : ''}`,
  );
};

export const apiDownloadReport = async (parkingId, reportName, filters = {}) => {
  ensureOnline();
  const params = new URLSearchParams({ ...filters, format: 'csv' });
  let response;
  try {
    response = await fetch(
      `${API_BASE_URL}/parkings/${encodeURIComponent(parkingId)}/reports/${reportName}?${params}`,
      { headers: authHeaders() },
    );
  } catch (error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error(offlineMessage());
    throw error;
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Could not export report');
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reportName.replaceAll('/', '-')}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const apiUpdateDailyRate = (parkingId, dailyParkingRate) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/daily-rate`,
  { method: 'PATCH', body: JSON.stringify({ dailyParkingRate }) },
);

export const apiCreateDailyParkingEntry = (parkingId, payload) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/daily-parking/entry`,
  { method: 'POST', body: JSON.stringify(payload) },
);

export const apiGetActiveDailyParking = (parkingId) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/daily-parking/active`,
);

export const apiGetDailyParkingHistory = (parkingId, filters = {}) => {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
  );
  return jsonRequest(`/parkings/${encodeURIComponent(parkingId)}/daily-parking?${params}`);
};

export const apiRecordDailyParkingExit = (parkingId, recordId) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/daily-parking/${encodeURIComponent(recordId)}/exit`,
  { method: 'PATCH' },
);

export const apiRecordDailyParkingPayment = (parkingId, recordId, method) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/daily-parking/${encodeURIComponent(recordId)}/payment`,
  { method: 'PATCH', body: JSON.stringify({ method }) },
);

export const apiCreateParking = (payload) => jsonRequest('/parkings', {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const apiCreateInvitation = (payload) => jsonRequest('/invitations', {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const apiGetPendingInvitations = () => jsonRequest('/invitations/pending');

export const apiAcceptInvitation = (invitationId) => jsonRequest(`/invitations/${invitationId}/accept`, {
  method: 'POST',
});

export const apiGetCustomers = (parkingId, { search = '', status = 'active', page = 1, limit = 20 } = {}) => {
  const params = new URLSearchParams({ search, status, page, limit });
  return jsonRequest(`/parkings/${encodeURIComponent(parkingId)}/customers?${params}`);
};

export const apiGetCustomer = (parkingId, customerId) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/customers/${encodeURIComponent(customerId)}`,
);

export const apiCreateCustomer = (parkingId, payload) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/customers`,
  { method: 'POST', body: JSON.stringify(payload) },
);

export const apiUpdateCustomer = (parkingId, customerId, payload) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/customers/${encodeURIComponent(customerId)}`,
  { method: 'PATCH', body: JSON.stringify(payload) },
);

export const apiDeactivateCustomer = (parkingId, customerId) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/customers/${encodeURIComponent(customerId)}/deactivate`,
  { method: 'PATCH' },
);

export const apiCreateVehicle = (parkingId, customerId, payload) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/customers/${encodeURIComponent(customerId)}/vehicles`,
  { method: 'POST', body: JSON.stringify(payload) },
);

export const apiUpdateVehicle = (parkingId, customerId, vehicleId, payload) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/customers/${encodeURIComponent(customerId)}/vehicles/${encodeURIComponent(vehicleId)}`,
  { method: 'PATCH', body: JSON.stringify(payload) },
);

export const apiDeactivateVehicle = (parkingId, customerId, vehicleId) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/customers/${encodeURIComponent(customerId)}/vehicles/${encodeURIComponent(vehicleId)}/deactivate`,
  { method: 'PATCH' },
);

export const apiReplaceVehicle = (parkingId, customerId, oldVehicleId, payload) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/customers/${encodeURIComponent(customerId)}/vehicles/${encodeURIComponent(oldVehicleId)}/replace`,
  { method: 'POST', body: JSON.stringify(payload) },
);

export const apiSearchVehicles = (parkingId, search) => {
  const params = new URLSearchParams({ search });
  return jsonRequest(`/parkings/${encodeURIComponent(parkingId)}/vehicles?${params}`);
};

export const apiGetVehicle = (parkingId, vehicleId) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/vehicles/${encodeURIComponent(vehicleId)}`,
);

export const apiGetSubscriptions = (parkingId, customerId) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/customers/${encodeURIComponent(customerId)}/subscriptions`,
);

export const apiChangeSubscriptionRate = (parkingId, customerId, subscriptionId, payload) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/customers/${encodeURIComponent(customerId)}/subscriptions/${encodeURIComponent(subscriptionId)}/rate`,
  { method: 'PATCH', body: JSON.stringify(payload) },
);

export const apiEndSubscription = (parkingId, customerId, subscriptionId) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/customers/${encodeURIComponent(customerId)}/subscriptions/${encodeURIComponent(subscriptionId)}/end`,
  { method: 'PATCH' },
);

export const apiGetDues = (parkingId, customerId) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/customers/${encodeURIComponent(customerId)}/dues`,
);

export const apiCreatePayment = (parkingId, customerId, payload) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/customers/${encodeURIComponent(customerId)}/payments`,
  { method: 'POST', body: JSON.stringify(payload) },
);

export const apiPreviewPayment = (parkingId, customerId, amount, manualDueOrder) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/customers/${encodeURIComponent(customerId)}/payments/preview`,
  { method: 'POST', body: JSON.stringify({ amount, ...(manualDueOrder === undefined ? {} : { manualDueOrder }) }) },
);

export const apiGetPayments = (parkingId, customerId) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/customers/${encodeURIComponent(customerId)}/payments`,
);

export const apiGetPayment = (parkingId, customerId, paymentId) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/customers/${encodeURIComponent(customerId)}/payments/${encodeURIComponent(paymentId)}`,
);

export const apiRequestPaymentCorrection = (parkingId, paymentId, payload) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/payments/${encodeURIComponent(paymentId)}/corrections/request`,
  { method: 'POST', body: JSON.stringify(payload) },
);

export const apiApprovePaymentCorrection = (parkingId, paymentId, auditLogId) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/payments/${encodeURIComponent(paymentId)}/corrections/${encodeURIComponent(auditLogId)}/approve`,
  { method: 'POST' },
);

export const apiRejectPaymentCorrection = (parkingId, paymentId, auditLogId) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/payments/${encodeURIComponent(paymentId)}/corrections/${encodeURIComponent(auditLogId)}/reject`,
  { method: 'POST' },
);
