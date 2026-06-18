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

      <div className="d-flex align-items-center justify-content-between mb-2">
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--av-ink)' }}>
          Tenant admin users
        </h3>
        <button
          className="av-tiny-btn primary"
          type="button"
          onClick={() => setShowAddForm(prev => !prev)}
        >
          {showAddForm ? 'Cancel' : '+ Add admin'}
        </button>
      </div>

      <div className="av-list">
        <div className="av-list-row av-list-head cols-admin-users">
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
          <div>Status</div>
          <div>Last login</div>
          <div></div>
        </div>
        {Array.isArray(rows) && rows.length ? rows.map((row) => (
          <div key={row.id} className="av-list-row cols-admin-users">
            <div className="av-cell-name">
              <div className="av-name">{row.full_name || '—'}</div>
            </div>
            <div className="av-cell-meta">{row.email}</div>
            <div className="av-cell-meta" style={{ textTransform: 'capitalize' }}>{row.role || 'admin'}</div>
            <div>
              <span className={`av-pill ${row.is_active ? 'active' : 'inactive'}`}>
                <span className="av-dot" />
                {row.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="av-cell-meta">
              {row.last_login_at
                ? new Date(row.last_login_at).toLocaleDateString('en-GB')
                : '—'}
            </div>
            <div className="av-row-actions">
              <a className="av-tiny-btn primary"
                href={`/administration?tab=admin-users&edit=${row.id}`}>Edit</a>
            </div>
          </div>
        )) : (
          <div className="av-list-row" style={{ display: 'block' }}>
            <span className="av-muted">No admin users found.</span>
          </div>
        )}
      </div>
    </>
  );
}
