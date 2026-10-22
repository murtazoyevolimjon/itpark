'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Menu, Sun, Moon, LogOut, User, ChevronDown } from 'lucide-react';
import { Breadcrumb } from './Breadcrumb';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage, Language } from '../../hooks/useLanguage';
import { useRouter } from 'next/navigation';
import styles from './Header.module.css';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const router = useRouter();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // The developer entered this center from the superadmin panel: offer a way back
  const [isDeveloperSession, setIsDeveloperSession] = useState(false);
  useEffect(() => {
    try {
      setIsDeveloperSession(!!localStorage.getItem('superadmin_token'));
    } catch {}
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.substring(0, 1).toUpperCase();
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.hamburger} onClick={onToggleSidebar} aria-label="Menu">
          <Menu size={20} />
        </button>
        <Breadcrumb />
      </div>

      <div className={styles.right}>
        {isDeveloperSession && (
          <button
            type="button"
            onClick={() => router.push('/superadmin')}
            title={t('backToDeveloperTooltip')}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card-subtle)',
              color: 'var(--primary)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t('backToDeveloper')}
          </button>
        )}

        {/* Theme Toggle (Sun / Moon) */}
        <button
          className={styles.themeToggle}
          onClick={toggleTheme}
          title={theme === 'light' ? t('switchToDark') : t('switchToLight')}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Language Selector Pills */}
        <div className={styles.langSelector}>
          {(['uz', 'en', 'ru'] as Language[]).map((l) => (
            <button
              key={l}
              className={`${styles.langBtn} ${lang === l ? styles.langBtnActive : ''}`}
              onClick={() => setLang(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* User Profile Dropdown */}
        <div className={styles.userMenu} ref={dropdownRef}>
          <div className={styles.userTrigger} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <div className={styles.avatar}>{getInitials(user?.fullName)}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.fullName || t('profile')}</span>
              <span className={styles.userRole}>
                {user?.role === 'TEACHER' ? t('roleTeacher') : (user?.role === 'OWNER' ? t('roleOwner') : t('roleAdmin'))}
              </span>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </div>

          {isDropdownOpen && (
            <div className={styles.dropdown}>
              <button
                className={styles.dropdownItem}
                onClick={() => {
                  setIsDropdownOpen(false);
                  router.push('/profile');
                }}
              >
                <User size={16} />
                <span>{t('profile')}</span>
              </button>

              <button
                className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>{t('logout')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
