export const dynamic = 'force-dynamic';

export default function SuperAdminLoginPage({ searchParams }) {
  const error = searchParams?.error || '';

  return (
    <div className="page page-center">
      <div className="container container-tight py-4">
        <div className="text-center mb-4">
          <h1 className="h2">Availio</h1>
          <p className="text-secondary">Platform Administration</p>
        </div>
        <div className="card">
          <div className="card-body">
            <h2 className="card-title text-center mb-4">Sign in</h2>
            {error ? <div className="alert alert-danger">{error}</div> : null}
            <form action="/superadmin-actions/login" method="post">
              <div className="mb-3">
                <label className="form-label">Email address</label>
                <input
                  className="form-control"
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  className="form-control"
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="form-footer">
                <button className="btn btn-primary w-100" type="submit">
                  Sign in to Platform Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
