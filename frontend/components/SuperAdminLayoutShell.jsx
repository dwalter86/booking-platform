import Link from 'next/link';

const navItems = [
  ['Dashboard',      '/superadmin'],
  ['Tenants',        '/superadmin/tenants'],
  ['Plans',          '/superadmin/plans'],
];

export default function SuperAdminLayoutShell({ title, children }) {
  return (
    <div className="page">
      <aside className="navbar navbar-vertical navbar-expand-lg" data-bs-theme="dark">
        <div className="container-fluid">
          <div className="mb-2">
            <h1 className="navbar-brand navbar-brand-autodark text-white mb-0">Availio</h1>
            <div className="text-white-50" style={{ fontSize: '0.75rem', paddingLeft: '0.75rem' }}>
              Platform Admin
            </div>
          </div>
          <div className="navbar-nav flex-column">
            {navItems.map(([label, href]) => (
              <Link key={href} href={href} className="nav-link text-white">
                {label}
              </Link>
            ))}
            <form action="/superadmin-actions/logout" method="post" className="mt-3">
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
