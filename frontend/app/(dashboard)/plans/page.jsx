import LayoutShell from '../../../components/LayoutShell';
import DataCard from '../../../components/DataCard';
import { apiFetch, requireAuth } from '../../../lib/auth';
import { prettyJson } from '../../../lib/format';

export const dynamic = 'force-dynamic';

export default async function PlansPage() {
  await requireAuth();
  const [catalogueRes, entitlementsRes, subscriptionRes] = await Promise.all([
    apiFetch('/api/plans/catalogue'),
    apiFetch('/api/plans/entitlements'),
    apiFetch('/api/plans/subscription')
  ]);

  const catalogue = catalogueRes.ok ? await catalogueRes.json() : [];
  const entitlements = entitlementsRes.ok ? await entitlementsRes.json() : {};
  const subscription = subscriptionRes.ok ? await subscriptionRes.json() : {};

  return (
    <LayoutShell title="Plans and entitlements">
      <DataCard title="Current subscription"><pre>{prettyJson(subscription)}</pre></DataCard>
      <DataCard title="Effective entitlements"><pre>{prettyJson(entitlements)}</pre></DataCard>
      <DataCard title="Plan catalogue"><pre>{prettyJson(catalogue)}</pre></DataCard>
    </LayoutShell>
  );
}
