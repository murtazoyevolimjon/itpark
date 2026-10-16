'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage, Language } from '../../hooks/useLanguage';
import { StudentPortalProvider, useStudentPortal } from '../../hooks/useStudentPortal';
import { UzFlag, GbFlag, RuFlag } from '../ui/Flags/Flags';
import {
  Compass,
  CalendarCheck,
  BookOpen,
  Video,
  CreditCard,
  Trophy,
  Sparkles,
  User as UserIcon,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  ChevronDown,
  Flame,
  Zap,
  Coins,
  ArrowRight,
  MoreHorizontal,
} from 'lucide-react';
import styles from './StudentLayout.module.css';

interface StudentLayoutProps {
  children: React.ReactNode;
}

const StudentLayoutInner: React.FC<StudentLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const pathname = usePathname() || '/student';
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, dict } = useLanguage();

  const {
    student,
    group,
    allGroups,
    selectedGroupId,
    setSelectedGroupId,
    attendanceStats,
    currentUserRank,
  } = useStudentPortal();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const centerName = user?.centerName || 'IT Park Academy';
  const studentFirstName = student?.firstName || user?.fullName?.split(' ')[0] || "O'quvchi";

  // Navigation Items (The 8 requested features)
  const navItems = [
    {
      label: dict.student?.dashboard || 'Mening holatim',
      href: '/student',
      icon: Compass,
      number: '01',
      isActive: pathname === '/student',
    },
    {
      label: dict.student?.attendance || 'Davomat & Mavzular',
      href: '/student/attendance',
      icon: CalendarCheck,
      number: '02',
      isActive: pathname.startsWith('/student/attendance'),
    },
    {
      label: dict.student?.homework || 'Uyga vazifalar',
      href: '/student/homework',
      icon: BookOpen,
      number: '03',
      isActive: pathname.startsWith('/student/homework'),
    },
    {
      label: dict.student?.videos || 'Video darslar',
      href: '/student/videos',
      icon: Video,
      number: '04',
      isActive: pathname.startsWith('/student/videos'),
    },
    {
      label: dict.student?.payments || "To'lovlar",
      href: '/student/payments',
      icon: CreditCard,
      number: '05',
      isActive: pathname.startsWith('/student/payments'),
    },
    {
      label: dict.student?.leaderboard || 'Guruh reytingi',
      href: '/student/leaderboard',
      icon: Trophy,
      number: '06',
      isActive: pathname.startsWith('/student/leaderboard'),
    },
    {
      label: dict.student?.aiTutor || 'AI Repetitor',
      href: '/student/ai',
      icon: Sparkles,
      number: '07',
      isActive: pathname.startsWith('/student/ai'),
    },
  ];

  const langOptions: { id: Language; label: string; short: string; Flag: React.FC<{ size?: number }> }[] = [
    { id: 'uz', label: "O'zbekcha", short: 'UZ', Flag: UzFlag },
    { id: 'en', label: 'English', short: 'EN', Flag: GbFlag },
    { id: 'ru', label: 'Русский', short: 'RU', Flag: RuFlag },
  ];
  const currentLangOption = langOptions.find((o) => o.id === lang) || langOptions[0];

  const currentXp = currentUserRank?.xp || 850;
  const currentCoins = currentUserRank?.coins || 42;
  const currentLevel = Math.max(1, Math.floor(currentXp / 300) + 1);

  return (
    <div className={styles.container} data-theme={theme}>
      {/* Dynamic Ambient Background Glows */}
      <div className={styles.orbCyan} />
      <div className={styles.orbPurple} />

      <div className={styles.shell}>
        {/* Mobile Drawer Overlay - inside shell so it shares stacking context with sidebar */}
        <div
          className={`${styles.mobileOverlay} ${isMobileOpen ? styles.mobileOverlayOpen : ''}`}
          onClick={() => setIsMobileOpen(false)}
        />

        {/* Desktop & Drawer Sidebar */}
        <aside className={`${styles.sidebar} ${isMobileOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarInner}>
            <div className={styles.sidebarHeader}>
              <div className={styles.sidebarHeaderTop}>
                <div className={styles.panelBadge}>
                  <span className={styles.pulseDot} />
                  {dict.student?.portalBadge || "O'quvchi portali"}
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
              <h1 className={styles.centerBrandTitle}>{centerName}</h1>

              {/* Group Selector if multiple */}
              {allGroups.length > 1 && (
                <div className={styles.groupPickerWrap}>
                  <label className={styles.pickerLabel}>Guruhni tanlash:</label>
                  <select
                    className={styles.groupPicker}
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                  >
                    {allGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Navigation Menu */}
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
                    <div className={styles.navItemLeft}>
                      <span className={styles.navNumber}>{item.number}</span>
                      <Icon
                        size={19}
                        className={item.isActive ? styles.navIconActive : styles.navIcon}
                      />
                      <span className={styles.navLabel}>{item.label}</span>
                    </div>
                    {item.isActive && <div className={styles.activeGlowBar} />}
                  </Link>
                );
              })}
            </nav>

            {/* Gamification Level & XP Card */}
            <div className={styles.levelCard}>
              <div className={styles.levelHeader}>
                <div className={styles.levelBadge}>
                  <Zap size={13} className={styles.zapIcon} />
                  <span>Level {currentLevel}</span>
                </div>
                <div className={styles.coinsBadge}>
                  <Coins size={13} className={styles.coinIcon} />
                  <span>{currentCoins} IT-Coins</span>
                </div>
              </div>
              <div className={styles.xpTextRow}>
                <span className={styles.xpLabel}>O'quvchi tajribasi</span>
                <span className={styles.xpValue}>{currentXp} XP</span>
              </div>
              <div className={styles.progressBarWrap}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${Math.min(100, (currentXp % 300) / 3)}%` }}
                />
              </div>
              <div className={styles.streakRow}>
                <Flame size={14} className={styles.flameIcon} />
                <span>5 kunlik faol qatnashuv streaki!</span>
              </div>
            </div>
          </div>

          {/* User Profile Footer */}
          <div className={styles.sidebarFooter}>
            <div className={styles.userCard}>
              <div className={styles.userAvatar}>
                {studentFirstName.charAt(0).toUpperCase()}
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{studentFirstName}</span>
                <span className={styles.userSub}>
                  {group?.course?.name || "O'quvchi"}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={styles.logoutBtn}
              title="Tizimdan chiqish"
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className={styles.mainWrapper}>
          {/* Top Header */}
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <button
                className={styles.hamburgerBtn}
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                aria-label="Toggle menu"
              >
                {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className={styles.headerTitleGroup}>
                <span className={styles.headerGreeting}>
                  Salom, <strong>{studentFirstName}</strong> 👋
                </span>
                <span className={styles.headerGroupName}>
                  {group ? group.name : 'IT Park Academy'}
                </span>
              </div>
            </div>

            <div className={styles.headerRight}>
              {/* Gamification Quick Badges */}
              <div className={styles.headerBadges}>
                <div className={styles.badgePill} title="Uzluksiz davomat streaki">
                  <Flame size={14} className={styles.badgeFlame} />
                  <span>5 kun</span>
                </div>
                <div className={styles.badgePill} title="Jami to'plangan XP">
                  <Zap size={14} className={styles.badgeZap} />
                  <span>{currentXp} XP</span>
                </div>
                <div className={styles.badgePill} title="IT-Coins balansi">
                  <Coins size={14} className={styles.badgeCoin} />
                  <span>{currentCoins} Coins</span>
                </div>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={styles.iconBtn}
                title={theme === 'dark' ? "Kunduzgi rejim" : "Tungi rejim"}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Language Selector */}
              <div className={styles.langDropdownWrap} ref={langMenuRef}>
                <button
                  className={styles.langTrigger}
                  onClick={() => setShowLangMenu(!showLangMenu)}
                >
                  <currentLangOption.Flag size={18} />
                  <span className={styles.langShort}>{currentLangOption.short}</span>
                  <ChevronDown size={14} />
                </button>

                {showLangMenu && (
                  <div className={styles.dropdownMenu}>
                    {langOptions.map((opt) => {
                      const FlagIcon = opt.Flag;
                      return (
                        <button
                          key={opt.id}
                          className={`${styles.dropdownItem} ${lang === opt.id ? styles.dropdownItemActive : ''}`}
                          onClick={() => {
                            setLang(opt.id);
                            setShowLangMenu(false);
                          }}
                        >
                          <FlagIcon size={18} />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* User Dropdown */}
              <div className={styles.userDropdownWrap} ref={userMenuRef}>
                <button
                  className={styles.userTrigger}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <div className={styles.topAvatar}>
                    {studentFirstName.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown size={14} />
                </button>

                {showUserMenu && (
                  <div className={styles.dropdownMenu}>
                    <div className={styles.userMenuHeader}>
                      <span className={styles.menuName}>
                        {student ? `${student.firstName} ${student.lastName}` : studentFirstName}
                      </span>
                      <span className={styles.menuPhone}>{student?.phone || user?.email}</span>
                    </div>
                    <div className={styles.menuDivider} />
                    <Link
                      href="/student/profile"
                      className={styles.dropdownItem}
                      onClick={() => setShowUserMenu(false)}
                    >
                      <UserIcon size={16} />
                      <span>{dict.student?.profile || 'Profilim'}</span>
                    </Link>
                    <button
                      className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                      onClick={handleLogout}
                    >
                      <LogOut size={16} />
                      <span>{dict.logout || 'Chiqish'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Main Body */}
          <main className={styles.contentArea}>{children}</main>

          {/* Mobile Bottom Navigation Bar */}
          <nav className={styles.mobileBottomNav}>
            <Link
              href="/student"
              className={`${styles.mobileTab} ${pathname === '/student' ? styles.mobileTabActive : ''}`}
            >
              <Compass size={20} />
              <span>Bosh sahifa</span>
            </Link>
            <Link
              href="/student/attendance"
              className={`${styles.mobileTab} ${pathname.startsWith('/student/attendance') ? styles.mobileTabActive : ''}`}
            >
              <CalendarCheck size={20} />
              <span>Davomat</span>
            </Link>
            <Link
              href="/student/homework"
              className={`${styles.mobileTab} ${pathname.startsWith('/student/homework') ? styles.mobileTabActive : ''}`}
            >
              <BookOpen size={20} />
              <span>Vazifalar</span>
            </Link>
            <Link
              href="/student/videos"
              className={`${styles.mobileTab} ${pathname.startsWith('/student/videos') ? styles.mobileTabActive : ''}`}
            >
              <Video size={20} />
              <span>Videolar</span>
            </Link>
            <Link
              href="/student/ai"
              className={`${styles.mobileTab} ${pathname.startsWith('/student/ai') ? styles.mobileTabActive : ''}`}
            >
              <Sparkles size={20} />
              <span>AI</span>
            </Link>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`${styles.mobileTab} ${showMoreMenu ? styles.mobileTabActive : ''}`}
            >
              <MoreHorizontal size={20} />
              <span>Ko'proq</span>
            </button>
          </nav>

          {/* Mobile "More" Modal */}
          {showMoreMenu && (
            <div className={styles.moreModalBackdrop} onClick={() => setShowMoreMenu(false)}>
              <div className={styles.moreModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.moreModalHeader}>
                  <h3>Qo'shimcha bo'limlar</h3>
                  <button onClick={() => setShowMoreMenu(false)} className={styles.closeBtn}>
                    <X size={18} />
                  </button>
                </div>
                <div className={styles.moreGrid}>
                  <Link
                    href="/student/payments"
                    onClick={() => setShowMoreMenu(false)}
                    className={styles.moreCard}
                  >
                    <CreditCard size={24} className={styles.moreIconCyan} />
                    <span>To'lovlar</span>
                  </Link>
                  <Link
                    href="/student/leaderboard"
                    onClick={() => setShowMoreMenu(false)}
                    className={styles.moreCard}
                  >
                    <Trophy size={24} className={styles.moreIconGold} />
                    <span>Guruh reytingi</span>
                  </Link>
                  <Link
                    href="/student/profile"
                    onClick={() => setShowMoreMenu(false)}
                    className={styles.moreCard}
                  >
                    <UserIcon size={24} className={styles.moreIconBlue} />
                    <span>Profilim</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  return (
    <StudentPortalProvider>
      <StudentLayoutInner>{children}</StudentLayoutInner>
    </StudentPortalProvider>
  );
};
