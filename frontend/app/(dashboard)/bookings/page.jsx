import LayoutShell from '../../../components/LayoutShell';
import { requireAuth } from '../../../lib/auth';
import BookingsPageClient from './BookingsPageClient';

export const dynamic = 'force-dynamic';

export default async function BookingsPage() {
  await requireAuth();

  const breadcrumb = (
    <>
      <span>Workspace</span>
      <span className="av-crumb-sep">›</span>
      <span className="av-crumb-now">Bookings</span>
    </>
  );

  return (
    <LayoutShell breadcrumb={breadcrumb}>
      <BookingsPageClient />
    </LayoutShell>
  );
}
