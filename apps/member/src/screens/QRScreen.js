import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCard from '../components/QRCard';
import TierBadge from '../components/TierBadge';
import { useAuth } from '../context/AuthContext';
import { Text } from 'react-native';

export default function QRScreen() {
  const { profile } = useAuth();
  if (!profile) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Your Code</Text>
        <Text style={styles.subtitle}>Show this at any In Common partner business to earn points</Text>

        <QRCard memberName={profile.name} tier={profile.tier} />

        <View style={styles.infoRow}>
          <TierBadge tier={profile.tier} size="md" />
          {profile.points_balance > 0
            ? <Text style={styles.balance}>{profile.points_balance.toLocaleString()} pts</Text>
            : <Text style={styles.balanceNew}>Earn your first points below 👇</Text>
          }
        </View>

        {profile.member_code && (
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Member Code</Text>
            <Text style={styles.codeValue}>{profile.member_code}</Text>
            <Text style={styles.codeHint}>Give this to staff if the QR won't scan</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How it works</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoEmoji}>🛒</Text>
            <Text style={styles.infoText}>Show your QR at checkout</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoEmoji}>✅</Text>
            <Text style={styles.infoText}>Staff scans and awards your Common Points</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoEmoji}>⭐</Text>
            <Text style={styles.infoText}>Points go straight to your balance</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoEmoji}>💚</Text>
            <Text style={styles.infoText}>Redeem pts as in-store credit any time</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#F5F7F5' },
  scroll:    { padding: 16, paddingBottom: 40, gap: 20 },
  title:     { fontSize: 26, fontWeight: '800', color: '#1B4332', textAlign: 'center' },
  subtitle:  { fontSize: 14, color: '#666', textAlign: 'center' },
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8 },
  balance:    { fontSize: 18, fontWeight: '700', color: '#1B4332' },
  balanceNew: { fontSize: 13, fontWeight: '600', color: '#2D6A4F', fontStyle: 'italic' },
  infoCard:  { backgroundColor: 'white', borderRadius: 20, padding: 20, gap: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  infoTitle: { fontSize: 16, fontWeight: '700', color: '#1B4332', marginBottom: 4 },
  infoItem:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoEmoji: { fontSize: 20 },
  infoText:  { flex: 1, fontSize: 14, color: '#444' },
  codeCard:  { backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', gap: 6, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  codeLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1.5 },
  codeValue: { fontSize: 38, fontWeight: '800', color: '#1B4332', letterSpacing: 8 },
  codeHint:  { fontSize: 12, color: '#AAA', textAlign: 'center' },
});
