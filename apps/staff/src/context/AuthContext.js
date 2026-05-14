import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { staffAuth } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token,   setToken]   = useState(null);
  const [staff,   setStaff]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem('staff_token');
      const s = await AsyncStorage.getItem('staff_profile');
      if (t && s) { setToken(t); setStaff(JSON.parse(s)); }
      setLoading(false);
    })();
  }, []);

  const login = async (phone, password) => {
    const res = await staffAuth.login(phone, password);
    const { token: t, staff: s } = res.data;
    await AsyncStorage.setItem('staff_token', t);
    await AsyncStorage.setItem('staff_profile', JSON.stringify(s));
    setToken(t);
    setStaff(s);
    return s;
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['staff_token', 'staff_profile']);
    setToken(null);
    setStaff(null);
  };

  return (
    <AuthContext.Provider value={{ token, staff, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
