import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Linking, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pub as pubApi, member as memberApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORY_LABEL = { food: 'Food & Drink', services: 'Services', shop: 'Shop' };

function InfoRow({ icon, label, value, onPress }) {
  const content = (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoText}>
        {label ? <Text style={styles.infoLabel}>{label}</Text> : null}
        <Text style={[styles.infoValue, onPress && styles.infoValueLink]}>{value}</Text>
      </View>
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
  return content;
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function PointsCalculator({ pointsRate }) {
  const [spend, setSpend] = useState('');
  const earned = spend ? Math.round(parseFloat(spend) * pointsRate) : null;

  return (
    <View style={styles.calcCard}>
      <Text style={styles.calcTitle}>💰 Points Calculator</Text>
      <Text style={styles.calcSub}>How much will you earn?</Text>
      <View style={styles.calcRow}>
        <View style={styles.calcInputWrap}>
          <Text style={styles.calcCurrency}>JD</Text>
          <TextInput
            style={styles.calcInput}
            value={spend}
            onChangeText={setSpend}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#aaa"
          />
        </View>
        <Text style={styles.calcArrow}>→</Text>
        <View style={styles.calcResult}>
          <Text style={styles.calcPts}>{earned !== null && !isNaN(earned) ? earned.toLocaleString() : '—'}</Text>
          <Text style={styles.calcPtsLabel}>pts</Text>
        </View>
      </View>
      <Text style={styles.calcRate}>Rate: {pointsRate} pts per JD spent</Text>
    </View>
  );
}

export default function BusinessDetailScreen({ route, navigation }) {
  const { businessId } = route.params;
  const { token } = useAuth();
  const [business, setBusiness] = useState(null);
  const [offers,   setOffers]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [bizRes, offersRes] = await Promise.all([
          pubApi.business(businessId),
          pubApi.businessOffers(businessId),
        ]);
        setBusiness(bizRes.data);
        setOffers(offersRes.data);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, [businessId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ flex: 1 }} color="#2D6A4F" size="large" />
      </SafeAreaView>
    );
  }

  if (!business) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ textAlign: 'center', color: '#888', marginTop: 60 }}>Business not found.</Text>
      </SafeAreaView>
    );
  }

  const discountLines = business.discounts
    ? business.discounts.split('\n').map(l => l.trim()).filter(Boolean)
    : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroWrap}>
          {business.cover_url && !imgError ? (
            <Image
              source={{ uri: business.cover_url }}
              style={styles.hero}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={[styles.hero, styles.heroFallback]}>
              <Text style={{ fontSize: 64 }}>🏪</Text>
            </View>
          )}
          {/* dark overlay gradient at bottom */}
          <View style={styles.heroGradient} />

          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          {/* Points chip top-right */}
          <View style={styles.ptsChip}>
            <Text style={styles.ptsChipText}>+{business.points_rate} pts / visit</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Name + category */}
          <View style={styles.nameRow}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>
                {CATEGORY_LABEL[business.category] || business.category}
              </Text>
            </View>
          </View>
          <Text style={styles.name}>{business.name}</Text>
          {!!business.address && (
            <Text style={styles.address}>📍 {business.address}</Text>
          )}

          {/* Description */}
          {!!business.description && (
            <Section title="About">
              <Text style={styles.description}>{business.description}</Text>
            </Section>
          )}

          {/* Hours */}
          {!!business.hours && (
            <Section title="Opening Hours">
              <InfoRow icon="🕐" value={business.hours} />
            </Section>
          )}

          {/* Discounts */}
          {discountLines.length > 0 && (
            <Section title="Member Discounts & Offers">
              {discountLines.map((line, i) => (
                <InfoRow key={i} icon="🏷️" value={line} />
              ))}
            </Section>
          )}

          {/* Contact */}
          {(business.phone || business.website || business.instagram) && (
            <Section title="Contact">
              {!!business.phone && (
                <InfoRow
                  icon="📞" value={business.phone}
                  onPress={() => Linking.openURL(`tel:${business.phone}`)}
                />
              )}
              {!!business.website && (
                <InfoRow
                  icon="🌐" value={business.website}
                  onPress={() => Linking.openURL(business.website)}
                />
              )}
              {!!business.instagram && (
                <InfoRow
                  icon="📸" value={business.instagram}
                  onPress={() => Linking.openURL(`https://instagram.com/${business.instagram.replace('@', '')}`)}
                />
              )}
            </Section>
          )}

          {/* Points Calculator */}
          <PointsCalculator pointsRate={business.points_rate} />

          {/* Offers */}
          {offers.length > 0 && (
            <Section title="Offers & Deals">
              {offers.map(offer => (
                <View key={offer.id} style={styles.offerCard}>
                  {!!offer.image_url && (
                    <Image source={{ uri: offer.image_url }} style={styles.offerImage} resizeMode="cover" />
                  )}
                  <View style={styles.offerBody}>
                    <Text style={styles.offerTitle}>{offer.title}</Text>
                    {!!offer.description && <Text style={styles.offerDesc}>{offer.description}</Text>}
                    {!!offer.valid_until && (
                      <Text style={styles.offerDate}>
                        Until {new Date(offer.valid_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </Section>
          )}

          {/* Menu */}
          {!!business.menu_url && (
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => Linking.openURL(business.menu_url)}
            >
              <Text style={styles.menuBtnText}>View Menu →</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7F5' },

  heroWrap:     { width: '100%', height: 300, position: 'relative' },
  hero:         { width: '100%', height: '100%' },
  heroFallback: { backgroundColor: '#D8F3DC', alignItems: 'center', justifyContent: 'center' },
  heroGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },

  backBtn: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7,
  },
  backText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  ptsChip: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: '#2D6A4F',
    borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7,
  },
  ptsChipText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  body: { padding: 20 },

  nameRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  categoryChip:  { backgroundColor: '#E8F5E9', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  categoryChipText: { color: '#2D6A4F', fontSize: 12, fontWeight: '700' },

  name:    { fontSize: 28, fontWeight: '900', color: '#1B4332', letterSpacing: -0.5, marginBottom: 4 },
  address: { fontSize: 13, color: '#777', marginBottom: 4 },

  section:      { marginTop: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#1B4332', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },

  description: { fontSize: 15, color: '#444', lineHeight: 23 },

  infoRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  infoIcon:     { fontSize: 18, width: 24, textAlign: 'center', marginTop: 1 },
  infoText:     { flex: 1 },
  infoLabel:    { fontSize: 11, color: '#999', fontWeight: '600', textTransform: 'uppercase', marginBottom: 1 },
  infoValue:    { fontSize: 14, color: '#333', lineHeight: 20 },
  infoValueLink:{ color: '#2D6A4F', textDecorationLine: 'underline' },

  menuBtn: {
    marginTop: 28,
    backgroundColor: '#2D6A4F',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  menuBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  // Calculator
  calcCard:       { marginTop: 24, backgroundColor: '#F0FAF5', borderRadius: 18, padding: 18, gap: 6 },
  calcTitle:      { fontSize: 15, fontWeight: '800', color: '#1B4332' },
  calcSub:        { fontSize: 13, color: '#666', marginBottom: 8 },
  calcRow:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  calcInputWrap:  { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1.5, borderColor: '#D0E8D8', gap: 6 },
  calcCurrency:   { fontSize: 16, fontWeight: '700', color: '#2D6A4F' },
  calcInput:      { flex: 1, fontSize: 20, fontWeight: '700', color: '#1B4332' },
  calcArrow:      { fontSize: 20, color: '#2D6A4F', fontWeight: '700' },
  calcResult:     { flex: 1, alignItems: 'center', backgroundColor: '#1B4332', borderRadius: 12, paddingVertical: 10 },
  calcPts:        { fontSize: 22, fontWeight: '900', color: '#fff' },
  calcPtsLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  calcRate:       { fontSize: 11, color: '#888', marginTop: 4 },

  offerCard:  { backgroundColor: '#F0FAF5', borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  offerImage: { width: '100%', height: 160 },
  offerBody:  { padding: 14, gap: 4 },
  offerTitle: { fontSize: 15, fontWeight: '800', color: '#1B4332' },
  offerDesc:  { fontSize: 13, color: '#444', lineHeight: 19 },
  offerDate:  { fontSize: 12, color: '#2D6A4F', fontWeight: '600', marginTop: 4 },
});
