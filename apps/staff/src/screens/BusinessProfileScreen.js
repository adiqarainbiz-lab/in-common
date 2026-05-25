import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { staffApi } from '../services/api';

// ── Small section card ────────────────────────────────────────────────────────
function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function Field({ label, value, onChange, placeholder, multiline }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && { height: 90, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || ''}
        placeholderTextColor="#aaa"
        multiline={multiline}
        autoCapitalize="none"
      />
    </View>
  );
}

// ── Offer request modal ───────────────────────────────────────────────────────
function OfferForm({ initial, onSubmit, onCancel, loading }) {
  const [title,       setTitle]       = useState(initial?.title       || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [imageUrl,    setImageUrl]    = useState(initial?.image_url   || '');
  const [validFrom,   setValidFrom]   = useState(initial?.valid_from  ? initial.valid_from.slice(0,10) : '');
  const [validUntil,  setValidUntil]  = useState(initial?.valid_until ? initial.valid_until.slice(0,10) : '');

  return (
    <View style={styles.offerForm}>
      <Field label="Title *" value={title} onChange={setTitle} placeholder="e.g. Double Points Weekend" />
      <Field label="Description" value={description} onChange={setDescription} placeholder="Details about the offer…" multiline />
      <Field label="Image URL" value={imageUrl} onChange={setImageUrl} placeholder="https://…" />
      <Field label="Valid From (YYYY-MM-DD)" value={validFrom} onChange={setValidFrom} placeholder="2026-06-01" />
      <Field label="Valid Until (YYYY-MM-DD)" value={validUntil} onChange={setValidUntil} placeholder="2026-06-30" />
      <View style={styles.offerFormBtns}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.6 }]}
          disabled={loading}
          onPress={() => onSubmit({ title, description, image_url: imageUrl, valid_from: validFrom || null, valid_until: validUntil || null })}
        >
          <Text style={styles.submitBtnText}>{loading ? 'Submitting…' : 'Submit for Review'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function BusinessProfileScreen() {
  const [data,          setData]         = useState(null);
  const [loading,       setLoading]      = useState(true);

  // Profile edit state
  const [showProfile,   setShowProfile]  = useState(false);
  const [profileFields, setProfileFields]= useState({});
  const [profileSaving, setProfileSaving]= useState(false);

  // Offer form state
  const [offerMode,     setOfferMode]    = useState(null); // null | 'create' | {edit, offer} | {delete, offer}
  const [offerSaving,   setOfferSaving]  = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await staffApi.businessPortal();
      setData(res.data);
      setProfileFields({
        logo_url:    res.data.business.logo_url    || '',
        cover_url:   res.data.business.cover_url   || '',
        description: res.data.business.description || '',
        hours:       res.data.business.hours       || '',
        phone:       res.data.business.phone       || '',
        website:     res.data.business.website     || '',
        instagram:   res.data.business.instagram   || '',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submitProfileRequest() {
    const payload = {};
    if (data?.business) {
      const biz = data.business;
      Object.keys(profileFields).forEach(k => {
        if (profileFields[k] !== (biz[k] || '')) payload[k] = profileFields[k] || null;
      });
    }
    if (!Object.keys(payload).length) return Alert.alert('No changes', 'Nothing was changed.');
    setProfileSaving(true);
    try {
      await staffApi.profileRequest(payload);
      Alert.alert('Submitted', 'Your profile update has been sent for review.');
      setShowProfile(false);
      load();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Submission failed.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function submitOfferRequest(fields) {
    setOfferSaving(true);
    try {
      if (offerMode === 'create') {
        await staffApi.offerRequest({ action: 'create', ...fields });
        Alert.alert('Submitted', 'Your new offer has been sent for review.');
      } else if (offerMode?.type === 'edit') {
        await staffApi.offerRequest({ action: 'edit', offer_id: offerMode.offer.id, ...fields });
        Alert.alert('Submitted', 'Your edit request has been sent for review.');
      }
      setOfferMode(null);
      load();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Submission failed.');
    } finally {
      setOfferSaving(false);
    }
  }

  async function requestDelete(offer) {
    Alert.alert(
      'Delete Offer',
      `Request to delete "${offer.title}"? Admin will review.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await staffApi.offerRequest({ action: 'delete', offer_id: offer.id });
              Alert.alert('Submitted', 'Delete request sent for review.');
              load();
            } catch (e) {
              Alert.alert('Error', e.response?.data?.error || 'Failed.');
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ flex: 1 }} color="#2D6A4F" size="large" />
      </SafeAreaView>
    );
  }

  const biz    = data?.business || {};
  const offers = data?.offers   || [];
  const pending = data?.pendingRequests?.length || 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{biz.name}</Text>
          <Text style={styles.headerSub}>{biz.category} · {biz.address}</Text>
          {pending > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>⏳ {pending} request{pending !== 1 ? 's' : ''} pending review</Text>
            </View>
          )}
        </View>

        {/* Cover preview */}
        {biz.cover_url ? (
          <Image source={{ uri: biz.cover_url }} style={styles.coverPreview} resizeMode="cover" />
        ) : (
          <View style={[styles.coverPreview, styles.coverFallback]}>
            <Text style={{ fontSize: 48 }}>🏪</Text>
          </View>
        )}

        {/* Profile update section */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📸 Profile & Photos</Text>
            <TouchableOpacity onPress={() => setShowProfile(v => !v)}>
              <Text style={styles.toggleBtn}>{showProfile ? 'Close' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          {!showProfile && (
            <Text style={styles.hint}>
              Update your cover photo, logo, description, hours, and contact info.
              Changes go to admin for review.
            </Text>
          )}

          {showProfile && (
            <>
              <Field label="Cover Photo URL" value={profileFields.cover_url} onChange={v => setProfileFields(f => ({...f, cover_url: v}))} placeholder="https://…" />
              <Field label="Logo URL"        value={profileFields.logo_url}  onChange={v => setProfileFields(f => ({...f, logo_url: v}))}  placeholder="https://…" />
              <Field label="Description"     value={profileFields.description} onChange={v => setProfileFields(f => ({...f, description: v}))} multiline placeholder="Tell customers about your business…" />
              <Field label="Opening Hours"   value={profileFields.hours}     onChange={v => setProfileFields(f => ({...f, hours: v}))}     placeholder="Sun–Thu 8am–10pm" />
              <Field label="Phone"           value={profileFields.phone}     onChange={v => setProfileFields(f => ({...f, phone: v}))}     placeholder="+972…" />
              <Field label="Website"         value={profileFields.website}   onChange={v => setProfileFields(f => ({...f, website: v}))}   placeholder="https://…" />
              <Field label="Instagram"       value={profileFields.instagram} onChange={v => setProfileFields(f => ({...f, instagram: v}))} placeholder="@yourhandle" />
              <TouchableOpacity
                style={[styles.submitBtn, profileSaving && { opacity: 0.6 }]}
                disabled={profileSaving}
                onPress={submitProfileRequest}
              >
                <Text style={styles.submitBtnText}>{profileSaving ? 'Submitting…' : 'Submit for Review'}</Text>
              </TouchableOpacity>
            </>
          )}
        </Card>

        {/* Offers section */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏷️ Offers</Text>
            <TouchableOpacity onPress={() => setOfferMode('create')}>
              <Text style={styles.toggleBtn}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {offerMode === 'create' && (
            <OfferForm
              onSubmit={submitOfferRequest}
              onCancel={() => setOfferMode(null)}
              loading={offerSaving}
            />
          )}

          {offers.length === 0 && offerMode !== 'create' && (
            <Text style={styles.hint}>No active offers yet. Tap "+ Add" to create one — it'll go to admin for review.</Text>
          )}

          {offers.map(offer => (
            <View key={offer.id} style={styles.offerItem}>
              {offer.image_url ? (
                <Image source={{ uri: offer.image_url }} style={styles.offerThumb} resizeMode="cover" />
              ) : null}
              <View style={styles.offerItemBody}>
                <Text style={styles.offerItemTitle}>{offer.title}</Text>
                {offer.description ? <Text style={styles.offerItemDesc} numberOfLines={2}>{offer.description}</Text> : null}
                {offer.valid_until ? <Text style={styles.offerItemDate}>Until {offer.valid_until.slice(0,10)}</Text> : null}
              </View>
              <View style={styles.offerItemActions}>
                <TouchableOpacity onPress={() => setOfferMode({ type: 'edit', offer })}>
                  <Text style={styles.offerEditBtn}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => requestDelete(offer)}>
                  <Text style={styles.offerDeleteBtn}>🗑</Text>
                </TouchableOpacity>
              </View>

              {offerMode?.type === 'edit' && offerMode.offer.id === offer.id && (
                <OfferForm
                  initial={offer}
                  onSubmit={submitOfferRequest}
                  onCancel={() => setOfferMode(null)}
                  loading={offerSaving}
                />
              )}
            </View>
          ))}
        </Card>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#F0F4F0' },
  scroll:       { paddingBottom: 40 },

  header:       { padding: 20, paddingBottom: 12 },
  headerTitle:  { fontSize: 22, fontWeight: '800', color: '#1B4332' },
  headerSub:    { fontSize: 14, color: '#555', marginTop: 2, textTransform: 'capitalize' },
  pendingBadge: { marginTop: 10, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10 },
  pendingBadgeText: { color: '#92400E', fontSize: 13, fontWeight: '600' },

  coverPreview: { width: '100%', height: 180, backgroundColor: '#D8F3DC', alignItems: 'center', justifyContent: 'center' },
  coverFallback:{ alignItems: 'center', justifyContent: 'center' },

  card:         { margin: 12, marginTop: 12, backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1B4332' },
  toggleBtn:    { color: '#2D6A4F', fontWeight: '700', fontSize: 14 },
  hint:         { color: '#888', fontSize: 13, lineHeight: 19 },

  fieldWrap:    { gap: 4 },
  fieldLabel:   { fontSize: 12, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput:   { borderWidth: 1.5, borderColor: '#D0E8D8', borderRadius: 10, padding: 11, fontSize: 14, color: '#222' },

  submitBtn:    { backgroundColor: '#2D6A4F', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  submitBtnText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn:    { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelBtnText:{ color: '#555', fontWeight: '600', fontSize: 15 },

  offerForm:    { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 14, gap: 10 },
  offerFormBtns:{ flexDirection: 'row', gap: 8 },

  offerItem:    { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12, gap: 8 },
  offerThumb:   { width: '100%', height: 120, borderRadius: 10 },
  offerItemBody:{ flex: 1 },
  offerItemTitle:{ fontSize: 14, fontWeight: '700', color: '#1B4332' },
  offerItemDesc: { fontSize: 13, color: '#666', marginTop: 2 },
  offerItemDate: { fontSize: 12, color: '#2D6A4F', marginTop: 4, fontWeight: '600' },
  offerItemActions: { flexDirection: 'row', gap: 16, justifyContent: 'flex-end' },
  offerEditBtn:  { fontSize: 20 },
  offerDeleteBtn:{ fontSize: 20 },
});
