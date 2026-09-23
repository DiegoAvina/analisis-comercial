import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loginRequest, logoutRequest, meRequest, registerRequest } from '../api/auth';
import { deleteAccount as deleteAccountRequest } from '../api/profile';
import { clearStoredToken, getStoredToken, setAuthToken, setStoredToken, setUnauthorizedHandler } from '../api/client';
import type { User } from '../api/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  deleteAccount: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = getStoredToken();
      if (token) {
        setAuthToken(token);
        try {
          const currentUser = await meRequest();
          setUser(currentUser);
        } catch {
          clearStoredToken();
          setAuthToken(null);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: loggedUser } = await loginRequest({ email, password });
    setStoredToken(token);
    setAuthToken(token);
    setUser(loggedUser);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { token, user: newUser } = await registerRequest({ name, email, password });
    setStoredToken(token);
    setAuthToken(token);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // token vencido o red caída: igual limpiamos la sesión local
    }
    clearStoredToken();
    setAuthToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    await deleteAccountRequest(password);
    clearStoredToken();
    setAuthToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearStoredToken();
      setAuthToken(null);
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, isAuthenticated: !!user, login, register, logout, updateUser, deleteAccount }),
    [user, isLoading, login, register, logout, updateUser, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
