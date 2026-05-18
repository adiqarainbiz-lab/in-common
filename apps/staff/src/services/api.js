import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

let _onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { _onUnauthorized = fn; };

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('staff_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      await AsyncStorage.multiRemove(['staff_token', 'staff_profile']);
      if (_onUnauthorized) _onUnauthorized();
    }
    return Promise.reject(err);
  }
);

export const staffAuth = {
  login: (phone_number, password) => api.post('/auth/staff/login', { phone_number, password }),
};

export const staffApi = {
  scan:         (token)                    => api.post('/staff/scan',         { token }),
  lookupCode:   (code)                     => api.post('/staff/lookup-code',  { code }),
  earn:         (member_id, points)        => api.post('/staff/earn',         { member_id, points }),
  redeem:       (member_id, points)        => api.post('/staff/redeem',       { member_id, points }),
  transactions:       (date) => api.get(`/staff/transactions${date ? `?date=${date}` : ''}`),
  reverseTransaction: (id)   => api.post(`/staff/transactions/${id}/reverse`),
  searchMembers:      (q)    => api.get(`/staff/search?q=${encodeURIComponent(q)}`),
};

export default api;
