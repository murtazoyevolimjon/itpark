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

  return (
    <>
      <div
        className={`${styles.mobileOverlay} ${isOpen ? styles.mobileOverlayOpen : ''}`}
        onClick={onClose}
      />
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logoArea}>
          <img
            src="/itpark-logo.png"
            alt="IT Park"
            className={styles.logoImg}
          />
          <div>
            <div className={styles.logoTitle}>IT PARK</div>
          </div>
        </div>

        <div className={styles.navContainer}>
          {/* Main Section */}
          <div className={styles.sectionGroup}>
            <div className={styles.sectionTitle}>{t('mainSection')}</div>
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

            {/* Profile */}
            <Link
              href="/profile"
              className={`${styles.navItem} ${pathname === '/profile' ? styles.navItemActive : ''}`}
              onClick={onClose}
            >
              <div className={styles.navItemLeft}>
                <User size={18} />
                <span>{t('profile')}</span>
              </div>
            </Link>

            {/* Chiqish (Log out) */}
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className={styles.logoutBtn}
            >
              <LogOut size={18} />
              <span>{t('logout')}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
