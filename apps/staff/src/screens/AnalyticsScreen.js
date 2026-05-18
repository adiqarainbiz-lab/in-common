import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { staffApi } from '../services/api';

const TIER_EMOJI = { Seedling: '🌱', Olive: '🫒', Cedar: '🌲', Keffiyeh: '🏅' };

function StatCard({ label, value, sub, color = '#1B4332' }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

function BarChart({ data }) {
  const maxEarned = Math.max(...data.map(d => d.earned), 1);
  const MAX_H = 80;
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View style={styles.chart}>
      {data.map((d, i) => {
        const day = new Date(d.date + 'T12:00:00');
        const isToday = d.date === new Date().toISOString().slice(0, 10);
        const barH = Math.max((d.earned / maxEarned) * MAX_H, d.earned > 0 ? 4 : 0);
        return (
          <View key={d.date} style={styles.chartCol}>
            <View style={[styles.bar, { height: barH, backgroundColor: isToday ? '#2D6A4F' : '#B7E4C7' }]} />
            <Text style={[styles.chartLabel, isToday && styles.chartLabelToday]}>
              {days[day.getDay()]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function AnalyticsScreen() {
  const [data,      setData]      = useState(null);
  const [period,    setPeriod]    = useState('week'); // 'week' | 'month'
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    try {
      const res = await staffApi.analytics();
      setData(res.data);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const summary = data?.[period];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <Text style={styles.title}>Insights</Text>

        {/* Period toggle */}
        <View style={styles.toggle}>
          {['week', 'month'].map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.toggleBtn, period === p && styles.toggleBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.toggleText, period === p && styles.toggleTextActive]}>
                {p === 'week' ? 'This Week' : 'This Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} color="#2D6A4F" size="large" />
        ) : (
          <>
            {/* Summary cards */}
            <View style={styles.statsGrid}>
              <StatCard label="pts earned"    value={summary.earned}       color="#2D6A4F" />
              <StatCard label="pts redeemed"  value={summary.redeemed}     color="#C1121F" />
              <StatCard label="transactions"  value={summary.transactions} color="#1B4332" />
              <StatCard label="members"       value={summary.members}      color="#457B9D" />
            </View>

            {/* 7-day bar chart */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Points Earned — Last 7 Days</Text>
              <BarChart data={data.daily} />
            </View>

            {/* Top members */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Top Members This Month</Text>
              {data.top_members.length === 0 ? (
                <Text style={styles.empty}>No activity yet this month</Text>
              ) : (
                data.top_members.map((m, i) => (
                  <View key={i} style={styles.memberRow}>
                    <Text style={styles.memberRank}>#{i + 1}</Text>
                    <View style={styles.memberBody}>
                      <Text style={styles.memberName}>{m.name}</Text>
                      <Text style={styles.memberMeta}>{TIER_EMOJI[m.tier]} {m.tier} · {m.visit_count} visit{m.visit_count !== 1 ? 's' : ''}</Text>
                    </View>
                    <Text style={styles.memberPts}>{m.points_earned.toLocaleString()} pts</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: '#F5F7F5' },
  scroll:            { padding: 16, paddingBottom: 40 },
  title:             { fontSize: 22, fontWeight: '800', color: '#1B4332', marginBottom: 12 },
  toggle:            { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 4, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  toggleBtn:         { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  toggleBtnActive:   { backgroundColor: '#2D6A4F' },
  toggleText:        { fontSize: 13, fontWeight: '600', color: '#888' },
  toggleTextActive:  { color: 'white' },
  statsGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard:          { flex: 1, minWidth: '45%', backgroundColor: 'white', borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  statValue:         { fontSize: 28, fontWeight: '800', lineHeight: 34 },
  statLabel:         { fontSize: 11, color: '#888', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  statSub:           { fontSize: 11, color: '#AAA', marginTop: 2 },
  card:              { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  cardTitle:         { fontSize: 14, fontWeight: '700', color: '#1B4332', marginBottom: 16 },
  chart:             { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 6 },
  chartCol:          { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  bar:               { width: '100%', borderRadius: 4, minHeight: 0 },
  chartLabel:        { fontSize: 11, color: '#AAA', fontWeight: '600' },
  chartLabelToday:   { color: '#2D6A4F' },
  memberRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 10 },
  memberRank:        { fontSize: 13, fontWeight: '700', color: '#AAA', width: 24 },
  memberBody:        { flex: 1, gap: 2 },
  memberName:        { fontSize: 14, fontWeight: '700', color: '#1B4332' },
  memberMeta:        { fontSize: 12, color: '#888' },
  memberPts:         { fontSize: 14, fontWeight: '800', color: '#2D6A4F' },
  empty:             { textAlign: 'center', color: '#AAA', paddingVertical: 24, fontSize: 14 },
});
