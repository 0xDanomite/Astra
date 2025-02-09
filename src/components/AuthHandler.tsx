'use client';

import { useLogin } from '@privy-io/react-auth';

export function AuthHandler() {
  const { login } = useLogin({
    onComplete: ({ user, isNewUser }) => {
      // No redirect, just complete the login
      console.log('Auth completed', { user, isNewUser });
    },
    onError: (error) => {
      console.error('Auth error:', error);
    },
  });

  return null;
}
