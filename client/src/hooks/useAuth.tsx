'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, RegisterCenterDto } from '../types';
import { authApi } from '../api/auth.api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, refreshToken: string, user: User) => void;
  loginWithCredentials: (email: string, pass: string) => Promise<void>;
  registerCenter: (dto: RegisterCenterDto) => Promise<void>;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    setToken(null);
    setUser(null);
  }, []);

  const refetchUser = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setIsLoading(false);
      return;
    }
    setToken(storedToken);
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {}
    }

    try {
      const data = await authApi.getMe();
      const fetchedUser: User = {
        id: data.id,
        fullName: data.fullName,
        email: data.email,
        role: data.role,
        centerId: data.centerId,
        centerName: data.center?.name,
      };
      setUser(fetchedUser);
      localStorage.setItem('user', JSON.stringify(fetchedUser));
    } catch (e) {
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refetchUser();
  }, [refetchUser]);

  const login = (newToken: string, newRefreshToken: string, newUser: User) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    }
    setToken(newToken);
    setUser(newUser);
  };

  const loginWithCredentials = async (email: string, pass: string) => {
    const res = await authApi.login({ email, password: pass });
    login(res.tokens.accessToken, res.tokens.refreshToken, res.user);
  };

  const registerCenter = async (dto: RegisterCenterDto) => {
    const res = await authApi.register(dto);
    login(res.tokens.accessToken, res.tokens.refreshToken, res.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        loginWithCredentials,
        registerCenter,
        logout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
