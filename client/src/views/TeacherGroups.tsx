'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { groupsApi } from '../api/groups.api';
import { Group } from '../types';
import styles from './TeacherGroups.module.css';

export const TeacherGroups: React.FC = () => {
  const router = useRouter();
  const { dict } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'main' | 'archive'>('main');

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['teacherGroupsList'],
    queryFn: () => groupsApi.getAll({ limit: 100 }),
  });

  const allGroups: Group[] = groupsData?.data || [];

  // Statistics
  const stats = useMemo(() => {
    const totalGroups = allGroups.length;
    // Calculate total students
    const totalStudents = allGroups.reduce((acc, g) => {
      const count = g._count?.studentGroups ?? g.studentGroups?.length ?? 0;
      return acc + count;
    }, 0);
    // Number of teachers involved (at least 1 for the logged in teacher)
    const teachersSet = new Set(allGroups.map((g) => g.teacherId).filter(Boolean));
    const totalTeachers = teachersSet.size > 0 ? teachersSet.size : 1;

    return { totalGroups, totalTeachers, totalStudents };
  }, [allGroups]);

  // Tab filtering
  const filteredByTab = useMemo(() => {
    if (activeTab === 'archive') {
      return allGroups.filter((g) => g.status === 'TUGAGAN');
    }
    return allGroups.filter((g) => g.status !== 'TUGAGAN');
  }, [allGroups, activeTab]);

  // Search filtering
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return filteredByTab;
    const term = searchTerm.toLowerCase();
    return filteredByTab.filter(
      (g) =>
        g.name.toLowerCase().includes(term) ||
        g.course?.name?.toLowerCase().includes(term) ||
        g.room?.name?.toLowerCase().includes(term)
    );
  }, [filteredByTab, searchTerm]);

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

        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={dict.teacher?.searchPlaceholder || 'Qidirish...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>
            {dict.teacher?.totalGroups || 'Jami guruhlar'}
          </span>
          <span className={styles.statValue}>
            {isLoading ? '-' : stats.totalGroups}
          </span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>
            {dict.teacher?.teachersCount || "O'qituvchilar"}
          </span>
          <span className={styles.statValue}>
            {isLoading ? '-' : stats.totalTeachers}
          </span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>
            {dict.teacher?.studentsCount || 'Talabalar'}
          </span>
          <span className={styles.statValue}>
            {isLoading ? '-' : stats.totalStudents}
          </span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div>
        <div className={styles.tabPillContainer}>
          <button
            className={`${styles.tabPill} ${activeTab === 'main' ? styles.tabPillActive : ''}`}
            onClick={() => setActiveTab('main')}
          >
            {dict.teacher?.activeGroups || 'Faol guruhlar'}
          </button>
          <button
            className={`${styles.tabPill} ${activeTab === 'archive' ? styles.tabPillActive : ''}`}
            onClick={() => setActiveTab('archive')}
          >
            {dict.teacher?.archiveGroups || 'Arxiv'}
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Status</th>
              <th>{dict.teacher?.groups || 'Guruh'}</th>
              <th>{dict.teacher?.course || 'Kurs'}</th>
              <th>{dict.teacher?.time || 'Dars vaqti'}</th>
              <th>{dict.teacher?.room || 'Xona'}</th>
              <th>{dict.teacher?.studentsCount || 'Talabalar'}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className={styles.emptyNotice}>
                  {dict.loading || 'Yuklanmoqda...'}
                </td>
              </tr>
            ) : filteredGroups.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyNotice}>
                  {dict.teacher?.noGroups || 'Guruhlar topilmadi'}
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
                        {isActive ? 'ACTIVE' : 'ARXIV'}
                      </span>
                    </td>
                    <td>
                      <span className={styles.groupNameText}>{group.name}</span>
                    </td>
                    <td>{group.course?.name || 'Backend'}</td>
                    <td>{group.startTime || '10:44'}</td>
                    <td>{group.room?.name || 'Asosiy'}</td>
                    <td>{studentCount}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
