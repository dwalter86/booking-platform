'use client';

import { useState, useEffect } from 'react';
import CopyButton from './CopyButton';

/**
 * ShareEventTypePanel — floating share panel for an event type.
 * variant: 'slideover' (right-edge drawer) | 'modal' (centred dialog)
 * Renders its own trigger button; manages its own open state.
 */
export default function ShareEventTypePanel({ eventType, baseUrl }) {
  const [open, setOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const bookingUrl = `${baseUrl}/book/${eventType.slug}`;

  const panelBody = (
    <>
      <div className="av-share-head">
        <h3 className="av-share-title">Share — {eventType.name}</h3>
        <button
          type="button"
          className="av-share-close"
          onClick={() => setOpen(false)}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="av-share-body">
        <div className="av-share-section">
          <h4>Public booking URL</h4>
          <p>Share this link with customers to let them book this event type directly.</p>
          <div className="av-share-url">
            <input type="text" readOnly value={bookingUrl} />
            <CopyButton text={bookingUrl} />
          </div>
        </div>

        <div className="av-share-section">
          <h4>Embed guide</h4>
          <p>Instructions for embedding this booking form on your website will appear here.</p>
          <div className="av-share-placeholder">Coming soon</div>
        </div>

        <div className="av-share-section">
          <h4>Embed code</h4>
          <p>Copy and paste this snippet into your website to embed the booking form.</p>
          <div className="av-share-placeholder mono">Coming soon</div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        className="av-tiny-btn"
        onClick={() => setOpen(true)}
      >
        Share
      </button>

      {open && (
        <div
          className="av-share-overlay slideover"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="av-share-panel slideover" role="dialog" aria-modal="true">
            {panelBody}
          </div>
        </div>
      )}
    </>
  );
}
