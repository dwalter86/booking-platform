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

export default async function CalendarPage() {
  await requireAuth();

  const [resourcesResult, bookingsResult, blocksResult] = await Promise.all([
    loadJson('/api/resources'),
    loadJson('/api/bookings'),
    loadJson('/api/unavailability-blocks')
  ]);

  const error = resourcesResult.error || bookingsResult.error || blocksResult.error;
  const resources = Array.isArray(resourcesResult.data) ? resourcesResult.data : [];
  const bookings = Array.isArray(bookingsResult.data?.data) ? bookingsResult.data.data : [];
  const unavailabilityBlocks = Array.isArray(blocksResult.data) ? blocksResult.data : [];

  return (
    <LayoutShell title="Calendar">
      <ErrorAlert message={error} />
      <AdminCalendarClient
        resources={resources}
        bookings={bookings}
        unavailabilityBlocks={unavailabilityBlocks}
      />
    </LayoutShell>
  );
}
