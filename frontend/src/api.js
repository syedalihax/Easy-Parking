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
