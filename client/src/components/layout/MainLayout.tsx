'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { useAuth } from '../../hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { Skeleton } from '../ui/Skeleton/Skeleton';
import { FloatingAIWidget } from '../ai/FloatingAIWidget';
import { TeacherLayout } from './TeacherLayout';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '/';

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('crm_sidebar_collapsed');
      if (saved !== null) {
        setIsSidebarCollapsed(saved === 'true');
      }
    } catch {}
  }, []);

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(!isSidebarOpen);
    } else {
      setIsSidebarCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('crm_sidebar_collapsed', String(next));
        } catch {}
        return next;
      });
    }
  };

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('crm_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Specific check for teacher routes:
  // Must be EXACTLY '/teacher' or start with '/teacher/' (e.g. /teacher/groups).
  // Must NOT match '/teachers' (which is the admin page for managing teachers)!
  const isTeacherRoute = pathname === '/teacher' || pathname.startsWith('/teacher/');

  const isAiRoute = pathname === '/ai-assistant' || pathname === '/dashboard/ai-assistant';

  // The developer (superadmin) has no center session but may open the AI analysis page
  const [hasSuperAdminSession, setHasSuperAdminSession] = useState(false);
  React.useEffect(() => {
    try {
      setHasSuperAdminSession(!!localStorage.getItem('superadmin_token'));
    } catch {}
  }, [pathname]);
  const superAdminOnAiRoute = !isAuthenticated && hasSuperAdminSession && isAiRoute;

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Read storage directly: the state above is not updated yet on the first render
      let superAdminToken = false;
      try {
        superAdminToken = !!localStorage.getItem('superadmin_token');
      } catch {}
      if (!(superAdminToken && isAiRoute)) {
        router.replace('/login');
      }
      return;
    }

    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'TEACHER') {
        // Teacher is strictly restricted to /teacher routes, /profile, and /ai-assistant
        if (!isTeacherRoute && pathname !== '/profile' && !isAiRoute) {
          router.replace('/teacher');
        }
      } else if (user.role === 'STUDENT') {
        // The student portal no longer exists: students only receive Telegram notifications
        logout();
      }
    }
  }, [isLoading, isAuthenticated, user, pathname, router, isTeacherRoute, isAiRoute, logout]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Skeleton width="120px" height="40px" />
      </div>
    );
  }

  if (superAdminOnAiRoute) {
    return (
      <div className={styles.layout} style={{ flexDirection: 'column' }}>
        <div style={{ padding: '12px 16px' }}>
          <Link href="/superadmin" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '14px' }}>
            ← Dasturchi paneliga qaytish
          </Link>
        </div>
        <main className={styles.content}>{children}</main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user?.role === 'TEACHER' || isTeacherRoute) {
    return <TeacherLayout>{children}</TeacherLayout>;
  }

  return (
    <div className={styles.layout}>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      <div className={`${styles.mainWrapper} ${isSidebarCollapsed ? styles.mainWrapperCollapsed : ''}`}>
        <Header onToggleSidebar={handleToggleSidebar} />
        <main className={styles.content}>
          {children}
        </main>
        <Footer />
      </div>
      <FloatingAIWidget />
    </div>
  );
};
