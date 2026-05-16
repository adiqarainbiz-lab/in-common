import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { staffApi } from '../services/api';

const TIER_EMOJI = { Seedling: '🌱', Olive: '🫒', Cedar: '🌲', Keffiyeh: '🏅' };

export default function MemberScreen({ route, navigation }) {
  const initial = route.params?.member;
  const [member,  setMember]  = useState(initial);
  const [mode,    setMode]    = useState(null); // 'earn' | 'redeem' | null
  const [pts,     setPts]     = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');

  if (!member) return null;

  const ptsNum   = parseInt(pts) || 0;
  const canAfford = ptsNum > 0 && member.points_balance >= ptsNum;

  const handleEarn = async () => {
    if (ptsNum <= 0) return setError('Enter points to award');
    setError('');
    setLoading(true);
    try {
      const res = await staffApi.earn(member.id, ptsNum);
      setMember((m) => ({ ...m, points_balance: res.data.newBalance, tier: res.data.tier }));
      setResult({ type: 'earn', points: res.data.points, newBalance: res.data.newBalance });
      setPts('');
      setMode(null);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not award points');
    } finally { setLoading(false); }
  };

  const handleRedeem = async () => {
    if (ptsNum <= 0) return setError('Enter points to redeem');
    if (!canAfford) return setError(`Only ${member.points_balance} pts available`);
    setError('');
    setLoading(true);
    try {
      const res = await staffApi.redeem(member.id, ptsNum);
      setMember((m) => ({ ...m, points_balance: res.data.newBalance, tier: res.data.tier }));
      setResult({ type: 'redeem', points: res.data.pointsRedeemed, newBalance: res.data.newBalance });
      setPts('');
      setMode(null);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not redeem points');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Scan Again</Text>
          </TouchableOpacity>

          {/* Member card */}
          <View style={styles.memberCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{member.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.memberName}>{member.name}</Text>
            <Text style={styles.memberPhone}>{member.phone_number}</Text>
            <View style={styles.tierRow}>
              <Text style={styles.tierEmoji}>{TIER_EMOJI[member.tier] || '🌱'}</Text>
              <Text style={styles.tierLabel}>{member.tier}</Text>
            </View>
            <View style={styles.balanceBadge}>
              <Text style={styles.balanceNum}>{member.points_balance.toLocaleString()}</Text>
              <Text style={styles.balancePts}>pts</Text>
            </View>
          </View>

          {/* Result banner */}
          {result && (
            <View style={[styles.resultBanner, result.type === 'earn' ? styles.earnBanner : styles.redeemBanner]}>
              <Text style={styles.resultEmoji}>{result.type === 'earn' ? '✅' : '💚'}</Text>
              <View>
                <Text style={styles.resultText}>
                  {result.type === 'earn' ? `+${result.points} pts awarded!` : `${result.points} pts redeemed`}
                </Text>
                <Text style={styles.resultSub}>New balance: {result.newBalance.toLocaleString()} pts</Text>
              </View>
            </View>
          )}

          {/* Action buttons */}
          {!mode && (
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.actionBtn, styles.earnBtn]} onPress={() => { setMode('earn'); setResult(null); }}>
                <Text style={styles.actionEmoji}>⭐</Text>
                <Text style={styles.actionLabel}>Award Points</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.redeemBtn, member.points_balance === 0 && styles.btnDisabled]}
                onPress={() => { if (member.points_balance > 0) { setMode('redeem'); setResult(null); } }}
              >
                <Text style={styles.actionEmoji}>💚</Text>
                <Text style={[styles.actionLabel, { color: '#1B4332' }]}>Redeem Points</Text>
                <Text style={[styles.actionSub, { color: '#2D6A4F' }]}>
                  {member.points_balance > 0 ? `${member.points_balance.toLocaleString()} available` : 'No points'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Earn form */}
          {mode === 'earn' && (
            <View style={styles.form}>
              <Text style={styles.formTitle}>Points to Award</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  value={pts}
                  onChangeText={v => { setPts(v); setError(''); }}
                  keyboardType="number-pad"
                  autoFocus
                  onSubmitEditing={handleEarn}
                  returnKeyType="go"
                />
                <Text style={styles.unitLabel}>pts</Text>
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.formButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setMode(null); setPts(''); setError(''); }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                {loading ? <ActivityIndicator color="#2D6A4F" /> : (
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleEarn}>
                    <Text style={styles.confirmText}>Confirm</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Redeem form */}
          {mode === 'redeem' && (
            <View style={styles.form}>
              <Text style={styles.formTitle}>Points to Redeem</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  value={pts}
                  onChangeText={v => { setPts(v); setError(''); }}
                  keyboardType="number-pad"
                  autoFocus
                  onSubmitEditing={handleRedeem}
                  returnKeyType="go"
                />
                <Text style={styles.unitLabel}>pts</Text>
              </View>
              {pts && !error ? (
                <Text style={[styles.preview, !canAfford && styles.previewError]}>
                  {canAfford
                    ? `${member.points_balance - ptsNum} pts remaining after redemption`
                    : `Only ${member.points_balance} pts available`}
                </Text>
              ) : null}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.formButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setMode(null); setPts(''); setError(''); }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                {loading ? <ActivityIndicator color="#2D6A4F" /> : (
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleRedeem}>
                    <Text style={styles.confirmText}>Confirm</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#F5F7F5' },
  scroll:       { padding: 16, gap: 16, paddingBottom: 48 },
  back:         { flexDirection: 'row' },
  backText:     { color: '#2D6A4F', fontSize: 16, fontWeight: '600' },
  memberCard:   { backgroundColor: 'white', borderRadius: 24, padding: 28, alignItems: 'center', gap: 8, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#2D6A4F', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarText:   { color: 'white', fontSize: 32, fontWeight: '800' },
  memberName:   { fontSize: 24, fontWeight: '800', color: '#1B4332' },
  memberPhone:  { fontSize: 14, color: '#888' },
  tierRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tierEmoji:    { fontSize: 20 },
  tierLabel:    { fontSize: 15, fontWeight: '600', color: '#2D6A4F' },
  balanceBadge: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 8 },
  balanceNum:   { fontSize: 40, fontWeight: '800', color: '#1B4332', lineHeight: 46 },
  balancePts:   { fontSize: 18, color: '#2D6A4F', fontWeight: '600', paddingBottom: 4 },
  resultBanner: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  earnBanner:   { backgroundColor: '#D8F3DC' },
  redeemBanner: { backgroundColor: '#E0F0E9' },
  resultEmoji:  { fontSize: 28 },
  resultText:   { fontSize: 16, fontWeight: '700', color: '#1B4332' },
  resultSub:    { fontSize: 13, color: '#40916C' },
  actions:      { flexDirection: 'row', gap: 12 },
  actionBtn:    { flex: 1, borderRadius: 20, padding: 20, gap: 6, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  earnBtn:      { backgroundColor: '#1B4332' },
  redeemBtn:    { backgroundColor: '#D8F3DC' },
  actionEmoji:  { fontSize: 28 },
  actionLabel:  { fontSize: 16, fontWeight: '700', color: 'white' },
  actionSub:    { fontSize: 12, color: '#FFFFFF99' },
  btnDisabled:  { opacity: 0.4 },
  form:         { backgroundColor: 'white', borderRadius: 20, padding: 20, gap: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  formTitle:    { fontSize: 16, fontWeight: '700', color: '#1B4332' },
  inputRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  amountInput:  { flex: 1, borderWidth: 2, borderColor: '#2D6A4F', borderRadius: 12, padding: 16, fontSize: 32, fontWeight: '700', color: '#1B4332', textAlign: 'center' },
  unitLabel:    { fontSize: 20, fontWeight: '700', color: '#2D6A4F' },
  preview:      { fontSize: 14, color: '#2D6A4F', textAlign: 'center', fontWeight: '600' },
  previewError: { color: '#C1121F' },
  formButtons:  { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:    { flex: 1, borderWidth: 2, borderColor: '#DDD', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelText:   { color: '#666', fontWeight: '700', fontSize: 16 },
  confirmBtn:   { flex: 2, backgroundColor: '#2D6A4F', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  confirmText:  { color: 'white', fontWeight: '700', fontSize: 16 },
  errorText:    { color: '#C1121F', fontSize: 13, textAlign: 'center', fontWeight: '600' },
});
