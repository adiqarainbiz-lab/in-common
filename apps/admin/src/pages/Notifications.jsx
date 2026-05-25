import { useState } from 'react';
import Layout from '../components/Layout';
import api from '../api';

const TIERS = [
  { value: '',         label: 'All members' },
  { value: 'Seedling', label: '🌱 Seedling' },
  { value: 'Olive',    label: '🫒 Olive' },
  { value: 'Cedar',    label: '🌲 Cedar' },
  { value: 'Keffiyeh', label: '🏅 Keffiyeh' },
];

const TEMPLATES = [
  { label: 'New offer', title: 'New deal just dropped 🎁', body: 'A partner business just added a new offer. Open the app to see it!' },
  { label: 'Weekend visit', title: 'Visit us this weekend 🌟', body: 'Don\'t miss out — come earn your Common Points this weekend at our partner businesses.' },
  { label: 'Points reminder', title: 'Your points are waiting 💚', body: 'You have Common Points ready to use. Stop by any partner business and redeem them today.' },
  { label: 'Custom', title: '', body: '' },
];

export default function Notifications() {
  const [title,    setTitle]    = useState('');
  const [body,     setBody]     = useState('');
  const [tier,     setTier]     = useState('');
  const [sending,  setSending]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState('');

  function applyTemplate(t) {
    setTitle(t.title);
    setBody(t.body);
    setResult(null);
    setError('');
  }

  async function send() {
    if (!title.trim()) return setError('Title is required.');
    if (!body.trim())  return setError('Message body is required.');
    setError('');
    setSending(true);
    setResult(null);
    try {
      const { data } = await api.post('/admin/notifications/send', {
        title: title.trim(), body: body.trim(), ...(tier ? { tier } : {}),
      });
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Send failed.');
    } finally {
      setSending(false);
    }
  }

  const charCount = body.length;
  const charWarn  = charCount > 180;

  return (
    <Layout title="Push Notifications">
      <div style={{ maxWidth: 600 }}>

        {/* Templates */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Quick templates</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TEMPLATES.map(t => (
              <button
                key={t.label}
                onClick={() => applyTemplate(t)}
                style={{
                  padding: '7px 14px', borderRadius: 20, border: '1.5px solid #D0E8D8',
                  background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#2D6A4F',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Audience */}
          <div>
            <label style={labelStyle}>Audience</label>
            <select
              value={tier}
              onChange={e => setTier(e.target.value)}
              style={inputStyle}
            >
              {TIERS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <p style={hintStyle}>Only members who have enabled notifications will receive this.</p>
          </div>

          {/* Title */}
          <div>
            <label style={labelStyle}>Notification title</label>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setError(''); setResult(null); }}
              placeholder="e.g. New deal just dropped 🎁"
              maxLength={80}
              style={inputStyle}
            />
          </div>

          {/* Body */}
          <div>
            <label style={labelStyle}>Message</label>
            <textarea
              value={body}
              onChange={e => { setBody(e.target.value); setError(''); setResult(null); }}
              placeholder="Write your message here…"
              maxLength={256}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
            />
            <p style={{ ...hintStyle, color: charWarn ? '#d97706' : '#aaa' }}>
              {charCount}/256 characters{charWarn ? ' — keep it short for best results' : ''}
            </p>
          </div>

          {/* Preview */}
          {(title || body) && (
            <div>
              <p style={{ ...labelStyle, marginBottom: 8 }}>Preview</p>
              <div style={{
                background: '#F8FAF8', borderRadius: 14, padding: '14px 16px',
                border: '1px solid #D0E8D8', display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: '#1B4332',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>🌿</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 3 }}>
                    {title || '—'}
                  </div>
                  <div style={{ fontSize: 13, color: '#555', lineHeight: 1.4 }}>
                    {body || '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: '#FEF2F2', borderRadius: 10, padding: '10px 14px', color: '#DC2626', fontSize: 14 }}>
              {error}
            </div>
          )}

          {result && (
            <div style={{ background: '#F0FFF4', borderRadius: 10, padding: '14px 18px', border: '1px solid #BBF7D0' }}>
              <div style={{ fontWeight: 700, color: '#166534', fontSize: 15, marginBottom: 8 }}>✓ Campaign sent</div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <Stat label="Delivered" value={result.sent}      color="#166534" />
                <Stat label="Failed"    value={result.failed}    color={result.failed > 0 ? '#DC2626' : '#aaa'} />
                <Stat label="No token"  value={result.no_token}  color="#aaa" />
              </div>
            </div>
          )}

          <button
            onClick={send}
            disabled={sending}
            style={{
              background: sending ? '#aaa' : '#1B4332',
              color: '#fff', border: 'none', borderRadius: 12,
              padding: '14px 28px', fontSize: 15, fontWeight: 700,
              cursor: sending ? 'not-allowed' : 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            {sending ? 'Sending…' : '📣 Send notification'}
          </button>
        </div>
      </div>
    </Layout>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>{label}</div>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 700, color: '#444',
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4,
};
const inputStyle = {
  width: '100%', padding: '10px 13px', border: '1.5px solid #D0E8D8',
  borderRadius: 10, fontSize: 14, color: '#222', boxSizing: 'border-box',
  outline: 'none', fontFamily: 'inherit',
};
const hintStyle = { margin: '5px 0 0', fontSize: 12, color: '#aaa' };
