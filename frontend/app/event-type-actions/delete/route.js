import { redirect } from 'next/navigation';
import { apiFetch } from '../../../lib/auth';

export async function POST(request) {
  const formData = await request.formData();
  const id = formData.get('id');
  const resourceId = formData.get('resource_id');

  if (!id) redirect(`/resources/${resourceId}/edit?error=Missing+event+type+ID`);

  const res = await apiFetch(`/api/event-types/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = encodeURIComponent(data.error || 'Failed to delete event type.');
    redirect(`/resources/${resourceId}/edit?error=${msg}`);
  }

  redirect(`/resources/${resourceId}/edit?success=Event+type+deleted`);
}
