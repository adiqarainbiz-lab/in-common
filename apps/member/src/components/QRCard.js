import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { member as memberApi } from '../services/api';

const REFRESH_INTERVAL = 60; // seconds

export default function QRCard({ memberName, tier }) {
  const [qrToken,    setQrToken]    = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef  = useRef(null);

  const pulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.85, duration: 150, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const fetchToken = async () => {
    try {
      setLoading(true);
      const res = await memberApi.qrToken();
      setQrToken(res.data.token);
      setSecondsLeft(REFRESH_INTERVAL);
      setError(null);
      pulse();
    } catch {
      setError('Could not refresh QR. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { fetchToken(); return REFRESH_INTERVAL; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [qrToken]);

  const urgency = secondsLeft <= 10;
  const ringColor = urgency ? '#C1121F' : '#2D6A4F';

  return (
    <LinearGradient colors={['#1B4332', '#2D6A4F']} style={styles.card}>
      <Text style={styles.appName}>In Common</Text>
      <Text style={styles.memberName}>{memberName}</Text>

      <Animated.View style={[styles.qrWrapper, { transform: [{ scale: pulseAnim }], borderColor: ringColor }]}>
        {loading ? (
          <ActivityIndicator size="large" color="#2D6A4F" style={styles.loader} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <QRCode value={qrToken} size={200} backgroundColor="white" color="#1A1A1A" />
        )}
      </Animated.View>

      <View style={styles.timerRow}>
        <View style={[styles.timerDot, { backgroundColor: urgency ? '#C1121F' : '#52B788' }]} />
        <Text style={[styles.timerText, urgency && styles.timerUrgent]}>
          Refreshes in {secondsLeft}s
        </Text>
      </View>

      <Text style={styles.hint}>Show this code to any partner business</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card:        { borderRadius: 24, padding: 28, alignItems: 'center', marginHorizontal: 16 },
  appName:     { color: '#FFFFFF88', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  memberName:  { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 24 },
  qrWrapper:   { backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 3, marginBottom: 20 },
  loader:      { width: 200, height: 200, justifyContent: 'center' },
  error:       { width: 200, height: 200, textAlign: 'center', color: '#C1121F', padding: 16, textAlignVertical: 'center' },
  timerRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  timerDot:    { width: 8, height: 8, borderRadius: 4 },
  timerText:   { color: '#FFFFFF', fontSize: 14 },
  timerUrgent: { color: '#FF6B6B', fontWeight: '700' },
  hint:        { color: '#FFFFFF66', fontSize: 12, textAlign: 'center' },
});
