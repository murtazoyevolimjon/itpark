'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, LogIn, Sun, Moon, Eye, EyeOff } from 'lucide-react';
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

  const [email, setEmail] = useState('admin@itpark.uz');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      error(t('loginSub'));
      return;
    }

    setIsLoading(true);
    try {
      await loginWithCredentials(email, password);
      success(t('loginTitle'));
      router.push('/dashboard');
    } catch (err: any) {
      if (!err.response) {
        error('Serverga ulanib bo\'lmadi. Backend ishga tushganini va bazani tekshiring.');
      } else if (err.response.status === 401) {
        error('Email yoki parol noto\'g\'ri');
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
      <div style={{ position: 'absolute', top: 20, right: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={toggleTheme}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <div style={{ display: 'flex', gap: 4, background: 'var(--card)', padding: 3, borderRadius: 20, border: '1px solid var(--border)' }}>
          {(['uz', 'en', 'ru'] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 16,
                border: 'none',
                cursor: 'pointer',
                background: lang === l ? 'var(--primary)' : 'transparent',
                color: lang === l ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.logoBadge}>M</div>
        <h1 className={styles.title}>{t('appName')}</h1>
        <p className={styles.subtitle}>{t('loginSub')}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label={t('email')}
            type="email"
            placeholder="admin@itpark.uz"
            icon={<Mail size={18} />}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label={t('password')}
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
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

        <div className={styles.footer}>
          <span>{t('noAccount')}</span> <Link href="/register">{t('registerBtn')}</Link>
        </div>
      </div>
    </div>
  );
};
