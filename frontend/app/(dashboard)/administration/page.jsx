import LayoutShell from '../../../components/LayoutShell';
import AdminTabBar from '../../../components/AdminTabBar';
import SettingsTabContent from '../../../components/admin-tabs/SettingsTabContent';
import AdminUsersTabContent from '../../../components/admin-tabs/AdminUsersTabContent';
import PlansTabContent from '../../../components/admin-tabs/PlansTabContent';
import AuditLogTabContent from '../../../components/admin-tabs/AuditLogTabContent';
import { apiFetch, requireAuth } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdministrationPage({ searchParams }) {
  await requireAuth();

  const tab     = searchParams?.tab     || 'settings';
  const page    = Math.max(1, Number.parseInt(searchParams?.page ?? '1', 10) || 1);
  const editId  = searchParams?.edit    || '';
  const success = searchParams?.success || '';
  const error   = searchParams?.error   || '';

  let content;

  if (tab === 'settings') {
    const tenantRes = await apiFetch('/api/tenant/profile');
    const tenant    = tenantRes.ok ? await tenantRes.json() : null;

    content = (
      <SettingsTabContent
        tenant={tenant}
        success={success}
        error={error}
      />
    );

  } else if (tab === 'admin-users') {
    const response = await apiFetch('/api/admin/users');
    const rows = response.ok ? await response.json() : [];
    const editUser = Array.isArray(rows) ? rows.find((r) => r.id === editId) || null : null;

    content = (
      <AdminUsersTabContent
        rows={rows}
        editUser={editUser}
        success={success}
        error={error}
      />
    );

  } else if (tab === 'plans') {
    const [catalogueRes, subscriptionRes, entitlementsRes] = await Promise.all([
      apiFetch('/api/plans/catalogue'),
      apiFetch('/api/plans/subscription'),
      apiFetch('/api/plans/entitlements'),
    ]);

    const catalogueData = catalogueRes.ok    ? await catalogueRes.json()    : { plans: [], limits: [], features: [] };
    const subscription  = subscriptionRes.ok ? await subscriptionRes.json() : null;
    const entitlements  = entitlementsRes.ok ? await entitlementsRes.json() : { limits: {}, features: {}, usage: {} };

    content = (
      <PlansTabContent
        catalogue={catalogueData}
        entitlements={entitlements}
        subscription={subscription}
      />
    );

  } else if (tab === 'audit-log') {
    const response = await apiFetch(`/api/admin/audit-log?page=${page}`);
    const body = response.ok ? await response.json().catch(() => ({})) : {};
    const rows = Array.isArray(body.data) ? body.data : [];
    const pagination = body.pagination || null;

    content = (
      <AuditLogTabContent rows={rows} pagination={pagination} page={page} />
    );

  } else {
    content = <div className="alert alert-warning">Unknown tab.</div>;
  }

  return (
    <LayoutShell title="Administration" headerAction={<AdminTabBar activeTab={tab} />}>
      {content}
    </LayoutShell>
  );
}
