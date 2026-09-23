import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first load, restore the session from localStorage rather than
  // forcing a re-login on every page refresh. We trust the stored user
  // object for the UI; every real request is still re-authorized by
  // the backend via the JWT, so a tampered localStorage value can't
  // grant access to anything the token doesn't actually allow.
  useEffect(() => {
    const token = localStorage.getItem('leave_mis_token');
    const storedUser = localStorage.getItem('leave_mis_user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('leave_mis_token');
        localStorage.removeItem('leave_mis_user');
      }
    }
    setIsLoading(false);
  }, []);

  async function login(email, password) {
    const { token, user: loggedInUser } = await api.post(
      '/auth/login',
      { email, password },
      { auth: false }
    );
    localStorage.setItem('leave_mis_token', token);
    localStorage.setItem('leave_mis_user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function register(payload) {
    // Registration does not log the user in automatically - it mirrors
    // the backend, which returns the created user but no token.
    return api.post('/auth/register', payload, { auth: false });
  }

  function logout() {
    localStorage.removeItem('leave_mis_token');
    localStorage.removeItem('leave_mis_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
