'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  LayoutGrid,
  List,
  GraduationCap,
  Users,
  BookOpen,
  Clock,
  MapPin,
  Calendar,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { groupsApi } from '../api/groups.api';
import { Group } from '../types';
import styles from './TeacherGroups.module.css';

const DAY_NAMES_MAP: Record<string, string> = {
  DUSH: 'Dushanba',
  SESH: 'Seshanba',
  CHOR: 'Chorshanba',
  PAY: 'Payshanba',
  JU: 'Juma',
  SHAN: 'Shanba',
  YAK: 'Yakshanba',
};

export const TeacherGroups: React.FC = () => {
  const router = useRouter();
  const { dict } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'main' | 'archive'>('main');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const { data: groupsData, isLoading, refetch } = useQuery({
    queryKey: ['teacherGroupsList'],
    queryFn: () => groupsApi.getAll({ limit: 100 }),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  React.useEffect(() => {
    const handleGroupsUpdate = () => {
      refetch();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('groups_updated', handleGroupsUpdate);
      window.addEventListener('focus', handleGroupsUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('groups_updated', handleGroupsUpdate);
        window.removeEventListener('focus', handleGroupsUpdate);
      }
    };
  }, [refetch]);

  const allGroups: Group[] = Array.isArray(groupsData)
    ? groupsData
    : groupsData?.data || [];

  // Statistics
  const stats = useMemo(() => {
    const totalGroups = allGroups.length;
    const activeGroupsCount = allGroups.filter((g) => g.status !== 'TUGAGAN').length;
    // Calculate total students
    const totalStudents = allGroups.reduce((acc, g) => {
      const count = g._count?.studentGroups ?? g.studentGroups?.length ?? 0;
      return acc + count;
    }, 0);
    // Number of teachers involved (at least 1 for the logged in teacher)
    const teachersSet = new Set(allGroups.map((g) => g.teacherId).filter(Boolean));
    const totalTeachers = teachersSet.size > 0 ? teachersSet.size : 1;

    return { totalGroups, activeGroupsCount, totalTeachers, totalStudents };
  }, [allGroups]);

  // Tab filtering
  const filteredByTab = useMemo(() => {
    if (activeTab === 'archive') {
      return allGroups.filter((g) => g.status === 'TUGAGAN');
    }
    return allGroups.filter((g) => g.status !== 'TUGAGAN');
  }, [allGroups, activeTab]);

  // Comprehensive multi-field and multi-token search
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return filteredByTab;

    const terms = searchTerm
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return filteredByTab.filter((g) => {
      const groupName = (g.name || '').toLowerCase();
      const courseName = (g.course?.name || '').toLowerCase();
      const roomName = (g.room?.name || '').toLowerCase();
      const startTime = (g.startTime || '').toLowerCase();
      const endTime = (g.endTime || '').toLowerCase();
      const statusText = g.status === 'TUGAGAN' ? 'arxiv archived tugagan' : 'active faol active';
      const studentCount = String(g._count?.studentGroups ?? g.studentGroups?.length ?? 0);
      const teacherName = g.teacher
        ? `${g.teacher.firstName || ''} ${g.teacher.lastName || ''}`.toLowerCase()
        : '';

      const daysCodes = Array.isArray(g.days) ? g.days.join(' ').toLowerCase() : '';
      const daysNames = Array.isArray(g.days)
        ? g.days
            .map((d: string) => DAY_NAMES_MAP[d] ? `${DAY_NAMES_MAP[d].toLowerCase()} ${d.toLowerCase()}` : d.toLowerCase())
            .join(' ')
        : '';

      const fullHaystack = `${groupName} ${courseName} ${roomName} ${startTime} ${endTime} ${statusText} ${studentCount} ${teacherName} ${daysCodes} ${daysNames}`;

      // Every typed word must match in the haystack
      return terms.every((t) => fullHaystack.includes(t));
    });
  }, [filteredByTab, searchTerm]);

  const activeGroupsTotal = allGroups.filter((g) => g.status !== 'TUGAGAN').length;
  const archiveGroupsTotal = allGroups.filter((g) => g.status === 'TUGAGAN').length;

  return (
    <div className={styles.pageContainer}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h2 className={styles.pageTitle}>
            {dict.teacher?.groupsTitle || 'Guruhlar'}
          </h2>
          <p className={styles.pageSubtitle}>
            {dict.teacher?.groupsSubtitle || "Sizga biriktirilgan guruhlar ro'yxati"}
          </p>
        </div>

        <div className={styles.headerActions}>
          {/* Smart Search Bar */}
          <div className={styles.searchWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={dict.teacher?.searchPlaceholder || "Guruh nomi, fan, vaqt, xona bo'yicha qidirish..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className={styles.searchClearBtn}
                onClick={() => setSearchTerm('')}
                title="Tozalash"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modern Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconWrapCyan}`}>
            <Layers size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>
              {dict.teacher?.totalGroups || 'Jami guruhlar'}
            </span>
            <span className={styles.statValue}>
              {isLoading ? '-' : stats.totalGroups}
            </span>
            <span className={styles.statSub}>
              {stats.activeGroupsCount} ta faol guruh
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconWrapPurple}`}>
            <GraduationCap size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>
              {dict.teacher?.teachersCount || "O'qituvchilar"}
            </span>
            <span className={styles.statValue}>
              {isLoading ? '-' : stats.totalTeachers}
            </span>
            <span className={styles.statSub}>
              Biriktirilgan mutaxassislar
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconWrapEmerald}`}>
            <Users size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>
              {dict.teacher?.studentsCount || 'Talabalar'}
            </span>
            <span className={styles.statValue}>
              {isLoading ? '-' : stats.totalStudents}
            </span>
            <span className={styles.statSub}>
              Jami ta'lim olayotganlar
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar: Tabs & View Mode & Search Feedback */}
      <div className={styles.toolbar}>
        <div className={styles.tabPillContainer}>
          <button
            className={`${styles.tabPill} ${activeTab === 'main' ? styles.tabPillActive : ''}`}
            onClick={() => setActiveTab('main')}
          >
            <span>{dict.teacher?.activeGroups || 'Faol guruhlar'}</span>
            <span className={styles.tabCountBadge}>{activeGroupsTotal}</span>
          </button>
          <button
            className={`${styles.tabPill} ${activeTab === 'archive' ? styles.tabPillActive : ''}`}
            onClick={() => setActiveTab('archive')}
          >
            <span>{dict.teacher?.archiveGroups || 'Arxiv'}</span>
            <span className={styles.tabCountBadge}>{archiveGroupsTotal}</span>
          </button>
        </div>

        <div className={styles.toolbarRight}>
          {searchTerm.trim() && (
            <div className={styles.searchMatchChip}>
              <Sparkles size={13} />
              <span>{filteredGroups.length} ta guruh topildi</span>
            </div>
          )}

          {/* View Mode Switcher */}
          <div className={styles.viewModeToggle}>
            <button
              className={`${styles.viewModeBtn} ${viewMode === 'table' ? styles.viewModeBtnActive : ''}`}
              onClick={() => setViewMode('table')}
              title="Jadval ko'rinishi"
            >
              <List size={17} />
            </button>
            <button
              className={`${styles.viewModeBtn} ${viewMode === 'grid' ? styles.viewModeBtnActive : ''}`}
              onClick={() => setViewMode('grid')}
              title="Karta ko'rinishi"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Cards Grid */}
      {viewMode === 'table' ? (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Status</th>
                <th>{dict.teacher?.groups || 'Guruh nomi'}</th>
                <th>{dict.teacher?.course || 'Kurs'}</th>
                <th>{dict.teacher?.time || 'Dars vaqti'}</th>
                <th>{dict.teacher?.room || 'Xona'}</th>
                <th>{dict.teacher?.studentsCount || 'Talabalar'}</th>
                <th style={{ textAlign: 'right' }}>Amal</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className={styles.emptyNotice}>
                    {dict.loading || 'Yuklanmoqda...'}
                  </td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className={styles.emptyNotice}>
                      <div className={styles.emptyNoticeIcon}>
                        <Search size={26} />
                      </div>
                      <div>
                        {searchTerm ? (
                          <>
                            <strong>"{searchTerm}"</strong> bo'yicha hech qanday guruh topilmadi
                          </>
                        ) : (
                          dict.teacher?.noGroups || "Hozircha guruhlar ro'yxati mavjud emas"
                        )}
                      </div>
                      {searchTerm && (
                        <button
                          type="button"
                          className={styles.clearSearchBtn}
                          onClick={() => setSearchTerm('')}
                        >
                          <X size={14} /> Qidiruvni tozalash
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => {
                  const isActive = group.status !== 'TUGAGAN';
                  const studentCount =
                    group._count?.studentGroups ??
                    group.studentGroups?.length ??
                    0;

                  return (
                    <tr
                      key={group.id}
                      onClick={() => router.push(`/teacher/groups/${group.id}`)}
                    >
                      <td>
                        <span
                          className={
                            isActive
                              ? styles.statusBadgeActive
                              : styles.statusBadgeArchived
                          }
                        >
                          {isActive && <span className={styles.pulsingDot} />}
                          {isActive ? 'ACTIVE' : 'ARXIV'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.groupNameCell}>
                          <div className={styles.groupIconWrap}>
                            <BookOpen size={16} />
                          </div>
                          <span className={styles.groupNameText}>{group.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.courseBadge}>
                          {group.course?.name || 'Frontend'}
                        </span>
                      </td>
                      <td>
                        <span className={styles.chip}>
                          <Clock size={13} />
                          {group.startTime || '10:00'}
                          {group.endTime ? ` - ${group.endTime}` : ''}
                        </span>
                      </td>
                      <td>
                        <span className={styles.chip}>
                          <MapPin size={13} />
                          {group.room?.name || 'Asosiy'}
                        </span>
                      </td>
                      <td>
                        <span className={styles.studentCountChip}>
                          <Users size={13} />
                          {studentCount} ta talaba
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className={styles.actionIconBtn}>
                          <ArrowRight size={16} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Cards Grid View */
        <div className={styles.cardsGrid}>
          {isLoading ? (
            <div className={styles.emptyNotice} style={{ gridColumn: '1 / -1' }}>
              {dict.loading || 'Yuklanmoqda...'}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className={styles.emptyNotice} style={{ gridColumn: '1 / -1' }}>
              <div className={styles.emptyNoticeIcon}>
                <Search size={26} />
              </div>
              <div>
                {searchTerm ? (
                  <>
                    <strong>"{searchTerm}"</strong> bo'yicha hech qanday guruh topilmadi
                  </>
                ) : (
                  dict.teacher?.noGroups || "Guruhlar topilmadi"
                )}
              </div>
              {searchTerm && (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={() => setSearchTerm('')}
                >
                  <X size={14} /> Qidiruvni tozalash
                </button>
              )}
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isActive = group.status !== 'TUGAGAN';
              const studentCount =
                group._count?.studentGroups ??
                group.studentGroups?.length ??
                0;

              const formattedDays = Array.isArray(group.days) && group.days.length > 0
                ? group.days.map((d: string) => DAY_NAMES_MAP[d] || d).join(', ')
                : 'Dush, Chor, Ju';

              return (
                <div
                  key={group.id}
                  className={styles.groupCard}
                  onClick={() => router.push(`/teacher/groups/${group.id}`)}
                >
                  <div>
                    <div className={styles.cardTopRow}>
                      <span className={styles.courseBadge}>
                        {group.course?.name || 'Frontend'}
                      </span>
                      <span
                        className={
                          isActive
                            ? styles.statusBadgeActive
                            : styles.statusBadgeArchived
                        }
                      >
                        {isActive && <span className={styles.pulsingDot} />}
                        {isActive ? 'ACTIVE' : 'ARXIV'}
                      </span>
                    </div>

                    <h3 className={styles.cardTitle} style={{ marginTop: '14px' }}>
                      {group.name}
                    </h3>
                  </div>

                  <div className={styles.cardMetaList}>
                    <div className={styles.cardMetaItem}>
                      <Clock size={14} />
                      <span>{group.startTime || '10:00'} {group.endTime ? `- ${group.endTime}` : ''}</span>
                    </div>
                    <div className={styles.cardMetaItem}>
                      <MapPin size={14} />
                      <span>{group.room?.name || 'Asosiy'}</span>
                    </div>
                    <div className={styles.cardMetaItem}>
                      <Calendar size={14} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {formattedDays}
                      </span>
                    </div>
                    <div className={styles.cardMetaItem}>
                      <Users size={14} />
                      <span>{studentCount} ta talaba</span>
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                      Guruh monitoringi
                    </span>
                    <button type="button" className={styles.cardEnterBtn}>
                      <span>Kirish</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
