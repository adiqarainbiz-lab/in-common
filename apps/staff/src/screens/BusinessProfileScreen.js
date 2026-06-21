import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { staffApi } from '../services/api';

function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

function SectionHeader({ title, onEdit, onSave, onCancel, editing, saving }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {editing ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={onCancel}><Text style={styles.cancelLink}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity onPress={onSave} disabled={saving}>
            <Text style={[styles.saveLink, saving && { opacity: 0.5 }]}>{saving ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={onEdit}><Text style={styles.editLink}>Edit</Text></TouchableOpacity>
      )}
    </View>
  );
}

function Field({ label, value, onChange, placeholder, multiline, lines }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && { height: lines ? lines * 22 + 20 : 90, textAlignVertical: 'top' }]}
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

function BarChart({ daily }) {
  const maxScans = Math.max(...daily.map(d => d.scans), 1);
  const BAR_MAX_H = 56;
  return (
    <View style={styles.chartWrap}>
      {daily.map((d) => {
        const barH = Math.max(4, Math.round((d.scans / maxScans) * BAR_MAX_H));
        const label = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0,1);
        const isToday = d.date === new Date().toISOString().slice(0,10);
        return (
          <View key={d.date} style={styles.barCol}>
            <Text style={styles.barCount}>{d.scans > 0 ? d.scans : ''}</Text>
            <View style={[styles.bar, { height: barH, backgroundColor: isToday ? '#1B4332' : '#B7E4C7' }]} />
            <Text style={[styles.barLabel, isToday && { color: '#1B4332', fontWeight: '700' }]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function OfferForm({ initial, onSubmit, onCancel, loading }) {
  const [title, setTitle]             = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [imageUrl, setImageUrl]       = useState(initial?.image_url || '');
  const [validFrom, setValidFrom]     = useState(initial?.valid_from ? initial.valid_from.slice(0,10) : '');
  const [validUntil, setValidUntil]   = useState(initial?.valid_until ? initial.valid_until.slice(0,10) : '');
  return (
    <View style={styles.offerForm}>
      <Field label="Title *" value={title} onChange={setTitle} placeholder="e.g. Double Points Weekend" />
      <Field label="Description" value={description} onChange={setDescription} placeholder="Details…" multiline />
      <Field label="Image URL" value={imageUrl} onChange={setImageUrl} placeholder="https://…" />
      <Field label="Valid From (YYYY-MM-DD)" value={validFrom} onChange={setValidFrom} placeholder="2026-06-01" />
      <Field label="Valid Until (YYYY-MM-DD)" value={validUntil} onChange={setValidUntil} placeholder="2026-06-30" />
      <View style={styles.offerFormBtns}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.6 }]} disabled={loading}
          onPress={() => onSubmit({ title, description, image_url: imageUrl, valid_from: validFrom||null, valid_until: validUntil||null })}>
          <Text style={styles.submitBtnText}>{loading ? 'Submitting…' : 'Submit for Review'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function BusinessProfileScreen() {
  const [data,       setData]       = useState(null);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Section editing state
  const [editSection, setEditSection] = useState(null); // 'about' | 'contact' | 'menu' | 'photos_meta'
  const [fields,      setFields]      = useState({});
  const [saving,      setSaving]      = useState(false);

  // Photo gallery state
  const [photos,       setPhotos]       = useState([]);
  const [newPhotoUrl,  setNewPhotoUrl]  = useState('');
  const [newPhotoCapt, setNewPhotoCapt] = useState('');
  const [photoAdding,  setPhotoAdding]  = useState(false);

  // Offer form state
  const [offerMode,  setOfferMode]  = useState(null);
  const [offerSaving, setOfferSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [portalRes, statsRes] = await Promise.allSettled([
        staffApi.businessPortal(),
        staffApi.businessStats(),
      ]);
      if (portalRes.status === 'fulfilled') {
        setData(portalRes.value.data);
        setPhotos(portalRes.value.data.photos || []);
        const biz = portalRes.value.data.business;
        setFields({
          description: biz.description || '',
          hours:       biz.hours       || '',
          phone:       biz.phone       || '',
          website:     biz.website     || '',
          instagram:   biz.instagram   || '',
          menu_url:    biz.menu_url    || '',
          logo_url:    biz.logo_url    || '',
          cover_url:   biz.cover_url   || '',
        });
      }
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveSection(sectionFields) {
    setSaving(true);
    try {
      const payload = {};
      sectionFields.forEach(k => { payload[k] = fields[k] || null; });
      const res = await staffApi.updateProfile(payload);
      setData(d => ({ ...d, business: res.data }));
      setEditSection(null);
      Alert.alert('Saved', 'Your changes are live.');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function addPhoto() {
    if (!newPhotoUrl.trim()) return;
    setPhotoAdding(true);
    try {
      const res = await staffApi.addPhoto(newPhotoUrl.trim(), newPhotoCapt.trim() || undefined);
      setPhotos(p => [...p, res.data]);
      setNewPhotoUrl('');
      setNewPhotoCapt('');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Could not add photo.');
    } finally {
      setPhotoAdding(false);
    }
  }

  async function removePhoto(id) {
    Alert.alert('Remove Photo', 'Remove this photo from your page?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await staffApi.removePhoto(id);
            setPhotos(p => p.filter(ph => ph.id !== id));
          } catch (e) {
            Alert.alert('Error', 'Could not remove photo.');
          }
        },
      },
    ]);
  }

  async function movePhoto(index, direction) {
    const newPhotos = [...photos];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newPhotos.length) return;
    [newPhotos[index], newPhotos[swapIndex]] = [newPhotos[swapIndex], newPhotos[index]];
    const orders = newPhotos.map((p, i) => ({ id: p.id, sort_order: i }));
    setPhotos(newPhotos);
    try {
      await staffApi.reorderPhotos(orders);
    } catch { load(); } // revert on error
  }

  async function submitOfferRequest(fields_) {
    setOfferSaving(true);
    try {
      if (offerMode === 'create') {
        await staffApi.offerRequest({ action: 'create', ...fields_ });
        Alert.alert('Submitted', 'New offer sent for review.');
      } else if (offerMode?.type === 'edit') {
        await staffApi.offerRequest({ action: 'edit', offer_id: offerMode.offer.id, ...fields_ });
        Alert.alert('Submitted', 'Edit request sent for review.');
      }
      setOfferMode(null);
      load();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Submission failed.');
    } finally {
      setOfferSaving(false);
    }
  }

  async function requestDeleteOffer(offer) {
    Alert.alert('Delete Offer', `Delete "${offer.title}"? Admin will review.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Request Delete', style: 'destructive',
        onPress: async () => {
          try {
            await staffApi.offerRequest({ action: 'delete', offer_id: offer.id });
            Alert.alert('Submitted', 'Delete request sent.');
            load();
          } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'Failed.');
          }
        },
      },
    ]);
  }

  if (loading) {
    return <SafeAreaView style={styles.safe}><ActivityIndicator style={{ flex: 1 }} color="#2D6A4F" size="large" /></SafeAreaView>;
  }

  const biz    = data?.business || {};
  const offers = data?.offers   || [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#2D6A4F" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{biz.name}</Text>
          <Text style={styles.headerSub}>{biz.category} · {biz.address}</Text>
          {(data?.pendingRequests?.length || 0) > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>⏳ {data.pendingRequests.length} offer request{data.pendingRequests.length !== 1 ? 's' : ''} pending review</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsDash}>
            <View style={styles.statsRow}>
              <View style={styles.statCard}><Text style={styles.statValue}>{stats.scans_today}</Text><Text style={styles.statLabel}>Today</Text></View>
              <View style={[styles.statCard, styles.statCardMid]}><Text style={styles.statValue}>{stats.scans_week}</Text><Text style={styles.statLabel}>This week</Text></View>
              <View style={styles.statCard}><Text style={styles.statValue}>{stats.members_week}</Text><Text style={styles.statLabel}>Members/wk</Text></View>
            </View>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Scans — last 7 days</Text>
              <BarChart daily={stats.daily} />
            </View>
          </View>
        )}

        {/* About */}
        <Card>
          <SectionHeader
            title="📝 About"
            editing={editSection === 'about'}
            saving={saving}
            onEdit={() => setEditSection('about')}
            onCancel={() => setEditSection(null)}
            onSave={() => saveSection(['description'])}
          />
          {editSection === 'about' ? (
            <Field label="Description" value={fields.description} onChange={v => setFields(f => ({...f, description: v}))}
              placeholder="Tell customers what makes your business special…" multiline lines={5} />
          ) : (
            <Text style={styles.previewText}>{biz.description || 'No description yet. Tap Edit to add one.'}</Text>
          )}
        </Card>

        {/* Hours & Contact */}
        <Card>
          <SectionHeader
            title="📞 Hours & Contact"
            editing={editSection === 'contact'}
            saving={saving}
            onEdit={() => setEditSection('contact')}
            onCancel={() => setEditSection(null)}
            onSave={() => saveSection(['hours', 'phone', 'website', 'instagram'])}
          />
          {editSection === 'contact' ? (
            <>
              <Field label="Opening Hours" value={fields.hours}     onChange={v => setFields(f => ({...f, hours: v}))}     placeholder="Sun–Thu 8am–10pm, Fri 8am–3pm" />
              <Field label="Phone"         value={fields.phone}     onChange={v => setFields(f => ({...f, phone: v}))}     placeholder="+972…" />
              <Field label="Website"       value={fields.website}   onChange={v => setFields(f => ({...f, website: v}))}   placeholder="https://…" />
              <Field label="Instagram"     value={fields.instagram} onChange={v => setFields(f => ({...f, instagram: v}))} placeholder="@yourhandle" />
            </>
          ) : (
            <View style={styles.previewRows}>
              {biz.hours     && <Text style={styles.previewRow}>🕐 {biz.hours}</Text>}
              {biz.phone     && <Text style={styles.previewRow}>📞 {biz.phone}</Text>}
              {biz.website   && <Text style={styles.previewRow}>🌐 {biz.website}</Text>}
              {biz.instagram && <Text style={styles.previewRow}>📸 {biz.instagram}</Text>}
              {!biz.hours && !biz.phone && !biz.website && !biz.instagram &&
                <Text style={styles.previewEmpty}>Nothing set yet. Tap Edit.</Text>}
            </View>
          )}
        </Card>

        {/* Menu */}
        <Card>
          <SectionHeader
            title="🍽️ Menu"
            editing={editSection === 'menu'}
            saving={saving}
            onEdit={() => setEditSection('menu')}
            onCancel={() => setEditSection(null)}
            onSave={() => saveSection(['menu_url'])}
          />
          {editSection === 'menu' ? (
            <Field label="Menu URL" value={fields.menu_url} onChange={v => setFields(f => ({...f, menu_url: v}))} placeholder="https://your-menu.com or a PDF link" />
          ) : (
            <Text style={styles.previewText}>{biz.menu_url || 'No menu link yet. Tap Edit to add one.'}</Text>
          )}
        </Card>

        {/* Cover & Logo */}
        <Card>
          <SectionHeader
            title="🖼️ Cover & Logo"
            editing={editSection === 'photos_meta'}
            saving={saving}
            onEdit={() => setEditSection('photos_meta')}
            onCancel={() => setEditSection(null)}
            onSave={() => saveSection(['cover_url', 'logo_url'])}
          />
          {editSection === 'photos_meta' ? (
            <>
              <Field label="Cover Photo URL" value={fields.cover_url} onChange={v => setFields(f => ({...f, cover_url: v}))} placeholder="https://…" />
              {fields.cover_url ? <Image source={{ uri: fields.cover_url }} style={styles.previewImg} resizeMode="cover" /> : null}
              <Field label="Logo URL" value={fields.logo_url} onChange={v => setFields(f => ({...f, logo_url: v}))} placeholder="https://…" />
              {fields.logo_url ? <Image source={{ uri: fields.logo_url }} style={styles.logoPreview} resizeMode="contain" /> : null}
            </>
          ) : (
            <View style={styles.previewRows}>
              {biz.cover_url && <Image source={{ uri: biz.cover_url }} style={styles.previewImg} resizeMode="cover" />}
              {biz.logo_url  && <Image source={{ uri: biz.logo_url  }} style={styles.logoPreview} resizeMode="contain" />}
              {!biz.cover_url && !biz.logo_url && <Text style={styles.previewEmpty}>No cover or logo yet.</Text>}
            </View>
          )}
        </Card>

        {/* Photo Gallery */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📸 Photo Gallery</Text>
          </View>
          {photos.length === 0 && <Text style={styles.previewEmpty}>No gallery photos yet. Add one below.</Text>}
          {photos.map((photo, index) => (
            <View key={photo.id} style={styles.galleryRow}>
              <Image source={{ uri: photo.url }} style={styles.galleryThumb} resizeMode="cover" />
              <View style={styles.galleryInfo}>
                {photo.caption ? <Text style={styles.galleryCaption} numberOfLines={2}>{photo.caption}</Text> : null}
                <Text style={styles.galleryUrl} numberOfLines={1}>{photo.url}</Text>
              </View>
              <View style={styles.galleryActions}>
                <TouchableOpacity onPress={() => movePhoto(index, 'up')} disabled={index === 0}>
                  <Text style={[styles.arrowBtn, index === 0 && styles.arrowDisabled]}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => movePhoto(index, 'down')} disabled={index === photos.length - 1}>
                  <Text style={[styles.arrowBtn, index === photos.length - 1 && styles.arrowDisabled]}>▼</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removePhoto(photo.id)}>
                  <Text style={styles.deleteBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={styles.addPhotoWrap}>
            <Text style={styles.fieldLabel}>ADD PHOTO</Text>
            <TextInput style={styles.fieldInput} value={newPhotoUrl} onChangeText={setNewPhotoUrl} placeholder="Photo URL (https://…)" placeholderTextColor="#aaa" autoCapitalize="none" />
            <TextInput style={styles.fieldInput} value={newPhotoCapt} onChangeText={setNewPhotoCapt} placeholder="Caption (optional)" placeholderTextColor="#aaa" />
            <TouchableOpacity
              style={[styles.submitBtn, (!newPhotoUrl.trim() || photoAdding) && { opacity: 0.5 }]}
              onPress={addPhoto}
              disabled={!newPhotoUrl.trim() || photoAdding}
            >
              <Text style={styles.submitBtnText}>{photoAdding ? 'Adding…' : '+ Add Photo'}</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Offers */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏷️ Offers</Text>
            <TouchableOpacity onPress={() => setOfferMode('create')}><Text style={styles.editLink}>+ Add</Text></TouchableOpacity>
          </View>
          <Text style={styles.hintText}>Offers go to admin for review before going live.</Text>
          {offerMode === 'create' && (
            <OfferForm onSubmit={submitOfferRequest} onCancel={() => setOfferMode(null)} loading={offerSaving} />
          )}
          {offers.length === 0 && offerMode !== 'create' && (
            <Text style={styles.previewEmpty}>No active offers yet.</Text>
          )}
          {offers.map(offer => (
            <View key={offer.id} style={styles.offerItem}>
              {offer.image_url ? <Image source={{ uri: offer.image_url }} style={styles.offerThumb} resizeMode="cover" /> : null}
              <View style={styles.offerItemBody}>
                <Text style={styles.offerItemTitle}>{offer.title}</Text>
                {offer.description ? <Text style={styles.offerItemDesc} numberOfLines={2}>{offer.description}</Text> : null}
                {offer.valid_until ? <Text style={styles.offerItemDate}>Until {offer.valid_until.slice(0,10)}</Text> : null}
              </View>
              <View style={styles.offerItemActions}>
                <TouchableOpacity onPress={() => setOfferMode({ type: 'edit', offer })}><Text style={styles.offerEditBtn}>✏️</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => requestDeleteOffer(offer)}><Text style={styles.offerDeleteBtn}>🗑</Text></TouchableOpacity>
              </View>
              {offerMode?.type === 'edit' && offerMode.offer.id === offer.id && (
                <OfferForm initial={offer} onSubmit={submitOfferRequest} onCancel={() => setOfferMode(null)} loading={offerSaving} />
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
  safe:   { flex: 1, backgroundColor: '#F0F4F0' },
  scroll: { paddingBottom: 40 },

  header:           { padding: 20, paddingBottom: 12 },
  headerTitle:      { fontSize: 22, fontWeight: '800', color: '#1B4332' },
  headerSub:        { fontSize: 14, color: '#555', marginTop: 2, textTransform: 'capitalize' },
  pendingBadge:     { marginTop: 10, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10 },
  pendingBadgeText: { color: '#92400E', fontSize: 13, fontWeight: '600' },

  statsDash:   { paddingHorizontal: 12, paddingTop: 4, gap: 8 },
  statsRow:    { flexDirection: 'row', gap: 8 },
  statCard:    { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
  statCardMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#F0F0F0' },
  statValue:   { fontSize: 26, fontWeight: '900', color: '#1B4332', lineHeight: 30 },
  statLabel:   { fontSize: 11, color: '#888', marginTop: 3, fontWeight: '500' },
  chartCard:   { backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
  chartTitle:  { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 12 },
  chartWrap:   { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 80 },
  barCol:      { flex: 1, alignItems: 'center', gap: 4 },
  bar:         { width: '60%', borderRadius: 4 },
  barCount:    { fontSize: 10, color: '#555', fontWeight: '700', height: 14 },
  barLabel:    { fontSize: 11, color: '#aaa', fontWeight: '500' },

  card:          { margin: 12, marginTop: 8, backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:  { fontSize: 15, fontWeight: '800', color: '#1B4332' },
  editLink:      { color: '#2D6A4F', fontWeight: '700', fontSize: 14 },
  saveLink:      { color: '#2D6A4F', fontWeight: '800', fontSize: 14 },
  cancelLink:    { color: '#888',    fontWeight: '600', fontSize: 14 },
  hintText:      { fontSize: 12, color: '#aaa' },

  previewText:  { fontSize: 14, color: '#444', lineHeight: 21 },
  previewEmpty: { fontSize: 13, color: '#aaa', fontStyle: 'italic' },
  previewRows:  { gap: 6 },
  previewRow:   { fontSize: 14, color: '#333' },
  previewImg:   { width: '100%', height: 160, borderRadius: 10 },
  logoPreview:  { width: 80, height: 80, borderRadius: 10, backgroundColor: '#f0f0f0' },

  fieldWrap:  { gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { borderWidth: 1.5, borderColor: '#D0E8D8', borderRadius: 10, padding: 11, fontSize: 14, color: '#222', marginBottom: 4 },

  submitBtn:     { backgroundColor: '#2D6A4F', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn:     { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#555', fontWeight: '600', fontSize: 15 },

  galleryRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  galleryThumb:   { width: 64, height: 64, borderRadius: 8, backgroundColor: '#eee' },
  galleryInfo:    { flex: 1, gap: 3 },
  galleryCaption: { fontSize: 13, fontWeight: '600', color: '#333' },
  galleryUrl:     { fontSize: 11, color: '#aaa' },
  galleryActions: { flexDirection: 'column', alignItems: 'center', gap: 4 },
  arrowBtn:       { fontSize: 18, color: '#2D6A4F', fontWeight: '700', paddingHorizontal: 4 },
  arrowDisabled:  { color: '#ccc' },
  deleteBtn:      { fontSize: 16, color: '#DC2626', fontWeight: '700', paddingHorizontal: 4 },
  addPhotoWrap:   { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 14, gap: 8 },

  offerForm:      { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 14, gap: 10 },
  offerFormBtns:  { flexDirection: 'row', gap: 8 },
  offerItem:      { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12, gap: 8 },
  offerThumb:     { width: '100%', height: 120, borderRadius: 10 },
  offerItemBody:  { flex: 1 },
  offerItemTitle: { fontSize: 14, fontWeight: '700', color: '#1B4332' },
  offerItemDesc:  { fontSize: 13, color: '#666', marginTop: 2 },
  offerItemDate:  { fontSize: 12, color: '#2D6A4F', marginTop: 4, fontWeight: '600' },
  offerItemActions: { flexDirection: 'row', gap: 16, justifyContent: 'flex-end' },
  offerEditBtn:   { fontSize: 20 },
  offerDeleteBtn: { fontSize: 20 },
});
