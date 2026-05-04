'use client';

import { useState } from 'react';
import DataCard from '../DataCard';

export default function AdminUsersTabContent({ rows, editUser, success, error }) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <>
      {success ? <div className="alert alert-success">{success}</div> : null}
      {error   ? <div className="alert alert-danger">{error}</div>   : null}

      {showAddForm && (
        <DataCard title="Add admin user">
          <form action="/api/admin/users/create" method="post">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Full name</label>
                <input className="form-control" type="text" name="full_name" required />
              </div>
              <div className="col-md-4">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" name="email" required />
              </div>
              <div className="col-md-4">
                <label className="form-label">Password</label>
                <input className="form-control" type="password" name="password" required minLength={8} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Role</label>
                <select className="form-select" name="role">
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="col-12 d-flex gap-2">
                <button className="btn btn-primary" type="submit">Create user</button>
                <button className="btn btn-outline-secondary" type="button"
                  onClick={() => setShowAddForm(false)}>Cancel</button>
              </div>
            </div>
          </form>
        </DataCard>
      )}

      {editUser && (
        <DataCard title={`Edit user — ${editUser.full_name || editUser.email}`}>
          <form action="/api/admin/users/update" method="post">
            <input type="hidden" name="user_id" value={editUser.id} />
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Full name</label>
                <input className="form-control" type="text" name="full_name"
                  defaultValue={editUser.full_name || ''} required />
              </div>
              <div className="col-md-4">
                <label className="form-label">Role</label>
                <select className="form-select" name="role" defaultValue={editUser.role || 'admin'}>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Active</label>
                <select className="form-select" name="is_active"
                  defaultValue={editUser.is_active ? 'true' : 'false'}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="col-12 d-flex gap-2">
                <button className="btn btn-primary" type="submit">Save changes</button>
                <a className="btn btn-outline-secondary"
                  href="/administration?tab=admin-users">Cancel</a>
              </div>
            </div>
          </form>
        </DataCard>
      )}

      <DataCard
        title="Tenant admin users"
        headerAction={
          <button
            className="btn btn-sm btn-primary"
            type="button"
            onClick={() => setShowAddForm(prev => !prev)}
          >
            {showAddForm ? 'Cancel' : '+ Add admin'}
          </button>
        }
      >
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(rows) && rows.length ? rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.full_name || '—'}</td>
                  <td>{row.email}</td>
                  <td>{row.role || 'admin'}</td>
                  <td>
                    {row.is_active
                      ? <span className="badge bg-green-lt">Active</span>
                      : <span className="badge bg-red-lt">Inactive</span>}
                  </td>
                  <td>{row.last_login_at
                    ? new Date(row.last_login_at).toLocaleDateString('en-GB')
                    : '—'}
                  </td>
                  <td>
                    <a className="btn btn-sm btn-outline-primary"
                      href={`/administration?tab=admin-users&edit=${row.id}`}>Edit</a>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="text-secondary">No admin users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DataCard>
    </>
  );
}
