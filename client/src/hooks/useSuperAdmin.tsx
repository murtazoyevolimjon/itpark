'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { superadminApi } from '../api/superadmin.api';

interface SuperAdminUser {
  role: 'SUPERADMIN';
  fullName: string;
  login: string;
}

interface SuperAdminContextType {
  user: SuperAdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (loginText: string, passwordText: string) => Promise<void>;
  logout: () => void;
  refetch: () => Promise<void>;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

export const SuperAdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('superadmin_token');
      localStorage.removeItem('superadmin_user');
      window.location.href = '/superadmin/login';
    }
    setToken(null);
    setUser(null);
  }, []);

  const refetch = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const storedToken = localStorage.getItem('superadmin_token');
    if (!storedToken) {
      setIsLoading(false);
      return;
    }
    setToken(storedToken);
    const savedUser = localStorage.getItem('superadmin_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {}
    }

    try {
      const data = await superadminApi.getMe();
      setUser(data.user);
      localStorage.setItem('superadmin_user', JSON.stringify(data.user));
    } catch (e) {
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const login = async (loginText: string, passwordText: string) => {
    const res = await superadminApi.login({ login: loginText, password: passwordText });
    if (typeof window !== 'undefined') {
      localStorage.setItem('superadmin_token', res.token);
      localStorage.setItem('superadmin_user', JSON.stringify(res.user));
    }
    setToken(res.token);
    setUser(res.user);
  };

  return (
    <SuperAdminContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        refetch,
      }}
    >
      {children}
    </SuperAdminContext.Provider>
  );
};

export const useSuperAdmin = () => {
  const context = useContext(SuperAdminContext);
  if (!context) {
    throw new Error('useSuperAdmin must be used within a SuperAdminProvider');
  }
  return context;
};
