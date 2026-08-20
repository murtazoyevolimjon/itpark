import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building, Mail, Phone, Lock, UserPlus, Sun, Moon } from 'lucide-react';
import { Input } from '../components/ui/Input/Input';
import { Button } from '../components/ui/Button/Button';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast/Toast';
import { useLanguage, Language } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { formatPhone, unmaskPhone } from '../utils/phoneMask';
import styles from './Login.module.css';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { registerCenter } = useAuth();
  const { error, success } = useToast();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !password) {
      error('Barcha maydonlarni to\'ldiring');
      return;
    }

    setIsLoading(true);
    try {
      await registerCenter({
        name,
        email,
        phone: unmaskPhone(phone),
        password,
      });
      success(t('registerTitle'));
      navigate('/');
    } catch (err: any) {
      error(err.response?.data?.message || 'Ro\'yxatdan o\'tishda xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
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

      <div className={styles.card} style={{ maxWidth: 480 }}>
        <div className={styles.logoBadge}>M</div>
        <h1 className={styles.title}>{t('registerTitle')}</h1>
        <p className={styles.subtitle}>{t('registerSub')}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label={t('centerName')}
            placeholder="IT-Academy"
            icon={<Building size={18} />}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label={t('email')}
            type="email"
            placeholder="info@itacademy.uz"
            icon={<Mail size={18} />}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label={t('phone')}
            placeholder="+998 90 123 45 67"
            icon={<Phone size={18} />}
            required
            value={formatPhone(phone)}
            onChange={(e) => setPhone(unmaskPhone(e.target.value))}
          />

          <Input
            label={t('password')}
            type="password"
            placeholder="••••••••"
            icon={<Lock size={18} />}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button type="submit" fullWidth isLoading={isLoading} icon={<UserPlus size={18} />}>
            {t('registerBtn')}
          </Button>
        </form>

        <div className={styles.footer}>
          <span>{t('hasAccount')}</span> <Link to="/login">{t('loginBtn')}</Link>
        </div>
      </div>
    </div>
  );
};
