import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api';

const TIER_EMOJI      = { Seedling: '🌱', Olive: '🫒', Cedar: '🌲', Keffiyeh: '🏅' };
const TIER_THRESHOLDS = { Seedling: 0, Olive: 500, Cedar: 2000, Keffiyeh: 5000 };
const TIER_ORDER      = ['Seedling', 'Olive', 'Cedar', 'Keffiyeh'];
const TYPE_LABEL      = { earn: 'Earn', redeem: 'Redeem', expire: 'Expire', reversal: 'Reversal', adjust: 'Adjust' };
const TYPE_COLOR      = { earn: '#2D6A4F', redeem: '#c05621', expire: '#888', reversal: '#555', adjust: '#6c43d3' };

function nextTier(tier) {
  const idx = TIER_ORDER.indexOf(tier);
  return idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
}

// ── Modal shell ──────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [member,       setMember]       = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txTotal,      setTxTotal]      = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [txLoading,    setTxLoading]    = useState(false);
  const [reversing,    setReversing]    = useState(null);

  // Filters
  const [filters, setFilters] = useState({ from: '', to: '', type: '' });

  // Adjust modal
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjSign,    setAdjSign]    = useState('+');
  const [adjAmt,     setAdjAmt]     = useState('');
  const [adjDesc,    setAdjDesc]    = useState('');
  const [adjusting,  setAdjusting]  = useState(false);
  const [adjError,   setAdjError]   = useState('');

  // Edit modal
  const [showEdit,  setShowEdit]  = useState(false);
  const [editName,  setEditName]  = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editing,   setEditing]   = useState(false);
  const [editError, setEditError] = useState('');

  // Status toggle
  const [toggling, setToggling] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const loadMember = useCallback(async () => {
    const { data } = await api.get(`/admin/members/${id}`);
    setMember(data.member);
    // Use the existing transactions from the detail endpoint on first load
    setTransactions(data.transactions);
    setTxTotal(data.transactions.length);
  }, [id]);

  const loadTransactions = useCallback(async (f = filters) => {
    setTxLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (f.from) params.set('from', f.from);
      if (f.to)   params.set('to',   f.to + 'T23:59:59');
      if (f.type) params.set('type', f.type);
      const { data } = await api.get(`/admin/members/${id}/transactions?${params}`);
      setTransactions(data.transactions);
      setTxTotal(data.total);
    } finally {
      setTxLoading(false);
    }
  }, [id, filters]);

  useEffect(() => {
    (async () => {
      try { await loadMember(); } finally { setLoading(false); }
    })();
  }, [loadMember]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleReverse(tx) {
    if (!window.confirm(`Reverse this ${tx.type} of ${Math.abs(tx.points)} pts?`)) return;
    setReversing(tx.id);
    try {
      await api.post(`/admin/transactions/${tx.id}/reverse`);
      await loadMember();
      loadTransactions();
    } catch (e) {
      alert(e.response?.data?.error || 'Reversal failed');
    } finally { setReversing(null); }
  }

  async function handleAdjust() {
    const pts = parseInt(adjAmt);
    if (!pts || pts <= 0) return setAdjError('Enter a positive amount');
    if (!adjDesc.trim())  return setAdjError('Description is required');
    const signed = adjSign === '+' ? pts : -pts;
    setAdjusting(true); setAdjError('');
    try {
      await api.post(`/admin/members/${id}/adjust`, { points: signed, description: adjDesc.trim() });
      setShowAdjust(false); setAdjAmt(''); setAdjDesc('');
      await loadMember();
      loadTransactions();
    } catch (e) {
      setAdjError(e.response?.data?.error || 'Adjustment failed');
    } finally { setAdjusting(false); }
  }

  async function handleEdit() {
    if (!editName.trim()) return setEditError('Name is required');
    setEditing(true); setEditError('');
    try {
      await api.patch(`/admin/members/${id}`, { name: editName.trim(), phone_number: editPhone.trim() || undefined });
      setShowEdit(false);
      await loadMember();
    } catch (e) {
      setEditError(e.response?.data?.error || 'Edit failed');
    } finally { setEditing(false); }
  }

  async function handleToggleStatus() {
    const action = member.is_active === false ? 'reactivate' : 'deactivate';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${member.name}?`)) return;
    setToggling(true);
    try {
      const { data } = await api.patch(`/admin/members/${id}/status`, { is_active: member.is_active === false });
      setMember(m => ({ ...m, is_active: data.is_active }));
    } catch (e) {
      alert(e.response?.data?.error || 'Status update failed');
    } finally { setToggling(false); }
  }

  async function handleExport() {
    const params = new URLSearchParams({ member_id: id });
    if (filters.from) params.set('from', filters.from);
    if (filters.to)   params.set('to', filters.to + 'T23:59:59');
    if (filters.type) params.set('type', filters.type);
    try {
      const res = await api.get(`/admin/export/transactions?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url;
      a.download = `transactions-${member.name.replace(/\s+/g, '-')}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch { alert('Export failed'); }
  }

  function applyFilters(f) {
    setFilters(f);
    loadTransactions(f);
  }

  function clearFilters() { applyFilters({ from: '', to: '', type: '' }); }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return <Layout title="Member"><p style={{ color: '#888' }}>Loading…</p></Layout>;
  if (!member) return <Layout title="Member"><p style={{ color: '#c00' }}>Member not found.</p></Layout>;

  const next     = nextTier(member.tier);
  const progress = next
    ? Math.min(100, Math.round(
        ((member.points_balance - TIER_THRESHOLDS[member.tier]) /
         (TIER_THRESHOLDS[next] - TIER_THRESHOLDS[member.tier])) * 100,
      ))
    : 100;
  const isActive = member.is_active !== false;

  return (
    <Layout
      title={member.name}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-sm btn-secondary" onClick={() => navigate('/members')}>← Members</button>
          <button className="btn btn-sm btn-secondary" onClick={() => { setEditName(member.name); setEditPhone(member.phone_number); setShowEdit(true); }}>✏️ Edit</button>
          <button className="btn btn-sm" style={{ background: '#6c43d3', color: '#fff' }} onClick={() => { setAdjAmt(''); setAdjDesc(''); setAdjError(''); setShowAdjust(true); }}>⚡ Adjust Points</button>
          <button
            className="btn btn-sm"
            style={{ background: isActive ? '#c05621' : '#2D6A4F', color: '#fff' }}
            disabled={toggling}
            onClick={handleToggleStatus}
          >
            {toggling ? '…' : isActive ? '🚫 Deactivate' : '✅ Reactivate'}
          </button>
        </div>
      }
    >
      {/* Member card */}
      <div className="card" style={{ marginBottom: 24, padding: 24, display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 48, lineHeight: 1 }}>{TIER_EMOJI[member.tier] || '👤'}</div>
          <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700 }}>{member.name}</div>
          <div style={{ color: '#555', marginTop: 2 }}>{member.phone_number}</div>
          <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
            Code: <code style={{ background: '#f4f4f4', padding: '1px 6px', borderRadius: 4 }}>{member.member_code}</code>
          </div>
          {!isActive && (
            <div style={{ marginTop: 8, display: 'inline-block', background: '#fde8e8', color: '#c00', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
              DEACTIVATED
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>Points balance</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#2D6A4F' }}>{member.points_balance.toLocaleString()}</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
              {TIER_EMOJI[member.tier]} {member.tier}
              {next && <span style={{ color: '#aaa' }}> → {next} ({TIER_THRESHOLDS[next].toLocaleString()} pts)</span>}
            </div>
            <div style={{ background: '#eee', borderRadius: 99, height: 8, overflow: 'hidden' }}>
              <div style={{ background: '#2D6A4F', width: `${progress}%`, height: '100%', borderRadius: 99, transition: 'width 0.3s' }} />
            </div>
          </div>
          <div style={{ fontSize: 13, color: '#888' }}>
            <div>Joined: {new Date(member.created_at).toLocaleDateString()}</div>
            <div>Last active: {member.last_activity_at ? new Date(member.last_activity_at).toLocaleDateString() : '—'}</div>
          </div>
        </div>
      </div>

      {/* Transaction filters + export */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 3 }}>From</label>
          <input type="date" className="input" style={{ width: 150 }} value={filters.from}
            onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 3 }}>To</label>
          <input type="date" className="input" style={{ width: 150 }} value={filters.to}
            onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 3 }}>Type</label>
          <select className="input" style={{ width: 130 }} value={filters.type}
            onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
            <option value="">All types</option>
            <option value="earn">Earn</option>
            <option value="redeem">Redeem</option>
            <option value="adjust">Adjust</option>
            <option value="reversal">Reversal</option>
            <option value="expire">Expire</option>
          </select>
        </div>
        <button className="btn btn-sm" onClick={() => applyFilters(filters)}>Apply</button>
        {(filters.from || filters.to || filters.type) && (
          <button className="btn btn-sm btn-secondary" onClick={clearFilters}>Clear</button>
        )}
        <button className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }} onClick={handleExport}>⬇ Export CSV</button>
      </div>

      {/* Transaction count */}
      <div style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
        {txLoading ? 'Loading…' : `${txTotal} transaction${txTotal !== 1 ? 's' : ''}${filters.from || filters.to || filters.type ? ' (filtered)' : ''}`}
      </div>

      {/* Transaction table */}
      {transactions.length === 0 && !txLoading ? (
        <p style={{ color: '#888' }}>No transactions match these filters.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th style={{ textAlign: 'right' }}>Points</th>
              <th>Description</th>
              <th>Business</th>
              <th>Staff</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const faded = tx.is_reversed || tx.type === 'reversal';
              return (
                <tr key={tx.id} style={{ opacity: faded ? 0.45 : 1 }}>
                  <td>
                    <span style={{ color: TYPE_COLOR[tx.type] || '#333', fontWeight: 600, fontSize: 13 }}>
                      {tx.type === 'reversal' && '↩ '}
                      {tx.type === 'adjust'   && '⚡ '}
                      {TYPE_LABEL[tx.type] || tx.type}
                    </span>
                    {tx.is_reversed && <span style={{ color: '#aaa', fontSize: 12 }}> · reversed</span>}
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: tx.points > 0 ? '#2D6A4F' : '#c05621', fontWeight: 600 }}>
                    {tx.points > 0 ? '+' : ''}{tx.points}
                  </td>
                  <td style={{ color: '#555', fontSize: 13 }}>{tx.description}</td>
                  <td style={{ color: '#555', fontSize: 13 }}>{tx.business_name || '—'}</td>
                  <td style={{ color: '#555', fontSize: 13 }}>{tx.staff_name || '—'}</td>
                  <td style={{ color: '#888', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {new Date(tx.created_at).toLocaleDateString()}{' '}
                    <span style={{ color: '#bbb' }}>{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td>
                    {!tx.is_reversed && !['reversal','expire','adjust'].includes(tx.type) && (
                      <button className="btn btn-sm btn-danger" disabled={reversing === tx.id} onClick={() => handleReverse(tx)}>
                        {reversing === tx.id ? '…' : 'Reverse'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ── Adjust Points Modal ───────────────────────────────────────────── */}
      {showAdjust && (
        <Modal title="⚡ Adjust Points" onClose={() => setShowAdjust(false)}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {['+', '-'].map(sign => (
              <button key={sign} onClick={() => setAdjSign(sign)} style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid',
                borderColor: adjSign === sign ? (sign === '+' ? '#2D6A4F' : '#c05621') : '#ddd',
                background: adjSign === sign ? (sign === '+' ? '#f0faf5' : '#fff5f5') : '#fff',
                color: adjSign === sign ? (sign === '+' ? '#2D6A4F' : '#c05621') : '#888',
                fontWeight: 700, fontSize: 16, cursor: 'pointer',
              }}>
                {sign === '+' ? '+ Add points' : '− Remove points'}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Amount</label>
            <input className="input" type="number" min="1" placeholder="e.g. 100" value={adjAmt}
              onChange={e => { setAdjAmt(e.target.value); setAdjError(''); }}
              style={{ width: '100%' }} autoFocus />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Reason <span style={{ color: '#888', fontWeight: 400 }}>(shown in transaction history)</span></label>
            <input className="input" type="text" placeholder="e.g. Promotional bonus, error correction…"
              value={adjDesc} onChange={e => { setAdjDesc(e.target.value); setAdjError(''); }}
              style={{ width: '100%' }} />
          </div>
          {adjAmt && (
            <div style={{ background: '#f8f8f8', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#555' }}>
              Balance: <b>{member.points_balance.toLocaleString()}</b> →{' '}
              <b style={{ color: adjSign === '+' ? '#2D6A4F' : '#c05621' }}>
                {(member.points_balance + (adjSign === '+' ? 1 : -1) * (parseInt(adjAmt) || 0)).toLocaleString()}
              </b> pts
            </div>
          )}
          {adjError && <p style={{ color: '#c00', fontSize: 13, marginBottom: 10 }}>{adjError}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setShowAdjust(false)}>Cancel</button>
            <button className="btn" style={{ background: adjSign === '+' ? '#2D6A4F' : '#c05621', color: '#fff' }}
              disabled={adjusting} onClick={handleAdjust}>
              {adjusting ? 'Saving…' : `${adjSign === '+' ? 'Add' : 'Remove'} Points`}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Edit Member Modal ─────────────────────────────────────────────── */}
      {showEdit && (
        <Modal title="✏️ Edit Member" onClose={() => setShowEdit(false)}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Name</label>
            <input className="input" type="text" value={editName}
              onChange={e => { setEditName(e.target.value); setEditError(''); }}
              style={{ width: '100%' }} autoFocus />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Phone number</label>
            <input className="input" type="tel" value={editPhone}
              onChange={e => { setEditPhone(e.target.value); setEditError(''); }}
              style={{ width: '100%' }} />
          </div>
          {editError && <p style={{ color: '#c00', fontSize: 13, marginBottom: 10 }}>{editError}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
            <button className="btn" disabled={editing} onClick={handleEdit}>
              {editing ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
