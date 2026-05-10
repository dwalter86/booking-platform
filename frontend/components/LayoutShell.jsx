import Link from 'next/link';
import TrialGraceBanner from './TrialGraceBanner';
import { apiFetch } from '../lib/auth';

const multiResourceNav = [
  ['Dashboard',   '/dashboard'],
  ['Resources',   '/resources'],
  ['Locations',   '/locations'],
  ['Bookings',    '/bookings'],
  ['Calendar',    '/calendar'],
  ['Plans',       '/plans'],
  ['Settings',    '/administration'],
];

const soloNav = [
  ['Dashboard',    '/dashboard'],
  ['My Schedule',  '/resources'],
  ['Event Types',  '/event-types'],
  ['Locations',    '/locations'],
  ['Bookings',     '/bookings'],
  ['Calendar',     '/calendar'],
  ['Plans',        '/plans'],
  ['Settings',     '/administration'],
];

export default async function LayoutShell({ title, subtitle, headerAction, children }) {
  let isSolo = false;
  try {
    const res = await apiFetch('/api/plans/subscription');
    if (res.ok) {
      const data = await res.json();
      isSolo = data?.plan_code === 'solo';
    }
  } catch {
    // fall back to multi-resource nav
  }

  const navItems = isSolo ? soloNav : multiResourceNav;

  return (
    <div className="page">
      <aside className="navbar navbar-vertical navbar-expand-lg" data-bs-theme="dark">
        <div className="container-fluid">
          <h1 className="navbar-brand navbar-brand-autodark text-white">Booking Admin</h1>
          <div className="navbar-nav flex-column">
            {navItems.map(([label, href]) => (
              <Link key={href} href={href} className="nav-link text-white">
                {label}
              </Link>
            ))}
            <form action="/api/auth/logout" method="post" className="mt-3">
              <button className="btn btn-outline-light w-100" type="submit">Logout</button>
            </form>
          </div>
        </div>
      </aside>
      <div className="page-wrapper">
        <TrialGraceBanner />
        {(title || headerAction) && (
          <div className="page-header d-print-none">
            <div className="container-xl">
              <div className="row g-2 align-items-center">
                <div className="col">
                  <h2 className="page-title mb-0">{title}</h2>
                  {subtitle && (
                    <p className="text-secondary mb-0 mt-1" style={{ fontSize: '0.85rem' }}>{subtitle}</p>
                  )}
                </div>
                {headerAction && <div className="col-auto d-flex align-items-center">{headerAction}</div>}
              </div>
            </div>
          </div>
        )}
        <div className="page-body">
          <div className="container-xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
