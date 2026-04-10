import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function POST() {
  cookies().delete('superadmin_token');
  redirect('/superadmin/login');
}
