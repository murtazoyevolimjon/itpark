import React, { useState, useRef, useEffect } from 'react';
import { Menu, Sun, Moon, LogOut, User, ChevronDown } from 'lucide-react';
import { Breadcrumb } from './Breadcrumb';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage, Language } from '../../hooks/useLanguage';
import { useNavigate } from 'react-router-dom';
import styles from './Header.module.css';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    navigate('/login');
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
        {/* Theme Toggle (Sun / Moon) */}
        <button
          className={styles.themeToggle}
          onClick={toggleTheme}
          title={theme === 'light' ? 'Tungi rejimga o\'tish' : 'Kunduzgi rejimga o\'tish'}
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
              <span className={styles.userName}>{user?.fullName || 'Foydalanuvchi'}</span>
              <span className={styles.userRole}>{user?.role || 'OWNER'}</span>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </div>

          {isDropdownOpen && (
            <div className={styles.dropdown}>
              <button
                className={styles.dropdownItem}
                onClick={() => {
                  setIsDropdownOpen(false);
                  navigate('/profile');
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
