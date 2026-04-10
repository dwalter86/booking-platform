import LayoutShell from '../../../components/LayoutShell';
import DataCard from '../../../components/DataCard';
import { apiFetch, requireAuth } from '../../../lib/auth';
import { formatDateTime } from '../../../lib/format';

export const dynamic = 'force-dynamic';

async function load() {
  await requireAuth();
  const [resourcesRes, bookingsRes, plansRes] = await Promise.all([
    apiFetch('/api/resources'),
    apiFetch('/api/bookings'),
    apiFetch('/api/plans/entitlements'),
  ]);

  const resourcesRaw = resourcesRes.ok ? await resourcesRes.json() : [];
  const bookingsRaw  = bookingsRes.ok  ? await bookingsRes.json()  : [];

  const resources = Array.isArray(resourcesRaw) ? resourcesRaw : (resourcesRaw.data || []);
  const bookings  = Array.isArray(bookingsRaw)  ? bookingsRaw  : (bookingsRaw.data  || []);
  const entitlements = plansRes.ok ? await plansRes.json() : {};
  return { resources, bookings, entitlements };
}

export default async function DashboardPage() {
  const { resources, bookings, entitlements } = await load();
  const recentBookings = Array.isArray(bookings) ? bookings.slice(0, 5) : [];

  return (
    <LayoutShell title="Dashboard">
      <div className="row row-deck row-cards">
        <div className="col-md-4">
          <DataCard title="Resources"><div className="h1 mb-0">{Array.isArray(resources) ? resources.length : 0}</div></DataCard>
        </div>
        <div className="col-md-4">
          <DataCard title="Bookings"><div className="h1 mb-0">{Array.isArray(bookings) ? bookings.length : 0}</div></DataCard>
        </div>
        <div className="col-md-4">
          <DataCard title="Current plan"><div className="h3 mb-0">{entitlements?.plan?.name || 'Unknown'}</div></DataCard>
        </div>
        <div className="col-12">
          <DataCard title="Recent bookings">
            <div className="table-responsive">
              <table className="table table-vcenter">
                <thead><tr><th>Reference</th><th>Status</th><th>Start</th><th>End</th></tr></thead>
                <tbody>
                  {recentBookings.length === 0 ? (
                    <tr><td colSpan="4">No bookings found.</td></tr>
                  ) : recentBookings.map((row) => (
                    <tr key={row.id}>
                      <td>{row.reference_code || row.id}</td>
                      <td>{row.status}</td>
                      <td>{formatDateTime(row.start_at)}</td>
                      <td>{formatDateTime(row.end_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataCard>
        </div>
      </div>
    </LayoutShell>
  );
}
