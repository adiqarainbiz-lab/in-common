import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

const STEPS = { PHONE: 'phone', OTP: 'otp', NAME: 'name' };

export default function AuthScreen() {
  const { requestOTP, login } = useAuth();
  const [step,     setStep]     = useState(STEPS.PHONE);
  const [phone,    setPhone]    = useState('');
  const [otp,      setOtp]      = useState('');
  const [name,     setName]     = useState('');
  const [isNew,    setIsNew]    = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [devOtp,   setDevOtp]   = useState('');
  const [error,    setError]    = useState('');

  const handlePhone = async () => {
    if (!phone.trim()) return setError('Enter your phone number');
    setError('');
    setLoading(true);
    try {
      const res = await requestOTP(phone.trim());
      if (res.dev_otp) setDevOtp(res.dev_otp);
      setStep(STEPS.OTP);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not send OTP');
    } finally { setLoading(false); }
  };

  const handleOTP = async () => {
    if (otp.length !== 6) return setError('Enter the 6-digit code');
    setError('');
    setLoading(true);
    try {
      await login(phone.trim(), otp.trim(), undefined);
    } catch (e) {
      const errMsg = e.response?.data?.error || '';
      if (errMsg.includes('name required')) {
        setIsNew(true);
        setStep(STEPS.NAME);
      } else {
        setError(errMsg || 'Invalid OTP');
      }
    } finally { setLoading(false); }
  };

  const handleName = async () => {
    if (!name.trim()) return setError('Enter your name');
    setError('');
    setLoading(true);
    try {
      await login(phone.trim(), otp.trim(), name.trim());
    } catch (e) {
      setError(e.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <LinearGradient colors={['#1B4332', '#2D6A4F', '#40916C']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
        <Text style={styles.logo}>In Common</Text>
        <Text style={styles.tagline}>Community loyalty for Jerusalem</Text>

        <View style={styles.card}>
          {step === STEPS.PHONE && (
            <>
              <Text style={styles.label}>Your phone number</Text>
              <TextInput
                style={styles.input}
                placeholder="+972 50 000 0000"
                value={phone}
                onChangeText={v => { setPhone(v); setError(''); }}
                keyboardType="phone-pad"
                autoFocus
                onSubmitEditing={handlePhone}
                returnKeyType="go"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {loading ? <ActivityIndicator color="#2D6A4F" /> : (
                <TouchableOpacity style={styles.btn} onPress={handlePhone}>
                  <Text style={styles.btnText}>Send Code</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {step === STEPS.OTP && (
            <>
              <Text style={styles.label}>Enter the 6-digit code sent to {phone}</Text>
              {devOtp ? <Text style={styles.devHint}>DEV: {devOtp}</Text> : null}
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="000000"
                value={otp}
                onChangeText={v => { setOtp(v); setError(''); }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                onSubmitEditing={handleOTP}
                returnKeyType="go"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {loading ? <ActivityIndicator color="#2D6A4F" /> : (
                <TouchableOpacity style={styles.btn} onPress={handleOTP}>
                  <Text style={styles.btnText}>Verify</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => { setStep(STEPS.PHONE); setError(''); }}>
                <Text style={styles.back}>← Change number</Text>
              </TouchableOpacity>
            </>
          )}

          {step === STEPS.NAME && (
            <>
              <Text style={styles.label}>Welcome! What's your name?</Text>
              <TextInput
                style={styles.input}
                placeholder="Your full name"
                value={name}
                onChangeText={v => { setName(v); setError(''); }}
                autoCapitalize="words"
                autoFocus
                onSubmitEditing={handleName}
                returnKeyType="go"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {loading ? <ActivityIndicator color="#2D6A4F" /> : (
                <TouchableOpacity style={styles.btn} onPress={handleName}>
                  <Text style={styles.btnText}>Join In Common</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <Text style={styles.footer}>No bank account required</Text>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner:     { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo:      { fontSize: 36, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 6 },
  tagline:   { fontSize: 15, color: '#FFFFFF99', textAlign: 'center', marginBottom: 40 },
  card:      { backgroundColor: 'white', borderRadius: 20, padding: 24, gap: 16 },
  label:     { fontSize: 15, color: '#1B4332', fontWeight: '600' },
  input:     { borderWidth: 1, borderColor: '#D0E8D8', borderRadius: 12, padding: 14, fontSize: 16 },
  otpInput:  { textAlign: 'center', letterSpacing: 8, fontSize: 24, fontWeight: '700' },
  btn:       { backgroundColor: '#2D6A4F', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnText:   { color: 'white', fontSize: 16, fontWeight: '700' },
  back:      { textAlign: 'center', color: '#2D6A4F', fontSize: 14 },
  devHint:   { backgroundColor: '#FFF3CD', padding: 8, borderRadius: 8, fontSize: 13, color: '#856404', textAlign: 'center' },
  footer:    { textAlign: 'center', color: '#FFFFFF66', marginTop: 32, fontSize: 13 },
  error:     { color: '#D62828', fontSize: 13, textAlign: 'center' },
});
