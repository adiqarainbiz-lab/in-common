import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

const STEPS = { PHONE: 'phone', OTP: 'otp', NAME: 'name', CONSENT: 'consent' };

export default function AuthScreen() {
  const { requestOTP, login, continueAsGuest } = useAuth();
  const [mode,    setMode]    = useState('signin'); // 'signin' | 'signup'
  const [step,    setStep]    = useState(STEPS.PHONE);
  const [phone,   setPhone]   = useState('');
  const [otp,     setOtp]     = useState('');
  const [name,    setName]    = useState('');
  const [referralCode,    setReferralCode]    = useState('');
  const [agreedToTerms,   setAgreedToTerms]   = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [devOtp,   setDevOtp]   = useState('');
  const [error,    setError]    = useState('');
  const [slowConn, setSlowConn] = useState(false);
  const slowTimer = useRef(null);

  useEffect(() => {
    if (loading) {
      slowTimer.current = setTimeout(() => setSlowConn(true), 5000);
    } else {
      clearTimeout(slowTimer.current);
      setSlowConn(false);
    }
    return () => clearTimeout(slowTimer.current);
  }, [loading]);

  function switchMode(next) {
    setMode(next);
    setStep(STEPS.PHONE);
    setPhone(''); setOtp(''); setName(''); setReferralCode('');
    setAgreedToTerms(false); setMarketingConsent(false);
    setError(''); setDevOtp('');
  }

  const handlePhone = async () => {
    if (!phone.trim()) return setError('Enter your phone number');
    if (mode === 'signup' && !name.trim()) return setError('Enter your name');
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
    // For sign-up, show the consent screen before creating the account
    if (mode === 'signup') {
      setStep(STEPS.CONSENT);
      return;
    }
    setLoading(true);
    try {
      await login(phone.trim(), otp.trim());
    } catch (e) {
      const errMsg = e.response?.data?.error || '';
      if (errMsg.includes('name required')) {
        setStep(STEPS.NAME);
      } else {
        setError(errMsg || 'Invalid OTP');
      }
    } finally { setLoading(false); }
  };

  const handleConsent = async () => {
    if (!agreedToTerms) return setError('You must agree to join In Common');
    setError('');
    setLoading(true);
    try {
      await login(
        phone.trim(), otp.trim(),
        name.trim(),
        referralCode.trim() || undefined,
        marketingConsent,
      );
    } catch (e) {
      setError(e.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  const handleName = async () => {
    if (!name.trim()) return setError('Enter your name');
    setError('');
    setLoading(true);
    try {
      await login(phone.trim(), otp.trim(), name.trim(), referralCode.trim() || undefined);
    } catch (e) {
      setError(e.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <LinearGradient colors={['#1B4332', '#2D6A4F', '#40916C']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.logo}>In Common</Text>
        <Text style={styles.tagline}>Community loyalty for Jerusalem</Text>

        <View style={styles.card}>
          {/* Sign In / Sign Up tabs */}
          {step === STEPS.PHONE && (
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'signin' && styles.modeTabActive]}
                onPress={() => switchMode('signin')}
              >
                <Text style={[styles.modeTabText, mode === 'signin' && styles.modeTabTextActive]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'signup' && styles.modeTabActive]}
                onPress={() => switchMode('signup')}
              >
                <Text style={[styles.modeTabText, mode === 'signup' && styles.modeTabTextActive]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === STEPS.PHONE && (
            <>
              {mode === 'signup' && (
                <>
                  <Text style={styles.label}>Your name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Full name"
                    value={name}
                    onChangeText={v => { setName(v); setError(''); }}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </>
              )}
              <Text style={styles.label}>
                {mode === 'signup' ? 'Your phone number' : 'Welcome back — your phone number'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="05x or +972 5x..."
                value={phone}
                onChangeText={v => { setPhone(v); setError(''); }}
                keyboardType="phone-pad"
                autoFocus={mode === 'signin'}
                onSubmitEditing={handlePhone}
                returnKeyType={mode === 'signup' ? 'next' : 'go'}
              />
              {mode === 'signup' && (
                <>
                  <Text style={styles.label}>Referral code <Text style={styles.labelHint}>(optional)</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Friend's 6-digit code"
                    value={referralCode}
                    onChangeText={v => { setReferralCode(v); setError(''); }}
                    keyboardType="number-pad"
                    maxLength={6}
                    returnKeyType="go"
                    onSubmitEditing={handlePhone}
                  />
                </>
              )}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {loading ? (
                <>
                  <ActivityIndicator color="#2D6A4F" />
                  {slowConn && <Text style={styles.slowHint}>⏳ Waking up server, please wait…</Text>}
                </>
              ) : (
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
              {loading ? (
                <>
                  <ActivityIndicator color="#2D6A4F" />
                  {slowConn && <Text style={styles.slowHint}>⏳ Waking up server, please wait…</Text>}
                </>
              ) : (
                <TouchableOpacity style={styles.btn} onPress={handleOTP}>
                  <Text style={styles.btnText}>{mode === 'signup' ? 'Join In Common' : 'Verify'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => { setStep(STEPS.PHONE); setOtp(''); setError(''); }}>
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

          {step === STEPS.CONSENT && (
            <>
              <Text style={styles.consentTitle}>Join In Common</Text>
              <Text style={styles.consentBody}>
                By joining, you agree that we collect your name, phone number, and purchase history
                to track your Common Points and provide rewards across participating businesses.
              </Text>
              <Text style={styles.consentBody}>
                We do not sell your data. We do not share it with anyone outside the In Common
                network of participating businesses without your separate consent.
              </Text>
              <Text style={styles.consentBody}>
                You can view, correct, or delete your data at any time by contacting{' '}
                <Text style={styles.consentEmail}>adiqarain.biz@gmail.com</Text>.
              </Text>

              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => { setAgreedToTerms(v => !v); setError(''); }}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                  {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>I agree to join In Common under these terms</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setMarketingConsent(v => !v)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, marketingConsent && styles.checkboxChecked]}>
                  {marketingConsent && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>
                  I would also like to receive offers and updates{' '}
                  <Text style={styles.optionalHint}>(optional)</Text>
                </Text>
              </TouchableOpacity>

              {error ? <Text style={styles.error}>{error}</Text> : null}
              {loading ? (
                <>
                  <ActivityIndicator color="#2D6A4F" />
                  {slowConn && <Text style={styles.slowHint}>⏳ Waking up server, please wait…</Text>}
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.btn, !agreedToTerms && styles.btnDisabled]}
                  onPress={handleConsent}
                  disabled={!agreedToTerms}
                >
                  <Text style={styles.btnText}>🌿  Join In Common</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => { setStep(STEPS.OTP); setError(''); }}>
                <Text style={styles.back}>← Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity onPress={continueAsGuest} style={styles.guestBtn}>
          <Text style={styles.guestText}>Browse as guest →</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>No bank account required</Text>
      </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  inner:            { flex: 1 },
  scroll:           { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  logo:             { fontSize: 36, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 6 },
  tagline:          { fontSize: 15, color: '#FFFFFF99', textAlign: 'center', marginBottom: 40 },
  card:             { backgroundColor: 'white', borderRadius: 20, padding: 24, gap: 16 },
  modeTabs:         { flexDirection: 'row', backgroundColor: '#F0F4F0', borderRadius: 12, padding: 4 },
  modeTab:          { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  modeTabActive:    { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  modeTabText:      { fontSize: 14, fontWeight: '600', color: '#888' },
  modeTabTextActive:{ color: '#1B4332' },
  label:            { fontSize: 15, color: '#1B4332', fontWeight: '600' },
  labelHint:        { fontSize: 13, color: '#999', fontWeight: '400' },
  input:            { borderWidth: 1, borderColor: '#D0E8D8', borderRadius: 12, padding: 14, fontSize: 16 },
  otpInput:         { textAlign: 'center', letterSpacing: 8, fontSize: 24, fontWeight: '700' },
  btn:              { backgroundColor: '#2D6A4F', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnText:          { color: 'white', fontSize: 16, fontWeight: '700' },
  back:             { textAlign: 'center', color: '#2D6A4F', fontSize: 14 },
  devHint:          { backgroundColor: '#FFF3CD', padding: 8, borderRadius: 8, fontSize: 13, color: '#856404', textAlign: 'center' },
  guestBtn:         { marginTop: 20, alignItems: 'center', paddingVertical: 8 },
  guestText:        { color: '#FFFFFFCC', fontSize: 15, fontWeight: '500' },
  footer:           { textAlign: 'center', color: '#FFFFFF66', marginTop: 16, fontSize: 13 },
  error:            { color: '#D62828', fontSize: 13, textAlign: 'center' },
  slowHint:         { color: '#888', fontSize: 13, textAlign: 'center', marginTop: 6 },

  // Consent step
  consentTitle:     { fontSize: 18, fontWeight: '800', color: '#1B4332', textAlign: 'center' },
  consentBody:      { fontSize: 13, color: '#444', lineHeight: 20 },
  consentEmail:     { color: '#2D6A4F', fontWeight: '600' },
  checkRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox:         { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#2D6A4F', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxChecked:  { backgroundColor: '#2D6A4F' },
  checkmark:        { color: '#fff', fontSize: 13, fontWeight: '800' },
  checkLabel:       { flex: 1, fontSize: 13, color: '#333', lineHeight: 20 },
  optionalHint:     { color: '#999' },
  btnDisabled:      { backgroundColor: '#A8C5B5', opacity: 0.7 },
});
