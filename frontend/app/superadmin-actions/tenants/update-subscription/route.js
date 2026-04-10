import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { config } from '../../../../lib/config';

export async function POST(request) {
  const token = cookies().get('superadmin_token')?.value;
  if (!token) redirect('/superadmin/login');

  const formData         = await request.formData();
  const id               = formData.get('id');
  const plan_code        = formData.get('plan_code')        || undefined;
  const extend_trial_days = formData.get('extend_trial_days') || undefined;
  const status           = formData.get('status')           || undefined;

  const body = {};
  if (plan_code && plan_code !== '') body.plan_code = plan_code;
  if (extend_trial_days)             body.extend_trial_days = Number(extend_trial_days);
  if (status && status !== '')       body.status = status;

  if (Object.keys(body).length === 0) {
    redirect(`/superadmin/tenants/${id}?error=No+changes+submitted`);
  }

  const response = await fetch(`${config.apiBaseUrl}/api/superadmin/tenants/${id}/subscription`, {
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
    redirect(`/superadmin/tenants/${id}?error=${encodeURIComponent(result.error || 'Failed to update subscription')}`);
  }

  redirect(`/superadmin/tenants/${id}?success=Subscription+updated+successfully`);
}
