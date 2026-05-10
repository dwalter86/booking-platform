import { redirect } from 'next/navigation';
import { apiFetch } from '../../../lib/auth';

export async function POST(request) {
  const formData = await request.formData();

  const payload = {
    resource_id:                  formData.get('resource_id'),
    name:                         formData.get('name'),
    slug:                         formData.get('slug'),
    description:                  formData.get('description') || null,
    duration_minutes:             parseInt(formData.get('duration_minutes'), 10),
    booking_mode:                 formData.get('booking_mode') || 'free',
    booking_form_type:            formData.get('booking_form_type') || 'classic',
    auto_confirm:                 formData.get('auto_confirm') === 'on',
    public_booking_enabled:       formData.get('public_booking_enabled') === 'on',
    booking_confirmation_message: formData.get('booking_confirmation_message') || null,
    min_notice_hours:             parseInt(formData.get('min_notice_hours') || '0', 10),
    max_advance_booking_days:     formData.get('max_advance_booking_days')
                                    ? parseInt(formData.get('max_advance_booking_days'), 10)
                                    : null,
    buffer_before_minutes:        parseInt(formData.get('buffer_before_minutes') || '0', 10),
    buffer_after_minutes:         parseInt(formData.get('buffer_after_minutes') || '0', 10),
    status:                       formData.get('status') || 'active',
  };

  const res = await apiFetch('/api/event-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const resourceId = payload.resource_id;

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = encodeURIComponent(data.error || 'Failed to create event type.');
    redirect(`/event-types/new?resource_id=${resourceId}&error=${msg}`);
  }

  const created = await res.json().catch(() => ({}));
  redirect(`/event-types/${created.id}/edit?success=Event+type+created+successfully`);
}
