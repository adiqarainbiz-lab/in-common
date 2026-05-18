import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { staffApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

function dateStr(d) {
  return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const TYPE_CONFIG = {
  earn:     { emoji: '⭐', color: '#2D6A4F', sign: '+' },
  redeem:   { emoji: '💚', color: '#C1121F', sign: '-' },
  reversal: { emoji: '↩️', color: '#888',   sign: ''  },
};

function TxRow({ item, onReverse }) {
  const cfg        = TYPE_CONFIG[item.type] || TYPE_CONFIG.earn;
  const canReverse = (item.type === 'earn' || item.type === 'redeem') && !item.is_reversed;
  const faded      = item.is_reversed || item.type === 'reversal';

  return (
    <View style={[styles.row, faded && styles.rowFaded]}>
      <View style={[styles.rowIcon, { backgroundColor: cfg.color + '18' }]}>
        <Text style={styles.rowEmoji}>{cfg.emoji}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowMember, faded && styles.textFaded]}>
          {item.member_name}
          {item.is_reversed && <Text style={styles.reversedBadge}> · reversed</Text>}
          {item.type === 'reversal' && <Text style={styles.reversedBadge}> · reversal</Text>}
        </Text>
        <Text style={styles.rowTime}>{dateStr(item.created_at)} · {item.tier || '—'}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowPoints, { color: faded ? '#AAA' : cfg.color }]}>
          {cfg.sign}{Math.abs(item.points)} pts
        </Text>
        {canReverse && (
          <TouchableOpacity onPress={() => onReverse(item)} style={styles.reverseBtn}>
            <Text style={styles.reverseBtnText}>Reverse</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function TransactionsScreen() {
  const { logout } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [date,      setDate]      = useState(today);
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reversing, setReversing] = useState(null); // txId being reversed

  const load = useCallback(async (d, pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    try {
      const res = await staffApi.transactions(d);
      setData(res.data);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  const shiftDay = (n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    setDate(d.toISOString().slice(0, 10));
  };

  const handleReverse = (item) => {
    const isEarn = item.type === 'earn';
    const pts    = Math.abs(item.points);
    Alert.alert(
      'Reverse Transaction',
      `This will ${isEarn ? 'deduct' : 'restore'} ${pts} pts ${isEarn ? 'from' : 'to'} ${item.member_name}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reverse',
          style: 'destructive',
          onPress: async () => {
            setReversing(item.id);
            try {
              await staffApi.reverseTransaction(item.id);
              load(date, true);
            } catch (e) {
              Alert.alert('Failed', e.response?.data?.error || 'Could not reverse transaction');
            } finally {
              setReversing(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutBtn}>Log out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => shiftDay(-1)}>
          <Text style={styles.navArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.dateLabel}>{date === today ? 'Today' : date}</Text>
        <TouchableOpacity style={styles.navBtn} onPress={() => shiftDay(1)} disabled={date >= today}>
          <Text style={[styles.navArrow, date >= today && styles.disabled]}>→</Text>
        </TouchableOpacity>
      </View>

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
          renderItem={({ item }) => (
            <TxRow
              item={item}
              onReverse={handleReverse}
              reversing={reversing === item.id}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(date, true)} />}
          ListEmptyComponent={<Text style={styles.empty}>No transactions for this date.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#F5F7F5' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle:    { fontSize: 18, fontWeight: '800', color: '#1B4332' },
  logoutBtn:      { fontSize: 14, color: '#C1121F', fontWeight: '600' },
  dateNav:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  navBtn:         { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navArrow:       { fontSize: 22, color: '#2D6A4F', fontWeight: '700' },
  disabled:       { color: '#CCC' },
  dateLabel:      { fontSize: 17, fontWeight: '700', color: '#1B4332' },
  summary:        { flexDirection: 'row', backgroundColor: 'white', marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryNum:     { fontSize: 22, fontWeight: '800', color: '#2D6A4F' },
  summaryLabel:   { fontSize: 11, color: '#888', marginTop: 2 },
  divider:        { width: 1, backgroundColor: '#EEE' },
  list:           { padding: 16, gap: 10, paddingBottom: 40 },
  row:            { backgroundColor: 'white', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  rowFaded:       { opacity: 0.55 },
  rowIcon:        { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowEmoji:       { fontSize: 20 },
  rowBody:        { flex: 1, gap: 2 },
  rowMember:      { fontSize: 14, fontWeight: '700', color: '#1B4332' },
  textFaded:      { color: '#888' },
  reversedBadge:  { fontSize: 12, fontWeight: '400', color: '#AAA' },
  rowTime:        { fontSize: 12, color: '#888' },
  rowRight:       { alignItems: 'flex-end', gap: 6 },
  rowPoints:      { fontSize: 16, fontWeight: '800' },
  reverseBtn:     { backgroundColor: '#FFF0F0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  reverseBtnText: { fontSize: 11, fontWeight: '700', color: '#C1121F' },
  empty:          { textAlign: 'center', color: '#AAA', marginTop: 60, fontSize: 15 },
});
