import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { config } from '../../../../lib/config';

export async function POST(request) {
  const token = cookies().get('superadmin_token')?.value;
  if (!token) redirect('/superadmin/login');

  const formData = await request.formData();

  const body = {
    name:            formData.get('name'),
    display_name:    formData.get('display_name') || undefined,
    subdomain:       formData.get('subdomain'),
    contact_email:   formData.get('contact_email') || undefined,
    timezone:        formData.get('timezone') || 'Europe/London',
    plan_code:       formData.get('plan_code') || 'trial',
    trial_days:      Number(formData.get('trial_days') || 14),
    admin_full_name: formData.get('admin_full_name'),
    admin_email:     formData.get('admin_email'),
    admin_password:  formData.get('admin_password'),
  };

  const response = await fetch(`${config.apiBaseUrl}/api/superadmin/tenants`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body:  JSON.stringify(body),
    cache: 'no-store',
  });

  const result = await response.json();

  if (!response.ok) {
    redirect(`/superadmin/tenants/new?error=${encodeURIComponent(result.error || 'Failed to create tenant')}`);
  }

  redirect(`/superadmin/tenants/${result.tenant.id}?success=${encodeURIComponent(
    `Tenant created. Login: ${result.handover.login_url} · Email: ${result.handover.email} · Password: ${result.handover.password}`
  )}`);
}
