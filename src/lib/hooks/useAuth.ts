import { usePrivy } from '@privy-io/react-auth';

export function useAuth() {
  const {
    ready,
    authenticated,
    user,
    login,
    logout,
  } = usePrivy();

  return {
    isLoading: !ready,
    isAuthenticated: authenticated,
    userId: user?.id,
    login,
    logout,
  };
}
