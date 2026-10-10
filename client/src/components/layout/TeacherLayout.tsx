'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutGrid,
  GraduationCap,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  User as UserIcon,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import styles from './TeacherLayout.module.css';

interface TeacherLayoutProps {
  children: React.ReactNode;
}

export const TeacherLayout: React.FC<TeacherLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const pathname = usePathname() || '/teacher';
  const router = useRouter();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentLang, setCurrentLang] = useState<string>("O'zbekcha");
  const [showLangMenu, setShowLangMenu] = useState(false);

  const centerName = user?.centerName || "Najot Ta'lim";
  const firstName = user?.fullName
    ? user.fullName.split(' ')[0].toLowerCase()
    : 'ahmad';

  const isProfileActive = pathname.startsWith('/teacher/profile');
  const isGroupsActive =
    pathname.startsWith('/teacher/groups') ||
    pathname === '/teacher' ||
    (!isProfileActive && pathname.startsWith('/teacher'));

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const navItems = [
    {
      label: 'Profil',
      href: '/teacher/profile',
      icon: LayoutGrid,
      number: '01',
      isActive: isProfileActive,
    },
    {
      label: 'Guruhlar',
      href: '/teacher/groups',
      icon: GraduationCap,
      number: '02',
      isActive: isGroupsActive,
    },
  ];

  return (
    <div className={styles.container}>
      {/* Ambient Glow Orbs */}
      <div className={styles.orbLeft} />
      <div className={styles.orbRight} />

      {/* Mobile Overlay */}
      <div
        className={`${styles.mobileOverlay} ${isMobileOpen ? styles.mobileOverlayOpen : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />

      <div className={styles.shell}>
        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${isMobileOpen ? styles.sidebarOpen : ''}`}>
          <div>
            <div className={styles.sidebarHeader}>
              <div className={styles.panelBadge}>
                Teacher panel
              </div>
              <h1 className={styles.centerBrandTitle}>
                {centerName}
              </h1>
            </div>

            <nav className={styles.navMenu}>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`${styles.navItem} ${item.isActive ? styles.navItemActive : ''}`}
                  >
                    <span className={styles.navItemLabel}>
                      <Icon size={18} strokeWidth={2.2} />
                      {item.label}
                    </span>
                    <span className={styles.navItemNumber}>{item.number}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className={styles.sidebarFooter}>
            <div className={styles.planCard}>
              Bugungi reja: dars mavzularini yakunlab chiqing.
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className={styles.mainCol}>
          {/* Header */}
          <header className={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                className={styles.mobileMenuBtn}
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                aria-label="Toggle navigation"
              >
                {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <h2 className={styles.greetingText}>
                Salom, {firstName}!
              </h2>
            </div>

            <div className={styles.headerActions}>
              <button className={styles.iconBtn} title="Bildirishnomalar">
                <Bell size={18} />
              </button>

              <button
                className={styles.iconBtn}
                title="Mavzu"
                onClick={() => setIsDarkMode(!isDarkMode)}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <div style={{ position: 'relative' }}>
                <button
                  className={styles.langBtn}
                  onClick={() => setShowLangMenu(!showLangMenu)}
                >
                  <span>{currentLang}</span>
                  <ChevronDown size={15} />
                </button>
                {showLangMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      background: '#ffffff',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      border: '1px solid #e2e8f0',
                      padding: '6px',
                      zIndex: 50,
                      minWidth: '130px',
                    }}
                  >
                    {["O'zbekcha", 'Русский', 'English'].map((l) => (
                      <button
                        key={l}
                        onClick={() => {
                          setCurrentLang(l);
                          setShowLangMenu(false);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          border: 'none',
                          background: currentLang === l ? '#f1f5f9' : 'transparent',
                          color: '#0f172a',
                          borderRadius: '8px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.userChip}>
                <UserIcon size={16} strokeWidth={2.2} />
                <span>{firstName}</span>
              </div>

              <button
                className={styles.logoutBtn}
                title="Chiqish"
                onClick={handleLogout}
              >
                <LogOut size={18} />
              </button>
            </div>
          </header>

          {/* Page Body */}
          <main className={styles.pageBody}>{children}</main>
        </div>
      </div>
    </div>
  );
};
