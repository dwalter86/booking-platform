'use client';
import { useState, useEffect } from 'react';

const PLATFORMS = [
  { value: 'teams', label: 'Microsoft Teams' },
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'other', label: 'Other' },
];

export default function ResourceMeetingTypes({ resourceId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tenantLocations, setTenantLocations] = useState([]);
  const [meetingTypes, setMeetingTypes] = useState([]);
  const [inPersonOn, setInPersonOn] = useState(false);
  const [onlineOn, setOnlineOn] = useState(false);
  const [telephoneOn, setTelephoneOn] = useState(false);
  const [onlinePlatform, setOnlinePlatform] = useState('teams');
  const [onlineUrl, setOnlineUrl] = useState('');
  const [selectedLocIds, setSelectedLocIds] = useState([]);

  useEffect(() => {
    if (!resourceId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/meeting-types/${resourceId}`).then(r => r.json()),
      fetch('/api/locations').then(r => r.ok ? r.json() : []),
    ]).then(([mtData, locs]) => {
      const types = mtData.meeting_types || [];
      const locIds = mtData.assigned_location_ids || [];
      setMeetingTypes(types);
      setTenantLocations(Array.isArray(locs) ? locs.filter(l => l.is_active) : []);
      const ip = types.find(m => m.meeting_type === 'in_person');
      const on = types.find(m => m.meeting_type === 'online');
      const tel = types.find(m => m.meeting_type === 'telephone');
      setInPersonOn(!!ip);
      setOnlineOn(!!on);
      setTelephoneOn(!!tel);
      setOnlinePlatform(on?.online_platform || 'teams');
      setOnlineUrl(on?.online_meeting_url || '');
      setSelectedLocIds(locIds);
    }).catch(() => setError('Failed to load meeting type settings.'))
      .finally(() => setLoading(false));
  }, [resourceId]);

  const toggleLocation = (id) => {
    setSelectedLocIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const saveType = async (type) => {
    setSaving(type); setError(''); setSuccess('');
    try {
      const currentTypes = meetingTypes.filter(m => m.meeting_type !== type);
      let newEntry = null;
      if (type === 'in_person' && inPersonOn) newEntry = { meeting_type: 'in_person' };
      if (type === 'online' && onlineOn) newEntry = { meeting_type: 'online', online_platform: onlinePlatform, online_meeting_url: onlineUrl };
      if (type === 'telephone' && telephoneOn) newEntry = { meeting_type: 'telephone' };
      const newTypes = newEntry ? [...currentTypes, newEntry] : currentTypes;
      const mtRes = await fetch(`/api/meeting-types/${resourceId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meeting_types: newTypes }) });
      if (!mtRes.ok) throw new Error('Failed to save meeting types');
      setMeetingTypes(await mtRes.json());
      if (type === 'in_person') {
        const locRes = await fetch(`/api/meeting-types/${resourceId}/locations`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location_ids: inPersonOn ? selectedLocIds : [] }) });
        if (!locRes.ok) throw new Error('Failed to save location assignments');
      }
      setSuccess('Saved.'); setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.message); }
    finally { setSaving(null); }
  };

  if (loading) return <div className="text-secondary py-3">Loading meeting types&hellip;</div>;

  return (
    <div>
      <p className="text-secondary mb-4">Choose how clients can meet with you for this resource.</p>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div><strong>In person</strong><div className="text-secondary small">Client selects a physical location when booking.</div></div>
            <label className="form-check form-switch mb-0"><input className="form-check-input" type="checkbox" checked={inPersonOn} onChange={e => setInPersonOn(e.target.checked)} /></label>
          </div>
          {inPersonOn && (
            <div className="mt-3">
              {tenantLocations.length === 0 ? (
                <div className="alert alert-warning mb-0">No locations defined yet. <a href="/resources?panel=locations">Add locations first &rarr;</a></div>
              ) : (
                <>{tenantLocations.map(loc => (
                  <div key={loc.id} className="form-check mb-1">
                    <input className="form-check-input" type="checkbox" id={`loc-${loc.id}`} checked={selectedLocIds.includes(loc.id)} onChange={() => toggleLocation(loc.id)} />
                    <label className="form-check-label" htmlFor={`loc-${loc.id}`}>{loc.name}{loc.city && <span className="text-secondary ms-1 small">&mdash; {loc.city}</span>}</label>
                  </div>
                ))}</>
              )}
            </div>
          )}
          <div className="mt-3"><button className="btn btn-sm btn-primary" onClick={() => saveType('in_person')} disabled={saving === 'in_person'}>{saving === 'in_person' ? 'Saving…' : 'Save'}</button></div>
        </div>
      </div>
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div><strong>Online</strong><div className="text-secondary small">Client joins via video call.</div></div>
            <label className="form-check form-switch mb-0"><input className="form-check-input" type="checkbox" checked={onlineOn} onChange={e => setOnlineOn(e.target.checked)} /></label>
          </div>
          {onlineOn && (
            <div className="row g-2 mt-2">
              <div className="col-12 col-md-5"><label className="form-label">Platform</label><select className="form-select" value={onlinePlatform} onChange={e => setOnlinePlatform(e.target.value)}>{PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
              <div className="col-12 col-md-7"><label className="form-label">Meeting URL <span className="text-secondary">(optional)</span></label><input type="url" className="form-control" placeholder="https://teams.microsoft.com/..." value={onlineUrl} onChange={e => setOnlineUrl(e.target.value)} /></div>
              <div className="col-12"><div className="text-secondary small">Meeting details will be provided after confirmation.</div></div>
            </div>
          )}
          <div className="mt-3"><button className="btn btn-sm btn-primary" onClick={() => saveType('online')} disabled={saving === 'online'}>{saving === 'online' ? 'Saving…' : 'Save'}</button></div>
        </div>
      </div>
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div><strong>Telephone</strong><div className="text-secondary small">You call the client. Their phone number is collected at booking.</div></div>
            <label className="form-check form-switch mb-0"><input className="form-check-input" type="checkbox" checked={telephoneOn} onChange={e => setTelephoneOn(e.target.checked)} /></label>
          </div>
          {telephoneOn && <div className="mt-2"><div className="text-secondary small">The booking form will ask the client for their phone number.</div></div>}
          <div className="mt-3"><button className="btn btn-sm btn-primary" onClick={() => saveType('telephone')} disabled={saving === 'telephone'}>{saving === 'telephone' ? 'Saving…' : 'Save'}</button></div>
        </div>
      </div>
    </div>
  );
}
