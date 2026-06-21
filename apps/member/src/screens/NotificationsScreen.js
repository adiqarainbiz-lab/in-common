import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { member as memberApi } from '../services/api';

const TYPE_ICON = {
  tier_upgrade:         '🏅',
  points_expired:       '⏰',
  points_expiring_soon: '⚠️',
  general:              '🔔',
};

function NotificationRow({ item }) {
  const icon = TYPE_ICON[item.type] || '🔔';
  const date = new Date(item.created_at);
  const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.row, !item.is_read && styles.rowUnread]}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, !item.is_read && styles.titleUnread]}>{item.title}</Text>
        <Text style={styles.bodyText}>{item.body}</Text>
        <Text style={styles.date}>{dateStr} · {timeStr}</Text>
      </View>
      {!item.is_read && <View style={styles.dot} />}
    </View>
  );
}

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [page,          setPage]          = useState(1);
  const [total,         setTotal]         = useState(0);

  const load = useCallback(async (p = 1, pull = false) => {
    if (pull) setRefreshing(true); else if (p === 1) setLoading(true);
    try {
      const res = await memberApi.notifications(p);
      const { notifications: rows, total: t } = res.data;
      setTotal(t);
      setNotifications(p === 1 ? rows : (prev) => [...prev, ...rows]);
      setPage(p);
      if (p === 1) memberApi.markAllRead().catch(() => {});
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(1); }, []);

  const loadMore = () => {
    if (notifications.length < total) load(page + 1);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#2D6A4F" size="large" />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Notifications</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <NotificationRow item={item} />}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, true)} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.empty}>No notifications yet</Text>
            <Text style={styles.emptySub}>We'll let you know when you reach a new tier or your points are about to expire.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F5F7F5' },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 12 },
  back:        { padding: 4 },
  backText:    { fontSize: 22, color: '#1B4332' },
  heading:     { fontSize: 22, fontWeight: '800', color: '#1B4332' },
  list:        { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  row:         { backgroundColor: 'white', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 },
  rowUnread:   { backgroundColor: '#F0FAF5', borderWidth: 1, borderColor: '#D8F3DC' },
  iconWrap:    { width: 44, height: 44, borderRadius: 12, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  icon:        { fontSize: 20 },
  body:        { flex: 1, gap: 3 },
  title:       { fontSize: 14, fontWeight: '600', color: '#444' },
  titleUnread: { color: '#1B4332', fontWeight: '700' },
  bodyText:    { fontSize: 13, color: '#666', lineHeight: 18 },
  date:        { fontSize: 11, color: '#AAA', marginTop: 2 },
  dot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2D6A4F', marginTop: 4 },
  emptyWrap:   { alignItems: 'center', marginTop: 80, paddingHorizontal: 32, gap: 8 },
  emptyIcon:   { fontSize: 48 },
  empty:       { fontSize: 16, fontWeight: '700', color: '#1B4332', textAlign: 'center' },
  emptySub:    { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 },
});
