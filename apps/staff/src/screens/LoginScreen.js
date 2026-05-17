import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login }    = useAuth();
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async () => {
    if (!phone.trim() || !password) return setError('Enter phone and password');
    setError('');
    setLoading(true);
    try {
      await login(phone.trim(), password);
    } catch (e) {
      setError(e.response?.data?.error || 'Check your credentials');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.logo}>In Common</Text>
          <Text style={styles.sub}>Staff Portal</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Phone number</Text>
          <TextInput
            style={styles.input}
            placeholder="+972 50 000 0000"
            value={phone}
            onChangeText={v => { setPhone(v); setError(''); }}
            keyboardType="phone-pad"
            autoCapitalize="none"
            onSubmitEditing={handleLogin}
            returnKeyType="next"
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={v => { setPassword(v); setError(''); }}
            secureTextEntry
            onSubmitEditing={handleLogin}
            returnKeyType="go"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {loading ? (
            <ActivityIndicator color="#2D6A4F" size="large" style={{ marginTop: 8 }} />
          ) : (
            <TouchableOpacity style={styles.btn} onPress={handleLogin}>
              <Text style={styles.btnText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#1B4332' },
  inner:   { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  header:  { alignItems: 'center', marginBottom: 48 },
  logo:    { fontSize: 36, fontWeight: '800', color: 'white' },
  sub:     { fontSize: 16, color: '#FFFFFF88', marginTop: 4 },
  form:    { backgroundColor: 'white', borderRadius: 24, padding: 28, gap: 12 },
  label:   { fontSize: 14, fontWeight: '600', color: '#1B4332' },
  input:   { borderWidth: 1, borderColor: '#D0E8D8', borderRadius: 12, padding: 14, fontSize: 16 },
  btn:       { backgroundColor: '#2D6A4F', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnText:   { color: 'white', fontSize: 16, fontWeight: '700' },
  errorText: { color: '#C1121F', fontSize: 13, textAlign: 'center', fontWeight: '600' },
});
