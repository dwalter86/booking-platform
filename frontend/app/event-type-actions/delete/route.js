import { redirect } from 'next/navigation';
import { apiFetch } from '../../../lib/auth';

export async function POST(request) {
  const formData = await request.formData();
  const id = formData.get('id');
  const resourceId = formData.get('resource_id');
  const base = `/resources/${resourceId}/edit`;

  if (!id) redirect(`${base}?error=Missing+event+type+ID`);

  const res = await apiFetch(`/api/event-types/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = encodeURIComponent(data.error || 'Failed to delete event type.');
    redirect(`${base}?error=${msg}`);
  }

  redirect(`${base}?success=Event+type+deleted`);
}
