import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import TierBadge from '../components/TierBadge';

const TIER_THRESHOLDS = [
  { name: 'Olive',    pts: 500  },
  { name: 'Cedar',    pts: 2000 },
  { name: 'Keffiyeh', pts: 5000 },
];

function nextTierInfo(points, currentTier) {
  const next = TIER_THRESHOLDS.find((t) => points < t.pts);
  if (!next) return null;
  return { name: next.name, remaining: next.pts - points, target: next.pts };
}

export default function HomeScreen({ navigation }) {
  const { profile, logout } = useAuth();
  if (!profile) return null;

  const next = nextTierInfo(profile.points_balance, profile.tier);
  const progress = next
    ? ((profile.points_balance / next.target) * 100).toFixed(0)
    : 100;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <LinearGradient colors={['#1B4332', '#2D6A4F']} style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.greeting}>مرحبا، {profile.name}</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
                <Text style={styles.editText}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={logout}>
                <Text style={styles.logoutText}>Sign out</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TierBadge tier={profile.tier} size="lg" />
        </LinearGradient>

        {/* Points card */}
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>Common Points</Text>
          <Text style={styles.pointsValue}>{profile.points_balance.toLocaleString()}</Text>
          <Text style={styles.pointsSubtext}>Common Points — redeem in-store</Text>

          {next && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>{next.remaining} pts to {next.name}</Text>
                <Text style={styles.progressPct}>{progress}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
          )}
        </View>

        {/* Quick actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('QR')}>
            <Text style={styles.actionIcon}>📱</Text>
            <Text style={styles.actionLabel}>My QR Code</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Businesses')}>
            <Text style={styles.actionIcon}>🏪</Text>
            <Text style={styles.actionLabel}>Businesses</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('History')}>
            <Text style={styles.actionIcon}>📜</Text>
            <Text style={styles.actionLabel}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Tier ladder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Journey</Text>
          {[
            { name: 'Seedling', min: 0,    emoji: '🌱' },
            { name: 'Olive',    min: 500,  emoji: '🫒' },
            { name: 'Cedar',    min: 2000, emoji: '🌲' },
            { name: 'Keffiyeh', min: 5000, emoji: '🏅' },
          ].map((t) => {
            const active  = profile.tier === t.name;
            const reached = profile.points_balance >= t.min;
            return (
              <View key={t.name} style={[styles.tierRow, active && styles.tierRowActive]}>
                <Text style={styles.tierEmoji}>{t.emoji}</Text>
                <View style={styles.tierInfo}>
                  <Text style={[styles.tierName, reached && styles.tierReached]}>{t.name}</Text>
                  <Text style={styles.tierMin}>{t.min.toLocaleString()} pts</Text>
                </View>
                {active && <View style={styles.tierDot} />}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#F5F7F5' },
  scroll:          { paddingBottom: 32 },
  header:          { padding: 24, paddingTop: 32, gap: 16 },
  headerTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting:        { color: 'white', fontSize: 20, fontWeight: '700' },
  headerActions:   { flexDirection: 'row', alignItems: 'center', gap: 16 },
  editText:        { color: '#FFFFFFCC', fontSize: 14 },
  logoutText:      { color: '#FFFFFF88', fontSize: 14 },
  pointsCard:      { margin: 16, backgroundColor: 'white', borderRadius: 20, padding: 24, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12 },
  pointsLabel:     { color: '#666', fontSize: 14, marginBottom: 4 },
  pointsValue:     { fontSize: 48, fontWeight: '800', color: '#1B4332', lineHeight: 56 },
  pointsSubtext:   { color: '#2D6A4F', fontSize: 14, marginBottom: 20 },
  progressSection: { gap: 8 },
  progressHeader:  { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel:   { fontSize: 13, color: '#555' },
  progressPct:     { fontSize: 13, color: '#2D6A4F', fontWeight: '600' },
  progressBar:     { height: 8, backgroundColor: '#E8F5E9', borderRadius: 4, overflow: 'hidden' },
  progressFill:    { height: '100%', backgroundColor: '#2D6A4F', borderRadius: 4 },
  actions:         { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 8 },
  actionBtn:       { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 16, alignItems: 'center', gap: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  actionIcon:      { fontSize: 28 },
  actionLabel:     { fontSize: 12, color: '#333', fontWeight: '600', textAlign: 'center' },
  section:         { margin: 16, backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  sectionTitle:    { fontSize: 16, fontWeight: '700', color: '#1B4332', marginBottom: 16 },
  tierRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 12 },
  tierRowActive:   { backgroundColor: '#F0FAF5', borderRadius: 12, paddingHorizontal: 8 },
  tierEmoji:       { fontSize: 24 },
  tierInfo:        { flex: 1 },
  tierName:        { fontSize: 15, fontWeight: '600', color: '#888' },
  tierReached:     { color: '#1B4332' },
  tierMin:         { fontSize: 13, color: '#AAA', marginTop: 2 },
  tierDot:         { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2D6A4F' },
});
