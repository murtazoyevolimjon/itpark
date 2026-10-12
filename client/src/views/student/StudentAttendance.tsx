'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useStudentPortal } from '../../hooks/useStudentPortal';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  XCircle,
  BookOpen,
  Play,
  Search,
  Filter,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Info,
} from 'lucide-react';
import styles from './StudentAttendance.module.css';

export const StudentAttendance: React.FC = () => {
  const {
    group,
    attendances,
    attendanceStats,
    latestTopic,
    videos,
  } = useStudentPortal();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'KELGAN' | 'KECHIKKAN' | 'KELMAGAN'>('ALL');
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);

  // Generate enriched lessons combining API attendances with teacher's saved lessons
  const enrichedLessons = useMemo(() => {
    // 1. Check if group_lessons_${groupId} exists
    let savedLessons: any[] = [];
    if (group) {
      try {
        const stored = localStorage.getItem(`group_lessons_${group.id}`);
        if (stored) {
          savedLessons = JSON.parse(stored);
        }
      } catch {}
    }

    // Default sample lessons if attendances are empty
    const baseLessons = [
      {
        id: 'att-12',
        date: '12.10.2026',
        topic: latestTopic.topic || 'React Hooks: useEffect va Custom Hooks yaratish',
        status: 'KELGAN',
        xp: 10,
        lessonNumber: 12,
        teacher: group?.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : 'Olimjon Murtazoyev',
        hasVideo: true,
      },
      {
        id: 'att-11',
        date: '10.10.2026',
        topic: 'React State Management va useState amaliyoti',
        status: 'KELGAN',
        xp: 10,
        lessonNumber: 11,
        teacher: group?.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : 'Olimjon Murtazoyev',
        hasVideo: true,
      },
      {
        id: 'att-10',
        date: '08.10.2026',
        topic: 'React Components, JSX sintaksisi va Props uzatish',
        status: 'KELGAN',
        xp: 10,
        lessonNumber: 10,
        teacher: group?.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : 'Olimjon Murtazoyev',
        hasVideo: true,
      },
      {
        id: 'att-9',
        date: '05.10.2026',
        topic: 'JavaScript ES6+: Async/Await va Fetch API bilan ishlash',
        status: 'KECHIKKAN',
        xp: 5,
        lessonNumber: 9,
        teacher: group?.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : 'Olimjon Murtazoyev',
        hasVideo: false,
      },
      {
        id: 'att-8',
        date: '03.10.2026',
        topic: 'JavaScript DOM bilan ishlash va Hodisalar (Events)',
        status: 'KELGAN',
        xp: 10,
        lessonNumber: 8,
        teacher: group?.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : 'Olimjon Murtazoyev',
        hasVideo: true,
      },
      {
        id: 'att-7',
        date: '01.10.2026',
        topic: 'JavaScript Funksiyalar va Massiv metodlari (map, filter)',
        status: 'KELGAN',
        xp: 10,
        lessonNumber: 7,
        teacher: group?.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : 'Olimjon Murtazoyev',
        hasVideo: false,
      },
      {
        id: 'att-6',
        date: '28.09.2026',
        topic: 'JavaScript O\'zgaruvchilar, Ma\'lumot turlari va Shartlar',
        status: 'KELMAGAN',
        xp: 0,
        lessonNumber: 6,
        teacher: group?.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : 'Olimjon Murtazoyev',
        hasVideo: false,
      },
    ];

    // If real attendances exist, merge them
    if (attendances.length > 0) {
      return attendances.map((a, idx) => {
        const topic =
          a.note?.trim() ||
          (savedLessons[idx]?.title || `Dars ${idx + 1}: ${group?.course?.name || 'Dasturlash'}`);
        return {
          id: a.id,
          date: new Date(a.date).toLocaleDateString('uz-UZ'),
          topic,
          status: a.status,
          xp: a.status === 'KELGAN' ? 10 : a.status === 'KECHIKKAN' ? 5 : 0,
          lessonNumber: attendances.length - idx,
          teacher: group?.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : 'Ustoz',
          hasVideo: videos.some((v) => v.topic?.toLowerCase().includes(topic.toLowerCase())),
        };
      });
    }

    return baseLessons;
  }, [attendances, group, latestTopic, videos]);

  // Filtered lessons
  const filteredLessons = useMemo(() => {
    return enrichedLessons.filter((item) => {
      if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.topic.toLowerCase().includes(q) ||
          item.date.includes(q) ||
          `dars ${item.lessonNumber}`.includes(q)
        );
      }
      return true;
    });
  }, [enrichedLessons, filterStatus, searchQuery]);

  return (
    <div className={styles.container}>
      {/* 1. Header Banner */}
      <section className={styles.headerSection}>
        <div className={styles.headerText}>
          <div className={styles.pageBadge}>
            <CalendarCheck size={13} />
            <span>Akademik nazorat</span>
          </div>
          <h1 className={styles.title}>Davomat va O'tilgan mavzular</h1>
          <p className={styles.subtitle}>
            Ustoz tomonidan o'tilgan har bir mavzu va sizning darslardagi ishtirokingiz to'liq qayd etiladi.
          </p>
        </div>

        {/* Highlight current announced topic */}
        <div className={styles.currentTopicCallout}>
          <div className={styles.calloutTop}>
            <span className={styles.calloutTag}>Oxirgi o'tilgan dars</span>
            <span className={styles.calloutDate}>{latestTopic.date}</span>
          </div>
          <h3 className={styles.calloutTitle}>{latestTopic.topic}</h3>
          <div className={styles.calloutTeacher}>
            Ustoz: <strong>{latestTopic.teacherName}</strong>
          </div>
        </div>
      </section>

      {/* 2. Attendance Metric Cards */}
      <section className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIconWrapCyan}>
            <CalendarCheck size={20} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Davomat foizi</span>
            <span className={styles.metricValue}>{attendanceStats.percentage}%</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIconWrapGreen}>
            <CheckCircle2 size={20} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Kelgan (Bor)</span>
            <span className={styles.metricValueGreen}>{attendanceStats.present} ta</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIconWrapYellow}>
            <Clock size={20} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Kechikkan</span>
            <span className={styles.metricValueYellow}>{attendanceStats.late} ta</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIconWrapRed}>
            <XCircle size={20} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Kelmagan</span>
            <span className={styles.metricValueRed}>{attendanceStats.absent} ta</span>
          </div>
        </div>
      </section>

      {/* 3. Controls & Filter Bar */}
      <section className={styles.controlsBar}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Mavzu nomi yoki sana bo'yicha qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterPills}>
          <button
            className={`${styles.filterPill} ${filterStatus === 'ALL' ? styles.filterPillActive : ''}`}
            onClick={() => setFilterStatus('ALL')}
          >
            Barchasi ({enrichedLessons.length})
          </button>
          <button
            className={`${styles.filterPill} ${filterStatus === 'KELGAN' ? styles.filterPillActive : ''}`}
            onClick={() => setFilterStatus('KELGAN')}
          >
            ✓ Kelgan
          </button>
          <button
            className={`${styles.filterPill} ${filterStatus === 'KECHIKKAN' ? styles.filterPillActive : ''}`}
            onClick={() => setFilterStatus('KECHIKKAN')}
          >
            ⏱ Kechikkan
          </button>
          <button
            className={`${styles.filterPill} ${filterStatus === 'KELMAGAN' ? styles.filterPillActive : ''}`}
            onClick={() => setFilterStatus('KELMAGAN')}
          >
            ✕ Kelmagan
          </button>
        </div>
      </section>

      {/* 4. Lesson Topics & Attendance Timeline Table */}
      <section className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <div className={styles.tableTitleWrap}>
            <BookOpen size={18} className={styles.bookIcon} />
            <h2>Dars mavzulari va davomat daftari</h2>
          </div>
          <span className={styles.totalBadge}>
            Jami: {filteredLessons.length} ta dars
          </span>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Dars #</th>
                <th>Sana</th>
                <th>O'tilgan mavzu (Ustoz kiritgan)</th>
                <th>Holat</th>
                <th>Ball (XP)</th>
                <th>Amal</th>
              </tr>
            </thead>
            <tbody>
              {filteredLessons.map((lesson) => {
                const isPresent = lesson.status === 'KELGAN';
                const isLate = lesson.status === 'KECHIKKAN';
                const isAbsent = lesson.status === 'KELMAGAN';

                return (
                  <tr
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson)}
                    className={styles.tableRow}
                  >
                    <td>
                      <span className={styles.lessonNumBadge}>
                        #{lesson.lessonNumber}
                      </span>
                    </td>
                    <td>
                      <span className={styles.dateText}>{lesson.date}</span>
                    </td>
                    <td>
                      <div className={styles.topicCell}>
                        <span className={styles.topicName}>{lesson.topic}</span>
                        <span className={styles.topicTeacher}>{lesson.teacher}</span>
                      </div>
                    </td>
                    <td>
                      {isPresent && (
                        <span className={styles.statusBadgePresent}>
                          <CheckCircle2 size={12} />
                          <span>Kelgan</span>
                        </span>
                      )}
                      {isLate && (
                        <span className={styles.statusBadgeLate}>
                          <Clock size={12} />
                          <span>Kechikkan</span>
                        </span>
                      )}
                      {isAbsent && (
                        <span className={styles.statusBadgeAbsent}>
                          <XCircle size={12} />
                          <span>Kelmagan</span>
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={
                          lesson.xp > 0 ? styles.xpGainText : styles.xpZeroText
                        }
                      >
                        +{lesson.xp} XP
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionCell}>
                        <Link
                          href="/student/videos"
                          onClick={(e) => e.stopPropagation()}
                          className={styles.actionIconBtn}
                          title="Dars videosini ko'rish"
                        >
                          <Play size={14} />
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLesson(lesson);
                          }}
                          className={styles.viewDetailBtn}
                        >
                          Batafsil
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Lesson Detail Modal */}
      {selectedLesson && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setSelectedLesson(null)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalBadge}>
                #{selectedLesson.lessonNumber}-Dars • {selectedLesson.date}
              </div>
              <button
                className={styles.closeBtn}
                onClick={() => setSelectedLesson(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <h2 className={styles.modalTitle}>{selectedLesson.topic}</h2>
              <p className={styles.modalTeacher}>
                O'qituvchi: <strong>{selectedLesson.teacher}</strong>
              </p>

              <div className={styles.modalStatusBox}>
                <div className={styles.statusBoxLeft}>
                  <span className={styles.boxLabel}>Davomat holatingiz:</span>
                  <span
                    className={
                      selectedLesson.status === 'KELGAN'
                        ? styles.statusBadgePresent
                        : selectedLesson.status === 'KECHIKKAN'
                        ? styles.statusBadgeLate
                        : styles.statusBadgeAbsent
                    }
                  >
                    {selectedLesson.status === 'KELGAN'
                      ? '✓ Darsda qatnashgan'
                      : selectedLesson.status === 'KECHIKKAN'
                      ? '⏱ Darsga kechikib kelgan'
                      : '✕ Darsda qatnashmagan'}
                  </span>
                </div>
                <div className={styles.statusBoxRight}>
                  <span className={styles.boxLabel}>Olingan ball:</span>
                  <span className={styles.boxXp}>+{selectedLesson.xp} XP</span>
                </div>
              </div>

              <div className={styles.modalActions}>
                <Link
                  href="/student/videos"
                  className={styles.modalVideoBtn}
                  onClick={() => setSelectedLesson(null)}
                >
                  <Play size={16} />
                  <span>Dars videosini ko'rish</span>
                </Link>
                <Link
                  href="/student/homework"
                  className={styles.modalHwBtn}
                  onClick={() => setSelectedLesson(null)}
                >
                  <BookOpen size={16} />
                  <span>Vazifani topshirish</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
