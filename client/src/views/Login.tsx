'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, LogIn, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { Input } from '../components/ui/Input/Input';
import { Button } from '../components/ui/Button/Button';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast/Toast';
import { useLanguage, Language } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import styles from './Login.module.css';

export const Login: React.FC = () => {
  const router = useRouter();
  const { loginWithCredentials } = useAuth();
  const { error, success } = useToast();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login || !password) {
      error(t('loginSub'));
      return;
    }

    setIsLoading(true);
    try {
      const loggedUser = await loginWithCredentials(login, password);
      success(t('loginTitle'));
      if (loggedUser?.role === 'TEACHER') {
        router.push('/teacher');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      if (!err.response) {
        error('Serverga ulanib bo\'lmadi. Backend ishga tushganini va bazani tekshiring.');
      } else if (err.response.status === 401) {
        error('Login yoki parol noto\'g\'ri');
      } else {
        error(err.response.data?.message || 'Kirishda xatolik yuz berdi');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Top right language & theme bar */}
      <div className={styles.topBar}>
        <button
          onClick={toggleTheme}
          className={styles.themeBtn}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <div className={styles.langBar}>
          {(['uz', 'en', 'ru'] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`${styles.langBtn} ${lang === l ? styles.langBtnActive : ''}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <h1 className={styles.title}>{t('appName')}</h1>
        <p className={styles.subtitle}>{t('loginSub')}</p>

        <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
          <Input
            label={t('login') || 'Login'}
            type="text"
            name="username"
            autoComplete="off"
            placeholder="Loginni kiriting"
            icon={<User size={18} />}
            required
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />

          <Input
            label={t('password')}
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete="new-password"
            placeholder="Parolni kiriting"
            icon={<Lock size={18} />}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
                title={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button type="submit" fullWidth isLoading={isLoading} icon={<LogIn size={18} />}>
            {t('loginBtn')}
          </Button>
        </form>

        <div className={styles.telegramWrapper}>
          <a
            href="https://t.me/OlimjonOtabekovich"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.telegramBadge}
            title="Telegram: @OlimjonOtabekovich"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              style={{ flexShrink: 0 }}
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"
                fill="#229ED9"
              />
            </svg>
            <span>@OlimjonOtabekovich</span>
          </a>
        </div>
      </div>
    </div>
  );
};
