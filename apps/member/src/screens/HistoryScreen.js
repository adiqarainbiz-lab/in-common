import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { member as memberApi } from '../services/api';

const TYPE_CONFIG = {
  earn:   { emoji: '⭐', color: '#2D6A4F', label: 'Points Earned',   sign: '+' },
  redeem: { emoji: '💚', color: '#1d4ed8', label: 'Points Redeemed', sign: '-' },
  expire: { emoji: '⏰', color: '#888',    label: 'Points Expired',  sign: '-' },
  adjust: { emoji: '⚡', color: '#d97706', label: 'Manual Adjust',   sign: ''  },
  reverse:{ emoji: '↩️', color: '#C1121F', label: 'Reversed',        sign: ''  },
};

function DetailModal({ item, onClose }) {
  if (!item) return null;
  const cfg   = TYPE_CONFIG[item.type] || TYPE_CONFIG.earn;
  const date  = new Date(item.created_at);
  const isPos = item.points > 0;

  return (
    <Modal transparent animationType="slide" visible={!!item} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHandle} />

          <View style={[styles.sheetIcon, { backgroundColor: cfg.color + '18' }]}>
            <Text style={{ fontSize: 36 }}>{cfg.emoji}</Text>
          </View>

          <Text style={[styles.sheetPts, { color: cfg.color }]}>
            {isPos ? '+' : ''}{item.points} pts
          </Text>
          <Text style={styles.sheetType}>{cfg.label}</Text>

          <View style={styles.sheetDivider} />

          <View style={styles.sheetRows}>
            {item.business_name && (
              <SheetRow label="Business"    value={item.business_name} />
            )}
            {item.description && (
              <SheetRow label="Description" value={item.description} />
            )}
            {item.amount_jd != null && item.amount_jd > 0 && (
              <SheetRow label="Amount"      value={`${item.amount_jd} JD`} />
            )}
            <SheetRow label="Date" value={date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
            <SheetRow label="Time" value={date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} />
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Done</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SheetRow({ label, value }) {
  return (
    <View style={styles.sheetRow}>
      <Text style={styles.sheetRowLabel}>{label}</Text>
      <Text style={styles.sheetRowValue}>{value}</Text>
    </View>
  );
}

function TransactionRow({ item, onPress }) {
  const cfg    = TYPE_CONFIG[item.type] || TYPE_CONFIG.earn;
  const date   = new Date(item.created_at);
  const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const isPos   = item.points > 0;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.rowIcon, { backgroundColor: cfg.color + '18' }]}>
        <Text style={styles.rowEmoji}>{cfg.emoji}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowBusiness}>{item.business_name || 'In Common'}</Text>
        <Text style={styles.rowDesc} numberOfLines={1}>{item.description}</Text>
        <Text style={styles.rowDate}>{dateStr} · {timeStr}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={[styles.rowPoints, { color: cfg.color }]}>
          {isPos ? '+' : ''}{Math.abs(item.points)} pts
        </Text>
        <Text style={styles.rowChevron}>›</Text>
      </View>
    </TouchableOpacity>
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
  const [selected,     setSelected]     = useState(null);

  const load = useCallback(async (p = 1, pull = false) => {
    if (pull) setRefreshing(true); else if (p === 1) setLoading(true);
    try {
      const res = await memberApi.transactions(p);
      const { transactions: rows, total: t } = res.data;
      setTotal(t);
      setTransactions(p === 1 ? rows : prev => [...prev, ...rows]);
      setPage(p);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(1); }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#2D6A4F" size="large" />;

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.subtitle}>{total} transaction{total !== 1 ? 's' : ''} · tap for details</Text>
      <FlatList
        data={transactions}
        keyExtractor={i => i.id}
        renderItem={({ item }) => <TransactionRow item={item} onPress={() => setSelected(item)} />}
        contentContainerStyle={styles.list}
        onEndReached={() => { if (transactions.length < total) load(page + 1); }}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, true)} tintColor="#2D6A4F" />}
        ListEmptyComponent={<EmptyHistory navigation={navigation} />}
      />
      <DetailModal item={selected} onClose={() => setSelected(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#F5F7F5' },
  title:     { fontSize: 28, fontWeight: '900', color: '#1B4332', paddingHorizontal: 20, paddingTop: 20 },
  subtitle:  { fontSize: 13, color: '#999', paddingHorizontal: 20, marginBottom: 16, marginTop: 2 },
  list:      { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },

  row:       { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 },
  rowIcon:   { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowEmoji:  { fontSize: 20 },
  rowBody:   { flex: 1, gap: 2 },
  rowBusiness:{ fontSize: 14, fontWeight: '700', color: '#1B4332' },
  rowDesc:   { fontSize: 13, color: '#666' },
  rowDate:   { fontSize: 11, color: '#BBB', marginTop: 2 },
  rowPoints: { fontSize: 16, fontWeight: '800' },
  rowChevron:{ fontSize: 18, color: '#DDD', fontWeight: '300' },

  // Modal
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40, alignItems: 'center', gap: 8 },
  sheetHandle:{ width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, marginBottom: 12 },
  sheetIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  sheetPts:  { fontSize: 36, fontWeight: '900' },
  sheetType: { fontSize: 15, color: '#888', fontWeight: '600' },
  sheetDivider: { width: '100%', height: 1, backgroundColor: '#F0F0F0', marginVertical: 16 },
  sheetRows: { width: '100%', gap: 14 },
  sheetRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sheetRowLabel: { fontSize: 13, color: '#999', fontWeight: '600', flex: 1 },
  sheetRowValue: { fontSize: 13, color: '#222', fontWeight: '600', flex: 2, textAlign: 'right' },
  closeBtn:  { marginTop: 20, backgroundColor: '#1B4332', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 48 },
  closeBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  emptyContainer: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 64, gap: 12 },
  emptyEmoji:     { fontSize: 56, marginBottom: 8 },
  emptyTitle:     { fontSize: 20, fontWeight: '800', color: '#1B4332', textAlign: 'center' },
  emptySubtitle:  { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 21 },
  emptyBtn:       { marginTop: 12, backgroundColor: '#2D6A4F', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  emptyBtnText:   { color: '#fff', fontSize: 15, fontWeight: '700' },
});
