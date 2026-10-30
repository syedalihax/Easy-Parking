const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const authHeaders = () => {
  const token = localStorage.getItem('easyparking_token');

  return token ? { Authorization: `Bearer ${token}` } : {};
};

const jsonRequest = async (endpoint, options = {}) => {
  const headers = {
    ...(options.headers || {}),
  };

  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
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

export const apiGetMyParkings = () => jsonRequest('/parkings/my');

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
