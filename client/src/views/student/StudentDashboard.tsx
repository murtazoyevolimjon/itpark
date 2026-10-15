'use client';

import React from 'react';
import Link from 'next/link';
import { useStudentPortal } from '../../hooks/useStudentPortal';
import {
  Compass,
  CalendarCheck,
  BookOpen,
  Video,
  CreditCard,
  Trophy,
  Sparkles,
  Clock,
  MapPin,
  User,
  ArrowRight,
  Flame,
  Zap,
  Coins,
  CheckCircle2,
  AlertCircle,
  Play,
  FileText,
  ChevronRight,
  ExternalLink,
  Bot,
} from 'lucide-react';
import styles from './StudentDashboard.module.css';

export const StudentDashboard: React.FC = () => {
  const {
    student,
    group,
    latestTopic,
    attendanceStats,
    paymentStats,
    homeworks,
    submissions,
    videos,
    currentUserRank,
    isLoading,
  } = useStudentPortal();

  const studentName = student?.firstName
    ? `${student.firstName} ${student.lastName}`
    : 'Sardor Aliyev';

  const pendingHwCount = homeworks.filter((hw) => !submissions[hw.id]).length;
  const recentVideos = videos.slice(0, 2);
  const activeHomework = homeworks[0] || null;
  const isHwSubmitted = activeHomework ? !!submissions[activeHomework.id] : false;

  // Format lesson days
  const formatDays = (days?: string[]) => {
    if (!days || days.length === 0) return 'Dush - Chor - Juma';
    const map: Record<string, string> = {
      DUSH: 'Dush',
      SESH: 'Sesh',
      CHOR: 'Chor',
      PAY: 'Pay',
      JU: 'Juma',
      SHAN: 'Shan',
      YAK: 'Yak',
    };
    return days.map((d) => map[d] || d).join(' - ');
  };

  return (
    <div className={styles.container}>
      {/* 1. Hero Welcome & Countdown Banner */}
      <section className={styles.heroSection}>
        <div className={styles.heroLeft}>
          <div className={styles.welcomePill}>
            <span className={styles.pulseDot} />
            <span>IT Park O'quvchi Tizimi</span>
          </div>
          <h1 className={styles.heroTitle}>
            Xush kelibsiz, <span className={styles.highlightName}>{studentName}</span>!
          </h1>
          <p className={styles.heroSubtitle}>
            Bugungi darsingizga tayyormisiz? O'tilgan mavzuni takrorlang, vazifalarni topshiring va guruh reytingida yuqorilang!
          </p>

          <div className={styles.quickActionRow}>
            <Link href="/student/videos" className={styles.actionBtnPrimary}>
              <Play size={16} />
              <span>Dars videosini ko'rish</span>
            </Link>
            <Link href="/student/homework" className={styles.actionBtnSecondary}>
              <BookOpen size={16} />
              <span>Vazifani topshirish</span>
            </Link>
            <Link href="/student/ai" className={styles.actionBtnAi}>
              <Sparkles size={16} />
              <span>AI Repetitor</span>
            </Link>
          </div>
        </div>

        {/* Next Lesson Card */}
        <div className={styles.nextLessonCard}>
          <div className={styles.nextLessonHeader}>
            <div className={styles.nextBadge}>
              <Clock size={13} />
              <span>Navbatdagi dars</span>
            </div>
            <span className={styles.lessonDayText}>Bugun</span>
          </div>

          <div className={styles.nextLessonTime}>
            {group?.startTime || '16:00'} - {group?.endTime || '18:00'}
          </div>

          <div className={styles.nextLessonDetails}>
            <div className={styles.detailRow}>
              <Compass size={15} className={styles.detailIcon} />
              <span>{group?.course?.name || 'Frontend Web Dasturlash'}</span>
            </div>
            <div className={styles.detailRow}>
              <User size={15} className={styles.detailIcon} />
              <span>
                Ustoz:{' '}
                {group?.teacher
                  ? `${group.teacher.firstName} ${group.teacher.lastName}`
                  : 'Olimjon Murtazoyev'}
              </span>
            </div>
            <div className={styles.detailRow}>
              <MapPin size={15} className={styles.detailIcon} />
              <span>{group?.room?.name || '302-xona (Kompyuter zali)'}</span>
            </div>
          </div>

          <div className={styles.daysSchedulePill}>
            {formatDays(group?.days)}
          </div>
        </div>
      </section>

      {/* 2. CRITICAL HIGHLIGHT: Teacher's Latest Announced Lesson Topic */}
      <section className={styles.topicHighlightSection}>
        <div className={styles.topicHighlightCard}>
          <div className={styles.topicHeaderRow}>
            <div className={styles.topicBadge}>
              <span className={styles.badgeGlow} />
              <span>Oxirgi o'tilgan dars mavzusi (Ustoz e'loni)</span>
            </div>
            <span className={styles.topicDate}>{latestTopic.date}</span>
          </div>

          <div className={styles.topicBody}>
            <div className={styles.topicIconWrap}>
              <BookOpen size={28} className={styles.topicIcon} />
            </div>
            <div className={styles.topicInfo}>
              <h2 className={styles.topicTitle}>{latestTopic.topic}</h2>
              <p className={styles.topicDesc}>
                Ushbu mavzu bo'yicha video darslik yuklangan va uyga vazifa biriktirilgan. Darsda o'rganilgan texnologiyalarni mustahkamlang.
              </p>
            </div>
          </div>

          <div className={styles.topicFooter}>
            <div className={styles.teacherMeta}>
              <div className={styles.teacherAvatarSmall}>
                {latestTopic.teacherName.charAt(0)}
              </div>
              <span className={styles.teacherNameText}>
                Ustoz: <strong>{latestTopic.teacherName}</strong>
              </span>
            </div>

            <div className={styles.topicLinks}>
              <Link href="/student/videos" className={styles.topicVideoLink}>
                <Play size={15} />
                <span>Videoni tomosha qilish</span>
              </Link>
              <Link href="/student/homework" className={styles.topicHwLink}>
                <BookOpen size={15} />
                <span>Vazifani ko'rish</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* AI TAHLIL BANNER */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bot size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>O&apos;quvchi AI Yordamchisi (AI Repetitor)</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: '#ffffff',
                }}
              >
                YANGI
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', margin: '2px 0 0 0' }}>
              Dars mavzulari, uyga vazifa yordami va kod xatoliklarini tushuntiruvchi sun&apos;iy intellekt
            </p>
          </div>
        </div>

        <Link
          href="/student/ai"
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
            transition: 'all 0.15s ease',
          }}
        >
          <Sparkles size={15} /> AI Tahlilini Ko&apos;rish
        </Link>
      </div>

      {/* 3. Quick Metrics Overview (4 Cards) */}
      <section className={styles.statsGrid}>
        {/* Davomat */}
        <Link href="/student/attendance" className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Davomatim</span>
            <div className={styles.statIconWrapCyan}>
              <CalendarCheck size={18} />
            </div>
          </div>
          <div className={styles.statValueRow}>
            <span className={styles.statBigValue}>{attendanceStats.percentage}%</span>
            <span className={styles.statSubText}>
              {attendanceStats.present} / {attendanceStats.total} dars
            </span>
          </div>
          <div className={styles.statBarWrap}>
            <div
              className={styles.statBarFillCyan}
              style={{ width: `${attendanceStats.percentage}%` }}
            />
          </div>
          <div className={styles.statCardFooter}>
            <span>Davomat tarixini ko'rish</span>
            <ArrowRight size={14} />
          </div>
        </Link>

        {/* Uyga vazifalar */}
        <Link href="/student/homework" className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Uyga vazifalar</span>
            <div className={styles.statIconWrapPurple}>
              <BookOpen size={18} />
            </div>
          </div>
          <div className={styles.statValueRow}>
            <span className={styles.statBigValue}>
              {Object.keys(submissions).length} / {homeworks.length}
            </span>
            <span className={styles.statSubText}>
              {pendingHwCount > 0 ? `${pendingHwCount} ta kutilmoqda` : 'Barchasi topshirildi'}
            </span>
          </div>
          <div className={styles.statBarWrap}>
            <div
              className={styles.statBarFillPurple}
              style={{
                width: `${homeworks.length > 0 ? (Object.keys(submissions).length / homeworks.length) * 100 : 100}%`,
              }}
            />
          </div>
          <div className={styles.statCardFooter}>
            <span>Vazifalarga o'tish</span>
            <ArrowRight size={14} />
          </div>
        </Link>

        {/* To'lov holati */}
        <Link href="/student/payments" className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>To'lov holati</span>
            <div className={styles.statIconWrapGreen}>
              <CreditCard size={18} />
            </div>
          </div>
          <div className={styles.statValueRow}>
            <span
              className={
                paymentStats.status === 'TOLANGAN'
                  ? styles.statBigValueGreen
                  : styles.statBigValueOrange
              }
            >
              {paymentStats.status === 'TOLANGAN' ? "To'langan" : 'Qarzdorlik'}
            </span>
            <span className={styles.statSubText}>
              {paymentStats.debt === 0
                ? "Qarz yo'q"
                : `${paymentStats.debt.toLocaleString()} so'm`}
            </span>
          </div>
          <div className={styles.paymentPillRow}>
            <CheckCircle2 size={13} className={styles.checkIcon} />
            <span>Oy to'lovi: {paymentStats.monthlyFee.toLocaleString()} so'm</span>
          </div>
          <div className={styles.statCardFooter}>
            <span>Kvitansiyalarni ko'rish</span>
            <ArrowRight size={14} />
          </div>
        </Link>

        {/* Reyting va ballar */}
        <Link href="/student/leaderboard" className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Guruhdagi o'rnim</span>
            <div className={styles.statIconWrapGold}>
              <Trophy size={18} />
            </div>
          </div>
          <div className={styles.statValueRow}>
            <span className={styles.statBigValueGold}>
              {currentUserRank?.rank ? `${currentUserRank.rank}-o'rin` : "2-o'rin"}
            </span>
            <span className={styles.statSubText}>
              {currentUserRank?.xp || 850} XP • {currentUserRank?.coins || 42} Coins
            </span>
          </div>
          <div className={styles.rankBadgesRow}>
            <span className={styles.rankBadge}>⚡ Faol o'quvchi</span>
            <span className={styles.rankBadge}>🔥 5 kun</span>
          </div>
          <div className={styles.statCardFooter}>
            <span>Reyting jadvalini ko'rish</span>
            <ArrowRight size={14} />
          </div>
        </Link>
      </section>

      {/* 4. Split Grid: Recent Videos & Active Homework */}
      <section className={styles.splitGrid}>
        {/* Videos Box */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardHeader}>
            <div className={styles.sectionCardTitleWrap}>
              <Video size={18} className={styles.sectionIconCyan} />
              <h3>Oxirgi yuklangan videolar</h3>
            </div>
            <Link href="/student/videos" className={styles.viewAllLink}>
              <span>Barchasi ({videos.length})</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className={styles.videosList}>
            {recentVideos.length === 0 ? (
              <p className={styles.emptyNotice}>Hozircha videolar yuklanmagan.</p>
            ) : (
              recentVideos.map((v) => (
                <div key={v.id} className={styles.videoItemCard}>
                  <div className={styles.videoThumb}>
                    <Play size={20} className={styles.playIcon} />
                  </div>
                  <div className={styles.videoItemInfo}>
                    <span className={styles.videoTopicBadge}>
                      {v.topic || 'Video dars'}
                    </span>
                    <h4 className={styles.videoItemTitle}>{v.title}</h4>
                    <span className={styles.videoItemMeta}>{v.createdAt}</span>
                  </div>
                  <Link href="/student/videos" className={styles.videoWatchBtn}>
                    Ko'rish
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Homework Box */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardHeader}>
            <div className={styles.sectionCardTitleWrap}>
              <BookOpen size={18} className={styles.sectionIconPurple} />
              <h3>Faol uyga vazifa</h3>
            </div>
            <Link href="/student/homework" className={styles.viewAllLink}>
              <span>Barchasi ({homeworks.length})</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {activeHomework ? (
            <div className={styles.activeHwCard}>
              <div className={styles.hwTopRow}>
                <span className={styles.hwCourseTag}>
                  {activeHomework.courseName || 'Frontend'}
                </span>
                <span
                  className={
                    isHwSubmitted ? styles.hwStatusDone : styles.hwStatusPending
                  }
                >
                  {isHwSubmitted ? '✓ Topshirildi' : '⏱ Topshirilmagan'}
                </span>
              </div>
              <h4 className={styles.hwCardTitle}>{activeHomework.title}</h4>
              <p className={styles.hwCardDesc}>{activeHomework.desc}</p>

              <div className={styles.hwDeadlineRow}>
                <Clock size={14} className={styles.deadlineIcon} />
                <span>Muddati: {activeHomework.deadline}</span>
              </div>

              <div className={styles.hwActionRow}>
                <Link
                  href="/student/homework"
                  className={isHwSubmitted ? styles.hwBtnDone : styles.hwBtnSubmit}
                >
                  {isHwSubmitted ? "Javobni ko'rish" : "Hozir topshirish"}
                </Link>
                <Link href="/student/ai" className={styles.hwBtnAi}>
                  <Sparkles size={14} />
                  <span>AI yordam</span>
                </Link>
              </div>
            </div>
          ) : (
            <p className={styles.emptyNotice}>Hozircha faol vazifa yo'q.</p>
          )}
        </div>
      </section>
    </div>
  );
};
