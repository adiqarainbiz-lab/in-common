import { useState } from 'react';
import api from '../api';

const CATEGORIES = [
  'Restaurant', 'Café', 'Grocery', 'Bakery', 'Pharmacy',
  'Clothing', 'Bookstore', 'Electronics', 'Salon', 'Other',
];

const FIELD = (label, key, props = {}) => ({ label, key, ...props });

const FIELDS = [
  FIELD('Business Name *', 'name', { placeholder: 'e.g. Al-Aqsa Bakery' }),
  FIELD('Category *', 'category', { type: 'select' }),
  FIELD('Address', 'address', { placeholder: 'e.g. Old City, Jerusalem' }),
  FIELD('Short Description', 'description', { type: 'textarea', placeholder: 'What makes your business special?' }),
  FIELD('Owner / Contact Name *', 'owner_name', { placeholder: 'Your name' }),
  FIELD('Phone Number *', 'phone', { placeholder: '+970 5x xxx xxxx', type: 'tel' }),
  FIELD('Email', 'email', { placeholder: 'optional', type: 'email' }),
  FIELD('Website', 'website', { placeholder: 'https://… (optional)' }),
  FIELD('Instagram', 'instagram', { placeholder: '@yourhandle (optional)' }),
];

export default function Apply() {
  const [form, setForm]       = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    setError('');
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/apply', form);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong — please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🌿</div>
          <h2 style={styles.heading}>Application received!</h2>
          <p style={{ color: '#555', lineHeight: 1.6 }}>
            Thank you for applying to join <strong>In Common</strong>. We'll review your
            application and be in touch soon.
          </p>
          <p style={{ color: '#888', fontSize: 14, marginTop: 8 }}>شكراً جزيلاً</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={styles.logo}>🌿</div>
          <h1 style={styles.heading}>Join In Common</h1>
          <p style={{ color: '#555', lineHeight: 1.6, margin: 0 }}>
            Partner with us to offer your customers a loyalty programme — no hardware, no bank account needed.
            Fill in the form below and we'll be in touch.
          </p>
        </div>

        <form onSubmit={submit}>
          {FIELDS.map(({ label, key, type, placeholder }) => (
            <div key={key} style={styles.field}>
              <label style={styles.label}>{label}</label>
              {type === 'select' ? (
                <select
                  style={styles.input}
                  value={form[key] || ''}
                  onChange={e => set(key, e.target.value)}
                >
                  <option value="">Select a category…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : type === 'textarea' ? (
                <textarea
                  style={{ ...styles.input, height: 90, resize: 'vertical' }}
                  placeholder={placeholder}
                  value={form[key] || ''}
                  onChange={e => set(key, e.target.value)}
                />
              ) : (
                <input
                  style={styles.input}
                  type={type || 'text'}
                  placeholder={placeholder}
                  value={form[key] || ''}
                  onChange={e => set(key, e.target.value)}
                />
              )}
            </div>
          ))}

          {error && (
            <div style={styles.errorBox}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '48px 16px',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: 40,
    width: '100%',
    maxWidth: 560,
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
  },
  logo: {
    fontSize: 40,
    marginBottom: 8,
  },
  heading: {
    margin: '0 0 8px',
    fontSize: 26,
    fontWeight: 700,
    color: '#1B4332',
  },
  field: {
    marginBottom: 18,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#333',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#b91c1c',
    fontSize: 14,
    marginBottom: 16,
  },
  btn: {
    width: '100%',
    padding: '13px 0',
    background: '#2D6A4F',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 8,
  },
};
