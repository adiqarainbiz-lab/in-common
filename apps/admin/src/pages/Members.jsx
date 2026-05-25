import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api';

const TIER_EMOJI = { Seedling: '🌱', Olive: '🫒', Cedar: '🌲', Keffiyeh: '🏅' };

export default function Members() {
  const navigate = useNavigate();
  const [members, setMembers]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [query, setQuery]       = useState('');
  const [loading, setLoading]   = useState(false);
  const debounceRef = useRef(null);
  const LIMIT = 20;

  const load = useCallback(async (q, p) => {
    setLoading(true);
    try {
      const params = { page: p, limit: LIMIT };
      if (q) params.q = q;
      const { data } = await api.get('/admin/members', { params });
      setMembers(data.members);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(query, page); }, [page]);

  function handleSearch(e) {
    const q = e.target.value;
    setQuery(q);
    setPage(1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(q, 1), 300);
  }

  const totalPages = Math.ceil(total / LIMIT);

  async function exportCsv() {
    try {
      const { data, headers } = await api.get('/admin/export/members', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `members-${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed — please try again.');
    }
  }

  return (
    <Layout title="Members">
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          className=""
          placeholder="Search by name or phone…"
          value={query}
          onChange={handleSearch}
          style={{ width: 300 }}
        />
        <span style={{ color: '#888', fontSize: 14 }}>
          {total} member{total !== 1 ? 's' : ''}
        </span>
        <button
          className="btn btn-sm btn-secondary"
          onClick={exportCsv}
          style={{ marginLeft: 'auto' }}
        >
          ⬇ Export CSV
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#888' }}>Loading…</p>
      ) : members.length === 0 ? (
        <p style={{ color: '#888' }}>No members found.</p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Tier</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
                <th>Last Active</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.name}</strong></td>
                  <td style={{ color: '#555' }}>{m.phone_number}</td>
                  <td>{TIER_EMOJI[m.tier] || ''} {m.tier}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {m.points_balance.toLocaleString()} pts
                  </td>
                  <td style={{ color: '#888', fontSize: 13 }}>
                    {m.last_activity_at
                      ? new Date(m.last_activity_at).toLocaleDateString()
                      : '—'}
                  </td>
                  <td style={{ color: '#888', fontSize: 13 }}>
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/members/${m.id}`)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
              <button
                className="btn btn-sm btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Prev
              </button>
              <span style={{ fontSize: 13, color: '#555' }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-sm btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
