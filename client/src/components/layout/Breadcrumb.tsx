'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import styles from './Breadcrumb.module.css';

export const Breadcrumb: React.FC = () => {
  const pathname = usePathname() || '/';
  const { t } = useLanguage();

  const pathnames = pathname.split('/').filter((x) => x);

  const getBreadcrumbLabel = (segment: string) => {
    if (segment === 'dashboard') return t('dashboard');
    if (segment === 'courses') return t('courses');
    if (segment === 'groups') return t('groups');
    if (segment === 'teachers') return t('teachers');
    if (segment === 'students') return t('students');
    if (segment === 'attendance') return t('attendance');
    if (segment === 'take') return t('takeAttendance');
    if (segment === 'rooms') return t('rooms');
    if (segment === 'employees') return t('employees');
    if (segment === 'finance') return t('finance');
    if (segment === 'expenses') return t('financeExpenses');
    if (segment === 'payments') return t('financePayments');
    if (segment === 'profile') return t('profile');
    if (segment.length > 20) return `${segment.substring(0, 8)}...`;
    return segment;
  };

  return (
    <nav className={styles.breadcrumb}>
      <Link href="/dashboard" className={styles.item}>
        <Home size={16} />
      </Link>
      {pathnames.length === 0 || (pathnames.length === 1 && pathnames[0] === 'dashboard') ? (
        <>
          <ChevronRight size={14} className={styles.separator} />
          <span className={styles.active}>{t('dashboard')}</span>
        </>
      ) : (
        pathnames.map((name, index) => {
          const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;

          return (
            <React.Fragment key={name}>
              <ChevronRight size={14} className={styles.separator} />
              {isLast ? (
                <span className={styles.active}>{getBreadcrumbLabel(name)}</span>
              ) : (
                <Link href={routeTo} className={styles.item}>
                  {getBreadcrumbLabel(name)}
                </Link>
              )}
            </React.Fragment>
          );
        })
      )}
    </nav>
  );
};
