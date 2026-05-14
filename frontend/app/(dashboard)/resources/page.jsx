import Link from 'next/link';
import LayoutShell from '../../../components/LayoutShell';
import { apiFetch, requireAuth } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export default async function ResourcesPage({ searchParams }) {
  await requireAuth();

  const [response, subscriptionRes] = await Promise.all([
    apiFetch('/api/resources'),
    apiFetch('/api/plans/subscription'),
  ]);

  const rows = response.ok ? await response.json() : [];
  const subscription = subscriptionRes.ok ? await subscriptionRes.json() : null;
  const isSolo = subscription?.plan_code === 'solo';
  const pageLabel = isSolo ? 'My Schedule' : 'Resources';
  const pageDescription = isSolo
    ? 'Your bookable schedule — the times and formats customers can book with you.'
    : 'Rooms, studios and equipment that customers can book.';

  const error = searchParams?.error || '';
  const success = searchParams?.success || '';

  const list = Array.isArray(rows) ? rows : [];
  const activeCount = list.filter(r => r.is_active).length;
  const totalCapacity = list.reduce((sum, r) => sum + (Number(r.capacity) || 0), 0);

  const addButton = (
    <Link className="btn btn-primary btn-sm" href="/resources/new">
      Add resource
    </Link>
  );

  const breadcrumb = (
    <>
      <span>Workspace</span>
      <span className="av-crumb-sep">/</span>
      <span className="av-crumb-now">{pageLabel}</span>
    </>
  );

  return (
    <LayoutShell breadcrumb={breadcrumb} headerAction={addButton}>
      {success && <div className="alert alert-success mb-4">{success}</div>}
      {error && <div className="alert alert-danger mb-4">{error}</div>}

      {/* ── Page header ── */}
      <div className="av-page-header">
        <div className="av-ph-title">
          <h1>{pageLabel}</h1>
          <p>{pageDescription}</p>
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="av-summary">
        <div className="av-summary-card">
          <div>
            <div className="av-sc-label">Total resources</div>
            <div className="av-sc-value">{list.length}</div>
          </div>
        </div>
        <div className="av-summary-card">
          <div>
            <div className="av-sc-label">Active</div>
            <div className="av-sc-value">{activeCount}</div>
            <div className="av-sc-sub">of {list.length}</div>
          </div>
        </div>
        <div className="av-summary-card">
          <div>
            <div className="av-sc-label">Inactive</div>
            <div className="av-sc-value">{list.length - activeCount}</div>
          </div>
        </div>
        <div className="av-summary-card">
          <div>
            <div className="av-sc-label">Total capacity</div>
            <div className="av-sc-value">{totalCapacity}</div>
            <div className="av-sc-sub">seats across all resources</div>
          </div>
        </div>
      </div>

      {/* ── List ── */}
      <div className="av-list">
        <div className="av-list-row av-list-head cols-resources">
          <div>Name</div>
          <div>Status</div>
          <div>Capacity</div>
          <div>Timezone</div>
          <div></div>
        </div>

        {list.length === 0 ? (
          <div className="av-list-row cols-resources">
            <div className="av-muted" style={{ gridColumn: '1 / -1' }}>
              No resources found. Click Add resource to create one.
            </div>
          </div>
        ) : list.map(row => (
          <div key={row.id} className="av-list-row cols-resources">
            <div className="av-cell-name">
              <div className="av-name">{row.name}</div>
              <div className="av-slug">{row.slug}</div>
            </div>
            <div>
              <span className={`av-pill ${row.is_active ? 'active' : 'inactive'}`}>
                <span className="av-dot" />
                {row.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="av-muted">{row.capacity}</div>
            <div className="av-muted">{row.timezone || 'Europe/London'}</div>
            <div className="av-row-actions">
              <Link className="av-tiny-btn primary" href={`/resources/${row.id}/edit`}>
                Edit
              </Link>
            </div>
          </div>
        ))}
      </div>
    </LayoutShell>
  );
}
