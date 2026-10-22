'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage, Language } from '../../hooks/useLanguage';
import { UzFlag, GbFlag, RuFlag } from '../ui/Flags/Flags';
import {
  LayoutGrid,
  GraduationCap,
  CalendarCheck,
  BookOpen,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Check,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { FloatingAIWidget } from '../ai/FloatingAIWidget';
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
  const langMenuRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    };
    if (showLangMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLangMenu]);

  const centerName = user?.centerName || 'Toyloq IT Park';
  const firstName = user?.fullName
    ? user.fullName.split(' ')[0]
    : 'Olimjon';

  const isProfileActive = pathname.startsWith('/teacher/profile');
  const isAttendanceActive = pathname.startsWith('/teacher/attendance');
  const isHomeworkActive = pathname.startsWith('/teacher/homework');
  const isAiActive = pathname.startsWith('/teacher/ai') || pathname === '/ai-assistant';
  const isSalaryActive = pathname.startsWith('/teacher/salary');
  const isGroupsActive =
    (pathname.startsWith('/teacher/groups') || pathname === '/teacher') &&
    !isAttendanceActive &&
    !isHomeworkActive &&
    !isProfileActive &&
    !isAiActive &&
    !isSalaryActive;

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
      label: dict.teacher?.aiAssistant || 'AI Yordamchi',
      href: '/teacher/ai',
      icon: Sparkles,
      number: '05',
      isActive: isAiActive,
    },
    {
      label: dict.teacher?.salary || 'Mening maoshim',
      href: '/teacher/salary',
      icon: Wallet,
      number: '06',
      isActive: isSalaryActive,
    },
  ];

  const langOptions: { id: Language; label: string; short: string; Flag: React.FC<{ size?: number }> }[] = [
    { id: 'uz', label: "O'zbekcha", short: 'UZ', Flag: UzFlag },
    { id: 'en', label: 'English', short: 'EN', Flag: GbFlag },
    { id: 'ru', label: 'Русский', short: 'RU', Flag: RuFlag },
  ];

  const currentOption = langOptions.find((o) => o.id === lang) || langOptions[0];

  return (
    <div className={styles.container} data-theme={theme}>
      {/* Ambient Glow Orbs */}
      <div className={styles.orbLeft} />
      <div className={styles.orbRight} />

      <div className={styles.shell}>
        {/* Mobile Overlay - inside shell so it shares stacking context with sidebar */}
        <div
          className={`${styles.mobileOverlay} ${isMobileOpen ? styles.mobileOverlayOpen : ''}`}
          onClick={() => setIsMobileOpen(false)}
        />

        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${isMobileOpen ? styles.sidebarOpen : ''}`}>
          <div>
            <div className={styles.sidebarHeader}>
              <div className={styles.sidebarHeaderTop}>
                <div className={styles.panelBadge}>
                  {dict.teacher?.panelBadge || 'Teacher panel'}
                </div>
                <button
                  type="button"
                  className={styles.sidebarCloseBtn}
                  onClick={() => setIsMobileOpen(false)}
                  aria-label="Menyuni yopish"
                >
                  <X size={18} />
                </button>
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
            {/* User Profile Card in Sidebar */}
            <div className={styles.sidebarUserCard}>
              <div className={styles.sidebarAvatar}>
                <UserIcon size={18} />
              </div>
              <div className={styles.sidebarUserInfo}>
                <span className={styles.sidebarUserName}>{user?.fullName || firstName}</span>
                <span className={styles.sidebarUserRole}>{centerName}</span>
              </div>
            </div>

            <div className={styles.planCard}>
              {dict.teacher?.todayPlan || 'Bugungi reja: dars mavzularini yakunlab chiqing.'}
            </div>

            {/* Logout button in sidebar for mobile */}
            <button
              onClick={handleLogout}
              className={styles.sidebarLogoutBtn}
            >
              <LogOut size={16} />
              <span>{dict.teacher?.logout || 'Tizimdan chiqish'}</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className={styles.mainCol}>
          {/* Header */}
          <header className={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
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
                className={`${styles.iconBtn} ${styles.iconBtnNotification}`}
                title={dict.teacher?.notifications || 'Bildirishnomalar'}
                aria-label="Bildirishnomalar"
              >
                <Bell size={18} />
              </button>

              <Link
                href="/teacher/ai"
                className={styles.iconBtn}
                title="AI Yordamchi"
                aria-label="AI Yordamchi"
                style={{ color: '#6366f1' }}
              >
                <Sparkles size={18} />
              </Link>

              <button
                className={styles.iconBtn}
                title={dict.teacher?.theme || 'Mavzu (Tun / Kun)'}
                onClick={toggleTheme}
                aria-label="Toggle dark/light mode"
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Language Selector (Uz / Eng / Rus) */}
              <div className={styles.langWrapper} ref={langMenuRef}>
                <button
                  type="button"
                  className={styles.langBtn}
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  aria-expanded={showLangMenu}
                  aria-haspopup="true"
                  aria-label="Tilni almashtirish"
                >
                  <span className={styles.langFlagBadge}>
                    <currentOption.Flag size={18} />
                  </span>
                  <span className={styles.langShort}>{currentOption.short}</span>
                  <ChevronDown
                    size={14}
                    className={`${styles.langChevron} ${showLangMenu ? styles.langChevronOpen : ''}`}
                  />
                </button>
                {showLangMenu && (
                  <div className={styles.langDropdown} role="menu">
                    <div className={styles.langDropdownHeader}>
                      {dict.teacher?.selectLanguage || 'Tilni tanlang'}
                    </div>
                    {langOptions.map((opt) => {
                      const isActive = lang === opt.id;
                      const IconComponent = opt.Flag;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setLang(opt.id);
                            setShowLangMenu(false);
                          }}
                          className={`${styles.langDropdownItem} ${isActive ? styles.langDropdownItemActive : ''}`}
                        >
                          <div className={styles.langItemFlagWrapper}>
                            <IconComponent size={20} />
                          </div>
                          <div className={styles.langItemContent}>
                            <span className={styles.langItemTitle}>{opt.label}</span>
                            <span className={styles.langItemSub}>{opt.short}</span>
                          </div>
                          {isActive && (
                            <div className={styles.langItemCheckBadge}>
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={`${styles.userChip} ${styles.desktopOnlyChip}`}>
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
      <FloatingAIWidget />
    </div>
  );
};
