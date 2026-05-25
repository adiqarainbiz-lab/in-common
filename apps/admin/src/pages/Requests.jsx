import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api';

const STATUS_TABS = ['pending', 'approved', 'rejected'];
const STATUS_COLOR = { pending: '#b45309', approved: '#166534', rejected: '#991b1b' };
const STATUS_BG    = { pending: '#fef3c7', approved: '#dcfce7', rejected: '#fee2e2' };
const ACTION_LABEL = { create: 'New Offer', edit: 'Edit Offer', delete: 'Delete Offer' };
const ACTION_COLOR = { create: '#166534', edit: '#1d4ed8', delete: '#991b1b' };

function Badge({ text, color, bg }) {
  return (
    <span style={{ background: bg, color, borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {text}
    </span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Requests() {
  const [tab, setTab]           = useState('pending');
  const [data, setData]         = useState({ profileRequests: [], offerRequests: [] });
  const [loading, setLoading]   = useState(false);
  const [modal, setModal]       = useState(null); // { type: 'approve'|'reject', kind: 'profile'|'offer', id }
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);

  async function load(status) {
    setLoading(true);
    try {
      const { data: d } = await api.get('/admin/requests', { params: { status } });
      setData(d);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(tab); }, [tab]);

  function openReject(kind, id) { setModal({ type: 'reject', kind, id }); setNotes(''); }
  function openApprove(kind, id) { setModal({ type: 'approve', kind, id }); }
  function closeModal() { setModal(null); setNotes(''); }

  async function confirm() {
    setSaving(true);
    try {
      const { kind, type, id } = modal;
      const endpoint = kind === 'profile'
        ? `/admin/profile-requests/${id}/${type}`
        : `/admin/offer-requests/${id}/${type}`;
      await api.patch(endpoint, type === 'reject' ? { notes } : {});
      closeModal();
      load(tab);
    } catch (e) {
      alert(e.response?.data?.error || 'Action failed.');
    } finally { setSaving(false); }
  }

  const totalPending = tab === 'pending'
    ? data.profileRequests.length + data.offerRequests.length
    : null;

  const empty = data.profileRequests.length === 0 && data.offerRequests.length === 0;

  return (
    <Layout title="Business Requests">
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setTab(s)} style={{
            padding: '7px 20px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontWeight: tab === s ? 700 : 400,
            background: tab === s ? '#1B4332' : '#f3f4f6',
            color: tab === s ? '#fff' : '#555',
            fontSize: 14, textTransform: 'capitalize',
          }}>
            {s}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: '#888' }}>Loading…</p> : empty ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <p>No {tab} requests.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Profile requests */}
          {data.profileRequests.map(req => (
            <div key={req.id} style={cardStyle}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                <Badge text="Profile Update" color="#1d4ed8" bg="#dbeafe" />
                <Badge text={req.status} color={STATUS_COLOR[req.status]} bg={STATUS_BG[req.status]} />
                <span style={{ color: '#888', fontSize: 13, marginLeft: 'auto' }}>{new Date(req.created_at).toLocaleDateString()}</span>
              </div>

              <strong style={{ fontSize: 16 }}>{req.business_name}</strong>
              {req.submitted_by_name && <div style={{ color: '#777', fontSize: 13, marginTop: 2 }}>Submitted by {req.submitted_by_name}</div>}

              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {['cover_url','logo_url','description','hours','phone','website','instagram'].filter(f => req[f]).map(f => (
                  <div key={f} style={{ fontSize: 13 }}>
                    <span style={{ color: '#999', fontWeight: 600, textTransform: 'capitalize' }}>{f.replace('_',' ')}: </span>
                    <span style={{ color: '#333' }}>{req[f]}</span>
                  </div>
                ))}
              </div>

              {req.notes && <div style={{ marginTop: 8, color: '#b91c1c', fontSize: 13 }}>Note: {req.notes}</div>}

              {req.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button className="btn btn-sm" style={{ background: '#166534', color: '#fff' }} onClick={() => openApprove('profile', req.id)}>✓ Approve</button>
                  <button className="btn btn-sm btn-secondary" style={{ color: '#b91c1c' }} onClick={() => openReject('profile', req.id)}>✕ Reject</button>
                </div>
              )}
            </div>
          ))}

          {/* Offer requests */}
          {data.offerRequests.map(req => (
            <div key={req.id} style={cardStyle}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                <Badge text={ACTION_LABEL[req.action]} color={ACTION_COLOR[req.action]} bg="#f0f9ff" />
                <Badge text={req.status} color={STATUS_COLOR[req.status]} bg={STATUS_BG[req.status]} />
                <span style={{ color: '#888', fontSize: 13, marginLeft: 'auto' }}>{new Date(req.created_at).toLocaleDateString()}</span>
              </div>

              <strong style={{ fontSize: 16 }}>{req.business_name}</strong>
              {req.submitted_by_name && <div style={{ color: '#777', fontSize: 13, marginTop: 2 }}>Submitted by {req.submitted_by_name}</div>}

              {req.action === 'delete' ? (
                <div style={{ marginTop: 8, color: '#991b1b', fontSize: 14 }}>
                  🗑 Delete: <em>{req.current_title || req.offer_id}</em>
                </div>
              ) : (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {req.title       && <div style={{ fontSize: 15, fontWeight: 700 }}>{req.title}</div>}
                  {req.description && <div style={{ fontSize: 13, color: '#444' }}>{req.description}</div>}
                  {req.image_url   && <img src={req.image_url} alt="offer" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginTop: 4 }} onError={e => e.target.style.display='none'} />}
                  <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#2D6A4F' }}>
                    {req.valid_from  && <span>From: {req.valid_from.slice(0,10)}</span>}
                    {req.valid_until && <span>Until: {req.valid_until.slice(0,10)}</span>}
                  </div>
                  {req.action === 'edit' && req.current_title && (
                    <div style={{ fontSize: 12, color: '#888' }}>Editing: "{req.current_title}"</div>
                  )}
                </div>
              )}

              {req.notes && <div style={{ marginTop: 8, color: '#b91c1c', fontSize: 13 }}>Note: {req.notes}</div>}

              {req.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button className="btn btn-sm" style={{ background: '#166534', color: '#fff' }} onClick={() => openApprove('offer', req.id)}>✓ Approve</button>
                  <button className="btn btn-sm btn-secondary" style={{ color: '#b91c1c' }} onClick={() => openReject('offer', req.id)}>✕ Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approve modal */}
      {modal?.type === 'approve' && (
        <Modal title={`Approve ${modal.kind === 'profile' ? 'profile update' : 'offer request'}?`} onClose={closeModal}>
          <p style={{ color: '#555', fontSize: 14, marginTop: 0 }}>
            {modal.kind === 'profile'
              ? 'This will update the business profile fields on the platform immediately.'
              : 'This will publish the offer change on the platform immediately.'}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn" disabled={saving} style={{ background: '#166534', color: '#fff' }} onClick={confirm}>
              {saving ? 'Approving…' : '✓ Approve'}
            </button>
          </div>
        </Modal>
      )}

      {/* Reject modal */}
      {modal?.type === 'reject' && (
        <Modal title="Reject request" onClose={closeModal}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Internal note (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Reason for rejection…"
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', height: 80, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn" disabled={saving} style={{ background: '#991b1b', color: '#fff' }} onClick={confirm}>
              {saving ? 'Rejecting…' : '✕ Reject'}
            </button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}

const cardStyle = {
  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20,
};
