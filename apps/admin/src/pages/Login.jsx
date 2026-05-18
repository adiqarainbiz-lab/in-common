import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/admin/login', form);
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.admin));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Brand header */}
        <div style={styles.header}>
          <div style={styles.logoMark}>🌿</div>
          <h1 style={styles.brand}>In Common</h1>
          <p style={styles.sub}>Admin Dashboard</p>
        </div>

        {/* Tab strip (single tab — sign in only) */}
        <div style={styles.tabStrip}>
          <div style={styles.tabActive}>Sign In</div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.errorBox}>{error}</div>
          )}

          <div style={styles.fieldWrap}>
            <span style={styles.fieldIcon}>✉️</span>
            <input
              style={styles.input}
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              autoFocus
            />
          </div>

          <div style={styles.fieldWrap}>
            <span style={styles.fieldIcon}>🔒</span>
            <input
              style={styles.input}
              type={showPw ? 'text' : 'password'}
              placeholder="Password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              style={styles.showPwBtn}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>

          <button style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(145deg, #1b3a2d 0%, #2d6a4f 100%)',
    padding: 16,
  },
  card: {
    background: '#fff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
  },
  header: {
    background: 'linear-gradient(135deg, #1b3a2d 0%, #2d6a4f 100%)',
    padding: '36px 32px 28px',
    textAlign: 'center',
  },
  logoMark: { fontSize: 36, marginBottom: 8 },
  brand: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: '-0.5px',
    margin: 0,
  },
  sub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    margin: '4px 0 0',
  },
  tabStrip: {
    display: 'flex',
    borderBottom: '1px solid #eee',
    padding: '0 32px',
  },
  tabActive: {
    padding: '14px 0',
    fontSize: 14,
    fontWeight: 700,
    color: '#2d6a4f',
    borderBottom: '2px solid #2d6a4f',
    marginBottom: -1,
  },
  form: {
    padding: '24px 32px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  errorBox: {
    background: '#fdf0ee',
    color: '#c0392b',
    padding: '10px 14px',
    borderRadius: 10,
    fontSize: 13,
  },
  fieldWrap: {
    display: 'flex',
    alignItems: 'center',
    border: '1.5px solid #e0e0e0',
    borderRadius: 12,
    padding: '0 14px',
    gap: 10,
    background: '#fafafa',
    transition: 'border-color 0.15s',
  },
  fieldIcon: { fontSize: 16 },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    padding: '13px 0',
    fontSize: 14,
    color: '#1a1a1a',
    fontFamily: 'inherit',
  },
  showPwBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    fontFamily: 'inherit',
  },
  submitBtn: {
    marginTop: 8,
    background: 'linear-gradient(135deg, #2d6a4f, #52b788)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '14px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: 0.3,
    transition: 'opacity 0.15s',
  },
};
