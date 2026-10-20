'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  UserCheck,
  CalendarCheck,
  DoorOpen,
  Briefcase,
  DollarSign,
  User,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '../../api/groups.api';
import { teachersApi } from '../../api/teachers.api';
import { studentsApi } from '../../api/students.api';
import { coursesApi } from '../../api/courses.api';
import { roomsApi } from '../../api/rooms.api';
import { employeesApi } from '../../api/employees.api';
import { dashboardApi } from '../../api/dashboard.api';
import styles from './Sidebar.module.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname() || '/';
  const queryClient = useQueryClient();

  const handlePrefetch = (path: string) => {
    try {
      if (path === '/dashboard') {
        queryClient.prefetchQuery({ queryKey: ['dashboardStats'], queryFn: dashboardApi.getStats });
      } else if (path === '/courses') {
        queryClient.prefetchQuery({
          queryKey: ['courses', 1, 20, '', 'createdAt', 'desc'],
          queryFn: () => coursesApi.getAll({ page: 1, limit: 20, search: '', sortBy: 'createdAt', order: 'desc' }),
        });
      } else if (path === '/groups') {
        queryClient.prefetchQuery({
          queryKey: ['groups', 1, 20, '', 'createdAt', 'desc'],
          queryFn: () => groupsApi.getAll({ page: 1, limit: 20, search: '', sortBy: 'createdAt', order: 'desc' }),
        });
      } else if (path === '/teachers') {
        queryClient.prefetchQuery({
          queryKey: ['teachers', 1, 20, '', 'createdAt', 'desc'],
          queryFn: () => teachersApi.getAll({ page: 1, limit: 20, search: '', sortBy: 'createdAt', order: 'desc' }),
        });
      } else if (path === '/students') {
        queryClient.prefetchQuery({
          queryKey: ['students', 1, 20, '', 'createdAt', 'desc'],
          queryFn: () => studentsApi.getAll({ page: 1, limit: 20, search: '', sortBy: 'createdAt', order: 'desc' }),
        });
      } else if (path === '/rooms') {
        queryClient.prefetchQuery({
          queryKey: ['rooms', 1, 20, '', 'createdAt', 'desc'],
          queryFn: () => roomsApi.getAll({ page: 1, limit: 20, search: '', sortBy: 'createdAt', order: 'desc' }),
        });
      } else if (path === '/employees') {
        queryClient.prefetchQuery({
          queryKey: ['employees', 1, 20, '', 'createdAt', 'desc'],
          queryFn: () => employeesApi.getAll({ page: 1, limit: 20, search: '', sortBy: 'createdAt', order: 'desc' }),
        });
      }
    } catch {}
  };

  const [isFinanceOpen, setIsFinanceOpen] = useState(
    pathname.startsWith('/finance'),
  );

  const isTeacher = user?.role === 'TEACHER';

  const teacherNavItems = [
    { path: '/teacher', label: 'Mening guruhlarim', icon: Users },
    { path: '/teacher/attendance', label: 'Davomat olish', icon: CalendarCheck },
    { path: '/ai-assistant', label: t('aiAssistant'), icon: Sparkles },
  ];

  const adminNavItems = [
    { path: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { path: '/courses', label: t('courses'), icon: BookOpen },
    { path: '/groups', label: t('groups'), icon: Users },
    { path: '/teachers', label: t('teachers'), icon: GraduationCap },
    { path: '/students', label: t('students'), icon: UserCheck },
    { path: '/attendance', label: t('attendance'), icon: CalendarCheck },
    { path: '/rooms', label: t('rooms'), icon: DoorOpen },
    { path: '/employees', label: t('employees'), icon: Briefcase },
    { path: '/ai-assistant', label: t('aiAssistant'), icon: Sparkles },
  ];

  const mainNavItems = isTeacher ? teacherNavItems : adminNavItems;

  const isItPark = Boolean(
    !user?.centerName ||
    user.centerName.trim().toUpperCase() === 'IT PARK' ||
    user.centerName.trim().toUpperCase() === 'IT-PARK' ||
    user.centerName.toLowerCase().includes('it-park') ||
    user.centerName.toLowerCase().includes('itpark') ||
    user.centerId === 'f05c31e9-58dd-481e-8f4f-eb2979982cb1' ||
    user.email === 'ITPARK_itpark'
  );

  return (
    <>
      <div
        className={`${styles.mobileOverlay} ${isOpen ? styles.mobileOverlayOpen : ''}`}
        onClick={onClose}
      />
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
        <div className={styles.logoArea}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
            {isItPark ? (
              <img
                src="/crm-logo.png"
                alt="IT Park CRM"
                className={styles.logoImg}
                style={{ borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  minWidth: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                }}
              >
                <GraduationCap size={20} />
              </div>
            )}
            {!isCollapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div className={styles.logoTitle} title={user?.centerName || 'IT PARK'}>
                  {user?.centerName || 'IT PARK'}
                </div>
              </div>
            )}
          </div>
          {onToggleCollapse && !isCollapsed && (
            <button
              type="button"
              className={styles.collapseBtn}
              onClick={onToggleCollapse}
              title="Sidebar'ni yig'ish"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        <div className={styles.navContainer}>
          {/* Main Section */}
          <div className={styles.sectionGroup}>
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === '/dashboard' 
                ? (pathname === '/' || pathname === '/dashboard')
                : pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                  onClick={onClose}
                  onMouseEnter={() => handlePrefetch(item.path)}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className={styles.navItemLeft}>
                    <Icon size={19} color={item.path === '/ai-assistant' ? '#6366f1' : undefined} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>
                  {!isCollapsed && item.path === '/ai-assistant' && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        color: '#ffffff',
                        letterSpacing: '0.5px',
                        boxShadow: '0 2px 6px rgba(99, 102, 241, 0.4)',
                      }}
                    >
                      AI
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Personal & Finance Section (Admin/Owner only) */}
          {!isTeacher && (
            <div className={styles.sectionGroup}>
              {!isCollapsed && <div className={styles.sectionTitle}>{t('personalSection')}</div>}

              {/* Finance Accordion */}
              {isCollapsed ? (
                <Link
                  href="/finance"
                  className={`${styles.navItem} ${pathname.startsWith('/finance') ? styles.navItemActive : ''}`}
                  title={t('finance')}
                  onClick={onClose}
                >
                  <div className={styles.navItemLeft}>
                    <DollarSign size={19} />
                  </div>
                </Link>
              ) : (
                <>
                  <div
                    className={`${styles.navItem} ${
                      pathname.startsWith('/finance') ? styles.navItemActive : ''
                    }`}
                    onClick={() => setIsFinanceOpen(!isFinanceOpen)}
                  >
                    <div className={styles.navItemLeft}>
                      <DollarSign size={18} />
                      <span>{t('finance')}</span>
                    </div>
                    {isFinanceOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>

                  {isFinanceOpen && (
                    <div className={styles.dropdownSubMenu}>
                      <Link
                        href="/finance"
                        className={`${styles.subNavItem} ${pathname === '/finance' ? styles.subNavItemActive : ''}`}
                        onClick={onClose}
                      >
                        • {t('financeSummary')}
                      </Link>
                      <Link
                        href="/finance/expenses"
                        className={`${styles.subNavItem} ${pathname === '/finance/expenses' ? styles.subNavItemActive : ''}`}
                        onClick={onClose}
                      >
                        • {t('financeExpenses')}
                      </Link>
                      <Link
                        href="/finance/payments"
                        className={`${styles.subNavItem} ${pathname === '/finance/payments' ? styles.subNavItemActive : ''}`}
                        onClick={onClose}
                      >
                        • {t('financePayments')}
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

