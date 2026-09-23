'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
      await loginWithCredentials(login, password);
      success(t('loginTitle'));
      router.push('/dashboard');
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
      </div>
    </div>
  );
};
