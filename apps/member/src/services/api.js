import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('member_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const auth = {
  requestOTP: (phone_number) => api.post('/auth/member/request-otp', { phone_number }),
  verifyOTP:  (phone_number, otp, name) => api.post('/auth/member/verify-otp', { phone_number, otp, name }),
};

export const member = {
  profile:      ()         => api.get('/member/profile'),
  qrToken:      ()         => api.get('/member/qr-token'),
  transactions: (page = 1) => api.get(`/member/transactions?page=${page}`),
  businesses:   (category) => api.get(`/member/businesses${category ? `?category=${category}` : ''}`),
};

export default api;
