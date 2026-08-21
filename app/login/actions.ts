'use server';

import { AuthError, CredentialsSignin } from 'next-auth';
import { signIn } from '@/auth';

const DEACTIVATED_MESSAGE =
  'Your account has been deactivated. Please contact your administrator.';

// Server action invoked by the login form. On success, signIn throws a redirect
// (to /dashboard) that must propagate; on bad credentials it throws AuthError,
// which we turn into a friendly message returned to the form.
export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/dashboard',
    });
  } catch (error) {
    // Deactivated account (correct credentials, but active = false).
    if (error instanceof CredentialsSignin && error.code === 'deactivated') {
      return DEACTIVATED_MESSAGE;
    }
    if (error instanceof AuthError) {
      return 'Invalid email or password.';
    }
    // Re-throw the redirect (and anything else) so navigation still happens.
    throw error;
  }
}
