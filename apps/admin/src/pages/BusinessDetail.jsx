import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api';

const EMPTY_STAFF_FORM = { name: '', phone_number: '', password: '', role: 'cashier' };

export default function BusinessDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'reset'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_STAFF_FORM);
  const [resetPassword, setResetPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [bizRes, staffRes] = await Promise.all([
        api.get('/admin/businesses'),
        api.get(`/admin/businesses/${id}/staff`),
      ]);
      setBusiness(bizRes.data.find(b => b.id === id) || null);
      setStaff(staffRes.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm(EMPTY_STAFF_FORM);
    setFormError('');
    setModal('add');
  }

  function openEdit(s) {
    setSelected(s);
    setForm({ name: s.name, phone_number: s.phone_number, role: s.role, password: '' });
    setFormError('');
    setModal('edit');
  }

  function openReset(s) {
    setSelected(s);
    setResetPassword('');
    setFormError('');
    setModal('reset');
  }

  async function handleAddStaff(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post(`/admin/businesses/${id}/staff`, form);
      setModal(null);
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to add staff');
    } finally {
      setSaving(false);
    }
  }

  async function handleEditStaff(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.patch(`/admin/staff/${selected.id}`, {
        name: form.name,
        phone_number: form.phone_number,
        role: form.role,
      });
      setModal(null);
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to update staff');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post(`/admin/staff/${selected.id}/reset-password`, { password: resetPassword });
      setModal(null);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(s) {
    const action = s.is_active ? 'deactivate' : 'reactivate';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${s.name}?`)) return;
    await api.patch(`/admin/staff/${s.id}`, { is_active: !s.is_active });
    load();
  }

  if (loading) return <Layout title="Loading…"><div className="empty-state">Loading…</div></Layout>;
  if (!business) return <Layout title="Not found"><div className="empty-state">Business not found.</div></Layout>;

  return (
    <Layout
      title={business.name}
      actions={
        <>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>← Back</button>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Staff</button>
        </>
      }
    >
      {/* Business info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3>Business Info</h3>
          <span className={`badge ${business.is_active ? 'badge-active' : 'badge-inactive'}`}>
            {business.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div style={{ padding: '14px 20px', display: 'flex', gap: 40, flexWrap: 'wrap' }}>
          <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Category</div>{business.category}</div>
          <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Points Rate</div>{business.points_rate} pts / visit</div>
          <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Address</div>{business.address || '—'}</div>
          <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Active Staff</div>{business.active_staff_count}</div>
        </div>
        {business.description && (
          <div style={{ padding: '0 20px 14px', color: 'var(--text-muted)', fontSize: 13 }}>{business.description}</div>
        )}
      </div>

      {/* Staff */}
      <div className="card">
        <div className="card-header"><h3>Staff</h3></div>
        <div className="table-wrap">
          {staff.length === 0 ? (
            <div className="empty-state">No staff yet. Add someone to get started.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.phone_number}</td>
                    <td style={{ textTransform: 'capitalize' }}>{s.role}</td>
                    <td>
                      <span className={`badge ${s.is_active ? 'badge-active' : 'badge-inactive'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>Edit</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openReset(s)}>Reset Password</button>
                      <button
                        className={`btn btn-sm ${s.is_active ? 'btn-ghost-danger' : 'btn-ghost'}`}
                        onClick={() => handleToggleActive(s)}
                      >
                        {s.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add staff modal */}
      {modal === 'add' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Add Staff Member</h3>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={handleAddStaff}>
              <div className="modal-body">
                {formError && <div className="error-msg">{formError}</div>}
                <div className="row">
                  <div className="form-group">
                    <label>Name *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="cashier">Cashier</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Adding…' : 'Add Staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit staff modal */}
      {modal === 'edit' && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Edit {selected.name}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={handleEditStaff}>
              <div className="modal-body">
                {formError && <div className="error-msg">{formError}</div>}
                <div className="row">
                  <div className="form-group">
                    <label>Name *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="cashier">Cashier</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {modal === 'reset' && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Reset Password — {selected.name}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                {formError && <div className="error-msg">{formError}</div>}
                <div className="form-group">
                  <label>New Password *</label>
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={e => setResetPassword(e.target.value)}
                    required
                    minLength={6}
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Resetting…' : 'Reset Password'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
