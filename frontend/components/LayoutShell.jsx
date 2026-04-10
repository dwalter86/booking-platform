import Link from 'next/link';

const navItems = [
  ['Dashboard', '/dashboard'],
  ['Resources', '/resources'],
  ['Bookings', '/bookings'],
  ['Calendar', '/calendar'],
  ['Unavailability', '/unavailability-blocks'],
  ['Availability Rules', '/availability-rules'],
  ['Admin Users', '/admin-users'],
  ['Plans', '/plans'],
  ['Audit Log', '/audit-log']
  ['Settings', '/settings'],
];

export default function LayoutShell({ title, children }) {
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
        <div className="page-header d-print-none">
          <div className="container-xl">
            <div className="row g-2 align-items-center">
              <div className="col">
                <h2 className="page-title">{title}</h2>
              </div>
            </div>
          </div>
        </div>
        <div className="page-body">
          <div className="container-xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
