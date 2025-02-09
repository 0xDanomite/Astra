'use client';

import { useAuth } from '@/lib/hooks/useAuth';

export function Login() {
  const { login, isAuthenticated, isLoading } = useAuth();

  const handleClick = async () => {
    if (!isAuthenticated) {
      login();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <button
        onClick={handleClick}
        className={`rounded-lg px-4 py-2 text-white transition-all duration-200 ${
          isAuthenticated
            ? 'bg-stellar-blue hover:bg-stellar-blue/80 cursor-default'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
        disabled={isLoading}
      >
        {isLoading ? 'Loading...' : isAuthenticated ? 'Ready to Launch' : 'Connect Wallet'}
      </button>
    </div>
  );
}
