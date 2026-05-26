import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api';

const CATEGORIES = ['Restaurant', 'Cafe', 'Grocery', 'Bakery', 'Pharmacy', 'Clothing', 'Other'];

const EMPTY_FORM = {
  name: '', category: '', address: '', description: '',
  logo_url: '', cover_url: '', points_rate: 10,
  phone: '', website: '', instagram: '', menu_url: '', hours: '', discounts: '',
};

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
      cover_url: b.cover_url || '', points_rate: b.points_rate,
      phone: b.phone || '', website: b.website || '', instagram: b.instagram || '',
      menu_url: b.menu_url || '', hours: b.hours || '', discounts: b.discounts || '',
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
                    <td>{b.points_rate} pts / visit</td>
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
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
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
                <div className="form-group">
                  <label>Cover Photo URL</label>
                  <input
                    value={form.cover_url}
                    onChange={e => setForm(f => ({ ...f, cover_url: e.target.value }))}
                    placeholder="https://…  paste any image URL"
                  />
                  {form.cover_url && (
                    <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', height: 160, background: '#f0f0f0' }}>
                      <img
                        src={form.cover_url}
                        alt="Cover preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={e => { e.target.style.display = 'none'; }}
                        onLoad={e => { e.target.style.display = 'block'; }}
                      />
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Working Hours</label>
                  <input
                    value={form.hours}
                    onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
                    placeholder="e.g. Mon–Fri: 9 AM – 10 PM, Sat–Sun: 10 AM – 11 PM"
                  />
                </div>
                <div className="row">
                  <div className="form-group">
                    <label>Phone</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+972…" />
                  </div>
                  <div className="form-group">
                    <label>Instagram</label>
                    <input value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@handle" />
                  </div>
                </div>
                <div className="row">
                  <div className="form-group">
                    <label>Website</label>
                    <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://…" />
                  </div>
                  <div className="form-group">
                    <label>Menu URL</label>
                    <input value={form.menu_url} onChange={e => setForm(f => ({ ...f, menu_url: e.target.value }))} placeholder="https://…" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Discounts & Offers</label>
                  <textarea
                    value={form.discounts}
                    onChange={e => setForm(f => ({ ...f, discounts: e.target.value }))}
                    placeholder="One offer per line, e.g.&#10;10% off all drinks for members&#10;Free coffee with any pastry on Fridays"
                    style={{ minHeight: 80 }}
                  />
                </div>
                <div className="row">
                  <div className="form-group">
                    <label>Logo URL</label>
                    <input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Points earn rate (per visit)</label>
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
