import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { member as memberApi, pub as pubApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const FAVS_KEY = 'fav_business_ids';

async function loadFavIds() {
  try { return JSON.parse(await AsyncStorage.getItem(FAVS_KEY) || '[]'); } catch { return []; }
}
async function saveFavIds(ids) {
  await AsyncStorage.setItem(FAVS_KEY, JSON.stringify(ids));
}

const CATEGORIES = [
  { key: null,       label: 'All',      emoji: '🏙️' },
  { key: 'food',     label: 'Food',     emoji: '🍽️' },
  { key: 'services', label: 'Services', emoji: '✂️' },
  { key: 'shop',     label: 'Shop',     emoji: '🛍️' },
];

const CATEGORY_LABEL = { food: 'Food & Drink', services: 'Services', shop: 'Shop' };
const CATEGORY_EMOJI = { food: '🍽️', services: '✂️', shop: '🛍️' };

function BusinessCard({ item, onPress, isFav, onToggleFav }) {
  const [imgError, setImgError] = useState(false);
  const label = CATEGORY_LABEL[item.category] || item.category;
  const emoji = CATEGORY_EMOJI[item.category] || '🏪';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      {/* Cover */}
      <View style={styles.coverWrap}>
        {item.cover_url && !imgError ? (
          <Image source={{ uri: item.cover_url }} style={styles.cover} resizeMode="cover" onError={() => setImgError(true)} />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <Text style={styles.coverFallbackEmoji}>{emoji}</Text>
          </View>
        )}
        <View style={styles.coverGradient} pointerEvents="none" />
        <View style={styles.chipRow} pointerEvents="none">
          <View style={styles.chipCategory}><Text style={styles.chipText}>{label}</Text></View>
          <View style={styles.chipPts}><Text style={styles.chipPtsText}>+{item.points_rate} pts</Text></View>
        </View>
        {/* Favourite button */}
        <TouchableOpacity style={styles.favBtn} onPress={onToggleFav} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.favIcon}>{isFav ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        {!!item.address    && <Text style={styles.cardAddress} numberOfLines={1}>📍 {item.address}</Text>}
        {!!item.description && <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>}
      </View>
    </TouchableOpacity>
  );
}

export default function BusinessesScreen({ navigation }) {
  const { token } = useAuth();
  const [category,   setCategory]   = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favIds,     setFavIds]     = useState([]);

  useEffect(() => { loadFavIds().then(setFavIds); }, []);

  const load = async (cat, pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    try {
      const res = token ? await memberApi.businesses(cat) : await pubApi.businesses(cat);
      setBusinesses(res.data);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  async function toggleFav(id) {
    const next = favIds.includes(id) ? favIds.filter(f => f !== id) : [...favIds, id];
    setFavIds(next);
    await saveFavIds(next);
  }

  useEffect(() => { load(category); }, [category]);

  const favBusinesses = businesses.filter(b => favIds.includes(b.id));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Partner Businesses</Text>
        <Text style={styles.subtitle}>Earn points at every visit</Text>
      </View>

      <View style={styles.tabs}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={String(c.key)} style={[styles.tab, category === c.key && styles.tabActive]} onPress={() => setCategory(c.key)}>
            <Text style={styles.tabEmoji}>{c.emoji}</Text>
            <Text style={[styles.tabLabel, category === c.key && styles.tabLabelActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#2D6A4F" size="large" />
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <BusinessCard
              item={item}
              isFav={favIds.includes(item.id)}
              onToggleFav={() => toggleFav(item.id)}
              onPress={() => navigation.navigate('BusinessDetail', { businessId: item.id })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(category, true)} tintColor="#2D6A4F" />}
          ListHeaderComponent={favBusinesses.length > 0 ? (
            <View style={styles.favsSection}>
              <Text style={styles.favsSectionTitle}>❤️ Your Favourites</Text>
              {favBusinesses.map(item => (
                <BusinessCard
                  key={item.id}
                  item={item}
                  isFav={true}
                  onToggleFav={() => toggleFav(item.id)}
                  onPress={() => navigation.navigate('BusinessDetail', { businessId: item.id })}
                />
              ))}
              <Text style={styles.favsAllTitle}>All Businesses</Text>
            </View>
          ) : null}
          ListEmptyComponent={<Text style={styles.empty}>No businesses in this category yet.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#F5F7F5' },

  header:  { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title:   { fontSize: 26, fontWeight: '800', color: '#1B4332', letterSpacing: -0.5 },
  subtitle:{ fontSize: 14, color: '#6B7C6B', marginTop: 2 },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: '#fff',
    gap: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tabActive:      { backgroundColor: '#2D6A4F' },
  tabEmoji:       { fontSize: 17 },
  tabLabel:       { fontSize: 10, color: '#666', fontWeight: '700', letterSpacing: 0.3 },
  tabLabelActive: { color: '#fff' },

  list: { paddingHorizontal: 16, gap: 16, paddingBottom: 32, paddingTop: 4 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  coverWrap:     { width: '100%', height: 190, position: 'relative' },
  cover:         { width: '100%', height: '100%' },
  coverFallback: {
    backgroundColor: '#D8F3DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverFallbackEmoji: { fontSize: 52 },

  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent',
    // Simulated gradient via two layers
  },

  chipRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipCategory: {
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  chipText: { color: '#fff', fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  chipPts: {
    backgroundColor: '#2D6A4F',
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  chipPtsText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  cardBody: { padding: 16, gap: 5 },
  cardName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B4332',
    letterSpacing: -0.3,
  },
  cardAddress: { fontSize: 12, color: '#888', fontWeight: '500' },
  cardDesc:    { fontSize: 13, color: '#555', lineHeight: 19, marginTop: 2 },

  empty: { textAlign: 'center', color: '#AAA', marginTop: 60, fontSize: 15 },

  favBtn:          { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 99, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  favIcon:         { fontSize: 16 },
  favsSection:     { gap: 16, marginBottom: 8 },
  favsSectionTitle:{ fontSize: 16, fontWeight: '800', color: '#1B4332', marginBottom: 4 },
  favsAllTitle:    { fontSize: 16, fontWeight: '800', color: '#1B4332', marginTop: 8 },
});
