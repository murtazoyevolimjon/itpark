'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Lock,
  LogIn,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Shield,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';
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

  // Interactive 3D Parallax Tilt state for Hero Showcase Card
  const [heroTilt, setHeroTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const [heroHovered, setHeroHovered] = useState(false);
  const heroCardRef = useRef<HTMLDivElement>(null);

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroCardRef.current) return;
    const rect = heroCardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateX = (0.5 - y) * 16;
    const rotateY = (x - 0.5) * 16;
    setHeroTilt({
      rotateX,
      rotateY,
      glareX: x * 100,
      glareY: y * 100,
    });
  };

  const handleHeroMouseLeave = () => {
    setHeroHovered(false);
    setHeroTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login || !password) {
      error(t('loginSub') || 'Login va parolni kiriting');
      return;
    }

    setIsLoading(true);
    try {
      const loggedUser = await loginWithCredentials(login, password);
      success(t('loginTitle') || 'Tizimga muvaffaqiyatli kirdingiz!');
      if (loggedUser?.role === 'TEACHER') {
        router.push('/teacher');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      if (!err.response) {
        error("Serverga ulanib bo'lmadi. Backend ishga tushganini va bazani tekshiring.");
      } else if (err.response.status === 401) {
        error("Login yoki parol noto'g'ri");
      } else {
        error(err.response.data?.message || 'Kirishda xatolik yuz berdi');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Background ambient orbs & grid */}
      <div className={styles.bgGridPattern} />
      <div className={styles.ambientOrbIndigo} />
      <div className={styles.ambientOrbPurple} />
      <div className={styles.ambientOrbBlue} />

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

      {/* 2-Column Main Login Container */}
      <div className={styles.mainWrapper}>
        <div className={styles.glowBar} />

        <div className={styles.layoutGrid}>
          {/* LEFT COLUMN: 3-rasm Interactive Showcase Card */}
          <div className={styles.showcaseColumn}>
            <div className={styles.showcaseHeader}>
              <h2 className={styles.showcaseTitle}>
                O'quv markazingizni yangi bosqichga olib chiqing
              </h2>
              <p className={styles.showcaseSubtitle}>
                Barcha o'quvchilar, o'qituvchilar, guruhlar, dars jadvallari va oylik to'lovlar tahlilini yagona aqlli tizim orqali samarali boshqaring.
              </p>
            </div>

            {/* Interactive 3D Parallax Tilt Card */}
            <div
              ref={heroCardRef}
              className={`${styles.heroTiltContainer} ${!heroHovered ? styles.heroTiltAmbient : ''}`}
              onMouseMove={handleHeroMouseMove}
              onMouseEnter={() => setHeroHovered(true)}
              onMouseLeave={handleHeroMouseLeave}
              style={{
                transform: heroHovered
                  ? `perspective(1000px) rotateX(${heroTilt.rotateX}deg) rotateY(${heroTilt.rotateY}deg) scale3d(1.02, 1.02, 1.02)`
                  : undefined,
              }}
            >
              <div className={styles.heroAuraBackdrop} />

              <div className={styles.heroInnerCard}>
                <img
                  src="/login-hero.png"
                  alt="EDU CRM Dashboard Illustration"
                  className={styles.heroImage}
                />

                {heroHovered && (
                  <div
                    className={styles.heroGlare}
                    style={{
                      background: `radial-gradient(circle at ${heroTilt.glareX}% ${heroTilt.glareY}%, rgba(255, 255, 255, 0.22) 0%, rgba(99, 102, 241, 0.12) 35%, transparent 65%)`,
                    }}
                  />
                )}
              </div>

              {/* Floating Badge Top-Right: Himoya - Xavfsiz Kirish Tizimi */}
              <div
                className={`${styles.floatingBadge} ${styles.badgeTopRight}`}
                style={{
                  transform: heroHovered
                    ? `translate3d(${heroTilt.rotateY * 0.9}px, ${-heroTilt.rotateX * 0.9}px, 35px)`
                    : undefined,
                }}
              >
                <div className={styles.badgeIconIndigo}>
                  <Shield size={16} />
                </div>
                <div>
                  <p className={styles.badgeLabel}>Himoya</p>
                  <p className={styles.badgeVal}>Xavfsiz Kirish Tizimi</p>
                </div>
              </div>

              {/* Floating Badge Bottom-Left: Tizim holati - 99.9% Ishonchli & Tezkor */}
              <div
                className={`${styles.floatingBadge} ${styles.badgeBottomLeft}`}
                style={{
                  transform: heroHovered
                    ? `translate3d(${-heroTilt.rotateY * 0.9}px, ${heroTilt.rotateX * 0.9}px, 35px)`
                    : undefined,
                }}
              >
                <div className={styles.badgeIconEmerald}>
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <p className={styles.badgeLabel}>Tizim holati</p>
                  <p className={styles.badgeVal}>99.9% Ishonchli & Tezkor</p>
                </div>
              </div>
            </div>

            {/* Bottom status line */}
            <div className={styles.showcaseFooter}>
              <div className={styles.statusItem}>
                <span className={styles.statusPulseDot}>
                  <span className={styles.statusPing} />
                  <span className={styles.statusDot} />
                </span>
                <span className={styles.statusLabel}>Backend API: Ishlamoqda</span>
              </div>
              <span className={styles.statusDivider}>|</span>
              <div className={styles.versionItem}>
                <span>Versiya:</span>
                <span className={styles.versionVal}>v2.5.0</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sleek Login Form Card */}
          <div className={styles.formColumn}>
            <div className={styles.loginFormCard}>
              <div className={styles.formHeader}>
                <div className={styles.loginBrandIcon}>
                  <GraduationCap size={28} className={styles.gradCapIcon} />
                </div>
                <h3 className={styles.formTitle}>EDU CRM</h3>
              </div>

              <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    TELEFON RAQAM / LOGIN
                  </label>
                  <div className={styles.inputWrap}>
                    <User size={18} className={styles.inputIcon} />
                    <input
                      type="text"
                      required
                      placeholder="+998901234567 yoki Login"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      className={styles.textInput}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    PAROL
                  </label>
                  <div className={styles.inputWrap}>
                    <Lock size={18} className={styles.inputIcon} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={styles.textInput}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={styles.eyeBtn}
                      aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={styles.loginActionBtn}
                >
                  {isLoading ? (
                    <span>Tekshirilmoqda...</span>
                  ) : (
                    <>
                      <LogIn size={18} />
                      <span>Tizimga kirish</span>
                    </>
                  )}
                </button>

                <div className={styles.telegramLinkWrap}>
                  <a
                    href="https://t.me/Olimjon_Otabekovich"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.telegramBadgeBtn}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"
                        fill="#38bdf8"
                      />
                    </svg>
                    <span>@Olimjon_Otabekovich</span>
                  </a>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
