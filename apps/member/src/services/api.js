import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({ baseURL: BASE_URL, timeout: 45000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('member_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const auth = {
  requestOTP: (phone_number)                      => api.post('/auth/member/request-otp', { phone_number }),
  verifyOTP:  (phone_number, otp, name, referral_code) => api.post('/auth/member/verify-otp', { phone_number, otp, name, referral_code }),
};

export const member = {
  profile:       ()                     => api.get('/member/profile'),
  updateProfile: (name, phone_number)   => api.patch('/member/profile', { name, phone_number }),
  savePushToken: (token)                => api.patch('/member/push-token', { token }),
  qrToken:       ()                     => api.get('/member/qr-token'),
  transactions:  (page = 1)            => api.get(`/member/transactions?page=${page}`),
  businesses:    (category)            => api.get(`/member/businesses${category ? `?category=${category}` : ''}`),
  referral:      ()                     => api.get('/member/referral'),
};

export const pub = {
  businesses:     (category) => api.get(`/businesses${category ? `?category=${category}` : ''}`),
  business:       (id)       => api.get(`/businesses/${id}`),
  businessOffers: (id)       => api.get(`/businesses/${id}/offers`),
  allOffers:      ()         => api.get('/businesses/offers'),
};

export default api;
