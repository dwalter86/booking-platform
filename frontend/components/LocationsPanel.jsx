'use client';
import { useState, useEffect } from 'react';
const empty = { name: '', address_line_1: '', address_line_2: '', city: '', postcode: '', country: 'GB', is_active: true };
export default function LocationsPanel() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(empty);
  const load = () => { setLoading(true); fetch('/api/locations').then(r => r.ok ? r.json() : []).then(d => setLocations(Array.isArray(d) ? d : [])).catch(() => setError('Failed to load.')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const openCreate = () => { setEditingId('new'); setForm(empty); setError(''); setSuccess(''); };
  const openEdit = l => { setEditingId(l.id); setForm({ name: l.name||'', address_line_1: l.address_line_1||'', address_line_2: l.address_line_2||'', city: l.city||'', postcode: l.postcode||'', country: l.country||'GB', is_active: l.is_active !== false }); setError(''); setSuccess(''); };
  const cancel = () => { setEditingId(null); setForm(empty); setError(''); };
  const save = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    try {
      const isNew = editingId === 'new';
      const res = await fetch(isNew ? '/api/locations' : `/api/locations/${editingId}`, { method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Save failed'); }
      setSuccess(isNew ? 'Location created.' : 'Location updated.'); setTimeout(() => setSuccess(''), 3000);
      setEditingId(null); load();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };
  const del = async id => {
    if (!confirm('Delete this location?')) return;
    setDeleting(id); setError('');
    try {
      const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Delete failed'); }
      setSuccess('Location deleted.'); setTimeout(() => setSuccess(''), 3000); load();
    } catch (e) { setError(e.message); } finally { setDeleting(null); }
  };
  if (loading) return <div className="text-secondary py-3">Loading&hellip;</div>;
  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div><h4 className="mb-0">Locations</h4><div className="text-secondary small">Physical meeting locations available to your resources.</div></div>
        {!editingId && <button className="btn btn-sm btn-primary" onClick={openCreate}>Add location</button>}
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {locations.length === 0 && !editingId && <div className="text-secondary py-2">No locations yet.</div>}
      {locations.length > 0 && !editingId && (
        <div className="table-responsive mb-3"><table className="table table-vcenter card-table"><thead><tr><th>Name</th><th>City</th><th>Postcode</th><th>Status</th><th></th></tr></thead><tbody>
          {locations.map(loc => (
            <tr key={loc.id}><td><strong>{loc.name}</strong></td><td>{loc.city||'\u2014'}</td><td>{loc.postcode||'\u2014'}</td>
              <td><span className={`badge ${loc.is_active ? 'bg-green-lt' : 'bg-red-lt'}`}>{loc.is_active ? 'Active' : 'Inactive'}</span></td>
              <td><div className="d-flex gap-1 justify-content-end"><button className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(loc)}>Edit</button><button className="btn btn-sm btn-outline-danger" onClick={() => del(loc.id)} disabled={deleting === loc.id}>{deleting === loc.id ? '\u2026' : 'Delete'}</button></div></td>
            </tr>
          ))}
        </tbody></table></div>
      )}
      {editingId && (
        <div className="card"><div className="card-header"><h5 className="card-title mb-0">{editingId === 'new' ? 'Add location' : 'Edit location'}</h5></div>
          <div className="card-body"><div className="row g-3">
            <div className="col-12"><label className="form-label">Name <span className="text-danger">*</span></label><input type="text" className="form-control" value={form.name} onChange={e => upd('name', e.target.value)} /></div>
            <div className="col-12"><label className="form-label">Address line 1</label><input type="text" className="form-control" value={form.address_line_1} onChange={e => upd('address_line_1', e.target.value)} /></div>
            <div className="col-12"><label className="form-label">Address line 2</label><input type="text" className="form-control" value={form.address_line_2} onChange={e => upd('address_line_2', e.target.value)} /></div>
            <div className="col-md-5"><label className="form-label">City</label><input type="text" className="form-control" value={form.city} onChange={e => upd('city', e.target.value)} /></div>
            <div className="col-md-3"><label className="form-label">Postcode</label><input type="text" className="form-control" value={form.postcode} onChange={e => upd('postcode', e.target.value)} /></div>
            <div className="col-md-4"><label className="form-label">Country</label><select className="form-select" value={form.country} onChange={e => upd('country', e.target.value)}><option value="GB">United Kingdom</option><option value="IE">Ireland</option><option value="DE">Germany</option><option value="FR">France</option><option value="NL">Netherlands</option><option value="US">United States</option><option value="OTHER">Other</option></select></div>
            <div className="col-12"><label className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={form.is_active} onChange={e => upd('is_active', e.target.checked)} /><span className="form-check-label">Active</span></label></div>
          </div></div>
          <div className="card-footer d-flex gap-2 justify-content-end"><button className="btn btn-outline-secondary" onClick={cancel} disabled={saving}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving\u2026' : editingId === 'new' ? 'Create location' : 'Save changes'}</button></div>
        </div>
      )}
    </div>
  );
}
