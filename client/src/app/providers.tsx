'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../hooks/useAuth';
import { ThemeProvider } from '../hooks/useTheme';
import { LanguageProvider } from '../hooks/useLanguage';
import { ToastProvider } from '../components/ui/Toast/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Bir nechta admin bir vaqtda ishlaydi: ma'lumot tez eskirishi va oynaga qaytganda yangilanishi kerak
            staleTime: 30 * 1000,
            gcTime: 15 * 60 * 1000, // 15 daqiqa keshda saqlanadi
            refetchOnMount: true, // Keshdagi ma'lumot darhol ko'rinadi, eskirgan bo'lsa fonda yangilanadi
            refetchOnWindowFocus: true,
            refetchOnReconnect: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
