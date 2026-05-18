import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api';

const TIER_EMOJI   = { Seedling: '🌱', Olive: '🫒', Cedar: '🌲', Keffiyeh: '🏅' };
const TIER_THRESHOLDS = { Seedling: 0, Olive: 500, Cedar: 2000, Keffiyeh: 5000 };
const TIER_ORDER   = ['Seedling', 'Olive', 'Cedar', 'Keffiyeh'];

function nextTier(tier) {
  const idx = TIER_ORDER.indexOf(tier);
  return idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
}

const TYPE_LABEL = { earn: 'Earn', redeem: 'Redeem', expire: 'Expire', reversal: 'Reversal' };
const TYPE_COLOR = { earn: '#2D6A4F', redeem: '#c05621', expire: '#888', reversal: '#555' };

export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember]           = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [reversing, setReversing]     = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/members/${id}`);
      setMember(data.member);
      setTransactions(data.transactions);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleReverse(tx) {
    if (!window.confirm(`Reverse this ${tx.type} of ${Math.abs(tx.points)} pts?`)) return;
    setReversing(tx.id);
    try {
      await api.post(`/admin/transactions/${tx.id}/reverse`);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || 'Reversal failed');
    } finally {
      setReversing(null);
    }
  }

  if (loading) return <Layout title="Member"><p style={{ color: '#888' }}>Loading…</p></Layout>;
  if (!member) return <Layout title="Member"><p style={{ color: '#c00' }}>Member not found.</p></Layout>;

  const next = nextTier(member.tier);
  const progress = next
    ? Math.min(100, Math.round(
        ((member.points_balance - TIER_THRESHOLDS[member.tier]) /
         (TIER_THRESHOLDS[next] - TIER_THRESHOLDS[member.tier])) * 100,
      ))
    : 100;

  return (
    <Layout
      title={member.name}
      actions={
        <button className="btn btn-sm btn-secondary" onClick={() => navigate('/members')}>
          ← Back to Members
        </button>
      }
    >
      {/* Member card */}
      <div className="card" style={{ marginBottom: 24, padding: 24, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 48, lineHeight: 1 }}>{TIER_EMOJI[member.tier] || '👤'}</div>
          <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700 }}>{member.name}</div>
          <div style={{ color: '#555', marginTop: 2 }}>{member.phone_number}</div>
          <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
            Code: <code style={{ background: '#f4f4f4', padding: '1px 6px', borderRadius: 4 }}>
              {member.member_code}
            </code>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>Points balance</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#2D6A4F' }}>
              {member.points_balance.toLocaleString()}
            </div>
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

      {/* Transaction history */}
      <h3 style={{ marginBottom: 12 }}>Transaction History</h3>
      {transactions.length === 0 ? (
        <p style={{ color: '#888' }}>No transactions yet.</p>
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
                <tr key={tx.id} style={{ opacity: faded ? 0.5 : 1 }}>
                  <td>
                    <span style={{ color: TYPE_COLOR[tx.type] || '#333', fontWeight: 600, fontSize: 13 }}>
                      {tx.type === 'reversal' && '↩ '}
                      {TYPE_LABEL[tx.type] || tx.type}
                    </span>
                    {tx.is_reversed && <span style={{ color: '#aaa', fontSize: 12 }}> · reversed</span>}
                  </td>
                  <td style={{
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    color: tx.points > 0 ? '#2D6A4F' : '#c05621',
                    fontWeight: 600,
                  }}>
                    {tx.points > 0 ? '+' : ''}{tx.points}
                  </td>
                  <td style={{ color: '#555', fontSize: 13 }}>{tx.description}</td>
                  <td style={{ color: '#555', fontSize: 13 }}>{tx.business_name || '—'}</td>
                  <td style={{ color: '#555', fontSize: 13 }}>{tx.staff_name || '—'}</td>
                  <td style={{ color: '#888', fontSize: 13 }}>
                    {new Date(tx.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    {!tx.is_reversed && tx.type !== 'reversal' && tx.type !== 'expire' && (
                      <button
                        className="btn btn-sm btn-danger"
                        disabled={reversing === tx.id}
                        onClick={() => handleReverse(tx)}
                      >
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
    </Layout>
  );
}
