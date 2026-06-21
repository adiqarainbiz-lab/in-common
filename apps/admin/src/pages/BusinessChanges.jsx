import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api';

export default function BusinessChanges() {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/business-changes').then(({ data }) => {
      setChanges(data);
      setLoading(false);
      // Mark all as seen when this page opens
      api.patch('/admin/business-changes/mark-seen').catch(() => {});
    }).catch(() => setLoading(false));
  }, []);

  return (
    <Layout title="Business Changes">
      {loading && <p>Loading…</p>}
      {!loading && changes.length === 0 && <p style={{ color: '#888' }}>No business changes yet.</p>}
      {!loading && changes.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee', color: '#555' }}>
              <th style={{ padding: '10px 12px' }}>Business</th>
              <th style={{ padding: '10px 12px' }}>Changed by</th>
              <th style={{ padding: '10px 12px' }}>Fields</th>
              <th style={{ padding: '10px 12px' }}>When</th>
              <th style={{ padding: '10px 12px' }}>Seen</th>
            </tr>
          </thead>
          <tbody>
            {changes.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0', background: c.admin_seen ? '#fff' : '#F0FAF5' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{c.business_name}</td>
                <td style={{ padding: '10px 12px', color: '#555' }}>{c.staff_name}</td>
                <td style={{ padding: '10px 12px', color: '#2D6A4F' }}>{c.changed_fields.join(', ')}</td>
                <td style={{ padding: '10px 12px', color: '#888', whiteSpace: 'nowrap' }}>
                  {new Date(c.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: '10px 12px' }}>{c.admin_seen ? '✓' : '🆕'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Layout>
  );
}
