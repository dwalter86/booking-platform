'use client';

const PLATFORM_LABELS = { teams: 'Microsoft Teams', google_meet: 'Google Meet', zoom: 'Zoom', other: 'Other' };

export default function MeetingTypeStep({ resource, meetingType, setMeetingType, locationId, setLocationId, bookerPhone, setBookerPhone }) {
  const types = resource?.meeting_types || [];
  const locations = resource?.meeting_locations || [];
  if (types.length === 0) return null;
  if (types.length === 1 && !meetingType) {
    // Auto-select if only one type
    setMeetingType(types[0].meeting_type);
  }
  const inPerson = types.find(t => t.meeting_type === 'in_person');
  const online = types.find(t => t.meeting_type === 'online');
  const telephone = types.find(t => t.meeting_type === 'telephone');
  return (
    <div className="mb-3">
      <label className="form-label fw-semibold">How would you like to meet?</label>
      <div className="d-flex flex-column gap-2">
        {inPerson && (
          <div>
            <label className={`d-flex align-items-center gap-2 p-2 border rounded cursor-pointer ${meetingType === 'in_person' ? 'border-primary bg-blue-lt' : ''}`} style={{cursor:'pointer'}}>
              <input type="radio" name="meeting_type" value="in_person" checked={meetingType === 'in_person'} onChange={() => { setMeetingType('in_person'); setLocationId(''); }} />
              <span><strong>In person</strong></span>
            </label>
            {meetingType === 'in_person' && locations.length > 0 && (
              <div className="mt-2 ms-4">
                <label className="form-label small text-secondary">Select location</label>
                <select className="form-select form-select-sm" value={locationId} onChange={e => setLocationId(e.target.value)} required>
                  <option value="">Choose a location…</option>
                  {locations.map(l => (
                    <option key={l.location_id} value={l.location_id}>
                      {l.name}{l.city ? ` — ${l.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        {online && (
          <label className={`d-flex align-items-center gap-2 p-2 border rounded`} style={{cursor:'pointer', ...(meetingType === 'online' ? {borderColor:'var(--tblr-primary)',backgroundColor:'var(--tblr-blue-lt)'} : {})}}>
            <input type="radio" name="meeting_type" value="online" checked={meetingType === 'online'} onChange={() => setMeetingType('online')} />
            <span><strong>Online</strong>{online.online_platform ? <span className="text-secondary ms-1 small">({PLATFORM_LABELS[online.online_platform] || online.online_platform})</span> : null}</span>
          </label>
        )}
        {telephone && (
          <div>
            <label className={`d-flex align-items-center gap-2 p-2 border rounded`} style={{cursor:'pointer', ...(meetingType === 'telephone' ? {borderColor:'var(--tblr-primary)',backgroundColor:'var(--tblr-blue-lt)'} : {})}}>
              <input type="radio" name="meeting_type" value="telephone" checked={meetingType === 'telephone'} onChange={() => setMeetingType('telephone')} />
              <span><strong>Telephone</strong> <span className="text-secondary small">We will call you</span></span>
            </label>
            {meetingType === 'telephone' && (
              <div className="mt-2 ms-4">
                <label className="form-label small text-secondary">Your phone number</label>
                <input type="tel" className="form-control form-control-sm" placeholder="e.g. 07700 900123" value={bookerPhone} onChange={e => setBookerPhone(e.target.value)} required />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
