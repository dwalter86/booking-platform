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
    const [tenantRes, entitlementRes, resourcesRes, bookingsRes] = await Promise.all([
      apiFetch('/api/tenant/profile'),
      apiFetch('/api/entitlement'),
      apiFetch('/api/resources'),
      apiFetch('/api/bookings'),
    ]);

    const tenant        = tenantRes.ok      ? await tenantRes.json()      : null;
    const entitlement   = entitlementRes.ok ? await entitlementRes.json() : null;
    const resourcesRaw  = resourcesRes.ok   ? await resourcesRes.json()   : [];
    const bookingsRaw   = bookingsRes.ok    ? await bookingsRes.json()    : {};
    const resourceCount = (Array.isArray(resourcesRaw) ? resourcesRaw : (resourcesRaw.data || [])).length;
    const totalBookings = bookingsRaw?.pagination?.total_count ?? (Array.isArray(bookingsRaw) ? bookingsRaw.length : (bookingsRaw.data?.length ?? 0));

    content = (
      <SettingsTabContent
        tenant={tenant}
        entitlement={entitlement}
        resourceCount={resourceCount}
        totalBookings={totalBookings}
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
    const [catalogueRes, entitlementsRes, subscriptionRes] = await Promise.all([
      apiFetch('/api/plans/catalogue'),
      apiFetch('/api/plans/entitlements'),
      apiFetch('/api/plans/subscription'),
    ]);

    const catalogue    = catalogueRes.ok    ? await catalogueRes.json()    : [];
    const entitlements = entitlementsRes.ok ? await entitlementsRes.json() : {};
    const subscription = subscriptionRes.ok ? await subscriptionRes.json() : {};

    content = (
      <PlansTabContent
        catalogue={catalogue}
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
    <LayoutShell title="Administration">
      <AdminTabBar activeTab={tab} />
      {content}
    </LayoutShell>
  );
}
