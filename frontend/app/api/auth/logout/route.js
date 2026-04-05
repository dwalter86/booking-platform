import { cookies } from 'next/headers';

export async function POST(request) {
  cookies().delete('booking_admin_token');
  return Response.redirect(new URL('/login', request.url), 302);
}
