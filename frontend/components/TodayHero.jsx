'use client';

import { useEffect, useState } from 'react';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatCountdown(targetDate) {
  const diff = new Date(targetDate) - new Date();
  if (diff <= 0) return null;
  const totalMins = Math.floor(diff / 60000);
  const days  = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins  = totalMins % 60;
  if (days > 0)  return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function TodayHero({ tenantName, nextBooking, planRing }) {
  const [greeting, setGreeting] = useState('');
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    setGreeting(getGreeting());
    if (nextBooking?.start_at) {
      setCountdown(formatCountdown(nextBooking.start_at));
      const id = setInterval(() => setCountdown(formatCountdown(nextBooking.start_at)), 60000);
      return () => clearInterval(id);
    }
  }, [nextBooking]);

  // Date label e.g. "Monday · 13 May 2026"
  const dateLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).replace(',', ' ·');

  // Next booking display
  const nextTime = nextBooking?.start_at
    ? new Date(nextBooking.start_at).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null;
  const nextDate = nextBooking?.start_at
    ? new Date(nextBooking.start_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
    : null;

  // Plan ring values
  const { current = 0, limit = 100, planName = 'Solo', pct = 0 } = planRing || {};
  const ringTone = pct >= 0.9 ? 'full' : pct >= 0.7 ? 'warn' : '';
  const circumference = 2 * Math.PI * ((92 - 9) / 2);
  const dash = circumference * Math.min(1, pct);

  return (
    <div style={{
      position: 'relative',
      borderRadius: 'var(--av-r-lg)',
      background: 'linear-gradient(135deg, var(--av-main-deep) 0%, var(--av-main) 55%, var(--av-main-soft) 100%)',
      color: '#fff',
      padding: '28px 30px',
      overflow: 'hidden',
      marginBottom: 18,
      boxShadow: 'var(--av-shadow-md)',
    }}>
      {/* Subtle diagonal texture */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(70% 110% at 100% 0%, rgba(78,168,255,.28) 0%, transparent 55%)',
      }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1.1fr', gap: 32, alignItems: 'stretch', position: 'relative' }}>

        {/* ── Left: greeting ── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'var(--av-font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.16em', color: 'rgba(255,255,255,.55)', marginBottom: 12 }}>
            {dateLabel}
          </div>
          <div style={{ fontWeight: 600, fontSize: 30, lineHeight: 1.1, letterSpacing: '-.02em', marginBottom: 10 }}>
            {greeting || 'Welcome'},<br />
            <span style={{ fontWeight: 700 }}>{tenantName || 'there'}</span>
          </div>
          {nextBooking ? (
            <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 14, lineHeight: 1.55, margin: '0 0 18px', maxWidth: '36ch' }}>
              Your next booking is{' '}
              <strong style={{ color: '#fff' }}>{nextDate} at {nextTime}</strong>
              {nextBooking.customer_name ? <> with <strong style={{ color: '#fff' }}>{nextBooking.customer_name}</strong></> : ''}.
            </p>
          ) : (
            <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 14, lineHeight: 1.55, margin: '0 0 18px', maxWidth: '36ch' }}>
              No upcoming bookings. Share your booking link to get started.
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
            <a href="/book" target="_blank" rel="noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
              background: '#fff', color: 'var(--av-main)', textDecoration: 'none',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              New booking
            </a>
            <a href="/bookings?status=provisional" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
              background: 'rgba(255,255,255,.10)', color: '#fff',
              border: '1px solid rgba(255,255,255,.18)', textDecoration: 'none',
            }}>
              Review pending
            </a>
          </div>
        </div>

        {/* ── Centre: next booking card ── */}
        <div style={{ borderLeft: '1px solid rgba(255,255,255,.12)', paddingLeft: 32, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'var(--av-font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.18em', color: 'rgba(255,255,255,.5)', marginBottom: 14 }}>
            Next up
          </div>
          {nextBooking ? (
            <>
              <div style={{
                display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'center',
                background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)',
                borderRadius: 14, padding: 14,
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 30, lineHeight: 1, letterSpacing: '-.025em' }}>{nextTime}</div>
                  <div style={{ fontFamily: 'var(--av-font-mono)', fontWeight: 400, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', marginTop: 6 }}>
                    {nextDate}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{nextBooking.customer_name || 'Booking'}</div>
                  <div style={{ color: 'rgba(255,255,255,.65)', fontSize: 12.5, lineHeight: 1.4 }}>
                    {nextBooking.resource_name || ''}
                  </div>
                  {nextBooking.customer_email && (
                    <div style={{ fontFamily: 'var(--av-font-mono)', fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>
                      {nextBooking.customer_email}
                    </div>
                  )}
                </div>
              </div>
              {countdown && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 8, fontFamily: 'var(--av-font-mono)', color: 'rgba(255,255,255,.65)', fontSize: 12 }}>
                  <span>Starts in</span>
                  <strong style={{ fontFamily: 'inherit', fontSize: 18, color: '#fff', fontWeight: 600 }}>{countdown}</strong>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 13, marginTop: 8 }}>
              Nothing scheduled yet.
            </div>
          )}
        </div>

        {/* ── Right: plan ring ── */}
        <div style={{ borderLeft: '1px solid rgba(255,255,255,.12)', paddingLeft: 28, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'var(--av-font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.18em', color: 'rgba(255,255,255,.5)', marginBottom: 14 }}>
            This month
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            {/* Ring rendered inline — avoids server/client mismatch on SVG */}
            <div style={{ position: 'relative', display: 'inline-grid', placeItems: 'center', width: 92, height: 92, flexShrink: 0 }}>
              <svg width="92" height="92" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
                <circle cx="46" cy="46" r="41.5" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="9" />
                <circle cx="46" cy="46" r="41.5" fill="none"
                  stroke={ringTone === 'full' ? 'var(--av-rose)' : ringTone === 'warn' ? 'var(--av-amber)' : 'var(--av-highlight)'}
                  strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                />
              </svg>
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
                <span style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-.02em', color: '#fff' }}>
                  {Math.round(pct * 100)}%
                </span>
                <span style={{ fontFamily: 'var(--av-font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.14em', color: 'rgba(255,255,255,.55)', marginTop: 3 }}>
                  used
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-.02em', lineHeight: 1, color: '#fff' }}>{planName}</div>
              <span style={{ marginTop: 8, display: 'inline-block', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', background: 'rgba(78,168,255,.18)', color: 'var(--av-highlight-soft)', padding: '3px 7px', borderRadius: 99, border: '1px solid rgba(78,168,255,.25)', fontWeight: 600 }}>
                Active
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--av-font-mono)', fontSize: 11, color: 'rgba(255,255,255,.55)', marginBottom: 14 }}>
            <span><strong style={{ color: '#fff' }}>{current}</strong> bookings used</span>
            <span>of {limit === null ? '∞' : limit}</span>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <a href="/plans" style={{
              display: 'block', textAlign: 'center', padding: '8px',
              background: 'rgba(255,255,255,.08)', color: '#fff',
              border: '1px solid rgba(255,255,255,.18)', borderRadius: 10,
              fontSize: 12, fontWeight: 500, textDecoration: 'none',
            }}>
              View plan details
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
