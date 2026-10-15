'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { useAuth } from '../../hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { Skeleton } from '../ui/Skeleton/Skeleton';
import { FloatingAIWidget } from '../ai/FloatingAIWidget';
import { TeacherLayout } from './TeacherLayout';
import { StudentLayout } from './StudentLayout';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '/';

  // Specific check for teacher routes:
  // Must be EXACTLY '/teacher' or start with '/teacher/' (e.g. /teacher/groups).
  // Must NOT match '/teachers' (which is the admin page for managing teachers)!
  const isTeacherRoute = pathname === '/teacher' || pathname.startsWith('/teacher/');

  // Specific check for student routes:
  const isStudentRoute = pathname === '/student' || pathname.startsWith('/student/');

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!isLoading && isAuthenticated && user) {
      const isAiRoute = pathname === '/ai-assistant' || pathname === '/dashboard/ai-assistant';
      if (user.role === 'TEACHER') {
        // Teacher is strictly restricted to /teacher routes, /profile, and /ai-assistant
        if (!isTeacherRoute && pathname !== '/profile' && !isAiRoute) {
          router.replace('/teacher');
        }
      } else if (user.role === 'STUDENT') {
        // Student is restricted to /student routes, /profile, and /ai-assistant
        if (!isStudentRoute && pathname !== '/profile' && !isAiRoute) {
          router.replace('/student');
        }
      }
    }
  }, [isLoading, isAuthenticated, user, pathname, router, isTeacherRoute, isStudentRoute]);

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

  if (user?.role === 'TEACHER' || isTeacherRoute) {
    return <TeacherLayout>{children}</TeacherLayout>;
  }

  if (user?.role === 'STUDENT' || isStudentRoute) {
    return <StudentLayout>{children}</StudentLayout>;
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
      <FloatingAIWidget />
    </div>
  );
};
