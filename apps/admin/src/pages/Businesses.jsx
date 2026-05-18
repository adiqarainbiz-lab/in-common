import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api';

const CATEGORIES = ['Restaurant', 'Cafe', 'Grocery', 'Bakery', 'Pharmacy', 'Clothing', 'Other'];

const EMPTY_FORM = { name: '', category: '', address: '', description: '', logo_url: '', points_rate: 10 };

export default function Businesses() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | business object
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/businesses');
      setBusinesses(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError('');
    setModal('add');
  }

  function openEdit(b) {
    setForm({
      name: b.name, category: b.category, address: b.address || '',
      description: b.description || '', logo_url: b.logo_url || '',
      points_rate: b.points_rate,
    });
    setFormError('');
    setModal(b);
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload = { ...form, points_rate: Number(form.points_rate) };
      if (modal === 'add') {
        await api.post('/admin/businesses', payload);
      } else {
        await api.patch(`/admin/businesses/${modal.id}`, payload);
      }
      setModal(null);
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(b) {
    if (!confirm(`Deactivate "${b.name}"? Staff won't be able to scan until reactivated.`)) return;
    await api.delete(`/admin/businesses/${b.id}`);
    load();
  }

  async function handleReactivate(b) {
    await api.patch(`/admin/businesses/${b.id}`, { is_active: true });
    load();
  }

  return (
    <Layout
      title="Businesses"
      actions={<button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Business</button>}
    >
      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : businesses.length === 0 ? (
            <div className="empty-state">No businesses yet. Add one to get started.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Points rate</th>
                  <th>Staff</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map(b => (
                  <tr key={b.id}>
                    <td>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: 0, fontWeight: 500 }}
                        onClick={() => navigate(`/businesses/${b.id}`)}
                      >
                        {b.name}
                      </button>
                    </td>
                    <td>{b.category}</td>
                    <td>{b.points_rate} pts / JD</td>
                    <td>{b.active_staff_count}</td>
                    <td>
                      <span className={`badge ${b.is_active ? 'badge-active' : 'badge-inactive'}`}>
                        {b.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(b)}>Edit</button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigate(`/businesses/${b.id}`)}
                      >
                        Staff
                      </button>
                      {b.is_active ? (
                        <button className="btn btn-ghost-danger btn-sm" onClick={() => handleDeactivate(b)}>
                          Deactivate
                        </button>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleReactivate(b)}>
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{modal === 'add' ? 'Add Business' : 'Edit Business'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {formError && <div className="error-msg">{formError}</div>}
                <div className="row">
                  <div className="form-group">
                    <label>Name *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Category *</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required>
                      <option value="">Select…</option>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="row">
                  <div className="form-group">
                    <label>Logo URL</label>
                    <input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Points rate (per JD)</label>
                    <input
                      type="number" min="1" value={form.points_rate}
                      onChange={e => setForm(f => ({ ...f, points_rate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
