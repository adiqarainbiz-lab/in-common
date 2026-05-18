import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { staffApi } from '../services/api';

const TIER_EMOJI = { Seedling: '🌱', Olive: '🫒', Cedar: '🌲', Keffiyeh: '🏅' };

function MemberRow({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowName}>{item.name}</Text>
        <Text style={styles.rowPhone}>{item.phone_number}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowTier}>{TIER_EMOJI[item.tier] || '🌱'} {item.tier}</Text>
        <Text style={styles.rowBalance}>{item.points_balance.toLocaleString()} pts</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen({ navigation }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await staffApi.searchMembers(query.trim());
        setResults(res.data.members);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  const handleSelect = (member) => {
    navigation.navigate('Member', { member });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Find Member</Text>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="Search by name or phone…"
          placeholderTextColor="#888"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {loading && <ActivityIndicator size="small" color="#52B788" style={{ marginRight: 8 }} />}
      </View>

      <FlatList
        data={results}
        keyExtractor={(i) => i.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <MemberRow item={item} onPress={handleSelect} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {query.trim().length < 2
              ? 'Type a name or phone number to search'
              : searched
              ? 'No members found'
              : null}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F5F7F5' },
  title:       { fontSize: 22, fontWeight: '800', color: '#1B4332', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBar:   { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', marginHorizontal: 16, borderRadius: 14, paddingHorizontal: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  searchIcon:  { fontSize: 16, marginRight: 6 },
  input:       { flex: 1, fontSize: 16, color: '#1B4332', paddingVertical: 14 },
  list:        { paddingHorizontal: 16, gap: 10, paddingBottom: 40 },
  row:         { backgroundColor: 'white', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  avatar:      { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2D6A4F', alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: 'white', fontSize: 18, fontWeight: '800' },
  rowBody:     { flex: 1, gap: 3 },
  rowName:     { fontSize: 15, fontWeight: '700', color: '#1B4332' },
  rowPhone:    { fontSize: 13, color: '#888' },
  rowRight:    { alignItems: 'flex-end', gap: 4 },
  rowTier:     { fontSize: 12, color: '#2D6A4F', fontWeight: '600' },
  rowBalance:  { fontSize: 14, fontWeight: '800', color: '#1B4332' },
  empty:       { textAlign: 'center', color: '#AAA', marginTop: 60, fontSize: 15, paddingHorizontal: 32 },
});
