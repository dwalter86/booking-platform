import LayoutShell from '../../../components/LayoutShell';
import ErrorAlert from '../../../components/ErrorAlert';
import AdminCalendarClient from '../../../components/AdminCalendarClient';
import { apiFetch, requireAuth } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

async function loadJson(path) {
  const response = await apiFetch(path);
  if (!response.ok) {
    return { ok: false, data: null, error: `Failed to load ${path}` };
  }
  const data = await response.json().catch(() => null);
  return { ok: true, data, error: '' };
}

export default async function CalendarPage({ searchParams }) {
  await requireAuth();

  const [resourcesResult, blocksResult] = await Promise.all([
    loadJson('/api/resources'),
    loadJson('/api/unavailability-blocks')
  ]);

  const error = resourcesResult.error || blocksResult.error;
  const resources = Array.isArray(resourcesResult.data) ? resourcesResult.data : [];
  const unavailabilityBlocks = Array.isArray(blocksResult.data) ? blocksResult.data : [];

  const initialView = searchParams?.view || 'timeGridWeek';

  return (
  <LayoutShell>
      <ErrorAlert message={error} />
      <AdminCalendarClient
        resources={resources}
        unavailabilityBlocks={unavailabilityBlocks}
        initialView={initialView}
      />
    </LayoutShell>
  );
}
