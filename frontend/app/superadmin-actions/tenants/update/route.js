import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { config } from '../../../../lib/config';

export async function POST(request) {
  const token = cookies().get('superadmin_token')?.value;
  if (!token) redirect('/superadmin/login');

  const formData = await request.formData();
  const id       = formData.get('id');

  const body = {
    name:                         formData.get('name')             || undefined,
    display_name:                 formData.get('display_name')     || undefined,
    contact_email:                formData.get('contact_email')    || undefined,
    timezone:                     formData.get('timezone')         || undefined,
    logo_url:                     formData.get('logo_url')         || undefined,
    brand_colour:                 formData.get('brand_colour')     || undefined,
    booking_confirmation_message: formData.get('booking_confirmation_message') || undefined,
    status:                       formData.get('status')           || undefined,
    public_booking_enabled:       formData.get('public_booking_enabled') === 'on',
  };

  const response = await fetch(`${config.apiBaseUrl}/api/superadmin/tenants/${id}`, {
    method:  'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body:  JSON.stringify(body),
    cache: 'no-store',
  });

  const result = await response.json();

  if (!response.ok) {
    redirect(`/superadmin/tenants/${id}?error=${encodeURIComponent(result.error || 'Failed to update tenant')}`);
  }

  redirect(`/superadmin/tenants/${id}?success=Profile+updated+successfully`);
}
