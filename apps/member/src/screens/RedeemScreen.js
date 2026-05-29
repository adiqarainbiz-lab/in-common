import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

const REDEEM_RATE = 10; // 10 points = 1 unit of credit

function PresetBtn({ pts, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.preset, selected && styles.presetActive]}
      onPress={onPress}
    >
      <Text style={[styles.presetPts, selected && styles.presetPtsActive]}>{pts.toLocaleString()}</Text>
      <Text style={[styles.presetLabel, selected && styles.presetLabelActive]}>pts</Text>
    </TouchableOpacity>
  );
}

export default function RedeemScreen({ navigation }) {
  const { profile } = useAuth();
  const balance = profile?.points_balance || 0;

  const [input, setInput] = useState('');
  const points = parseInt(input) || 0;
  const credit = (points / REDEEM_RATE).toFixed(1);
  const isValid = points > 0 && points <= balance && points % 10 === 0;

  const PRESETS = [100, 250, 500, 1000].filter(p => p <= balance);

  function handleConfirm() {
    if (!isValid) return;
    Alert.alert(
      'Ready to redeem',
      `Tell the cashier:\n\n"I'd like to redeem ${points.toLocaleString()} points as credit"\n\nThen show your QR code on the My QR tab for them to scan.`,
      [
        { text: 'Go to My QR', onPress: () => navigation.navigate('QR'), style: 'default' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←  Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Redeem Points</Text>
        <Text style={styles.subtitle}>Use your Common Points as store credit at any partner business</Text>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>YOUR BALANCE</Text>
          <Text style={styles.balanceValue}>{balance.toLocaleString()}</Text>
          <Text style={styles.balancePts}>Common Points</Text>
        </View>

        {/* How to redeem */}
        <View style={styles.howCard}>
          <Text style={styles.howTitle}>How to redeem</Text>
          <View style={styles.howStep}>
            <View style={styles.howNum}><Text style={styles.howNumText}>1</Text></View>
            <Text style={styles.howText}>Choose how many points to redeem below</Text>
          </View>
          <View style={styles.howStep}>
            <View style={styles.howNum}><Text style={styles.howNumText}>2</Text></View>
            <Text style={styles.howText}>Tell the cashier "I'd like to use my points"</Text>
          </View>
          <View style={styles.howStep}>
            <View style={styles.howNum}><Text style={styles.howNumText}>3</Text></View>
            <Text style={styles.howText}>Show your QR code — staff will scan and apply the credit</Text>
          </View>
        </View>

        {balance === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>No points yet</Text>
            <Text style={styles.emptyText}>Visit a partner business and scan your QR to start earning</Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('Businesses')}>
              <Text style={styles.exploreBtnText}>Find Businesses →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Quick presets */}
            {PRESETS.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>QUICK SELECT</Text>
                <View style={styles.presets}>
                  {PRESETS.map(p => (
                    <PresetBtn
                      key={p}
                      pts={p}
                      selected={points === p}
                      onPress={() => setInput(String(p))}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Custom input */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CUSTOM AMOUNT (multiples of 10)</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={input}
                  onChangeText={v => setInput(v.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor="#CCC"
                  keyboardType="number-pad"
                />
                <Text style={styles.inputSuffix}>pts</Text>
              </View>
              {input && points > balance && (
                <Text style={styles.inputError}>Not enough points (you have {balance.toLocaleString()})</Text>
              )}
              {input && points > 0 && points % 10 !== 0 && (
                <Text style={styles.inputError}>Must be a multiple of 10</Text>
              )}
            </View>

            {/* Credit preview */}
            {isValid && (
              <View style={styles.previewCard}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Points to redeem</Text>
                  <Text style={styles.previewValue}>{points.toLocaleString()} pts</Text>
                </View>
                <View style={styles.previewDivider}/>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Store credit</Text>
                  <Text style={styles.previewCredit}>{credit} credit</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Remaining balance</Text>
                  <Text style={styles.previewValue}>{(balance - points).toLocaleString()} pts</Text>
                </View>
              </View>
            )}

            {/* CTA */}
            <TouchableOpacity
              style={[styles.confirmBtn, !isValid && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!isValid}
            >
              <Text style={styles.confirmBtnText}>
                {isValid ? `Redeem ${points.toLocaleString()} pts →` : 'Select points to redeem'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.rateNote}>Rate: {REDEEM_RATE} pts = 1 unit of store credit</Text>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F5F7F5' },
  scroll: { padding: 20, gap: 20 },

  backBtn:  { alignSelf: 'flex-start' },
  backText: { color: '#2D6A4F', fontSize: 15, fontWeight: '600' },

  title:    { fontSize: 28, fontWeight: '900', color: '#1B4332', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#6B7C6B', lineHeight: 20 },

  balanceCard: {
    backgroundColor: '#1B4332',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 4,
  },
  balanceLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '700', letterSpacing: 2 },
  balanceValue: { fontSize: 56, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  balancePts:   { fontSize: 16, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  howCard:  { backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  howTitle: { fontSize: 15, fontWeight: '800', color: '#1B4332', marginBottom: 4 },
  howStep:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  howNum:   { width: 24, height: 24, borderRadius: 12, backgroundColor: '#2D6A4F', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  howNumText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  howText:  { flex: 1, fontSize: 14, color: '#444', lineHeight: 20 },

  emptyCard:  { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1B4332' },
  emptyText:  { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  exploreBtn: { marginTop: 8, backgroundColor: '#2D6A4F', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  exploreBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  section:      { gap: 10 },
  sectionLabel: { fontSize: 11, color: '#999', fontWeight: '700', letterSpacing: 1.5 },

  presets:      { flexDirection: 'row', gap: 10 },
  preset:       { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 2, borderWidth: 1.5, borderColor: '#E0EDE6', elevation: 1 },
  presetActive: { backgroundColor: '#2D6A4F', borderColor: '#2D6A4F' },
  presetPts:    { fontSize: 16, fontWeight: '800', color: '#1B4332' },
  presetPtsActive: { color: '#fff' },
  presetLabel:  { fontSize: 11, color: '#888' },
  presetLabelActive: { color: 'rgba(255,255,255,0.75)' },

  inputWrap:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1.5, borderColor: '#D0E8D8', gap: 8 },
  input:        { flex: 1, fontSize: 28, fontWeight: '800', color: '#1B4332' },
  inputSuffix:  { fontSize: 16, color: '#888', fontWeight: '600' },
  inputError:   { fontSize: 13, color: '#D62828', marginTop: 4 },

  previewCard:    { backgroundColor: '#F0FAF5', borderRadius: 18, padding: 18, gap: 12 },
  previewRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewDivider: { height: 1, backgroundColor: '#D0E8D8' },
  previewLabel:   { fontSize: 14, color: '#555' },
  previewValue:   { fontSize: 14, fontWeight: '700', color: '#1B4332' },
  previewCredit:  { fontSize: 18, fontWeight: '900', color: '#2D6A4F' },

  confirmBtn:         { backgroundColor: '#2D6A4F', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  confirmBtnDisabled: { backgroundColor: '#B0C8B8' },
  confirmBtnText:     { color: '#fff', fontSize: 16, fontWeight: '800' },

  rateNote: { textAlign: 'center', fontSize: 12, color: '#AAA' },
});
