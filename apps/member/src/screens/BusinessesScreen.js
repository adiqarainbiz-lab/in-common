import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { member as memberApi } from '../services/api';

const CATEGORIES = [
  { key: null,       label: 'All',      emoji: '🏙️' },
  { key: 'food',     label: 'Food',     emoji: '🍽️' },
  { key: 'shop',     label: 'Shop',     emoji: '🛍️' },
  { key: 'services', label: 'Services', emoji: '🔧' },
];

function BusinessCard({ item }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardEmoji}>{CATEGORIES.find(c => c.key === item.category)?.emoji || '🏪'}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardAddress}>{item.address}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardRate}>{item.points_rate}</Text>
        <Text style={styles.cardRateLabel}>pts per visit</Text>
      </View>
    </View>
  );
}

export default function BusinessesScreen() {
  const [category,    setCategory]    = useState(null);
  const [businesses,  setBusinesses]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  const load = async (cat, pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    try {
      const res = await memberApi.businesses(cat);
      setBusinesses(res.data);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(category); }, [category]);

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Partner Businesses</Text>
      <Text style={styles.subtitle}>Earn points at every visit</Text>

      <View style={styles.tabs}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={String(c.key)}
            style={[styles.tab, category === c.key && styles.tabActive]}
            onPress={() => setCategory(c.key)}
          >
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
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <BusinessCard item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(category, true)} />}
          ListEmptyComponent={<Text style={styles.empty}>No businesses in this category yet.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F5F7F5' },
  title:         { fontSize: 24, fontWeight: '800', color: '#1B4332', paddingHorizontal: 16, paddingTop: 16 },
  subtitle:      { fontSize: 14, color: '#666', paddingHorizontal: 16, marginBottom: 16 },
  tabs:          { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  tab:           { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, backgroundColor: 'white', gap: 4 },
  tabActive:     { backgroundColor: '#2D6A4F' },
  tabEmoji:      { fontSize: 18 },
  tabLabel:      { fontSize: 11, color: '#555', fontWeight: '600' },
  tabLabelActive:{ color: 'white' },
  list:          { padding: 12, gap: 12, paddingBottom: 32 },
  card:          { backgroundColor: 'white', borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  cardLeft:      { width: 48, height: 48, backgroundColor: '#E8F5E9', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardEmoji:     { fontSize: 24 },
  cardBody:      { flex: 1, gap: 3 },
  cardName:      { fontSize: 16, fontWeight: '700', color: '#1B4332' },
  cardAddress:   { fontSize: 12, color: '#888' },
  cardDesc:      { fontSize: 13, color: '#555' },
  cardRight:     { alignItems: 'center', justifyContent: 'center', minWidth: 44 },
  cardRate:      { fontSize: 20, fontWeight: '800', color: '#2D6A4F' },
  cardRateLabel: { fontSize: 10, color: '#888' },
  empty:         { textAlign: 'center', color: '#AAA', marginTop: 60, fontSize: 15 },
});
