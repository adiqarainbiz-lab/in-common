import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../api';

function KpiCard({ label, value, sub, accent }) {
  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: accent || 'var(--green-mid)', lineHeight: 1.1 }}>{Number(value).toLocaleString()}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ data, valueKey = 'count' }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 64 }}>
      {data.map((d, i) => {
        const h = Math.max((d[valueKey] / max) * 60, d[valueKey] > 0 ? 3 : 0);
        const isRecent = i >= data.length - 7;
        return (
          <div key={d.date} title={`${d.date}: ${d[valueKey]}`} style={{
            flex: 1, height: h, borderRadius: 3,
            backgroundColor: isRecent ? 'var(--green-mid)' : 'var(--green-pale)',
            transition: 'height 0.2s',
          }} />
        );
      })}
    </div>
  );
}

export default function Analytics() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/analytics');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Layout title="Analytics">
      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : error ? (
        <div className="error-msg">{error}</div>
      ) : (
        <>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <KpiCard label="Total Members"       value={data.members.total}          sub={`+${data.members.this_week} this week`} />
            <KpiCard label="New This Month"      value={data.members.this_month}     accent="var(--green-dark)" />
            <KpiCard label="Points in Circulation" value={data.points_in_circulation} accent="#457b9d" />
            <KpiCard label="Transactions (30d)"  value={data.transactions_30d}       accent="#6b5b2e" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* New members chart */}
            <div className="card">
              <div className="card-header"><h3>New Members — Last 30 Days</h3></div>
              <div style={{ padding: '16px 20px 20px' }}>
                <MiniBar data={data.members_by_day} valueKey="count" />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{data.members_by_day[0]?.date}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Today</span>
                </div>
              </div>
            </div>

            {/* Top businesses */}
            <div className="card">
              <div className="card-header"><h3>Top Businesses — Last 30 Days</h3></div>
              <div className="table-wrap">
                {data.top_businesses.length === 0 ? (
                  <div className="empty-state">No transactions yet</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Business</th>
                        <th>Transactions</th>
                        <th>Pts Issued</th>
                        <th>Members</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_businesses.map((b, i) => (
                        <tr key={i}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{b.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{b.category}</div>
                          </td>
                          <td>{b.transactions.toLocaleString()}</td>
                          <td>{b.points_issued.toLocaleString()}</td>
                          <td>{b.unique_members.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
