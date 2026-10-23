'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  Check,
  ChevronDown,
  CalendarCheck,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Globe2,
  GraduationCap,
  Instagram,
  Layers,
  Lock,
  LogIn,
  Phone,
  Send,
  Sparkles,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast/Toast';
import { useLanguage, Language } from '../../hooks/useLanguage';
import { LANDING_TEXT } from './landingText';
import styles from './LandingPage.module.css';

interface LandingPageProps {
  initialLoginOpen?: boolean;
}

const FEATURE_ICONS = [Users, Layers, CalendarCheck, Wallet, BarChart3, Sparkles, GraduationCap, Globe2];
const HERO_POINT_ICONS = [FileSpreadsheet, Wallet, Bell, Bot];

const TELEGRAM_URL = 'https://t.me/Olimjon_Otabekovich';
const INSTAGRAM_URL = 'https://instagram.com/murtazoyev0limjon';
const PHONE_TEL = 'tel:+998885790309';
const PHONE_TEXT = '+998 88 579 03 09';

/** Fades a block in when it scrolls into view (visible at once when animations are unavailable). */
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${styles.reveal} ${shown ? styles.revealShown : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export const LandingPage: React.FC<LandingPageProps> = ({ initialLoginOpen = false }) => {
  const router = useRouter();
  const { loginWithCredentials, isAuthenticated, user } = useAuth();
  const { success, error, info } = useToast();
  const { lang, setLang } = useLanguage();
  const tx = LANDING_TEXT[lang as keyof typeof LANDING_TEXT] || LANDING_TEXT.uz;

  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);
  const loginRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (initialLoginOpen) loginRef.current?.focus();
  }, [initialLoginOpen]);

  const goDashboard = () => router.push(user?.role === 'TEACHER' ? '/teacher' : '/dashboard');

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const focusLogin = () => {
    scrollTo('kirish');
    setTimeout(() => loginRef.current?.focus(), 400);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput || !passwordInput) {
      error(tx.form.enter);
      return;
    }
    setIsLoading(true);
    try {
      const loggedUser = await loginWithCredentials(loginInput, passwordInput);
      success(tx.form.ok);
      router.push(loggedUser?.role === 'TEACHER' ? '/teacher' : '/dashboard');
    } catch (err: any) {
      if (!err.response) error(tx.form.noServer);
      else if (err.response.status === 401) error(tx.form.wrong);
      else error(err.response.data?.message || tx.form.failed);
    } finally {
      setIsLoading(false);
    }
  };

  const NAV = [
    { id: 'imkoniyatlar', label: tx.nav.features },
    { id: 'rollar', label: tx.nav.roles },
    { id: 'boshlash', label: tx.nav.how },
    { id: 'savollar', label: tx.nav.faq },
    { id: 'aloqa', label: tx.nav.contact },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.bgGlowA} />
      <div className={styles.bgGlowB} />
      <div className={styles.bgGrid} />

      {/* NAVIGATION */}
      <header className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
        <div className={styles.navInner}>
          <a className={styles.brand} href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <img src="/crm-logo.png" alt="EduCRM" className={styles.brandLogo} />
            <span className={styles.brandText}>Edu<b>CRM</b></span>
          </a>

          <nav className={styles.navLinks}>
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`} className={styles.navLink} onClick={(e) => { e.preventDefault(); scrollTo(n.id); }}>
                {n.label}
              </a>
            ))}
          </nav>

          <div className={styles.navRight}>
            <div className={styles.langSwitch}>
              {(['uz', 'en', 'ru'] as Language[]).map((l) => (
                <button key={l} type="button" onClick={() => setLang(l)} className={`${styles.langBtn} ${lang === l ? styles.langBtnActive : ''}`}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button type="button" className={styles.navCta} onClick={isAuthenticated ? goDashboard : focusLogin}>
              {isAuthenticated ? tx.nav.open : tx.nav.login}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <span className={styles.badge}>
              <span className={styles.badgeDot} />
              {tx.hero.badge}
            </span>
            <h1 className={styles.title}>
              {tx.hero.title1} <span className={styles.titleGradient}>{tx.hero.title2}</span>
            </h1>
            <p className={styles.lead}>{tx.hero.sub}</p>

            <ul className={styles.points}>
              {tx.hero.points.map((p, i) => {
                const Icon = HERO_POINT_ICONS[i];
                return (
                  <li key={p} className={styles.point}>
                    <span className={styles.pointIcon}><Icon size={16} /></span>
                    {p}
                  </li>
                );
              })}
            </ul>

            <div className={styles.heroActions}>
              <a className={styles.primaryBtn} href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
                <Send size={17} />
                {tx.hero.contactCta}
              </a>
              <a className={styles.ghostBtn} href={PHONE_TEL}>
                <Phone size={17} />
                {PHONE_TEXT}
              </a>
            </div>
          </div>

          {/* LOGIN CARD */}
          <div className={styles.loginWrap} id="kirish">
            <div className={styles.loginCard}>
              <div className={styles.loginHead}>
                <span className={styles.loginLogo}><GraduationCap size={24} /></span>
                <div>
                  <h2 className={styles.loginTitle}>{tx.form.title}</h2>
                  <p className={styles.loginSub}>{tx.form.sub}</p>
                </div>
              </div>

              {isAuthenticated ? (
                <div className={styles.alreadyBox}>
                  <p>{tx.form.already}{user?.fullName ? `: ${user.fullName}` : ''}</p>
                  <button type="button" className={styles.submitBtn} onClick={goDashboard}>
                    {tx.nav.open}
                    <ArrowRight size={17} />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLogin} autoComplete="off" className={styles.form}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>{tx.form.login}</span>
                    <span className={styles.inputBox}>
                      <User size={18} className={styles.inputIcon} />
                      <input
                        ref={loginRef}
                        type="text"
                        required
                        value={loginInput}
                        onChange={(e) => setLoginInput(e.target.value)}
                        placeholder={tx.form.loginPh}
                        className={styles.input}
                        autoCapitalize="none"
                        autoCorrect="off"
                      />
                    </span>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>{tx.form.password}</span>
                    <span className={styles.inputBox}>
                      <Lock size={18} className={styles.inputIcon} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className={styles.input}
                      />
                      <button
                        type="button"
                        className={styles.eyeBtn}
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? tx.form.hide : tx.form.show}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </span>
                  </label>

                  <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                    {isLoading ? tx.form.checking : (<><LogIn size={18} />{tx.form.submit}</>)}
                  </button>

                  <button type="button" className={styles.forgotBtn} onClick={() => info(tx.form.forgotInfo)}>
                    {tx.form.forgot}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* PRODUCT PREVIEW */}
        <Reveal className={styles.previewWrap}>
          <div className={styles.preview}>
            <div className={styles.previewBar}>
              <span /><span /><span />
              <em>{tx.preview.sample}</em>
            </div>
            <div className={styles.previewBody}>
              <aside className={styles.previewSide}>
                {tx.preview.menu.map((m, i) => (
                  <div key={m} className={`${styles.previewMenu} ${i === 0 ? styles.previewMenuActive : ''}`}>{m}</div>
                ))}
              </aside>
              <div className={styles.previewMain}>
                <div className={styles.previewStats}>
                  <div className={styles.previewStat}><small>{tx.preview.students}</small><b>1 248</b></div>
                  <div className={styles.previewStat}><small>{tx.preview.attendance}</small><b className={styles.good}>92%</b></div>
                  <div className={styles.previewStat}><small>{tx.preview.revenue}</small><b>186 400 000</b></div>
                  <div className={styles.previewStat}><small>{tx.preview.debtors}</small><b className={styles.warn}>37</b></div>
                </div>
                <div className={styles.previewChart}>
                  <span className={styles.previewChartTitle}>{tx.preview.chart}</span>
                  <svg viewBox="0 0 400 120" preserveAspectRatio="none" className={styles.chartSvg}>
                    <defs>
                      <linearGradient id="lpArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0 90 C40 70 70 95 110 60 C150 25 190 70 230 48 C270 26 310 52 350 24 L400 30 L400 120 L0 120 Z" fill="url(#lpArea)" />
                    <path d="M0 90 C40 70 70 95 110 60 C150 25 190 70 230 48 C270 26 310 52 350 24 L400 30" fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
            <div className={`${styles.floatCard} ${styles.floatA}`}>
              <span className={styles.floatIconGreen}><Check size={16} /></span>
              {tx.preview.float1}
            </div>
            <div className={`${styles.floatCard} ${styles.floatB}`}>
              <span className={styles.floatIconBlue}><Send size={15} /></span>
              {tx.preview.float2}
            </div>
          </div>
        </Reveal>
      </section>

      {/* FEATURES */}
      <section className={styles.section} id="imkoniyatlar">
        <Reveal>
          <h2 className={styles.sectionTitle}>{tx.featuresTitle}</h2>
          <p className={styles.sectionSub}>{tx.featuresSub}</p>
        </Reveal>
        <div className={styles.featureGrid}>
          {tx.features.map((f, i) => {
            const Icon = FEATURE_ICONS[i];
            return (
              <Reveal key={f.t} delay={(i % 4) * 70}>
                <article className={styles.featureCard}>
                  <span className={styles.featureIcon}><Icon size={22} /></span>
                  <h3>{f.t}</h3>
                  <p>{f.d}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ROLES */}
      <section className={styles.section} id="rollar">
        <Reveal>
          <h2 className={styles.sectionTitle}>{tx.rolesTitle}</h2>
        </Reveal>
        <div className={styles.roleGrid}>
          {tx.roles.map((r, i) => (
            <Reveal key={r.t} delay={i * 90}>
              <article className={styles.roleCard}>
                <h3>{r.t}</h3>
                <ul>
                  {r.items.map((it) => (
                    <li key={it}>
                      <span className={styles.tick}><Check size={14} /></span>
                      {it}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section className={styles.section} id="boshlash">
        <Reveal>
          <h2 className={styles.sectionTitle}>{tx.howTitle}</h2>
        </Reveal>
        <div className={styles.stepGrid}>
          {tx.how.map((s, i) => (
            <Reveal key={s.t} delay={i * 90}>
              <article className={styles.stepCard}>
                <span className={styles.stepNum}>{i + 1}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className={styles.section} id="savollar">
        <Reveal>
          <h2 className={styles.sectionTitle}>{tx.faqTitle}</h2>
        </Reveal>
        <div className={styles.faqList}>
          {tx.faq.map((f, i) => (
            <Reveal key={f.q} delay={i * 50}>
              <div className={`${styles.faqItem} ${openFaq === i ? styles.faqOpen : ''}`}>
                <button type="button" className={styles.faqQ} onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                  <span>{f.q}</span>
                  <ChevronDown size={20} />
                </button>
                <div className={styles.faqA}>
                  <p>{f.a}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section className={styles.section} id="aloqa">
        <Reveal>
          <div className={styles.contactCard}>
            <h2 className={styles.sectionTitle}>{tx.contactTitle}</h2>
            <p className={styles.sectionSub}>{tx.contactSub}</p>
            <div className={styles.contactGrid}>
              <a className={styles.contactItem} href={PHONE_TEL}>
                <span className={`${styles.contactIcon} ${styles.cGreen}`}><Phone size={20} /></span>
                <small>{tx.phone}</small>
                <b>{PHONE_TEXT}</b>
              </a>
              <a className={styles.contactItem} href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
                <span className={`${styles.contactIcon} ${styles.cBlue}`}><Send size={20} /></span>
                <small>{tx.telegram}</small>
                <b>@Olimjon_Otabekovich</b>
              </a>
              <a className={styles.contactItem} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                <span className={`${styles.contactIcon} ${styles.cPink}`}><Instagram size={20} /></span>
                <small>{tx.instagram}</small>
                <b>murtazoyev0limjon</b>
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerBrand}>
            <img src="/crm-logo.png" alt="" className={styles.brandLogoSmall} />
            EduCRM
          </span>
          <span className={styles.footerNote}>
            © {new Date().getFullYear()} EduCRM. {tx.footer} · {tx.developer}: Olimjon Murtazoyev
          </span>
        </div>
      </footer>
    </div>
  );
};
