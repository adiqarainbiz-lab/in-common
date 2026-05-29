import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { member as memberApi } from '../services/api';

const TIER_EMOJI = { Seedling: '🌱', Olive: '🫒', Cedar: '🌲', Keffiyeh: '🏅' };

function StatPill({ label, value, sub }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

function AchievementBadge({ badge }) {
  return (
    <View style={[styles.badge, !badge.unlocked && styles.badgeLocked]}>
      <Text style={[styles.badgeEmoji, !badge.unlocked && { opacity: 0.3 }]}>{badge.emoji}</Text>
      <Text style={[styles.badgeTitle, !badge.unlocked && styles.badgeTitleLocked]} numberOfLines={1}>
        {badge.title}
      </Text>
      <Text style={[styles.badgeDesc, !badge.unlocked && { opacity: 0.4 }]} numberOfLines={2}>
        {badge.desc}
      </Text>
      {!badge.unlocked && <View style={styles.lockOverlay}><Text style={styles.lockIcon}>🔒</Text></View>}
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { profile, logout, refreshProfile } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [refreshing,   setRefreshing]   = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [, achRes] = await Promise.allSettled([
        refreshProfile(),
        memberApi.achievements(),
      ]);
      if (achRes.status === 'fulfilled') setAchievements(achRes.value.data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  if (!profile) return null;

  const initials = profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const unlocked = achievements.filter(a => a.unlocked).length;

  function copyCode() {
    Clipboard.setString(profile.member_code);
    Alert.alert('Copied!', 'Your member code has been copied.');
  }

  function confirmLogout() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#fff" />}
      >
        {/* ── Header ── */}
        <LinearGradient colors={['#1B4332', '#2D6A4F']} style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.since}>Member since {memberSince}</Text>
          <View style={styles.tierRow}>
            <Text style={styles.tierEmoji}>{TIER_EMOJI[profile.tier]}</Text>
            <Text style={styles.tierLabel}>{profile.tier}</Text>
          </View>
        </LinearGradient>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <StatPill label="Points" value={profile.points_balance.toLocaleString()} sub="balance" />
          <View style={styles.statDivider} />
          <StatPill label="Visits" value={(profile.total_visits || 0).toLocaleString()} sub="all-time" />
          <View style={styles.statDivider} />
          <StatPill label="Earned" value={(profile.lifetime_points_earned || 0).toLocaleString()} sub="pts ever" />
        </View>

        {/* ── Member ID card ── */}
        <TouchableOpacity style={styles.idCard} onPress={copyCode} activeOpacity={0.8}>
          <View>
            <Text style={styles.idLabel}>Member Code</Text>
            <Text style={styles.idCode}>{profile.member_code}</Text>
            <Text style={styles.idHint}>Tap to copy · Share to earn referral bonus</Text>
          </View>
          <Text style={styles.idIcon}>🪪</Text>
        </TouchableOpacity>

        {/* ── Achievements ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <Text style={styles.sectionSub}>{unlocked}/{achievements.length} unlocked</Text>
          </View>
          <View style={styles.badgeGrid}>
            {achievements.map(a => <AchievementBadge key={a.id} badge={a} />)}
          </View>
        </View>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('EditProfile')}>
            <Text style={styles.actionBtnText}>✏️  Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('History')}>
            <Text style={styles.actionBtnText}>📜  Transaction History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={confirmLogout}>
            <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#F5F7F5' },

  // Header
  header:    { alignItems: 'center', paddingTop: 36, paddingBottom: 32, gap: 8 },
  avatar:    { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText:{ fontSize: 30, fontWeight: '800', color: '#fff' },
  name:      { fontSize: 22, fontWeight: '800', color: '#fff' },
  since:     { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  tierRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 6 },
  tierEmoji: { fontSize: 16 },
  tierLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Stats
  statsRow:   { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: -20, borderRadius: 18, padding: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12 },
  statPill:   { flex: 1, alignItems: 'center', gap: 2 },
  statDivider:{ width: 1, backgroundColor: '#f0f0f0' },
  statValue:  { fontSize: 22, fontWeight: '900', color: '#1B4332' },
  statLabel:  { fontSize: 12, fontWeight: '700', color: '#555' },
  statSub:    { fontSize: 10, color: '#aaa' },

  // Member ID card
  idCard:    { margin: 16, backgroundColor: '#1B4332', borderRadius: 18, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  idLabel:   { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  idCode:    { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 4 },
  idHint:    { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 6 },
  idIcon:    { fontSize: 36 },

  // Achievements
  section:       { marginHorizontal: 16, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { fontSize: 17, fontWeight: '800', color: '#1B4332' },
  sectionSub:    { fontSize: 13, color: '#888' },
  badgeGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge:         { width: '31%', backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', gap: 4, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, position: 'relative', overflow: 'hidden' },
  badgeLocked:   { backgroundColor: '#f9f9f9' },
  badgeEmoji:    { fontSize: 28 },
  badgeTitle:    { fontSize: 11, fontWeight: '800', color: '#1B4332', textAlign: 'center' },
  badgeTitleLocked: { color: '#bbb' },
  badgeDesc:     { fontSize: 10, color: '#888', textAlign: 'center', lineHeight: 13 },
  lockOverlay:   { position: 'absolute', top: 6, right: 6 },
  lockIcon:      { fontSize: 10 },

  // Actions
  actions:           { margin: 16, marginTop: 20, gap: 10 },
  actionBtn:         { backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 },
  actionBtnDanger:   { backgroundColor: '#FEF2F2' },
  actionBtnText:     { fontSize: 15, fontWeight: '700', color: '#1B4332' },
  actionBtnTextDanger:{ color: '#DC2626' },
});
