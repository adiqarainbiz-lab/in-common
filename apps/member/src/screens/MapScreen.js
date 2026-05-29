import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { member as memberApi, pub as pubApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORY_LABEL = { food: 'Food & Drink', services: 'Services', shop: 'Shop' };
const CATEGORY_COLOR = { food: '#E74C3C', services: '#8E44AD', shop: '#F39C12' };

const JERUSALEM = {
  latitude: 31.7817,
  longitude: 35.2249,
  latitudeDelta: 0.07,
  longitudeDelta: 0.07,
};

export default function MapScreen({ navigation }) {
  const { token } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef(null);

  const load = async (pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    try {
      const res = token ? await memberApi.businesses() : await pubApi.businesses();
      setBusinesses(res.data.filter(b => b.lat && b.lng));
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  // Refresh whenever the tab comes into focus
  useFocusEffect(useCallback(() => { load(true); }, []));

  const recenter = () => {
    mapRef.current?.animateToRegion(JERUSALEM, 600);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Map</Text>
          <Text style={styles.subtitle}>
            {businesses.length} partner {businesses.length === 1 ? 'business' : 'businesses'}
          </Text>
        </View>
        <TouchableOpacity style={styles.recenterBtn} onPress={recenter}>
          <Text style={styles.recenterText}>📍 Jerusalem</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#2D6A4F" size="large" />
      ) : (
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={JERUSALEM}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {businesses.map(biz => (
              <Marker
                key={biz.id}
                coordinate={{ latitude: parseFloat(biz.lat), longitude: parseFloat(biz.lng) }}
              >
                {/* Custom pin */}
                <View style={[styles.pin, { backgroundColor: CATEGORY_COLOR[biz.category] || '#2D6A4F' }]}>
                  <Text style={styles.pinEmoji}>
                    {biz.category === 'food' ? '🍽️' : biz.category === 'services' ? '✂️' : '🛍️'}
                  </Text>
                </View>
                <View style={styles.pinTail} />

                <Callout
                  tooltip
                  onPress={() => navigation.navigate('BusinessDetail', { businessId: biz.id })}
                >
                  <View style={styles.callout}>
                    <View style={styles.calloutHeader}>
                      <Text style={styles.calloutName} numberOfLines={1}>{biz.name}</Text>
                      <View style={[styles.calloutCatChip, { backgroundColor: CATEGORY_COLOR[biz.category] || '#2D6A4F' }]}>
                        <Text style={styles.calloutCatText}>{CATEGORY_LABEL[biz.category] || biz.category}</Text>
                      </View>
                    </View>
                    {!!biz.address && <Text style={styles.calloutAddr} numberOfLines={1}>📍 {biz.address}</Text>}
                    <View style={styles.calloutFooter}>
                      <Text style={styles.calloutPts}>+{biz.points_rate} pts / visit</Text>
                      <Text style={styles.calloutOpen}>Tap to open →</Text>
                    </View>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>

          {/* Pull-to-refresh overlay at top */}
          <View style={styles.refreshBar} pointerEvents="box-none">
            {refreshing ? (
              <View style={styles.refreshPill}>
                <ActivityIndicator size="small" color="#2D6A4F" />
                <Text style={styles.refreshText}>Refreshing…</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.refreshPill} onPress={() => load(true)}>
                <Text style={styles.refreshIcon}>↻</Text>
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            )}
          </View>

          {businesses.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No businesses with locations yet</Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#F5F7F5' },

  header:  {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F5F7F5',
  },
  title:    { fontSize: 26, fontWeight: '800', color: '#1B4332', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#6B7C6B', marginTop: 1 },

  recenterBtn:  { backgroundColor: '#1B4332', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  recenterText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Custom map pin
  pin: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  pinEmoji: { fontSize: 17 },
  pinTail:  {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: '#2D6A4F',
    alignSelf: 'center', marginTop: -2,
  },

  // Callout bubble
  callout: {
    width: 220, backgroundColor: '#fff', borderRadius: 14, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
    gap: 6,
  },
  calloutHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  calloutName:    { flex: 1, fontSize: 14, fontWeight: '800', color: '#1B4332' },
  calloutCatChip: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  calloutCatText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  calloutAddr:    { fontSize: 12, color: '#888' },
  calloutFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  calloutPts:     { fontSize: 12, color: '#2D6A4F', fontWeight: '700' },
  calloutOpen:    { fontSize: 11, color: '#AAA' },

  // Refresh floating pill
  refreshBar:  { position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center' },
  refreshPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 99,
    paddingHorizontal: 16, paddingVertical: 8,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  refreshIcon: { fontSize: 16, color: '#2D6A4F', fontWeight: '700' },
  refreshText: { fontSize: 13, color: '#2D6A4F', fontWeight: '600' },

  empty:     { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  emptyText: { backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, fontSize: 13 },
});
