'use client';

/**
 * Ring — circular progress indicator, Availio brand primitive.
 * value: 0–1, size: px, stroke: px, tone: ''|'warn'|'full'|'ok'
 * label: centre text, sub: centre sub-text, children: override centre
 */
export default function Ring({ value = 0, size = 56, stroke = 6, tone = '', label, sub, children }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const v    = Math.max(0, Math.min(1, value));
  const dash = circ * v;

  return (
    <div className="av-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="av-ring-track" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          className={`av-ring-fill${tone ? ` tone-${tone}` : ''}`}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ - dash}`}
        />
      </svg>
      {(label != null || children) && (
        <div className="av-ring-label">
          {children ?? (
            <>
              <span className="av-ring-pct" style={{ fontSize: Math.max(10, size * 0.24) + 'px' }}>
                {label}
              </span>
              {sub && <span className="av-ring-pct-sub">{sub}</span>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
