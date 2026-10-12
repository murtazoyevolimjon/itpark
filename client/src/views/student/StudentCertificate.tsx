'use client';

import React, { useRef } from 'react';
import { useStudentPortal } from '../../hooks/useStudentPortal';
import {
  Award,
  Download,
  Printer,
  Share2,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Building,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import styles from './StudentCertificate.module.css';

export const StudentCertificate: React.FC = () => {
  const { student, group, currentUserRank } = useStudentPortal();

  const studentName = student
    ? `${student.firstName} ${student.lastName}`
    : 'Sardor Aliyev';

  const courseName = group?.course?.name || 'Frontend Web Dasturlash';
  const certificateId = 'ITP-CERT-2026-89412';
  const issueDate = '12-Oktyabr 2026';

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'IT Park Academy Sertifikati',
        text: `Men IT Park Academy'da "${courseName}" kursini muvaffaqiyatli tamomladim!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Sertifikat havolasi nusxalandi! Do'stlaringiz bilan ulashing.");
    }
  };

  const skills = [
    { title: 'HTML5 & Semantik Web arxitekturasi', percent: 100 },
    { title: 'CSS3, Flexbox & CSS Grid adaptiv dizayn', percent: 100 },
    { title: 'JavaScript ES6+, DOM & Async API', percent: 95 },
    { title: 'React.js, Hooks & Komponentlar tuzilmasi', percent: 90 },
    { title: 'Git & GitHub jamoaviy boshqaruvi', percent: 92 },
  ];

  return (
    <div className={styles.container}>
      {/* 1. Header Banner */}
      <section className={styles.headerSection}>
        <div className={styles.headerText}>
          <div className={styles.pageBadge}>
            <Award size={13} />
            <span>Rasmiy bitiruv hujjati</span>
          </div>
          <h1 className={styles.title}>Sertifikatlar & Yutuqlar</h1>
          <p className={styles.subtitle}>
            IT Park Academy tomonidan tasdiqlangan maxsus QR kodli elektron va bosma sertifikat.
          </p>
        </div>

        <div className={styles.actionButtonsRow}>
          <button onClick={handlePrint} className={styles.btnPrint}>
            <Printer size={16} />
            <span>Chop etish (Print)</span>
          </button>
          <button onClick={handleShare} className={styles.btnShare}>
            <Share2 size={16} />
            <span>Ulashish</span>
          </button>
        </div>
      </section>

      {/* 2. Official Premium Certificate Canvas Card */}
      <section className={styles.certificateCanvasWrap} id="printable-certificate">
        <div className={styles.certificateCard}>
          {/* Decorative Corner Ornaments */}
          <div className={`${styles.corner} ${styles.cornerTL}`} />
          <div className={`${styles.corner} ${styles.cornerTR}`} />
          <div className={`${styles.corner} ${styles.cornerBL}`} />
          <div className={`${styles.corner} ${styles.cornerBR}`} />

          <div className={styles.certInnerBorder}>
            {/* Header */}
            <div className={styles.certHeader}>
              <div className={styles.certLogoBadge}>
                <Building size={22} className={styles.buildingIcon} />
                <span>IT PARK ACADEMY</span>
              </div>
              <h2 className={styles.certTitle}>SERTIFIKAT</h2>
              <p className={styles.certSubtitle}>CERTIFICATE OF COMPLETION</p>
            </div>

            {/* Recipient */}
            <div className={styles.certBody}>
              <span className={styles.presentText}>USHBU SERTIFIKAT BILAN TAQDIRLANADI</span>
              <h3 className={styles.recipientName}>{studentName}</h3>

              <div className={styles.certDividerLine} />

              <p className={styles.completionText}>
                Axborot texnologiyalari va zamonaviy dasturlash yo'nalishidagi
              </p>
              <h4 className={styles.courseTitleHighlight}>{courseName}</h4>
              <p className={styles.completionSubText}>
                intensiv kasbiy ta'lim kursini muvaffaqiyatli tamomlaganligi va barcha amaliy loyihalarni a'lo darajada himoya qilganligi uchun taqdim etiladi.
              </p>
            </div>

            {/* Footer with QR, Stamps, Signatures */}
            <div className={styles.certFooter}>
              <div className={styles.certMetaCol}>
                <span className={styles.metaLabel}>Berilgan sana:</span>
                <strong>{issueDate}</strong>
                <span className={styles.certIdCode}>ID: {certificateId}</span>
              </div>

              <div className={styles.certSealCenter}>
                <div className={styles.goldSeal}>
                  <Award size={32} className={styles.awardIcon} />
                  <span>OFFICIAL SEAL</span>
                </div>
              </div>

              <div className={styles.certVerifyCol}>
                <div className={styles.qrBox}>
                  <QrCode size={52} className={styles.qrIcon} />
                  <span>QR Tasdiqlash</span>
                </div>
                <div className={styles.directorSignature}>
                  <div className={styles.signLine} />
                  <span>Markaz Rahbari Imzosi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Skill Milestones Overview */}
      <section className={styles.skillsSection}>
        <div className={styles.skillsHeader}>
          <Sparkles size={18} className={styles.skillsIcon} />
          <h3>Kurs davomida o'zlashtirilgan ko'nikmalar</h3>
        </div>

        <div className={styles.skillsGrid}>
          {skills.map((s, idx) => (
            <div key={idx} className={styles.skillCard}>
              <div className={styles.skillTop}>
                <span className={styles.skillTitle}>{s.title}</span>
                <span className={styles.skillPercent}>{s.percent}%</span>
              </div>
              <div className={styles.skillBarWrap}>
                <div
                  className={styles.skillBarFill}
                  style={{ width: `${s.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
