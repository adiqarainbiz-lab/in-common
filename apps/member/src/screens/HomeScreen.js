import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, FlatList, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import TierBadge from '../components/TierBadge';
import { pub } from '../services/api';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.52;
const CARD_H = CARD_W * 1.3;

const TIER_THRESHOLDS = [
  { name: 'Olive',    pts: 500  },
  { name: 'Cedar',    pts: 2000 },
  { name: 'Keffiyeh', pts: 5000 },
];

function nextTierInfo(points) {
  const next = TIER_THRESHOLDS.find((t) => points < t.pts);
  if (!next) return null;
  return { name: next.name, remaining: next.pts - points, target: next.pts };
}

function OfferCard({ biz, onPress }) {
  return (
    <TouchableOpacity style={styles.offerCard} onPress={onPress} activeOpacity={0.88}>
      <Image
        source={{ uri: biz.cover_url || biz.logo_url }}
        style={styles.offerImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.72)']}
        style={styles.offerGradient}
      >
        {/* Points rate pill */}
        <View style={styles.offerPill}>
          <Text style={styles.offerPillText}>+{biz.points_rate} pts/JD</Text>
        </View>

        {/* Bottom info */}
        <View style={styles.offerBottom}>
          <Text style={styles.offerName} numberOfLines={1}>{biz.name}</Text>
          <Text style={styles.offerCategory}>{biz.category}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const { profile } = useAuth();
  const [businesses, setBusinesses] = useState([]);

  useEffect(() => {
    pub.businesses().then(r => setBusinesses(r.data)).catch(() => {});
  }, []);

  if (!profile) return null;

  const next     = nextTierInfo(profile.points_balance);
  const progress = next ? ((profile.points_balance / next.target) * 100).toFixed(0) : 100;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ───────────────────────────────────────────────── */}
        <LinearGradient colors={['#1B4332', '#2D6A4F']} style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.greeting}>مرحبا، {profile.name}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
              <Text style={styles.editText}>✏️</Text>
            </TouchableOpacity>
          </View>
          <TierBadge tier={profile.tier} size="lg" />
        </LinearGradient>

        {/* ── Points card ──────────────────────────────────────────── */}
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>Common Points</Text>
          <Text style={styles.pointsValue}>{profile.points_balance.toLocaleString()}</Text>
          {profile.points_balance === 0 ? (
            <TouchableOpacity onPress={() => navigation.navigate('Businesses')}>
              <Text style={styles.pointsSubtextCta}>Visit a partner business to start earning →</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.pointsSubtext}>pts — redeem as in-store credit</Text>
          )}
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

        {/* ── First-visit nudge ────────────────────────────────────── */}
        {profile.points_balance === 0 && (
          <TouchableOpacity style={styles.firstVisitCard} onPress={() => navigation.navigate('QR')} activeOpacity={0.85}>
            <Text style={styles.firstVisitEmoji}>👋</Text>
            <View style={styles.firstVisitText}>
              <Text style={styles.firstVisitTitle}>Ready to earn your first points?</Text>
              <Text style={styles.firstVisitSub}>Show your QR code at any partner business.</Text>
            </View>
            <Text style={styles.firstVisitArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* ── Quick actions ────────────────────────────────────────── */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('QR')}>
            <Text style={styles.actionIcon}>📱</Text>
            <Text style={styles.actionLabel}>My QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Businesses')}>
            <Text style={styles.actionIcon}>🏪</Text>
            <Text style={styles.actionLabel}>Spots</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('History')}>
            <Text style={styles.actionIcon}>📜</Text>
            <Text style={styles.actionLabel}>History</Text>
          </TouchableOpacity>
        </View>

        {/* ── Around Jerusalem ─────────────────────────────────────── */}
        {businesses.length > 0 && (
          <View style={styles.offersSection}>
            <View style={styles.offersSectionHeader}>
              <Text style={styles.offersSectionTitle}>Around Jerusalem</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Businesses')}>
                <Text style={styles.offersSeeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={businesses}
              keyExtractor={b => b.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.offersList}
              snapToInterval={CARD_W + 12}
              decelerationRate="fast"
              renderItem={({ item }) => (
                <OfferCard
                  biz={item}
                  onPress={() => navigation.navigate('BusinessDetail', { business: item })}
                />
              )}
            />
          </View>
        )}

        {/* ── Tier ladder ──────────────────────────────────────────── */}
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
  safe:              { flex: 1, backgroundColor: '#F5F7F5' },
  scroll:            { paddingBottom: 40 },

  // Header
  header:            { padding: 24, paddingTop: 32, gap: 16 },
  headerTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting:          { color: 'white', fontSize: 20, fontWeight: '700' },
  editText:          { color: '#FFFFFFCC', fontSize: 18 },

  // Points card
  pointsCard:        { margin: 16, backgroundColor: 'white', borderRadius: 20, padding: 24, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12 },
  pointsLabel:       { color: '#666', fontSize: 14, marginBottom: 4 },
  pointsValue:       { fontSize: 48, fontWeight: '800', color: '#1B4332', lineHeight: 56 },
  pointsSubtext:     { color: '#2D6A4F', fontSize: 14, marginBottom: 20 },
  pointsSubtextCta:  { color: '#2D6A4F', fontSize: 14, marginBottom: 20, textDecorationLine: 'underline', fontWeight: '600' },
  progressSection:   { gap: 8 },
  progressHeader:    { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel:     { fontSize: 13, color: '#555' },
  progressPct:       { fontSize: 13, color: '#2D6A4F', fontWeight: '600' },
  progressBar:       { height: 8, backgroundColor: '#E8F5E9', borderRadius: 4, overflow: 'hidden' },
  progressFill:      { height: '100%', backgroundColor: '#2D6A4F', borderRadius: 4 },

  // First-visit nudge
  firstVisitCard:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#E8F5E9', borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: '#C8E6C9' },
  firstVisitEmoji:   { fontSize: 28 },
  firstVisitText:    { flex: 1 },
  firstVisitTitle:   { fontSize: 14, fontWeight: '700', color: '#1B4332', marginBottom: 2 },
  firstVisitSub:     { fontSize: 12, color: '#2D6A4F', lineHeight: 17 },
  firstVisitArrow:   { fontSize: 24, color: '#2D6A4F', fontWeight: '300' },

  // Quick actions
  actions:           { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 4, marginTop: 4 },
  actionBtn:         { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 16, alignItems: 'center', gap: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  actionIcon:        { fontSize: 26 },
  actionLabel:       { fontSize: 12, color: '#333', fontWeight: '600' },

  // Around Jerusalem
  offersSection:     { marginTop: 20 },
  offersSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 14 },
  offersSectionTitle:  { fontSize: 18, fontWeight: '800', color: '#1B4332' },
  offersSeeAll:        { fontSize: 13, color: '#2D6A4F', fontWeight: '600' },
  offersList:          { paddingHorizontal: 16, gap: 12 },

  offerCard:         {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#D0E8D8',
  },
  offerImage:        { ...StyleSheet.absoluteFillObject },
  offerGradient:     {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 12,
  },
  offerPill:         {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  offerPillText:     { color: 'white', fontSize: 11, fontWeight: '700' },
  offerBottom:       { gap: 2 },
  offerName:         { color: 'white', fontSize: 15, fontWeight: '800' },
  offerCategory:     { color: 'rgba(255,255,255,0.72)', fontSize: 12, textTransform: 'capitalize' },

  // Tier ladder
  section:           { margin: 16, backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  sectionTitle:      { fontSize: 16, fontWeight: '700', color: '#1B4332', marginBottom: 16 },
  tierRow:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 12 },
  tierRowActive:     { backgroundColor: '#F0FAF5', borderRadius: 12, paddingHorizontal: 8 },
  tierEmoji:         { fontSize: 24 },
  tierInfo:          { flex: 1 },
  tierName:          { fontSize: 15, fontWeight: '600', color: '#888' },
  tierReached:       { color: '#1B4332' },
  tierMin:           { fontSize: 13, color: '#AAA', marginTop: 2 },
  tierDot:           { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2D6A4F' },
});
