import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { member as memberApi } from '../services/api';

function TransactionRow({ item }) {
  const isEarn   = item.type === 'earn';
  const isExpire = item.type === 'expire';
  const sign     = isEarn ? '+' : '';
  const color    = isEarn ? '#2D6A4F' : isExpire ? '#888' : '#C1121F';
  const date     = new Date(item.created_at);
  const dateStr  = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr  = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: color + '18' }]}>
        <Text style={styles.rowEmoji}>{isEarn ? '⭐' : isExpire ? '⏰' : '💚'}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowBusiness}>{item.business_name || 'In Common'}</Text>
        <Text style={styles.rowDesc} numberOfLines={1}>{item.description}</Text>
        <Text style={styles.rowDate}>{dateStr} · {timeStr}</Text>
      </View>
      <Text style={[styles.rowPoints, { color }]}>
        {sign}{Math.abs(item.points)} pts
      </Text>
    </View>
  );
}

function EmptyHistory({ navigation }) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🌱</Text>
      <Text style={styles.emptyTitle}>No transactions yet</Text>
      <Text style={styles.emptySubtitle}>
        Your points history will appear here after your first visit to a partner business.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Businesses')}>
        <Text style={styles.emptyBtnText}>Find a partner business →</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HistoryScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [page,         setPage]         = useState(1);
  const [total,        setTotal]        = useState(0);

  const load = useCallback(async (p = 1, pull = false) => {
    if (pull) setRefreshing(true); else if (p === 1) setLoading(true);
    try {
      const res = await memberApi.transactions(p);
      const { transactions: rows, total: t } = res.data;
      setTotal(t);
      setTransactions(p === 1 ? rows : (prev) => [...prev, ...rows]);
      setPage(p);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(1); }, []);

  const loadMore = () => {
    if (transactions.length < total) load(page + 1);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#2D6A4F" size="large" />;

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Transaction History</Text>
      <Text style={styles.subtitle}>{total} transaction{total !== 1 ? 's' : ''}</Text>
      <FlatList
        data={transactions}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <TransactionRow item={item} />}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, true)} />}
        ListEmptyComponent={<EmptyHistory navigation={navigation} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#F5F7F5' },
  title:     { fontSize: 24, fontWeight: '800', color: '#1B4332', paddingHorizontal: 16, paddingTop: 16 },
  subtitle:  { fontSize: 14, color: '#888', paddingHorizontal: 16, marginBottom: 12 },
  list:      { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  row:       { backgroundColor: 'white', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 },
  rowIcon:   { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowEmoji:  { fontSize: 20 },
  rowBody:   { flex: 1, gap: 2 },
  rowBusiness:{ fontSize: 14, fontWeight: '700', color: '#1B4332' },
  rowDesc:   { fontSize: 13, color: '#666' },
  rowDate:   { fontSize: 11, color: '#AAA' },
  rowPoints: { fontSize: 16, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 64, gap: 12 },
  emptyEmoji:     { fontSize: 56, marginBottom: 8 },
  emptyTitle:     { fontSize: 20, fontWeight: '800', color: '#1B4332', textAlign: 'center' },
  emptySubtitle:  { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 21 },
  emptyBtn:       { marginTop: 12, backgroundColor: '#2D6A4F', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  emptyBtnText:   { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
