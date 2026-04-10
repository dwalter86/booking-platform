import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { config } from '../../../lib/config';

export async function POST(request) {
  const formData = await request.formData();
  const email    = formData.get('email');
  const password = formData.get('password');

  let result;
  let errorMessage;

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/auth/superadmin-login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
      cache:   'no-store',
    });

    result = await response.json();

    if (!response.ok) {
      errorMessage = result.error || 'Login failed';
    }
  } catch {
    errorMessage = 'Unable to connect to server';
  }

  if (errorMessage) {
    redirect(`/superadmin/login?error=${encodeURIComponent(errorMessage)}`);
  }

  const cookieStore = cookies();
  cookieStore.set('superadmin_token', result.token, {
    httpOnly: true,
    secure:   false,
    sameSite: 'lax',
    path:     '/',
    maxAge:   60 * 60 * 12,
  });

  redirect('/superadmin');
}
