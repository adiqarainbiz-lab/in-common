import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth as authApi, member as memberApi } from '../services/api';
import { registerForPushNotifications } from '../services/notifications';

function syncPushToken() {
  registerForPushNotifications().then((pushToken) => {
    if (pushToken) memberApi.savePushToken(pushToken).catch(() => {});
  }).catch(() => {});
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token,   setToken]   = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('member_token');
      if (stored) {
        setToken(stored);
        try {
          const res = await memberApi.profile();
          setProfile(res.data);
          syncPushToken();
        } catch {
          await AsyncStorage.removeItem('member_token');
          setToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const requestOTP = async (phone) => {
    const res = await authApi.requestOTP(phone);
    return res.data;
  };

  const login = async (phone, otp, name) => {
    const res = await authApi.verifyOTP(phone, otp, name);
    const { token: t, member: m } = res.data;
    await AsyncStorage.setItem('member_token', t);
    setToken(t);
    setProfile(m);
    syncPushToken();
    return m;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('member_token');
    setToken(null);
    setProfile(null);
  };

  const continueAsGuest = () => setIsGuest(true);
  const exitGuest = () => setIsGuest(false);

  const refreshProfile = async () => {
    const res = await memberApi.profile();
    setProfile(res.data);
    return res.data;
  };

  const updateProfile = async (name, phone_number) => {
    const res = await memberApi.updateProfile(name, phone_number);
    setProfile(res.data);
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ token, profile, loading, isGuest, requestOTP, login, logout, refreshProfile, updateProfile, continueAsGuest, exitGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
