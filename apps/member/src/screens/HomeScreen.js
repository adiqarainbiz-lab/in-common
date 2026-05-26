import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, FlatList, Dimensions, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import TierBadge from '../components/TierBadge';
import { pub, member as memberApi } from '../services/api';

const CATEGORY_EMOJI = { food: '🍽️', services: '✂️', shop: '🛍️' };

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
  const [businesses,    setBusinesses]    = useState([]);
  const [referralStats, setReferralStats] = useState(null);
  const [recommended,   setRecommended]   = useState([]);

  useEffect(() => {
    pub.businesses().then(r => setBusinesses(r.data)).catch(() => {});
    memberApi.referral().then(r => setReferralStats(r.data)).catch(() => {});
    memberApi.recommended().then(r => setRecommended(r.data)).catch(() => {});
  }, []);

  async function handleShare() {
    if (!referralStats?.referral_code) return;
    try {
      await Share.share({
        message: `Join me on In Common — the loyalty app for Jerusalem's best spots!\n\nUse my code ${referralStats.referral_code} when you sign up and we both get 150 bonus points 🎁\n\nhttps://in-common.carrd.co`,
        title: 'Join In Common',
      });
    } catch { /* dismissed */ }
  }

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

        {/* ── Member stats row ─────────────────────────────────────── */}
        {(profile.total_visits > 0 || profile.lifetime_points_earned > 0) && (
          <View style={styles.memberStatsRow}>
            <View style={styles.memberStat}>
              <Text style={styles.memberStatVal}>{(profile.total_visits || 0)}</Text>
              <Text style={styles.memberStatLabel}>visits</Text>
            </View>
            <View style={styles.memberStatDivider} />
            <View style={styles.memberStat}>
              <Text style={styles.memberStatVal}>{(profile.lifetime_points_earned || 0).toLocaleString()}</Text>
              <Text style={styles.memberStatLabel}>pts earned ever</Text>
            </View>
            <View style={styles.memberStatDivider} />
            <View style={styles.memberStat}>
              <Text style={styles.memberStatVal}>{TIER_THRESHOLDS.find(t => profile.points_balance < t.pts)?.name || '🏅'}</Text>
              <Text style={styles.memberStatLabel}>next tier</Text>
            </View>
          </View>
        )}

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

        {/* ── Invite Friends ───────────────────────────────────────── */}
        {referralStats && (
          <View style={styles.inviteCard}>
            <LinearGradient colors={['#1B4332', '#2D6A4F']} style={styles.inviteGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <View style={styles.inviteLeft}>
                <Text style={styles.inviteTitle}>Invite Friends</Text>
                <Text style={styles.inviteSub}>You & your friend each get</Text>
                <Text style={styles.inviteBonus}>+150 pts 🎁</Text>
                {referralStats.friends_count > 0 && (
                  <Text style={styles.inviteCount}>
                    {referralStats.friends_count} friend{referralStats.friends_count !== 1 ? 's' : ''} joined so far
                  </Text>
                )}
              </View>
              <View style={styles.inviteRight}>
                <View style={styles.codeBox}>
                  <Text style={styles.codeLabel}>Your code</Text>
                  <Text style={styles.codeValue}>{referralStats.referral_code}</Text>
                </View>
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
                  <Text style={styles.shareBtnText}>Share 🔗</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        )}

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
                  onPress={() => navigation.navigate('BusinessDetail', { businessId: item.id })}
                />
              )}
            />
          </View>
        )}

        {/* ── Recommended for you ──────────────────────────────────── */}
        {recommended.length > 0 && (
          <View style={styles.offersSection}>
            <View style={styles.offersSectionHeader}>
              <Text style={styles.offersSectionTitle}>Recommended for You</Text>
            </View>
            <FlatList
              data={recommended}
              keyExtractor={b => b.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.offersList}
              snapToInterval={CARD_W + 12}
              decelerationRate="fast"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.recCard}
                  onPress={() => navigation.navigate('BusinessDetail', { businessId: item.id })}
                  activeOpacity={0.88}
                >
                  {item.cover_url || item.logo_url ? (
                    <Image source={{ uri: item.cover_url || item.logo_url }} style={styles.recImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.recImage, { backgroundColor: '#D8F3DC', alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ fontSize: 32 }}>{CATEGORY_EMOJI[item.category] || '🏪'}</Text>
                    </View>
                  )}
                  <View style={styles.recBody}>
                    <Text style={styles.recName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.recCategory}>{item.category}</Text>
                    <View style={styles.recPill}>
                      <Text style={styles.recPillText}>+{item.points_rate} pts/JD</Text>
                    </View>
                  </View>
                </TouchableOpacity>
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

  // Member stats row
  memberStatsRow:    { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  memberStat:        { flex: 1, alignItems: 'center', gap: 2 },
  memberStatVal:     { fontSize: 18, fontWeight: '900', color: '#1B4332' },
  memberStatLabel:   { fontSize: 11, color: '#888', fontWeight: '500' },
  memberStatDivider: { width: 1, backgroundColor: '#F0F0F0' },

  // Recommended cards
  recCard:    { width: CARD_W, borderRadius: 18, backgroundColor: '#fff', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8 },
  recImage:   { width: '100%', height: CARD_H * 0.65 },
  recBody:    { padding: 10, gap: 3 },
  recName:    { fontSize: 14, fontWeight: '800', color: '#1B4332' },
  recCategory:{ fontSize: 11, color: '#888', textTransform: 'capitalize' },
  recPill:    { alignSelf: 'flex-start', backgroundColor: '#E8F5E9', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  recPillText:{ fontSize: 10, color: '#2D6A4F', fontWeight: '700' },

  // Invite Friends
  inviteCard:        { marginHorizontal: 16, marginTop: 16, borderRadius: 20, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 12 },
  inviteGradient:    { flexDirection: 'row', padding: 20, gap: 16 },
  inviteLeft:        { flex: 1, gap: 4 },
  inviteTitle:       { color: 'white', fontSize: 17, fontWeight: '800' },
  inviteSub:         { color: 'rgba(255,255,255,0.72)', fontSize: 12 },
  inviteBonus:       { color: '#B7E4C7', fontSize: 20, fontWeight: '800', marginTop: 2 },
  inviteCount:       { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 },
  inviteRight:       { alignItems: 'center', gap: 10 },
  codeBox:           { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  codeLabel:         { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  codeValue:         { color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  shareBtn:          { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  shareBtnText:      { color: 'white', fontSize: 13, fontWeight: '700' },

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
