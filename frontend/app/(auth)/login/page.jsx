export const dynamic = 'force-dynamic';

export default function LoginPage({ searchParams }) {
  const error = searchParams?.error || '';

  return (
    <div className="page page-center">
      <div className="container container-tight py-4">
        <div className="card card-md">
          <div className="card-body">
            <h2 className="h2 text-center mb-4">Admin Login</h2>
            {error ? <div className="alert alert-danger">{error}</div> : null}
            <form action="/api/auth/login" method="post">
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" name="email" required />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input className="form-control" type="password" name="password" required />
              </div>
              <button className="btn btn-primary w-100" type="submit">Sign in</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
