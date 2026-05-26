import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api';

const STATUS_TABS = ['pending', 'approved', 'rejected'];
const STATUS_COLOR = { pending: '#b45309', approved: '#166534', rejected: '#991b1b' };
const STATUS_BG    = { pending: '#fef3c7', approved: '#dcfce7', rejected: '#fee2e2' };

function Modal({ title, onClose, children }) {
  return (
    <div style={overlay}>
      <div style={sheet}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Applications() {
  const navigate = useNavigate();
  const [tab, setTab]           = useState('pending');
  const [apps, setApps]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(null);       // application being reviewed
  const [action, setAction]     = useState(null);       // 'approve' | 'reject'
  const [notes, setNotes]       = useState('');
  const [pointsRate, setPointsRate] = useState(10);
  const [saving, setSaving]     = useState(false);

  async function load(status) {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/applications', { params: { status } });
      setApps(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(tab); }, [tab]);

  function openApprove(app) {
    setSelected(app);
    setPointsRate(10);
    setAction('approve');
  }

  function openReject(app) {
    setSelected(app);
    setNotes('');
    setAction('reject');
  }

  function closeModal() {
    setSelected(null);
    setAction(null);
    setNotes('');
    setPointsRate(10);
  }

  async function confirmApprove() {
    setSaving(true);
    try {
      const { data } = await api.patch(`/admin/applications/${selected.id}/approve`, { points_rate: pointsRate });
      closeModal();
      load(tab);
      if (data.business_id) {
        if (window.confirm('Business created! Open business detail now?')) {
          navigate(`/businesses/${data.business_id}`);
        }
      }
    } catch (e) {
      alert(e.response?.data?.error || 'Approve failed.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmReject() {
    setSaving(true);
    try {
      await api.patch(`/admin/applications/${selected.id}/reject`, { notes });
      closeModal();
      load(tab);
    } catch (e) {
      alert(e.response?.data?.error || 'Reject failed.');
    } finally {
      setSaving(false);
    }
  }

  const pendingCount = tab === 'pending' ? apps.length : null;

  return (
    <Layout title="Business Applications">
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {STATUS_TABS.map(s => (
          <button
            key={s}
            onClick={() => setTab(s)}
            style={{
              padding: '7px 20px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              fontWeight: tab === s ? 700 : 400,
              background: tab === s ? '#1B4332' : '#f3f4f6',
              color: tab === s ? '#fff' : '#555',
              fontSize: 14,
              textTransform: 'capitalize',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#888' }}>Loading…</p>
      ) : apps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <p>No {tab} applications.</p>
          {tab === 'pending' && (
            <p style={{ fontSize: 13 }}>
              Share the apply link:{' '}
              <a
                href={`${window.location.origin}/apply`}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#2D6A4F' }}
              >
                {window.location.origin}/apply
              </a>
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {apps.map(app => (
            <div key={app.id} style={card}>
              {/* Status badge */}
              <span style={{
                ...badge,
                background: STATUS_BG[app.status],
                color: STATUS_COLOR[app.status],
              }}>
                {app.status}
              </span>

              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginTop: 8 }}>
                {/* Left: business info */}
                <div style={{ flex: '1 1 260px' }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>{app.name}</h3>
                  <div style={{ color: '#555', fontSize: 14, marginBottom: 4 }}>
                    {app.category}{app.address ? ` · ${app.address}` : ''}
                  </div>
                  {app.description && (
                    <div style={{ color: '#666', fontSize: 13, marginBottom: 8, fontStyle: 'italic' }}>
                      "{app.description}"
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {app.website   && <a href={app.website}   target="_blank" rel="noreferrer" style={link}>🌐 Website</a>}
                    {app.instagram && <a href={`https://instagram.com/${app.instagram.replace('@','')}`} target="_blank" rel="noreferrer" style={link}>📸 {app.instagram}</a>}
                  </div>
                </div>

                {/* Right: contact info */}
                <div style={{ flex: '0 0 200px' }}>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
                    <strong>Contact:</strong> {app.owner_name}
                  </div>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>📞 {app.phone}</div>
                  {app.email && <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>✉️ {app.email}</div>}
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>
                    Applied {new Date(app.created_at).toLocaleDateString()}
                  </div>
                  {app.reviewed_at && (
                    <div style={{ fontSize: 12, color: '#aaa' }}>
                      Reviewed {new Date(app.reviewed_at).toLocaleDateString()}
                    </div>
                  )}
                  {app.notes && (
                    <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>
                      Note: {app.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {app.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button className="btn btn-sm" style={{ background: '#166534', color: '#fff' }} onClick={() => openApprove(app)}>
                    ✓ Approve
                  </button>
                  <button className="btn btn-sm btn-secondary" style={{ color: '#b91c1c' }} onClick={() => openReject(app)}>
                    ✕ Reject
                  </button>
                </div>
              )}
              {app.status === 'approved' && app.business_id && (
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/businesses/${app.business_id}`)}>
                    View Business →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approve modal */}
      {action === 'approve' && selected && (
        <Modal title={`Approve — ${selected.name}`} onClose={closeModal}>
          <p style={{ color: '#555', fontSize: 14, marginTop: 0 }}>
            This will create the business on the platform. You can edit details (logo, hours, etc.) afterward.
          </p>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Points earn rate (per visit)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={pointsRate}
              onChange={e => setPointsRate(Number(e.target.value))}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button
              className="btn"
              disabled={saving}
              style={{ background: '#166534', color: '#fff' }}
              onClick={confirmApprove}
            >
              {saving ? 'Creating…' : '✓ Approve & Create Business'}
            </button>
          </div>
        </Modal>
      )}

      {/* Reject modal */}
      {action === 'reject' && selected && (
        <Modal title={`Reject — ${selected.name}`} onClose={closeModal}>
          <p style={{ color: '#555', fontSize: 14, marginTop: 0 }}>
            Optionally add a note (internal only — not shown to the applicant).
          </p>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Internal note (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Outside our current area, reapply in 6 months"
              style={{ ...inputStyle, height: 80, resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button
              className="btn"
              disabled={saving}
              style={{ background: '#991b1b', color: '#fff' }}
              onClick={confirmReject}
            >
              {saving ? 'Rejecting…' : '✕ Reject Application'}
            </button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const card = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 20,
  position: 'relative',
};
const badge = {
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};
const link = {
  color: '#2D6A4F',
  fontSize: 13,
  textDecoration: 'none',
};
const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: 16,
};
const sheet = {
  background: '#fff',
  borderRadius: 14,
  padding: 28,
  width: '100%',
  maxWidth: 480,
  boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
};
const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#333',
  marginBottom: 6,
};
const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1.5px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};
