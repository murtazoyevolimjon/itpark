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
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import styles from './Sidebar.module.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname() || '/';

  const [isFinanceOpen, setIsFinanceOpen] = useState(
    pathname.startsWith('/finance'),
  );

  const mainNavItems = [
    { path: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { path: '/courses', label: t('courses'), icon: BookOpen },
    { path: '/groups', label: t('groups'), icon: Users },
    { path: '/teachers', label: t('teachers'), icon: GraduationCap },
    { path: '/students', label: t('students'), icon: UserCheck },
    { path: '/attendance', label: t('attendance'), icon: CalendarCheck },
    { path: '/rooms', label: t('rooms'), icon: DoorOpen },
    { path: '/employees', label: t('employees'), icon: Briefcase },
  ];

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
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logoArea}>
          {isItPark ? (
            <img
              src="/itpark-logo.png"
              alt="IT Park"
              className={styles.logoImg}
            />
          ) : (
            <div
              style={{
                width: '38px',
                height: '38px',
                minWidth: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              }}
            >
              <GraduationCap size={22} />
            </div>
          )}
          <div style={{ overflow: 'hidden' }}>
            <div className={styles.logoTitle} title={user?.centerName || 'IT PARK'}>
              {user?.centerName || 'IT PARK'}
            </div>
            {typeof window !== 'undefined' && localStorage.getItem('superadmin_token') && (
              <Link
                href="/superadmin"
                style={{
                  fontSize: '11px',
                  color: '#6366f1',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '2px',
                }}
              >
                ⚡ Dasturchi paneli
              </Link>
            )}
          </div>
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
                >
                  <div className={styles.navItemLeft}>
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Personal & Finance Section */}
          <div className={styles.sectionGroup}>
            <div className={styles.sectionTitle}>{t('personalSection')}</div>

            {/* Finance Accordion */}
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
          </div>
        </div>
      </aside>
    </>
  );
};

