import { cookies, headers } from 'next/headers';
import TrialGraceBanner from './TrialGraceBanner';
import NavItem from './NavItem';
import { apiFetch } from '../lib/auth';

/* ── Availio logomark ──────────────────────────────────────── */
function Mark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path
        d="M50,8 a42,42 0 1,1 0,84 a42,42 0 1,1 0,-84 z M50,20 a30,30 0 1,0 0,60 a30,30 0 1,0 0,-60 z"
        fill="var(--av-main)"
        fillRule="evenodd"
      />
      <path d="M50 8 a42 42 0 0 1 30.5 13 L50 50 Z" fill="var(--av-highlight)" />
      <rect x="65" y="65" width="27" height="27" fill="var(--av-main-deep)" />
    </svg>
  );
}

/* ── Nav icons ─────────────────────────────────────────────── */
const Icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  bookings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  resources: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  ),
  eventTypes: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
    </svg>
  ),
  locations: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2.5"/>
    </svg>
  ),
  plans: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

/* ── Nav structure ─────────────────────────────────────────── */
const multiResourceNav = {
  workspace: [
    { label: 'Dashboard', href: '/dashboard',    icon: Icons.dashboard },
    { label: 'Calendar',  href: '/calendar',      icon: Icons.calendar  },
    { label: 'Bookings',  href: '/bookings',      icon: Icons.bookings  },
  ],
  configure: [
    { label: 'Resources', href: '/resources',     icon: Icons.resources },
    { label: 'Locations', href: '/locations',     icon: Icons.locations },
  ],
  account: [
    { label: 'Plans',       href: '/plans',          icon: Icons.plans    },
    { label: 'Admin users', href: '/administration', icon: Icons.users    },
    { label: 'Settings',    href: '/administration', icon: Icons.settings },
  ],
};

const soloNav = {
  workspace: [
    { label: 'Dashboard',  href: '/dashboard',  icon: Icons.dashboard  },
    { label: 'Calendar',   href: '/calendar',    icon: Icons.calendar   },
    { label: 'Bookings',   href: '/bookings',    icon: Icons.bookings   },
  ],
  configure: [
    { label: 'My Schedule', href: '/resources',  icon: Icons.resources  },
    { label: 'Event Types', href: '/event-types',icon: Icons.eventTypes },
    { label: 'Locations',   href: '/locations',  icon: Icons.locations  },
  ],
  account: [
    { label: 'Plans',       href: '/plans',          icon: Icons.plans    },
    { label: 'Admin users', href: '/administration', icon: Icons.users    },
    { label: 'Settings',    href: '/administration', icon: Icons.settings },
  ],
};

/* ── LayoutShell ───────────────────────────────────────────── */
export default async function LayoutShell({ title, subtitle, headerAction, children }) {
  let isSolo     = false;
  let planCode   = null;
  let tenantName = null;

  try {
    const [subRes, tenantRes] = await Promise.all([
      apiFetch('/api/plans/subscription'),
      apiFetch('/api/tenant/profile'),
    ]);
    if (subRes.ok) {
      const sub  = await subRes.json();
      isSolo     = sub?.plan_code === 'solo';
      planCode   = sub?.plan_code ?? null;
    }
    if (tenantRes.ok) {
      const t    = await tenantRes.json();
      tenantName = t?.display_name ?? null;
    }
  } catch {
    // fall back to defaults silently
  }

  const nav      = isSolo ? soloNav : multiResourceNav;
  const planLabel = planCode
    ? planCode.charAt(0).toUpperCase() + planCode.slice(1)
    : 'Free';
  const initials = tenantName
    ? tenantName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AV';

  return (
    <div className="av-shell">

      {/* ── Sidebar ── */}
      <aside className="av-sidebar">
        <div className="av-brand">
          <div className="av-brand-mark">
            <Mark size={20} />
          </div>
          <div>
            <div className="av-brand-name">Availio</div>
            <div className="av-brand-sub">{planLabel} plan</div>
          </div>
        </div>

        <nav className="av-nav" aria-label="Main navigation">
          <div className="av-nav-section">Workspace</div>
          {nav.workspace.map(item => (
            <NavItem key={item.href + item.label} {...item} />
          ))}

          <div className="av-nav-section">Configure</div>
          {nav.configure.map(item => (
            <NavItem key={item.href + item.label} {...item} />
          ))}

          <div className="av-nav-section">Account</div>
          {nav.account.map(item => (
            <NavItem key={item.href + item.label} {...item} />
          ))}
        </nav>

        <div className="av-sidebar-foot">
          <div className="av-user-pod">
            <div className="av-avatar">{initials}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="av-user-name">{tenantName || 'Admin'}</div>
              <div className="av-user-email">{planLabel} plan</div>
            </div>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="av-nav-item">
              {Icons.logout}
              <span>Log out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="av-main">
        <TrialGraceBanner />

        {(title || headerAction) && (
          <div className="av-topbar">
            <div className="av-topbar-left">
              {title    && <div className="av-topbar-title">{title}</div>}
              {subtitle && <div className="av-topbar-sub">{subtitle}</div>}
            </div>
            {headerAction && (
              <div className="av-topbar-right">{headerAction}</div>
            )}
          </div>
        )}

        <div className="av-content">
          {children}
        </div>
      </div>

    </div>
  );
}
