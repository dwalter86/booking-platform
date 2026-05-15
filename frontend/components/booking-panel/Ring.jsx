'use client';

export default function Ring({ value = 0, size = 44, stroke = 5, tone = '', dark = false, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const dash = c * v;

  return (
    <div
      className={`bp-ring ${tone}${dark ? ' on-dark' : ''}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ring-fill"
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      {children && <div className="bp-ring-label">{children}</div>}
    </div>
  );
}
