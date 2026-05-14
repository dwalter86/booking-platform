'use client';

import { useState } from 'react';

export default function BookingLinkCard({ host, eventTypes = [] }) {
  const [copied, setCopied] = useState(null);

  function copy(url) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(url);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  const baseUrl = host ? `https://${host}` : '';

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--av-line)',
      borderRadius: 'var(--av-r-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--av-shadow-sm)',
      height: '100%',
      boxSizing: 'border-box',
    }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--av-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--av-font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--av-ink-3)' }}>
          Your booking link
        </span>
        <a href="/event-types" style={{ fontSize: 12, color: 'var(--av-main)', fontWeight: 500, textDecoration: 'none' }}>
          Manage →
        </a>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {eventTypes.length === 0 ? (
          <div style={{ color: 'var(--av-ink-4)', fontSize: 13, marginBottom: 10 }}>
            No event types yet.{' '}
            <a href="/event-types" style={{ color: 'var(--av-main)', textDecoration: 'none', fontWeight: 500 }}>Create one →</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {eventTypes.slice(0, 4).map(et => {
              const url     = `${baseUrl}/book/${et.slug}`;
              const isCopied = copied === url;
              return (
                <div key={et.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--av-paper-2)', borderRadius: 8, border: '1px solid var(--av-line)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: et.colour || '#1e2a78', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--av-ink-2)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {et.name}
                  </span>
                  <button
                    onClick={() => copy(url)}
                    style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '1px solid var(--av-line)', background: isCopied ? 'var(--av-sage-bg)' : '#fff', color: isCopied ? 'var(--av-sage-ink)' : 'var(--av-ink-3)', cursor: 'pointer', flexShrink: 0, fontFamily: 'var(--av-font-mono)' }}>
                    {isCopied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <a href={`${baseUrl}/book`} target="_blank" rel="noreferrer" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          marginTop: 10, padding: '7px', borderRadius: 8,
          border: '1px dashed var(--av-line)', color: 'var(--av-ink-3)',
          fontSize: 12, textDecoration: 'none', fontWeight: 500,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open booking page
        </a>
      </div>
    </div>
  );
}
