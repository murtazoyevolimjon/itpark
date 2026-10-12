'use client';

import React, { useState } from 'react';
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
  CheckCircle2,
  Save,
  Moon,
  Sun,
  Shield,
} from 'lucide-react';
import styles from './StudentProfile.module.css';

export const StudentProfile: React.FC = () => {
  const { student, group } = useStudentPortal();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLanguage();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const studentName = student
    ? `${student.firstName} ${student.lastName}`
    : 'Sardor Aliyev';

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      alert("Parollar mos kelmadi yoki bo'sh kiritildi!");
      return;
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setNewPassword('');
      setConfirmPassword('');
    }, 2500);
  };

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
              <h3>Xavfsizlik (Parol o'zgartirish)</h3>
            </div>

            <form onSubmit={handleSaveSecurity} className={styles.securityForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Yangi parol</label>
                <input
                  type="password"
                  placeholder="Yangi parol kiriting"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={styles.inputField}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Parolni tasdiqlang</label>
                <input
                  type="password"
                  placeholder="Yangi parolni qayta kiriting"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={styles.inputField}
                  required
                />
              </div>

              {saveSuccess && (
                <div className={styles.successAlert}>
                  <CheckCircle2 size={16} />
                  <span>Parolingiz muvaffaqiyatli yangilandi!</span>
                </div>
              )}

              <button type="submit" className={styles.btnSave}>
                <Save size={15} />
                <span>Parolni saqlash</span>
              </button>
            </form>
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
