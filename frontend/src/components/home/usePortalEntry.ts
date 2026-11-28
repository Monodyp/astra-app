import { useAuth } from '../../context/AuthContext.js';

export function usePortalEntry() {
  const { user, loading } = useAuth();
  return {
    authenticated: !!user,
    href: user || loading ? '/home' : '/login',
    label: loading ? 'Portal' : user ? 'Go to App' : 'Log In',
  };
}
