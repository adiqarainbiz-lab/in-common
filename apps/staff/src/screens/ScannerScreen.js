import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { staffApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ScannerScreen({ navigation }) {
  const { staff }  = useAuth();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning,      setScanning]      = useState(true);
  const [processing,    setProcessing]    = useState(false);
  const [scanError,     setScanError]     = useState('');
  const [mode,          setMode]          = useState('scan'); // 'scan' | 'code'
  const [code,          setCode]          = useState('');
  const [codeLoading,   setCodeLoading]   = useState(false);
  const [codeError,     setCodeError]     = useState('');
  const lastScan = useRef(0);

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const handleBarcode = async ({ data: token }) => {
    const now = Date.now();
    if (!scanning || processing || now - lastScan.current < 2000) return;
    lastScan.current = now;
    setProcessing(true);
    setScanning(false);
    try {
      const res = await staffApi.scan(token);
      navigation.navigate('Member', { member: res.data.member });
    } catch (e) {
      const msg = e.response?.data?.error || 'Could not read QR code';
      setScanError(msg);
      setProcessing(false);
    }
  };

  const handleCodeLookup = async () => {
    if (!code.trim()) return;
    setCodeError('');
    setCodeLoading(true);
    try {
      const res = await staffApi.lookupCode(code.trim());
      setCode('');
      setCodeError('');
      setMode('scan');
      navigation.navigate('Member', { member: res.data.member });
    } catch (e) {
      setCodeError(e.response?.data?.error || 'No member found with that code');
    } finally { setCodeLoading(false); }
  };

  // ── Manual code entry mode ──────────────────────────────────────────────────
  if (mode === 'code') {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.codeScreen}>
          <TouchableOpacity onPress={() => { setMode('scan'); setCode(''); }}>
            <Text style={styles.backText}>← Back to Scanner</Text>
          </TouchableOpacity>

          <View style={styles.codeCard}>
            <Text style={styles.codeTitle}>Enter Member Code</Text>
            <Text style={styles.codeSub}>Ask the member for their 6-digit code shown in their app</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="000000"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              onSubmitEditing={handleCodeLookup}
              returnKeyType="go"
            />
            {codeError ? <Text style={styles.codeError}>{codeError}</Text> : null}
            {codeLoading ? <ActivityIndicator color="#2D6A4F" size="large" /> : (
              <TouchableOpacity
                style={styles.codeBtn}
                onPress={handleCodeLookup}
              >
                <Text style={styles.codeBtnText}>Find Member</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Camera scan mode ────────────────────────────────────────────────────────
  if (hasPermission === null) {
    return <View style={styles.center}><Text style={styles.permText}>Requesting camera…</Text></View>;
  }
  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera permission denied.</Text>
        <TouchableOpacity style={styles.codeBtn} onPress={() => setMode('code')}>
          <Text style={styles.codeBtnText}>Enter Code Instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan Member QR</Text>
        <Text style={styles.headerSub}>{staff?.business_name}</Text>
      </View>

      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanning ? handleBarcode : undefined}
        />
        <View style={styles.overlay}>
          <View style={styles.topFade} />
          <View style={styles.middleRow}>
            <View style={styles.sideFade} />
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
              {processing && (
                <View style={styles.processingOverlay}>
                  <Text style={styles.processingText}>Verifying…</Text>
                </View>
              )}
            </View>
            <View style={styles.sideFade} />
          </View>
          <View style={styles.bottomFade}>
            {scanError ? (
              <>
                <Text style={styles.scanErrorText}>{scanError}</Text>
                <View style={styles.scanErrorBtns}>
                  <TouchableOpacity style={styles.manualBtn} onPress={() => { setScanError(''); setScanning(true); }}>
                    <Text style={styles.manualBtnText}>Try Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.manualBtn} onPress={() => { setScanError(''); setMode('code'); }}>
                    <Text style={styles.manualBtnText}>Enter Code</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.scanHint}>Point camera at member's QR code</Text>
                <TouchableOpacity style={styles.manualBtn} onPress={() => setMode('code')}>
                  <Text style={styles.manualBtnText}>Enter Code Instead</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const CORNER = 28;
const BORDER = 4;
const CORNER_COLOR = '#52B788';

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#1B4332' },
  center:           { flex: 1, backgroundColor: '#1B4332', justifyContent: 'center', alignItems: 'center', padding: 32 },
  permText:         { color: 'white', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  header:           { padding: 20, paddingTop: 8 },
  headerTitle:      { color: 'white', fontSize: 22, fontWeight: '800' },
  headerSub:        { color: '#FFFFFF88', fontSize: 14, marginTop: 2 },
  cameraWrap:       { flex: 1, position: 'relative', overflow: 'hidden' },
  overlay:          { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  topFade:          { flex: 1, backgroundColor: '#00000066' },
  middleRow:        { flexDirection: 'row', height: 260 },
  sideFade:         { flex: 1, backgroundColor: '#00000066' },
  viewfinder:       { width: 260, height: 260 },
  bottomFade:       { flex: 1, backgroundColor: '#00000066', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 24, gap: 16 },
  corner:           { position: 'absolute', width: CORNER, height: CORNER, borderColor: CORNER_COLOR },
  tl:               { top: 0,    left: 0,   borderTopWidth: BORDER,    borderLeftWidth:  BORDER },
  tr:               { top: 0,    right: 0,  borderTopWidth: BORDER,    borderRightWidth: BORDER },
  bl:               { bottom: 0, left: 0,   borderBottomWidth: BORDER, borderLeftWidth:  BORDER },
  br:               { bottom: 0, right: 0,  borderBottomWidth: BORDER, borderRightWidth: BORDER },
  processingOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: '#2D6A4F99', justifyContent: 'center', alignItems: 'center' },
  processingText:   { color: 'white', fontSize: 16, fontWeight: '700' },
  scanHint:         { color: '#FFFFFF88', fontSize: 14, textAlign: 'center' },
  scanErrorText:    { color: '#FF6B6B', fontSize: 14, fontWeight: '700', textAlign: 'center', paddingHorizontal: 16 },
  scanErrorBtns:    { flexDirection: 'row', gap: 12 },
  manualBtn:        { backgroundColor: '#FFFFFF22', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF44' },
  manualBtnText:    { color: 'white', fontWeight: '600', fontSize: 14 },
  // Code entry mode
  codeScreen:       { flex: 1, padding: 24, gap: 32 },
  backText:         { color: '#52B788', fontSize: 16, fontWeight: '600' },
  codeCard:         { backgroundColor: '#FFFFFF15', borderRadius: 24, padding: 28, gap: 20, alignItems: 'center' },
  codeTitle:        { color: 'white', fontSize: 22, fontWeight: '800' },
  codeSub:          { color: '#FFFFFF88', fontSize: 14, textAlign: 'center' },
  codeInput:        { backgroundColor: 'white', borderRadius: 16, padding: 20, fontSize: 36, fontWeight: '800', color: '#1B4332', textAlign: 'center', letterSpacing: 12, width: '100%' },
  codeError:        { color: '#FF6B6B', fontSize: 14, textAlign: 'center' },
  codeBtn:          { backgroundColor: '#52B788', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center', width: '100%' },
  codeBtnDisabled:  { opacity: 0.4 },
  codeBtnText:      { color: 'white', fontSize: 16, fontWeight: '700' },
});
