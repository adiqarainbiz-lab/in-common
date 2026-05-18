import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export default function EditProfileScreen({ navigation }) {
  const { profile, updateProfile } = useAuth();
  const [name,    setName]    = useState(profile?.name || '');
  const [phone,   setPhone]   = useState(profile?.phone_number || '');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [saved,   setSaved]   = useState(false);

  const isDirty = name !== profile?.name || phone !== profile?.phone_number;

  const handleSave = async () => {
    if (!name.trim()) return setError('Name cannot be empty');
    if (!phone.trim()) return setError('Phone number cannot be empty');
    setError('');
    setLoading(true);
    try {
      await updateProfile(name.trim(), phone.trim());
      setSaved(true);
      setTimeout(() => navigation.goBack(), 800);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Edit Profile</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(name || '?')[0].toUpperCase()}</Text>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {saved  ? <Text style={styles.success}>Saved!</Text> : null}

            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={v => { setName(v); setError(''); setSaved(false); }}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={v => { setPhone(v); setError(''); setSaved(false); }}
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>

            <View style={styles.meta}>
              <Text style={styles.metaRow}>Member code <Text style={styles.metaVal}>{profile?.member_code}</Text></Text>
              <Text style={styles.metaRow}>Member since <Text style={styles.metaVal}>{new Date(profile?.created_at).toLocaleDateString()}</Text></Text>
            </View>

            {loading ? (
              <ActivityIndicator color="#2D6A4F" style={{ marginTop: 8 }} />
            ) : (
              <TouchableOpacity
                style={[styles.btn, !isDirty && styles.btnDisabled]}
                onPress={handleSave}
                disabled={!isDirty}
              >
                <Text style={styles.btnText}>Save Changes</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F5F7F5' },
  scroll:      { padding: 16, paddingBottom: 40 },
  header:      { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  backBtn:     { paddingVertical: 4, paddingRight: 8 },
  backText:    { color: '#2D6A4F', fontSize: 15, fontWeight: '600' },
  title:       { fontSize: 20, fontWeight: '800', color: '#1B4332' },
  card:        { backgroundColor: 'white', borderRadius: 20, padding: 24, gap: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  avatar:      { width: 72, height: 72, borderRadius: 36, backgroundColor: '#D8F3DC', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 4 },
  avatarText:  { fontSize: 32, fontWeight: '800', color: '#2D6A4F' },
  field:       { gap: 6 },
  label:       { fontSize: 12, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  input:       { borderWidth: 1, borderColor: '#D0E8D8', borderRadius: 12, padding: 14, fontSize: 16, color: '#1B4332' },
  meta:        { backgroundColor: '#F8FAF8', borderRadius: 12, padding: 14, gap: 8 },
  metaRow:     { fontSize: 13, color: '#888' },
  metaVal:     { color: '#1B4332', fontWeight: '600' },
  btn:         { backgroundColor: '#2D6A4F', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#B2CFBE' },
  btnText:     { color: 'white', fontSize: 16, fontWeight: '700' },
  error:       { color: '#D62828', fontSize: 13, textAlign: 'center' },
  success:     { color: '#2D6A4F', fontSize: 13, textAlign: 'center', fontWeight: '600' },
});
