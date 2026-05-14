import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { staffApi } from '../services/api';

function dateStr(d) {
  return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function TxRow({ item }) {
  const isEarn  = item.type === 'earn';
  const color   = isEarn ? '#2D6A4F' : '#C1121F';
  const sign    = isEarn ? '+' : '-';
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: color + '18' }]}>
        <Text style={styles.rowEmoji}>{isEarn ? '⭐' : '💚'}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowMember}>{item.member_name}</Text>
        <Text style={styles.rowTime}>{dateStr(item.created_at)} · {item.tier}</Text>
      </View>
      <Text style={[styles.rowPoints, { color }]}>{sign}{Math.abs(item.points)} pts</Text>
    </View>
  );
}

export default function TransactionsScreen() {
  const today     = new Date().toISOString().slice(0, 10);
  const [date,    setDate]    = useState(today);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (d, pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    try {
      const res = await staffApi.transactions(d);
      setData(res.data);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(date); }, [date]);

  const shiftDay = (n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    setDate(d.toISOString().slice(0, 10));
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Date nav */}
      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => shiftDay(-1)}>
          <Text style={styles.navArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.dateLabel}>{date === today ? 'Today' : date}</Text>
        <TouchableOpacity style={styles.navBtn} onPress={() => shiftDay(1)} disabled={date >= today}>
          <Text style={[styles.navArrow, date >= today && styles.disabled]}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      {data && (
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{data.summary.earned}</Text>
            <Text style={styles.summaryLabel}>pts earned</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: '#C1121F' }]}>{data.summary.redeemed}</Text>
            <Text style={styles.summaryLabel}>pts redeemed</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: '#1B4332' }]}>{data.transactions.length}</Text>
            <Text style={styles.summaryLabel}>transactions</Text>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#2D6A4F" />
      ) : (
        <FlatList
          data={data?.transactions || []}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <TxRow item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(date, true)} />}
          ListEmptyComponent={<Text style={styles.empty}>No transactions for this date.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F5F7F5' },
  dateNav:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  navBtn:      { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navArrow:    { fontSize: 22, color: '#2D6A4F', fontWeight: '700' },
  disabled:    { color: '#CCC' },
  dateLabel:   { fontSize: 17, fontWeight: '700', color: '#1B4332' },
  summary:     { flexDirection: 'row', backgroundColor: 'white', marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum:  { fontSize: 22, fontWeight: '800', color: '#2D6A4F' },
  summaryLabel:{ fontSize: 11, color: '#888', marginTop: 2 },
  divider:     { width: 1, backgroundColor: '#EEE' },
  list:        { padding: 16, gap: 10, paddingBottom: 40 },
  row:         { backgroundColor: 'white', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon:     { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowEmoji:    { fontSize: 20 },
  rowBody:     { flex: 1, gap: 2 },
  rowMember:   { fontSize: 14, fontWeight: '700', color: '#1B4332' },
  rowTime:     { fontSize: 12, color: '#888' },
  rowAmount:   { fontSize: 12, color: '#555' },
  rowPoints:   { fontSize: 16, fontWeight: '800' },
  empty:       { textAlign: 'center', color: '#AAA', marginTop: 60, fontSize: 15 },
});
