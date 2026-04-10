import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { config } from '../../../../lib/config';

export async function POST(request) {
  const token = cookies().get('superadmin_token')?.value;
  if (!token) redirect('/superadmin/login');

  const formData     = await request.formData();
  const tenant_id    = formData.get('tenant_id');
  const user_id      = formData.get('user_id');
  const new_password = formData.get('new_password');

  const response = await fetch(
    `${config.apiBaseUrl}/api/superadmin/tenants/${tenant_id}/users/${user_id}/reset-password`,
    {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body:  JSON.stringify({ new_password }),
      cache: 'no-store',
    }
  );

  const result = await response.json();

  if (!response.ok) {
    redirect(`/superadmin/tenants/${tenant_id}?error=${encodeURIComponent(result.error || 'Failed to reset password')}`);
  }

  redirect(`/superadmin/tenants/${tenant_id}?success=Password+reset+successfully`);
}
