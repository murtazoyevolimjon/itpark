'use client';

import React from 'react';
import { useStudentPortal } from '../../hooks/useStudentPortal';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import {
  User,
  Phone,
  Calendar,
  Lock,
  Building,
  BookOpen,
  Moon,
  Sun,
  Shield,
} from 'lucide-react';
import styles from './StudentProfile.module.css';

export const StudentProfile: React.FC = () => {
  const { student, group } = useStudentPortal();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLanguage();

  const studentName = student
    ? `${student.firstName} ${student.lastName}`
    : 'Sardor Aliyev';

  return (
    <div className={styles.container}>
      {/* 1. Header Banner */}
      <section className={styles.headerSection}>
        <div className={styles.headerText}>
          <div className={styles.pageBadge}>
            <User size={13} />
            <span>Shaxsiy ma'lumotlar</span>
          </div>
          <h1 className={styles.title}>Mening profilim</h1>
          <p className={styles.subtitle}>
            Akkaunt ma'lumotlari, biriktirilgan kurs va xavfsizlik sozlamalari.
          </p>
        </div>
      </section>

      {/* 2. Profile Grid */}
      <div className={styles.profileGrid}>
        {/* Left Column: Personal & Group Info */}
        <div className={styles.leftCol}>
          <div className={styles.card}>
            <div className={styles.avatarRow}>
              <div className={styles.avatarBig}>
                {studentName.charAt(0)}
              </div>
              <div className={styles.avatarInfo}>
                <h2 className={styles.profileName}>{studentName}</h2>
                <span className={styles.roleTag}>IT Park O'quvchisi</span>
              </div>
            </div>

            <div className={styles.divider} />

            <div className={styles.infoFieldsList}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Telefon raqam</span>
                <span className={styles.infoValue}>
                  {student?.phone || '+998 (90) 123-45-67'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Tug'ilgan sana</span>
                <span className={styles.infoValue}>
                  {student?.birthDate ? new Date(student.birthDate).toLocaleDateString('uz-UZ') : '15.06.2005'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Ota/Ona telefoni</span>
                <span className={styles.infoValue}>
                  {student?.fatherPhone || student?.motherPhone || '+998 (97) 987-65-43'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Markaz</span>
                <span className={styles.infoValue}>
                  IT Park Academy
                </span>
              </div>
            </div>
          </div>

          {/* Group Details Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <BookOpen size={18} className={styles.cardIconCyan} />
              <h3>Biriktirilgan Guruh</h3>
            </div>
            <div className={styles.infoFieldsList}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Guruh nomi</span>
                <span className={styles.infoValueHighlight}>
                  {group?.name || 'Frontend Web Dasturlash'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Kurs</span>
                <span className={styles.infoValue}>
                  {group?.course?.name || 'Frontend Web Dasturlash'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>O'qituvchi</span>
                <span className={styles.infoValue}>
                  {group?.teacher
                    ? `${group.teacher.firstName} ${group.teacher.lastName}`
                    : 'Olimjon Murtazoyev'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Dars vaqti</span>
                <span className={styles.infoValue}>
                  {group?.startTime || '16:00'} - {group?.endTime || '18:00'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Dars xonasi</span>
                <span className={styles.infoValue}>
                  {group?.room?.name || '302-xona'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Security & Preferences */}
        <div className={styles.rightCol}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Lock size={18} className={styles.cardIconPurple} />
              <h3>Kirish va Xavfsizlik</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.22)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Tizimga kirish logini:
                  </span>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '6px',
                      background: 'rgba(59, 130, 246, 0.18)',
                      color: '#60a5fa',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    @{student?.login || (student?.phone ? student.phone.replace(/\D/g, '') : 'talaba')}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Parol holati:
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#fbbf24',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                    }}
                  >
                    •••••••• (Himoyalangan)
                  </span>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.07)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <Shield size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '12.5px', color: 'var(--text)', lineHeight: 1.55 }}>
                  <strong style={{ color: '#f59e0b', display: 'block', marginBottom: '2px' }}>
                    Ma'muriyat tomonidan boshqariladi
                  </strong>
                  Xavfsizlik qoidalariga ko'ra o'quvchi o'z login va parolini o'zgartira olmaydi. Barcha kirish ma'lumotlari faqat markaz administratori tomonidan belgilanadi. Agar parolni unutgan bo'lsangiz, o'quv markazingiz ma'muriyatiga murojaat qiling.
                </div>
              </div>
            </div>
          </div>

          {/* Preferences Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Shield size={18} className={styles.cardIconCyan} />
              <h3>Tizim sozlamalari</h3>
            </div>

            <div className={styles.prefRow}>
              <div className={styles.prefLabelWrap}>
                <span className={styles.prefTitle}>Mavzu (Dizayn rejimi)</span>
                <span className={styles.prefSubtitle}>
                  {theme === 'dark' ? "Tungi rejim faol" : "Kunduzgi rejim faol"}
                </span>
              </div>
              <button onClick={toggleTheme} className={styles.themeToggleBtn}>
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>

            <div className={styles.divider} />

            <div className={styles.prefRow}>
              <div className={styles.prefLabelWrap}>
                <span className={styles.prefTitle}>Tizim tili</span>
                <span className={styles.prefSubtitle}>Interfeys tilini tanlash</span>
              </div>
              <div className={styles.langPills}>
                <button
                  className={`${styles.langPill} ${lang === 'uz' ? styles.langPillActive : ''}`}
                  onClick={() => setLang('uz')}
                >
                  UZ
                </button>
                <button
                  className={`${styles.langPill} ${lang === 'ru' ? styles.langPillActive : ''}`}
                  onClick={() => setLang('ru')}
                >
                  RU
                </button>
                <button
                  className={`${styles.langPill} ${lang === 'en' ? styles.langPillActive : ''}`}
                  onClick={() => setLang('en')}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
