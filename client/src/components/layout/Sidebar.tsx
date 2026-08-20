import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import styles from './Sidebar.module.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const [isFinanceOpen, setIsFinanceOpen] = useState(
    location.pathname.startsWith('/finance'),
  );

  const mainNavItems = [
    { path: '/', label: t('dashboard'), icon: LayoutDashboard },
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
          <div className={styles.logoIcon}>M</div>
          <div>
            <div className={styles.logoTitle}>{t('appName')}</div>
            <div className={styles.logoCenter}>{user?.centerName || 'IT-Park Academy'}</div>
          </div>
        </div>

        <div className={styles.navContainer}>
          {/* Main Section */}
          <div className={styles.sectionGroup}>
            <div className={styles.sectionTitle}>{t('mainSection')}</div>
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                  }
                  onClick={onClose}
                >
                  <div className={styles.navItemLeft}>
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </div>
                </NavLink>
              );
            })}
          </div>

          {/* Personal & Finance Section */}
          <div className={styles.sectionGroup}>
            <div className={styles.sectionTitle}>{t('personalSection')}</div>

            {/* Finance Accordion */}
            <div
              className={`${styles.navItem} ${
                location.pathname.startsWith('/finance') ? styles.navItemActive : ''
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
                <NavLink
                  to="/finance"
                  end
                  className={({ isActive }) =>
                    `${styles.subNavItem} ${isActive ? styles.subNavItemActive : ''}`
                  }
                  onClick={onClose}
                >
                  • {t('financeSummary')}
                </NavLink>
                <NavLink
                  to="/finance/expenses"
                  className={({ isActive }) =>
                    `${styles.subNavItem} ${isActive ? styles.subNavItemActive : ''}`
                  }
                  onClick={onClose}
                >
                  • {t('financeExpenses')}
                </NavLink>
                <NavLink
                  to="/finance/payments"
                  className={({ isActive }) =>
                    `${styles.subNavItem} ${isActive ? styles.subNavItemActive : ''}`
                  }
                  onClick={onClose}
                >
                  • {t('financePayments')}
                </NavLink>
              </div>
            )}

            {/* Profile */}
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
              onClick={onClose}
            >
              <div className={styles.navItemLeft}>
                <User size={18} />
                <span>{t('profile')}</span>
              </div>
            </NavLink>
          </div>
        </div>
      </aside>
    </>
  );
};
