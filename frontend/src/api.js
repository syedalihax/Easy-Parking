import i18n from './i18n';

const resolveApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredUrl) {
    const url = new URL(configuredUrl, window.location.origin);
    const isLoopbackAddress = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    const pageIsLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
    if (import.meta.env.DEV && isLoopbackAddress && !pageIsLoopback) {
      url.hostname = window.location.hostname;
    }
    return url.toString().replace(/\/$/, '');
  }
  if (!import.meta.env.DEV) return '/api';

  const url = new URL(window.location.origin);
  url.port = '5000';
  url.pathname = '/api';
  return url.toString().replace(/\/$/, '');
};

const API_BASE_URL = resolveApiBaseUrl();
const offlineMessage = () => i18n.t('errors.offline');
const apiUnavailableMessage = () => i18n.t('errors.apiUnavailable');

const ensureOnline = () => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error(offlineMessage());
  }
};

const jsonRequest = async (endpoint, options = {}, retry = true) => {
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
      credentials: 'include',
      headers,
    });
  } catch (error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error(offlineMessage());
    if (error instanceof TypeError) throw new Error(apiUnavailableMessage());
    throw error;
  }

  if (response.status === 401 && retry && endpoint !== '/auth/refresh') {
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshResponse.ok) {
        return jsonRequest(endpoint, options, false);
      }
    } catch (error) {
      // Fall back to the original error if the refresh call fails.
    }
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

export const apiUpdateProfile = (profile) => jsonRequest('/auth/me', {
  method: 'PATCH',
  body: JSON.stringify(profile),
});

export const apiGetMyParkings = () => jsonRequest('/parkings/my');

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
      { credentials: 'include' },
    );
  } catch (error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error(offlineMessage());
    if (error instanceof TypeError) throw new Error(apiUnavailableMessage());
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

export const apiGetDailyRate = (parkingId) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/daily-rate`,
);

export const apiUpdateDailyRate = (parkingId, dailyParkingRate) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/daily-rate`,
  { method: 'PATCH', body: JSON.stringify({ dailyParkingRate }) },
);

export const apiUpdateRateCard = (parkingId, payload) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/daily-rate/card`,
  { method: 'PUT', body: JSON.stringify(payload) },
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

export const apiUpdateParking = (parkingId, payload) => jsonRequest(`/parkings/${parkingId}`, {
  method: 'PATCH',
  body: JSON.stringify(payload),
});

export const apiCreateInvitation = (payload) => jsonRequest('/invitations', {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const apiGetPendingInvitations = () => jsonRequest('/invitations/pending');
export const apiGetParkingInvitations = (parkingId) => jsonRequest(`/parkings/${parkingId}/invitations`);
export const apiCancelInvitation = (parkingId, invitationId) => jsonRequest(
  `/parkings/${parkingId}/invitations/${invitationId}/cancel`,
  { method: 'POST' },
);

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

export const apiActivateCustomer = (parkingId, customerId) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/customers/${encodeURIComponent(customerId)}/activate`,
  { method: 'PATCH' },
);

export const apiDeleteCustomer = (parkingId, customerId) => jsonRequest(
  `/parkings/${encodeURIComponent(parkingId)}/customers/${encodeURIComponent(customerId)}`,
  { method: 'DELETE' },
);
