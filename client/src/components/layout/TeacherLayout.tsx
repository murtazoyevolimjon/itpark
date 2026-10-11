'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage, Language } from '../../hooks/useLanguage';
import {
  LayoutGrid,
  GraduationCap,
  CalendarCheck,
  BookOpen,
  Video,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Check,
} from 'lucide-react';
import styles from './TeacherLayout.module.css';

interface TeacherLayoutProps {
  children: React.ReactNode;
}

export const TeacherLayout: React.FC<TeacherLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const pathname = usePathname() || '/teacher';
  const router = useRouter();

  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  const { lang, setLang, dict } = useLanguage();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const centerName = user?.centerName || 'Toyloq IT Park';
  const firstName = user?.fullName
    ? user.fullName.split(' ')[0]
    : 'Olimjon';

  const isProfileActive = pathname.startsWith('/teacher/profile');
  const isAttendanceActive = pathname.startsWith('/teacher/attendance');
  const isHomeworkActive = pathname.startsWith('/teacher/homework');
  const isVideosActive = pathname.startsWith('/teacher/videos');
  const isGroupsActive =
    (pathname.startsWith('/teacher/groups') || pathname === '/teacher') &&
    !isAttendanceActive &&
    !isHomeworkActive &&
    !isVideosActive &&
    !isProfileActive;

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
      label: dict.teacher?.profile || 'Profil',
      href: '/teacher/profile',
      icon: LayoutGrid,
      number: '01',
      isActive: isProfileActive,
    },
    {
      label: dict.teacher?.groups || 'Guruhlar',
      href: '/teacher/groups',
      icon: GraduationCap,
      number: '02',
      isActive: isGroupsActive,
    },
    {
      label: dict.teacher?.attendance || 'Akademik davomat',
      href: '/teacher/attendance',
      icon: CalendarCheck,
      number: '03',
      isActive: isAttendanceActive,
    },
    {
      label: dict.teacher?.homework || 'Uyga vazifa',
      href: '/teacher/homework',
      icon: BookOpen,
      number: '04',
      isActive: isHomeworkActive,
    },
    {
      label: dict.teacher?.videos || 'Videolar',
      href: '/teacher/videos',
      icon: Video,
      number: '05',
      isActive: isVideosActive,
    },
  ];

  const langOptions: { id: Language; label: string; short: string; flag: string }[] = [
    { id: 'uz', label: "O'zbekcha", short: 'Uz', flag: '🇺🇿' },
    { id: 'en', label: 'English', short: 'Eng', flag: '🇬🇧' },
    { id: 'ru', label: 'Русский', short: 'Rus', flag: '🇷🇺' },
  ];

  const currentOption = langOptions.find((o) => o.id === lang) || langOptions[0];

  return (
    <div className={styles.container} data-theme={theme}>
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
                {dict.teacher?.panelBadge || 'Teacher panel'}
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
              {dict.teacher?.todayPlan || 'Bugungi reja: dars mavzularini yakunlab chiqing.'}
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
                {dict.teacher?.greeting || 'Salom'}, {firstName}!
              </h2>
            </div>

            <div className={styles.headerActions}>
              <button
                className={styles.iconBtn}
                title={dict.teacher?.notifications || 'Bildirishnomalar'}
                aria-label="Bildirishnomalar"
              >
                <Bell size={18} />
              </button>

              <button
                className={styles.iconBtn}
                title={dict.teacher?.theme || 'Mavzu (Tun / Kun)'}
                onClick={toggleTheme}
                aria-label="Toggle dark/light mode"
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Language Selector (Uz / Eng / Rus) */}
              <div style={{ position: 'relative' }}>
                <button
                  className={styles.langBtn}
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  aria-label="Tilni almashtirish"
                >
                  <span className={styles.langFlag}>{currentOption.flag}</span>
                  <span className={styles.langShort}>{currentOption.short}</span>
                  <ChevronDown size={14} />
                </button>
                {showLangMenu && (
                  <div className={styles.langDropdown}>
                    {langOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setLang(opt.id);
                          setShowLangMenu(false);
                        }}
                        className={`${styles.langDropdownItem} ${lang === opt.id ? styles.langDropdownItemActive : ''}`}
                      >
                        <span className={styles.langItemFlag}>{opt.flag}</span>
                        <span className={styles.langItemShort}>{opt.short}</span>
                        <span className={styles.langItemFull}>{opt.label}</span>
                        {lang === opt.id && <Check size={14} className={styles.langItemCheck} />}
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
                title={dict.teacher?.logout || 'Chiqish'}
                onClick={handleLogout}
                aria-label="Chiqish"
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
