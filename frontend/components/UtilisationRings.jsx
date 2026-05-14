'use client';

import { useEffect, useState } from 'react';
import Ring from './Ring';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function tone(pct) {
  if (pct >= 0.95) return 'full';
  if (pct >= 0.7)  return 'warn';
  return '';
}

export default function UtilisationRings() {
  const [data,  setData]  = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Build date range client-side so timezone is correct
    const today = new Date();
    const pad   = n => String(n).padStart(2, '0');
    const fmt   = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const dateFrom = fmt(today);
    const end      = new Date(today);
    end.setDate(end.getDate() + 6);
    const dateTo = fmt(end);

    fetch(`/api/analytics/utilisation?date_from=${dateFrom}&date_to=${dateTo}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error) return null;

  const avg = data
    ? Math.round((data.days.reduce((s, d) => s + d.pct, 0) / Math.max(1, data.days.length)) * 100)
    : null;

  const todayStr = (() => {
    const d   = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--av-line)',
      borderRadius: 'var(--av-r-lg)',
      padding: '16px 18px',
      boxShadow: 'var(--av-shadow-sm)',
      height: '100%',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--av-font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--av-ink-3)' }}>
          This week · utilisation
        </span>
        {avg !== null && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <strong style={{ fontFamily: 'var(--av-font-mono)', fontSize: 13, color: 'var(--av-ink)' }}>{avg}%</strong>
            <span style={{ fontSize: 11, color: 'var(--av-ink-3)' }}>avg</span>
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {data ? data.days.map((d) => {
          // Parse date parts directly to avoid UTC/local shift
          const [year, month, day] = d.date.split('-').map(Number);
          const date    = new Date(year, month - 1, day);
          const isToday = d.date === todayStr;
          const dow     = DAYS[date.getDay()];
          const pctInt  = Math.round(d.pct * 100);

          return (
            <div key={d.date} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              padding: '6px 4px 4px',
              borderRadius: 8,
              background: isToday ? 'oklch(0.96 0.04 250)' : 'transparent',
            }}>
              <Ring value={d.pct} size={36} stroke={4} tone={tone(d.pct)} />
              <span style={{
                fontFamily: 'var(--av-font-mono)', fontSize: 12, fontWeight: 600,
                color: isToday ? 'var(--av-main)' : 'var(--av-ink-2)',
              }}>
                {day}
              </span>
              <span style={{
                fontFamily: 'var(--av-font-mono)', fontSize: 9,
                textTransform: 'uppercase', letterSpacing: '.12em',
                color: isToday ? 'var(--av-main)' : 'var(--av-ink-4)',
              }}>
                {dow}
              </span>
              {d.booked > 0 && (
                <span style={{ fontFamily: 'var(--av-font-mono)', fontSize: 9, color: 'var(--av-ink-3)', marginTop: -2 }}>
                  {d.booked} booking{d.booked !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          );
        }) : Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '6px 4px 4px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--av-paper-3)' }} />
            <div style={{ width: 18, height: 10, borderRadius: 3, background: 'var(--av-paper-3)', marginTop: 2 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
