'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, User, Lock, ArrowRight, Eye, EyeOff, Terminal, ArrowLeft } from 'lucide-react';
import { useSuperAdmin } from '../hooks/useSuperAdmin';
import { useLanguage, Language } from '../hooks/useLanguage';
import { useToast } from '../components/ui/Toast/Toast';
import styles from './SuperAdminLogin.module.css';

export const SuperAdminLogin: React.FC = () => {
  const router = useRouter();
  const { login } = useSuperAdmin();
  const { success, error } = useToast();
  const { lang, setLang, t, dict } = useLanguage();

  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim() || !passwordInput.trim()) {
      error('Login va parolni kiriting');
      return;
    }

    setIsLoading(true);
    try {
      await login(loginInput.trim(), passwordInput.trim());
      success('Dasturchi paneliga muvaffaqiyatli kirdingiz!');
      router.push('/superadmin');
    } catch (err: any) {
      if (err.response?.data?.message) {
        error(err.response.data.message);
      } else {
        error("Dasturchi logini yoki paroli noto'g'ri");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.gridOverlay} />

      {/* Top right language bar */}
      <div style={{ position: 'absolute', top: 20, right: 24, zIndex: 50, display: 'flex', gap: 4, background: 'rgba(255,255,255,0.06)', padding: 4, borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
        {(['uz', 'en', 'ru'] as Language[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            style={{
              padding: '4px 10px',
              borderRadius: 16,
              fontSize: '11px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: lang === l ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' : 'transparent',
              color: lang === l ? '#ffffff' : '#94a3b8',
              transition: 'all 0.15s ease',
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.badge}>
            <Terminal size={14} />
            <span>Root Developer Mode</span>
          </div>
          <h1 className={styles.title}>{dict.superadmin?.brandTitle || 'Dasturchi Boshqaruvi'}</h1>
          <p className={styles.subtitle}>
            {dict.superadmin?.heroDesc || 'Barcha o\'quv markazlarni markazlashgan boshqarish va nazorat qilish tizimi'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
          <div className={styles.fieldGroup}>
            <label className={styles.label}>{dict.superadmin?.login || t('login')}</label>
            <div className={styles.inputWrapper}>
              <div className={styles.inputIcon}>
                <User size={18} />
              </div>
              <input
                type="text"
                className={styles.input}
                placeholder={dict.superadmin?.login || t('login')}
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>{t('password')}</label>
            <div className={styles.inputWrapper}>
              <div className={styles.inputIcon}>
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder={t('password')}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
              />
              <button
                type="button"
                className={styles.togglePass}
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide" : "Show"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? (
              <span>{t('loading')}</span>
            ) : (
              <>
                <span>{dict.superadmin?.enterCenter || 'Boshqaruvga Kirish'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className={styles.backLink}>
          <Link href="/login">
            <ArrowLeft size={14} />
            <span>{t('back')} ({t('login')})</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
