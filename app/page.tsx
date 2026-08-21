import { redirect } from 'next/navigation';
import { auth } from '@/auth';

// Root route: send signed-in users to the dashboard, everyone else to login.
export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect('/dashboard');
  }
  redirect('/login');
}
