'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, User, Lock, ArrowRight, Eye, EyeOff, Terminal, ArrowLeft } from 'lucide-react';
import { useSuperAdmin } from '../hooks/useSuperAdmin';
import { useToast } from '../components/ui/Toast/Toast';
import styles from './SuperAdminLogin.module.css';

export const SuperAdminLogin: React.FC = () => {
  const router = useRouter();
  const { login } = useSuperAdmin();
  const { success, error } = useToast();

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

      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.badge}>
            <Terminal size={14} />
            <span>Root Developer Mode</span>
          </div>
          <h1 className={styles.title}>Dasturchi Boshqaruvi</h1>
          <p className={styles.subtitle}>
            Barcha o&apos;quv markazlarni markazlashgan boshqarish va nazorat qilish tizimi
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Dasturchi Logini</label>
            <div className={styles.inputWrapper}>
              <div className={styles.inputIcon}>
                <User size={18} />
              </div>
              <input
                type="text"
                className={styles.input}
                placeholder="Loginni kiriting"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Parol</label>
            <div className={styles.inputWrapper}>
              <div className={styles.inputIcon}>
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder="Maxfiy parolni kiriting"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
              />
              <button
                type="button"
                className={styles.togglePass}
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Yashirish" : "Ko'rsatish"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? (
              <span>Kirilmoqda...</span>
            ) : (
              <>
                <span>Boshqaruvga Kirish</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className={styles.backLink}>
          <Link href="/login">
            <ArrowLeft size={14} />
            <span>Oddiy CRM kirish sahifasiga qaytish</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
