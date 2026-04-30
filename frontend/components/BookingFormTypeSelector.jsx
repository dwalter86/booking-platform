'use client';
import { useState } from 'react';

const FORM_TYPES = [
  { value: 'classic', label: 'Classic',            desc: 'Two-step form. Contact details alongside a mini calendar, then slot selection.' },
  { value: 'minimal', label: 'Minimal',            desc: 'Linear 4-step wizard. One step at a time with a progress bar.' },
  { value: 'split',   label: 'Split panel',        desc: '50/50 layout. Calendar and slot picker on the left, contact form on the right.' },
  { value: 'cards',   label: 'Progressive cards',  desc: 'Each step is a card that collapses to a summary once completed.' },
];

function FormPreview({ slug, iframeKey }) {
  if (!slug) return null;
  return (
    <div className="mt-3">
      <div className="d-flex align-items-center justify-content-between mb-1">
        <span className="text-secondary small fw-medium">Preview</span>
        <a href={`/book/${slug}`} target="_blank" rel="noopener noreferrer" className="text-secondary small">
          Open in new tab ↗
        </a>
      </div>
      <div className="rounded border bg-white overflow-hidden" style={{ height: 520, position: 'relative' }}>
        <iframe
          key={iframeKey}
          src={`/book/${slug}`}
          style={{ width: '100%', height: '100%', border: 'none' }}
          tabIndex={-1}
          title="Booking form preview"
        />
      </div>
    </div>
  );
}

export default function BookingFormTypeSelector({ resourceId, resourceSlug, initialValue = 'classic' }) {
  const [selected, setSelected]     = useState(initialValue);
  const [saveState, setSaveState]   = useState('idle');
  const [iframeKey, setIframeKey]   = useState(0);

  async function handleSelect(value) {
    if (value === selected) return;
    setSelected(value);
    setSaveState('saving');
    try {
      const form = new FormData();
      form.append('id', resourceId);
      form.append('booking_form_type', value);
      const res = await fetch('/resource-actions/update-form-type', {
        method: 'POST',
        body: form,
      });
      if (res.ok) {
        setSaveState('saved');
        setIframeKey(k => k + 1);
      } else {
        setSaveState('error');
      }
    } catch {
      setSaveState('error');
    }
    setTimeout(() => setSaveState('idle'), 2000);
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <label className="form-label mb-0 fw-medium">Booking form style</label>
        {saveState === 'saving' && <span className="text-secondary small">Saving…</span>}
        {saveState === 'saved'  && <span className="text-success small">✓ Saved</span>}
        {saveState === 'error'  && <span className="text-danger small">Save failed</span>}
      </div>
      <div className="row g-2">
        {FORM_TYPES.map(ft => (
          <div className="col-6" key={ft.value}>
            <div
              onClick={() => handleSelect(ft.value)}
              className="card mb-0 h-100"
              style={{
                cursor: 'pointer',
                border: selected === ft.value ? '2px solid #206bc4' : '2px solid #dee2e6',
                background: selected === ft.value ? '#f0f4ff' : '#fff',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div className="card-body p-2">
                <div className="d-flex align-items-start gap-2">
                  <div
                    className="rounded-circle mt-1 flex-shrink-0"
                    style={{
                      width: 14, height: 14,
                      border: selected === ft.value ? '4px solid #206bc4' : '2px solid #adb5bd',
                      background: selected === ft.value ? '#206bc4' : '#fff',
                      transition: 'all 0.15s',
                    }}
                  />
                  <div>
                    <div className="fw-medium" style={{ fontSize: 13 }}>{ft.label}</div>
                    <div className="text-secondary" style={{ fontSize: 11 }}>{ft.desc}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <FormPreview slug={resourceSlug} iframeKey={iframeKey} />
    </div>
  );
}
