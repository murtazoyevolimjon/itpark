'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { useAuth } from '../../hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { Skeleton } from '../ui/Skeleton/Skeleton';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '/';

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'TEACHER') {
        // Teacher is strictly restricted to /teacher and /profile
        if (!pathname.startsWith('/teacher') && pathname !== '/profile') {
          router.replace('/teacher');
        }
      }
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Skeleton width="120px" height="40px" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.layout}>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className={styles.mainWrapper}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className={styles.content}>
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
};
