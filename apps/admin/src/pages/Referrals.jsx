import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api';

function StatCard({ label, value, sub, color = '#1B4332' }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '22px 24px',
      flex: 1, minWidth: 160,
      boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
      borderTop: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: '#aaa', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export default function Referrals() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/referrals')
      .then(({ data: d }) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout title="Referrals"><p style={{ color: '#888' }}>Loading…</p></Layout>;
  if (!data)   return <Layout title="Referrals"><p style={{ color: '#888' }}>Failed to load.</p></Layout>;

  const { summary, topReferrers, referrals } = data;

  return (
    <Layout title="Referrals">

      {/* ── Summary cards ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <StatCard
          label="Total referrals"
          value={summary.total_referrals.toLocaleString()}
          sub="members joined via invite"
          color="#1B4332"
        />
        <StatCard
          label="Points awarded"
          value={summary.total_points_awarded.toLocaleString()}
          sub="150 pts × 2 per referral"
          color="#2D6A4F"
        />
        <StatCard
          label="Active referrers"
          value={summary.total_referrers.toLocaleString()}
          sub="members who invited someone"
          color="#40916C"
        />
      </div>

      {/* ── Top referrers ── */}
      {topReferrers.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#1B4332' }}>🏆 Top referrers</h3>
          <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#F8FAF8', borderBottom: '1px solid #eee' }}>
                  <th style={th}>#</th>
                  <th style={th}>Member</th>
                  <th style={th}>Phone</th>
                  <th style={{ ...th, textAlign: 'right' }}>Referrals</th>
                  <th style={{ ...th, textAlign: 'right' }}>Pts earned</th>
                  <th style={{ ...th, textAlign: 'right' }}>Last invite</th>
                </tr>
              </thead>
              <tbody>
                {topReferrers.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ ...td, color: '#aaa', width: 36 }}>{i + 1}</td>
                    <td style={{ ...td, fontWeight: 600, color: '#1B4332' }}>{r.name}</td>
                    <td style={{ ...td, color: '#666' }}>{r.phone_number}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{r.referral_count}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#2D6A4F', fontWeight: 600 }}>+{(r.points_earned * 1).toLocaleString()}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#aaa', fontSize: 12 }}>
                      {new Date(r.last_referral_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Full referral log ── */}
      <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#1B4332' }}>
        📋 Referral log
        <span style={{ fontSize: 12, color: '#aaa', fontWeight: 400, marginLeft: 8 }}>
          (most recent first, max 200)
        </span>
      </h3>

      {referrals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤝</div>
          <p>No referrals yet — share the app!</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#F8FAF8', borderBottom: '1px solid #eee' }}>
                <th style={th}>Referrer</th>
                <th style={th}>→ New member</th>
                <th style={{ ...th, textAlign: 'right' }}>Pts each</th>
                <th style={{ ...th, textAlign: 'right' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={td}>
                    <div style={{ fontWeight: 600, color: '#1B4332' }}>{r.referrer_name}</div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>{r.referrer_phone}</div>
                  </td>
                  <td style={td}>
                    <div style={{ fontWeight: 500 }}>{r.referee_name}</div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>{r.referee_phone}</div>
                  </td>
                  <td style={{ ...td, textAlign: 'right', color: '#2D6A4F', fontWeight: 700 }}>+{r.points}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#aaa', fontSize: 12 }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </Layout>
  );
}

const th = {
  padding: '10px 16px', textAlign: 'left', fontSize: 12,
  fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.4,
};
const td = { padding: '12px 16px', verticalAlign: 'middle' };
