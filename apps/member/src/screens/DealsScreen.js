import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pub } from '../services/api';

function DealCard({ offer, onPress }) {
  const hasImage = !!offer.image_url;
  const daysLeft = offer.valid_until
    ? Math.ceil((new Date(offer.valid_until) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Offer image */}
      {hasImage && (
        <Image
          source={{ uri: offer.image_url }}
          style={styles.cardImage}
          resizeMode="cover"
          onError={e => { e.target.style = { display: 'none' }; }}
        />
      )}

      {/* Business row */}
      <View style={styles.bizRow}>
        {offer.business_logo ? (
          <Image source={{ uri: offer.business_logo }} style={styles.bizLogo} resizeMode="cover" />
        ) : (
          <View style={[styles.bizLogo, styles.bizLogoFallback]}>
            <Text style={{ fontSize: 14 }}>🏪</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.bizName}>{offer.business_name}</Text>
          <Text style={styles.bizCategory}>{offer.business_category}</Text>
        </View>
        {daysLeft !== null && (
          <View style={[
            styles.expiryPill,
            daysLeft <= 3 ? styles.expiryUrgent : styles.expiryNormal,
          ]}>
            <Text style={[
              styles.expiryText,
              daysLeft <= 3 ? styles.expiryTextUrgent : styles.expiryTextNormal,
            ]}>
              {daysLeft <= 0 ? 'Last day' : `${daysLeft}d left`}
            </Text>
          </View>
        )}
      </View>

      {/* Offer details */}
      <View style={styles.cardBody}>
        <Text style={styles.offerTitle}>{offer.title}</Text>
        {offer.description ? (
          <Text style={styles.offerDesc} numberOfLines={2}>{offer.description}</Text>
        ) : null}
        {offer.valid_from && (
          <Text style={styles.offerDates}>
            {offer.valid_from.slice(0, 10)}
            {offer.valid_until ? ` → ${offer.valid_until.slice(0, 10)}` : ''}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function DealsScreen({ navigation }) {
  const [offers,     setOffers]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(false);
    try {
      const { data } = await pub.allOffers();
      setOffers(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Deals</Text>
          <Text style={styles.headerSub}>Exclusive offers from partner businesses</Text>
        </View>
        <ActivityIndicator style={{ marginTop: 60 }} color="#2D6A4F" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={offers}
        keyExtractor={o => o.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#2D6A4F" />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Deals</Text>
            <Text style={styles.headerSub}>Exclusive offers from partner businesses</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {error ? (
              <>
                <Text style={styles.emptyEmoji}>⚠️</Text>
                <Text style={styles.emptyTitle}>Couldn't load deals</Text>
                <TouchableOpacity onPress={() => load()} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Try again</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.emptyEmoji}>🏷️</Text>
                <Text style={styles.emptyTitle}>No deals right now</Text>
                <Text style={styles.emptySub}>Check back soon — businesses add new offers regularly.</Text>
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <DealCard
            offer={item}
            onPress={() => navigation.navigate('BusinessDetail', { businessId: item.business_id })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#F5F7F5' },
  list:            { paddingBottom: 40 },

  header:          { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  headerTitle:     { fontSize: 28, fontWeight: '900', color: '#1B4332' },
  headerSub:       { fontSize: 14, color: '#888', marginTop: 4 },

  // Deal card
  card:            {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#fff', borderRadius: 18,
    overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10,
  },
  cardImage:       { width: '100%', height: 180 },

  bizRow:          { flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 10, gap: 10 },
  bizLogo:         { width: 38, height: 38, borderRadius: 10, backgroundColor: '#E8F5E9' },
  bizLogoFallback: { alignItems: 'center', justifyContent: 'center' },
  bizName:         { fontSize: 14, fontWeight: '700', color: '#1B4332' },
  bizCategory:     { fontSize: 12, color: '#888', textTransform: 'capitalize', marginTop: 1 },

  expiryPill:      { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  expiryNormal:    { backgroundColor: '#F0FFF4' },
  expiryUrgent:    { backgroundColor: '#FEF2F2' },
  expiryText:      { fontSize: 11, fontWeight: '700' },
  expiryTextNormal:{ color: '#2D6A4F' },
  expiryTextUrgent:{ color: '#DC2626' },

  cardBody:        { paddingHorizontal: 14, paddingBottom: 16, gap: 6 },
  offerTitle:      { fontSize: 17, fontWeight: '800', color: '#111' },
  offerDesc:       { fontSize: 14, color: '#555', lineHeight: 20 },
  offerDates:      { fontSize: 12, color: '#2D6A4F', fontWeight: '600', marginTop: 2 },

  // Empty / error
  empty:           { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyEmoji:      { fontSize: 48, marginBottom: 16 },
  emptyTitle:      { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8, textAlign: 'center' },
  emptySub:        { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
  retryBtn:        { marginTop: 16, backgroundColor: '#2D6A4F', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
});
