'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Lock,
  CheckCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Phone,
} from 'lucide-react';
import { formatDate } from '../utils/formatDate';
import { Card } from '../components/ui/Card/Card';
import { Button } from '../components/ui/Button/Button';
import { Input } from '../components/ui/Input/Input';
import { Badge } from '../components/ui/Badge/Badge';
import { Modal } from '../components/ui/Modal/Modal';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import { useToast } from '../components/ui/Toast/Toast';
import {
  GroupCardSelect,
  getCourseBadge,
  getGroupTime,
  cleanGroupTitle,
  formatGroupDays,
} from '../components/ui/GroupCardSelect/GroupCardSelect';
import { groupsApi } from '../api/groups.api';
import { attendanceApi } from '../api/attendance.api';
import { AttendanceStatus } from '../types';
import { formatPhone } from '../utils/phoneMask';
import {
  getTashkentDateString,
  checkAttendanceTimeEligibility,
} from '../utils/attendanceTime';
import { LessonTopicSelect } from '../components/ui/LessonTopicSelect/LessonTopicSelect';
import { useLanguage } from '../hooks/useLanguage';

const checkIsClassDay = (group: any, dateStr: string): boolean => {
  if (!dateStr) return false;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  const [y, m, d] = parts.map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayMap = ['YAK', 'DUSH', 'SESH', 'CHOR', 'PAY', 'JU', 'SHAN'];
  const dayCode = dayMap[dateObj.getDay()];

  if (Array.isArray(group.days) && group.days.includes(dayCode)) {
    return true;
  }
  const name = (group.name || '').toLowerCase();
  if (dayCode === 'DUSH' && name.includes('dush')) return true;
  if (dayCode === 'SESH' && name.includes('sesh')) return true;
  if (dayCode === 'CHOR' && name.includes('chor')) return true;
  if (dayCode === 'PAY' && name.includes('pay')) return true;
  if (dayCode === 'JU' && (name.includes('jum') || name.includes('ju'))) return true;
  if (dayCode === 'SHAN' && name.includes('shan')) return true;
  return false;
};

export const TeacherAttendance: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { dict } = useLanguage();

  const queryGroupId = searchParams.get('groupId') || '';

  const todayStr = useMemo(() => getTashkentDateString(), []);
  const minAllowedDate = useMemo(() => {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }, []);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(queryGroupId);
  const [attendanceDate, setAttendanceDate] = useState<string>(todayStr);
  const [attendanceTopic, setAttendanceTopic] = useState<string>('');
  const [topicError, setTopicError] = useState<boolean>(false);

  // Form statuses state: studentId -> status (only used when taking initial attendance)
  const [studentStatuses, setStudentStatuses] = useState<Record<string, AttendanceStatus>>({});

  // Late reason modal state for changing KELMAGAN -> KECHIKKAN
  const [lateModalStudent, setLateModalStudent] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [lateReason, setLateReason] = useState<string>('');

  // Fetch only this teacher's groups
  const { data: groupsData, isLoading: isGroupsLoading } = useQuery({
    queryKey: ['teacherGroupsAttendance'],
    queryFn: () => groupsApi.getAll({ limit: 100 }),
  });

  const groups = groupsData?.data || [];

  // Select group if passed in query param or pick first
  useEffect(() => {
    if (queryGroupId) {
      setSelectedGroupId(queryGroupId);
    } else if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, queryGroupId, selectedGroupId]);

  // Fetch group details (to get students, start time, etc.)
  const { data: groupDetail, isLoading: isGroupLoading } = useQuery({
    queryKey: ['teacherGroupDetail', selectedGroupId],
    queryFn: () => groupsApi.getOne(selectedGroupId),
    enabled: !!selectedGroupId,
  });

  // Fetch existing attendance for this group and date
  const {
    data: existingAttendance,
    isLoading: isAttendanceLoading,
    refetch: refetchAttendance,
  } = useQuery({
    queryKey: ['teacherExistingAttendance', selectedGroupId, attendanceDate],
    queryFn: () => attendanceApi.getByGroup(selectedGroupId, attendanceDate),
    enabled: !!selectedGroupId && !!attendanceDate,
  });

  // Map of saved attendances: studentId -> { status, note }
  // Only considers attendances matching the selected attendanceDate!
  const savedAttendancesMap = useMemo(() => {
    const map: Record<string, { status: AttendanceStatus; note?: string }> = {};
    if (Array.isArray(existingAttendance)) {
      const cleanDate = attendanceDate.split('T')[0];
      existingAttendance.forEach((att: any) => {
        const attDateStr = att.date ? att.date.split('T')[0] : '';
        if (attDateStr && attDateStr !== cleanDate) {
          return;
        }
        if (att.studentId && att.status) {
          map[att.studentId] = {
            status: att.status,
            note: att.note || '',
          };
        }
      });
    }
    return map;
  }, [existingAttendance, attendanceDate]);

  const hasAnySavedAttendance = Object.keys(savedAttendancesMap).length > 0;

  // Extract all recorded attendance dates for this group
  const availableHistoryDates = useMemo(() => {
    if (!groupDetail?.attendances || !Array.isArray(groupDetail.attendances)) return [];
    const set = new Set<string>();
    groupDetail.attendances.forEach((a: any) => {
      if (a.date) {
        const d = a.date.split('T')[0];
        if (d) set.add(d);
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [groupDetail?.attendances]);

  // Saved lesson topic if available
  const savedTopicNote = useMemo(() => {
    if (!hasAnySavedAttendance) return '';
    const firstWithNote = Object.values(savedAttendancesMap).find((s) => s.note && !s.note.toLowerCase().includes('sabab:'));
    return firstWithNote?.note || '';
  }, [hasAnySavedAttendance, savedAttendancesMap]);

  // Extract all distinct past lesson topics from all recorded attendances of this group
  const pastAttendanceTopics = useMemo(() => {
    if (!groupDetail?.attendances || !Array.isArray(groupDetail.attendances)) return [];
    const seen = new Set<string>();
    const list: { title: string; date?: string }[] = [];
    const sorted = [...groupDetail.attendances].sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
    sorted.forEach((a: any) => {
      const note = a.note ? a.note.trim() : '';
      if (note && !note.toLowerCase().includes('sabab:') && !seen.has(note)) {
        seen.add(note);
        list.push({ title: note, date: a.date ? a.date.split('T')[0] : '' });
      }
    });
    return list;
  }, [groupDetail?.attendances]);

  // The latest (most recent) lesson topic of this group
  const latestLessonTopic = useMemo(() => {
    if (hasAnySavedAttendance && savedTopicNote) {
      return savedTopicNote;
    }
    if (typeof window !== 'undefined' && selectedGroupId) {
      const stored = localStorage.getItem(`group_last_topic_${selectedGroupId}`);
      if (stored && stored.trim()) return stored.trim();
    }
    if (pastAttendanceTopics.length > 0) {
      return pastAttendanceTopics[0].title;
    }
    if (typeof window !== 'undefined' && selectedGroupId) {
      try {
        const lessons = localStorage.getItem(`group_lessons_${selectedGroupId}`);
        if (lessons) {
          const parsed = JSON.parse(lessons);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.title) {
            return parsed[0].title.trim();
          }
        }
      } catch {}
    }
    return '';
  }, [hasAnySavedAttendance, savedTopicNote, selectedGroupId, pastAttendanceTopics]);

  // Sync attendanceTopic whenever group, date, or saved topic changes!
  useEffect(() => {
    if (hasAnySavedAttendance) {
      // Davomat olingan bo'lsa: aynan shu kunda saqlangan mavzu chiqib tursin!
      setAttendanceTopic(savedTopicNote || '');
    } else {
      // Yangi davomat olinayotganda: oxirgi dars mavzusi avtomatik chiqib tursin!
      if (latestLessonTopic) {
        setAttendanceTopic(latestLessonTopic);
      } else {
        setAttendanceTopic('');
      }
    }
  }, [attendanceDate, selectedGroupId, hasAnySavedAttendance, savedTopicNote, latestLessonTopic]);

  // Time eligibility check for taking initial attendance on this group & date
  const timeEligibility = useMemo(() => {
    return checkAttendanceTimeEligibility(attendanceDate, groupDetail);
  }, [attendanceDate, groupDetail]);

  // Initialize student statuses for initial taking
  useEffect(() => {
    if (groupDetail?.studentGroups) {
      const initialStatuses: Record<string, AttendanceStatus> = {};

      groupDetail.studentGroups.forEach((sg: any) => {
        const student = sg.student;
        if (student) {
          const saved = savedAttendancesMap[student.id];
          if (saved) {
            initialStatuses[student.id] = saved.status;
          } else {
            // Default to KELGAN for initial attendance
            initialStatuses[student.id] = 'KELGAN';
          }
        }
      });

      setStudentStatuses(initialStatuses);
    }
  }, [groupDetail, savedAttendancesMap]);

  // Save Mutation (Initial or Late update)
  const saveMutation = useMutation({
    mutationFn: (payload: any) => attendanceApi.bulkSave(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['teacherExistingAttendance', selectedGroupId, attendanceDate],
      });
      queryClient.invalidateQueries({
        queryKey: ['attendanceStats'],
      });
      queryClient.invalidateQueries({
        queryKey: ['teacherDashboardStats'],
      });
      refetchAttendance();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Davomat saqlashda xatolik yuz berdi');
    },
  });

  // Handle changing status when taking NEW attendance
  const handleInitialStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (hasAnySavedAttendance || !timeEligibility.canTakeAttendance) return;
    setStudentStatuses((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  // Mark all as KELGAN (only when taking initial attendance)
  const handleMarkAllPresent = () => {
    if (hasAnySavedAttendance || !timeEligibility.canTakeAttendance) return;
    if (!groupDetail?.studentGroups) return;

    const allPresent: Record<string, AttendanceStatus> = {};
    groupDetail.studentGroups.forEach((sg: any) => {
      if (sg.student) {
        allPresent[sg.student.id] = 'KELGAN';
      }
    });
    setStudentStatuses(allPresent);
    success("Barcha o'quvchilar 'Kelgan' deb belgilandi");
  };

  // Save Initial Attendance (Can only be done ONCE)
  const handleSaveInitialAttendance = () => {
    if (hasAnySavedAttendance) {
      error("Ushbu sana uchun davomat allaqachon saqlangan va qayta olib bo'lmaydi!");
      return;
    }

    if (!timeEligibility.canTakeAttendance) {
      error(timeEligibility.message);
      return;
    }

    if (!selectedGroupId) {
      error('Iltimos, guruhni tanlang');
      return;
    }

    const students = groupDetail?.studentGroups || [];
    if (students.length === 0) {
      error("Ushbu guruhda o'quvchilar mavjud emas");
      return;
    }

    // Dars mavzusi majburiy tekshiruvi
    if (!attendanceTopic.trim()) {
      setTopicError(true);
      error("Dars mavzusini tanlash yoki yozish majburiy! Mavzusiz davomat olib bo'lmaydi.");
      return;
    }

    const records = students.map((sg: any) => ({
      studentId: sg.student.id,
      status: studentStatuses[sg.student.id] || 'KELGAN',
      note: attendanceTopic.trim(),
    }));

    saveMutation.mutate(
      {
        groupId: selectedGroupId,
        date: attendanceDate,
        records,
      },
      {
        onSuccess: () => {
          success("Davomat muvaffaqiyatli saqlandi! Endi u qulflangan.");
          // Persist this topic so it stays as the last lesson topic for this group
          if (typeof window !== 'undefined' && selectedGroupId && attendanceTopic.trim()) {
            localStorage.setItem(`group_last_topic_${selectedGroupId}`, attendanceTopic.trim());
            try {
              const prev = localStorage.getItem(`group_lessons_${selectedGroupId}`);
              const parsed = prev ? JSON.parse(prev) : [];
              const exists = parsed.some((p: any) => p.title?.trim() === attendanceTopic.trim());
              if (!exists) {
                const updated = [
                  { id: Date.now().toString(), title: attendanceTopic.trim(), createdAt: new Date().toLocaleDateString('uz-UZ') },
                  ...parsed,
                ];
                localStorage.setItem(`group_lessons_${selectedGroupId}`, JSON.stringify(updated));
              }
            } catch {}
          }
        },
      }
    );
  };

  // Open modal to mark an absent student as LATE
  const handleOpenLateModal = (studentId: string, studentName: string) => {
    setLateModalStudent({ id: studentId, name: studentName });
    setLateReason('');
  };

  // Submit LATE modification (KELMAGAN -> KECHIKKAN)
  const handleConfirmLate = () => {
    if (!lateModalStudent) return;
    if (!lateReason.trim()) {
      error("Kechikish sababini yozish majburiy!");
      return;
    }

    saveMutation.mutate(
      {
        groupId: selectedGroupId,
        date: attendanceDate,
        records: [
          {
            studentId: lateModalStudent.id,
            status: 'KECHIKKAN',
            note: lateReason.trim(),
          },
        ],
      },
      {
        onSuccess: () => {
          success(`${lateModalStudent.name} 'Kechikkan' deb qayd etildi!`);
          setLateModalStudent(null);
          setLateReason('');
        },
      }
    );
  };

  const studentsList = groupDetail?.studentGroups || [];

  // Summary counts
  const summaryCounts = useMemo(() => {
    let kelgan = 0;
    let kelmagan = 0;
    let kechikkan = 0;

    if (hasAnySavedAttendance) {
      Object.values(savedAttendancesMap).forEach((st) => {
        if (st.status === 'KELGAN') kelgan++;
        else if (st.status === 'KELMAGAN') kelmagan++;
        else if (st.status === 'KECHIKKAN') kechikkan++;
      });
    } else {
      Object.values(studentStatuses).forEach((st) => {
        if (st === 'KELGAN') kelgan++;
        else if (st === 'KELMAGAN') kelmagan++;
        else if (st === 'KECHIKKAN') kechikkan++;
      });
    }

    return { kelgan, kelmagan, kechikkan, total: studentsList.length };
  }, [hasAnySavedAttendance, savedAttendancesMap, studentStatuses, studentsList]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="outline" size="sm" onClick={() => router.push('/teacher')}>
            <ArrowLeft size={16} /> {dict.teacher?.back || 'Orqaga'}
          </Button>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              {dict.teacher?.attendance || 'Akademik davomat'}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              {dict.teacher?.groupInfoSubtitle || "Dars mashg'ulotlari bo'yicha davomatni qayd etish"}
            </p>
          </div>
        </div>

        {/* Live Counters */}
        {studentsList.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              ✓ {dict.teacher?.present || 'Kelgan'}: {summaryCounts.kelgan}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
              ✕ {dict.teacher?.absent || 'Kelmagan'}: {summaryCounts.kelmagan}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              🕒 {dict.teacher?.late || 'Kechikkan'}: {summaryCounts.kechikkan}
            </span>
          </div>
        )}
      </div>

      {/* Group & Date Selectors */}
      <Card>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            alignItems: 'flex-start',
          }}
        >
          <GroupCardSelect
            label="Guruhni tanlang"
            groups={groups}
            value={selectedGroupId}
            onChange={(newId) => setSelectedGroupId(newId)}
            placeholder="Guruhni tanlang"
            searchPlaceholder="Guruh, fan yoki dars vaqti bo'yicha qidirish..."
          />
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                Dars sanasi (Yil, oy, kun):
              </label>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <Button
                  size="sm"
                  variant="outline"
                  title="Oldingi kun"
                  disabled={attendanceDate <= minAllowedDate}
                  style={{
                    padding: '3px 8px',
                    height: '28px',
                    fontSize: '12px',
                    opacity: attendanceDate <= minAllowedDate ? 0.4 : 1,
                  }}
                  onClick={() => {
                    const d = new Date(attendanceDate);
                    d.setDate(d.getDate() - 1);
                    const newD = d.toISOString().split('T')[0];
                    if (newD >= minAllowedDate) {
                      setAttendanceDate(newD);
                    }
                  }}
                >
                  <ChevronLeft size={13} /> Oldingi kun
                </Button>
                <Button
                  size="sm"
                  variant={attendanceDate === todayStr ? 'primary' : 'outline'}
                  style={{ padding: '3px 8px', height: '28px', fontSize: '12px' }}
                  onClick={() => setAttendanceDate(todayStr)}
                >
                  Bugun
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  title="Keyingi kun"
                  disabled={attendanceDate >= todayStr}
                  style={{
                    padding: '3px 8px',
                    height: '28px',
                    fontSize: '12px',
                    opacity: attendanceDate >= todayStr ? 0.4 : 1,
                  }}
                  onClick={() => {
                    const d = new Date(attendanceDate);
                    d.setDate(d.getDate() + 1);
                    const newD = d.toISOString().split('T')[0];
                    if (newD <= todayStr) {
                      setAttendanceDate(newD);
                    }
                  }}
                >
                  Keyingi kun <ChevronRight size={13} />
                </Button>
              </div>
            </div>
            <Input
              type="date"
              value={attendanceDate}
              min={minAllowedDate}
              max={todayStr}
              onChange={(e) => setAttendanceDate(e.target.value)}
            />
          </div>
        </div>

        {/* Quick select chips for teacher's groups */}
        {groups.length > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '16px',
              flexWrap: 'wrap',
              paddingTop: '14px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-muted)',
              }}
            >
              Tezkor tanlash:
            </span>
            {groups.map((g: any) => {
              const isSelected = selectedGroupId === g.id;
              const badge = getCourseBadge(g.course?.name, g.name);
              const time = getGroupTime(g.startTime, g.name);
              const title = cleanGroupTitle(g.name, g.course?.name);
              const isClassDay = checkIsClassDay(g, attendanceDate);

              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGroupId(g.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isSelected
                      ? `2px solid ${badge.border}`
                      : '1px solid var(--border)',
                    background: isSelected
                      ? 'rgba(59, 130, 246, 0.15)'
                      : 'var(--card-subtle)',
                    color: isSelected ? 'var(--text)' : 'var(--text-muted)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '4px',
                      color: badge.color,
                      backgroundColor: badge.bg,
                    }}
                  >
                    {badge.tag}
                  </span>
                  <span>{title}</span>
                  {time !== '--:--' && (
                    <span style={{ fontSize: '11px', opacity: 0.85 }}>
                      ({time})
                    </span>
                  )}
                  {isClassDay && (
                    <span
                      style={{
                        fontSize: '10px',
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#10b981',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        fontWeight: 700,
                      }}
                      title="Bugun dars bor"
                    >
                      Bugun
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Available History Dates Chips */}
        {availableHistoryDates.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '14px',
              flexWrap: 'wrap',
              paddingTop: '12px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-muted)',
              }}
            >
              Mavjud davomat sanalari ({availableHistoryDates.length} ta dars):
            </span>
            {availableHistoryDates.map((dateStr) => {
              const isSelected = attendanceDate === dateStr;
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setAttendanceDate(dateStr)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                    background: isSelected ? 'var(--primary)' : 'var(--card-subtle)',
                    color: isSelected ? '#ffffff' : 'var(--text)',
                  }}
                >
                  <CalendarCheck size={12} />
                  <span>{formatDate(dateStr)}</span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Status Banner */}
      {selectedGroupId && (
        hasAnySavedAttendance ? (
          /* SAVED AND LOCKED BANNER */
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <Lock size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text)' }}>
              <strong style={{ color: '#d97706', display: 'block', fontSize: '14px', marginBottom: '2px' }}>
                {attendanceDate !== todayStr ? `${formatDate(attendanceDate)} dars davomati tarixi (Saqlangan)` : 'Davomat saqlangan! (Qulflangan)'}
              </strong>
              {savedTopicNote && (
                <div style={{ margin: '4px 0 6px 0', color: 'var(--primary)', fontWeight: 600 }}>
                  📚 O'tilgan mavzu: {savedTopicNote}
                </div>
              )}
              Ushbu sana uchun kunlik davomat allaqachon olingan va tizimda saqlangan.{' '}
              {attendanceDate === todayStr && (
                <>
                  <strong>Yagona ruxsat:</strong> Dars boshida <em>"Kelmagan"</em> deb belgilangan o'quvchi kechikib kelsa, uni <em>"Kechikib keldi"</em> tugmasi orqali sababini yozib <em>"Kechikkan"</em> holatiga o'tkazishingiz mumkin.
                </>
              )}
            </div>
          </div>
        ) : !timeEligibility.canTakeAttendance ? (
          /* TIME RESTRICTION OR PAST DATE BANNER */
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '12px',
              background: timeEligibility.status === 'TIME_EXPIRED' || timeEligibility.status === 'PAST_DATE'
                ? 'rgba(239, 68, 68, 0.08)'
                : 'rgba(245, 158, 11, 0.08)',
              border: timeEligibility.status === 'TIME_EXPIRED' || timeEligibility.status === 'PAST_DATE'
                ? '1px solid rgba(239, 68, 68, 0.3)'
                : '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            {timeEligibility.status === 'TIME_EXPIRED' ? (
              <Clock size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            )}
            <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text)' }}>
              <strong
                style={{
                  color: timeEligibility.status === 'TIME_EXPIRED' || timeEligibility.status === 'PAST_DATE' ? '#ef4444' : '#d97706',
                  display: 'block',
                  fontSize: '14px',
                  marginBottom: '2px',
                }}
              >
                {timeEligibility.status === 'TIME_EXPIRED'
                  ? 'Davomat olish vaqti tugagan!'
                  : timeEligibility.status === 'PAST_DATE'
                  ? "O'tgan sana uchun yangi davomat saqlab bo'lmaydi!"
                  : timeEligibility.status === 'FUTURE_DATE'
                  ? "Kelgusi sana uchun davomat olinmaydi!"
                  : 'Dars hali boshlanmagan!'}
              </strong>
              {timeEligibility.message}
            </div>
          </div>
        ) : (
          /* INITIAL TAKING BANNER (WITHIN ALLOWED TIME) */
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CalendarCheck size={18} color="#3b82f6" />
              <span style={{ fontSize: '13px', color: 'var(--text)' }}>
                Darsga kelganlarni <strong>"Kelgan"</strong>, hali kelmaganlarni <strong>"Kelmagan"</strong> deb belgilang va <strong>"Davomatni saqlash"</strong> tugmasini bosing.
                {timeEligibility.deadlineTime && (
                  <span style={{ color: '#2563eb', fontWeight: 600, marginLeft: '6px' }}>
                    (Soat {timeEligibility.deadlineTime} gacha)
                  </span>
                )}
              </span>
            </div>

            <Button size="sm" variant="outline" onClick={handleMarkAllPresent}>
              <CheckCheck size={15} /> Barchasini kelgan qilish
            </Button>
          </div>
        )
      )}

      {/* Students List Card */}
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              {groupDetail
                ? hasAnySavedAttendance
                  ? `${groupDetail.name} — ${formatDate(attendanceDate)} davomati (${summaryCounts.kelgan} kelgan, ${summaryCounts.kelmagan} kelmagan, ${summaryCounts.kechikkan} kechikkan)`
                  : `${groupDetail.name} — O'quvchilar ro'yxati (${studentsList.length} nafar)`
                : "O'quvchilar ro'yxati"}
            </h3>
            {groupDetail && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Kurs: {groupDetail.course?.name || '-'} | Xona: {groupDetail.room?.name || '-'}
                {groupDetail.startTime && ` | Vaqti: ${groupDetail.startTime.slice(0, 5)} - ${groupDetail.endTime ? groupDetail.endTime.slice(0, 5) : '--:--'}`}
              </span>
            )}
          </div>

          {/* Action Button */}
          {!hasAnySavedAttendance ? (
            <Button
              icon={<Save size={16} />}
              isLoading={saveMutation.isPending}
              onClick={handleSaveInitialAttendance}
              disabled={
                !selectedGroupId ||
                studentsList.length === 0 ||
                !timeEligibility.canTakeAttendance
              }
            >
              {timeEligibility.status === 'TIME_EXPIRED'
                ? `VAQT TUGAGAN (${timeEligibility.deadlineTime || ''} GACHA)`
                : timeEligibility.status === 'PAST_DATE'
                ? "O'TGAN SANA"
                : timeEligibility.status === 'TOO_EARLY'
                ? `DARS BOSHLANMAGAN (${timeEligibility.startTime || ''})`
                : 'DAVOMATNI SAQLASH'}
            </Button>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', padding: '6px 12px', borderRadius: '8px' }}>
              <Lock size={14} /> Davomat qulflangan
            </div>
          )}
        </div>

        {/* Lesson Topic Select (Ustiga bossa mavzular chiqadi) */}
        {selectedGroupId && (
          <div style={{ marginBottom: '18px', maxWidth: '640px' }}>
            <LessonTopicSelect
              groupId={selectedGroupId}
              value={hasAnySavedAttendance ? (savedTopicNote || attendanceTopic) : attendanceTopic}
              onChange={(val) => {
                setAttendanceTopic(val);
                if (topicError && val.trim()) setTopicError(false);
              }}
              disabled={hasAnySavedAttendance}
              required={true}
              hasError={topicError}
              errorMessage={topicError ? "Dars mavzusini tanlash yoki yozish majburiy! Mavzusiz davomat olib bo'lmaydi." : undefined}
              label={hasAnySavedAttendance ? "O'tilgan dars mavzusi:" : "Dars mavzusi:"}
              lastLessonTopic={latestLessonTopic}
              pastTopics={pastAttendanceTopics}
            />
            {!hasAnySavedAttendance && timeEligibility.canTakeAttendance && !attendanceTopic.trim() && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '12px', color: '#d97706', fontWeight: 600 }}>
                <AlertTriangle size={13} />
                <span>Davomatni saqlash uchun dars mavzusini tanlang yoki yozing.</span>
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {isGroupLoading || isAttendanceLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height="56px" />
            ))}
          </div>
        ) : !selectedGroupId ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Iltimos, yuqoridagi ro'yxatdan guruhni tanlang.
          </div>
        ) : studentsList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Ushbu guruhga hali o'quvchilar biriktirilmagan.
          </div>
        ) : !hasAnySavedAttendance && timeEligibility.status === 'PAST_DATE' ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <AlertCircle size={38} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.6 }} />
            <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text)' }}>
              {formatDate(attendanceDate)} sanasi uchun davomat topilmadi
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px 0', maxWidth: '440px', marginInline: 'auto' }}>
              Ushbu o'tgan sanada dars mashg'uloti bo'lmagan yoki davomat saqlanmagan.
            </p>
            {availableHistoryDates.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setAttendanceDate(availableHistoryDates[0])}>
                Eng so'nggi davomatni ko'rish ({formatDate(availableHistoryDates[0])})
              </Button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {studentsList.map((sg: any, idx: number) => {
              const student = sg.student;
              if (!student) return null;

              const studentId = student.id;
              const currentStatus = studentStatuses[studentId] || 'KELGAN';
              const saved = savedAttendancesMap[studentId];

              return (
                <div
                  key={studentId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  {/* Student info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)' }}>
                        {student.firstName} {student.lastName}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {student.phone ? (
                            <a
                              href={`tel:${student.phone}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                                textDecoration: 'none',
                              }}
                              title="Talabaga qo'ng'iroq qilish"
                            >
                              <Phone size={12} />
                              <span>{formatPhone(student.phone)}</span>
                            </a>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tel: yo'q</span>
                          )}
                        </div>
                        {(student.fatherPhone || student.motherPhone) ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {student.fatherPhone && (
                              <a
                                href={`tel:${student.fatherPhone}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  background: 'rgba(56, 189, 248, 0.12)',
                                  border: '1px solid rgba(56, 189, 248, 0.25)',
                                  color: '#38bdf8',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                }}
                                title="Otasiga qo'ng'iroq qilish"
                              >
                                <Phone size={10} />
                                <span>Otasi: {formatPhone(student.fatherPhone)}</span>
                              </a>
                            )}
                            {student.motherPhone && (
                              <a
                                href={`tel:${student.motherPhone}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  background: 'rgba(244, 114, 182, 0.12)',
                                  border: '1px solid rgba(244, 114, 182, 0.25)',
                                  color: '#f472b6',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                }}
                                title="Onasiga qo'ng'iroq qilish"
                              >
                                <Phone size={10} />
                                <span>Onasi: {formatPhone(student.motherPhone)}</span>
                              </a>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Attendance Controls */}
                  <div>
                    {hasAnySavedAttendance && saved ? (
                      /* SAVED VIEW: Locked statuses + only KELMAGAN can be modified to KECHIKKAN */
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {saved.status === 'KELGAN' && (
                          <Badge variant="success">
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={14} /> KELGAN
                            </span>
                          </Badge>
                        )}

                        {saved.status === 'KECHIKKAN' && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <Badge variant="warning">
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={14} /> KECHIKKAN
                              </span>
                            </Badge>
                            {saved.note && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Sababi: {saved.note}
                              </span>
                            )}
                          </div>
                        )}

                        {saved.status === 'KELMAGAN' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Badge variant="danger">
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <XCircle size={14} /> KELMAGAN
                              </span>
                            </Badge>

                            {/* Allowed action: Absent student came late */}
                            <Button
                              size="sm"
                              variant="outline"
                              style={{
                                color: '#d97706',
                                borderColor: 'rgba(245, 158, 11, 0.4)',
                                background: 'rgba(245, 158, 11, 0.08)',
                                fontWeight: 600,
                              }}
                              onClick={() =>
                                handleOpenLateModal(
                                  studentId,
                                  `${student.firstName} ${student.lastName}`
                                )
                              }
                            >
                              <Clock size={14} /> Kechikib keldi
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* INITIAL TAKING CONTROLS: Choose Kelgan or Kelmagan */
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          disabled={!timeEligibility.canTakeAttendance}
                          onClick={() => handleInitialStatusChange(studentId, 'KELGAN')}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: timeEligibility.canTakeAttendance ? 'pointer' : 'not-allowed',
                            opacity: timeEligibility.canTakeAttendance ? 1 : 0.6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease',
                            border:
                              currentStatus === 'KELGAN'
                                ? '2px solid #10b981'
                                : '1px solid var(--border)',
                            background:
                              currentStatus === 'KELGAN' ? '#10b981' : 'var(--surface)',
                            color: currentStatus === 'KELGAN' ? '#ffffff' : 'var(--text)',
                          }}
                        >
                          <CheckCircle2 size={15} /> Kelgan
                        </button>

                        <button
                          type="button"
                          disabled={!timeEligibility.canTakeAttendance}
                          onClick={() => handleInitialStatusChange(studentId, 'KELMAGAN')}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: timeEligibility.canTakeAttendance ? 'pointer' : 'not-allowed',
                            opacity: timeEligibility.canTakeAttendance ? 1 : 0.6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease',
                            border:
                              currentStatus === 'KELMAGAN'
                                ? '2px solid #ef4444'
                                : '1px solid var(--border)',
                            background:
                              currentStatus === 'KELMAGAN' ? '#ef4444' : 'var(--surface)',
                            color: currentStatus === 'KELMAGAN' ? '#ffffff' : 'var(--text)',
                          }}
                        >
                          <XCircle size={15} /> Kelmagan
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Late Reason Modal (KELMAGAN -> KECHIKKAN) */}
      <Modal
        isOpen={!!lateModalStudent}
        onClose={() => setLateModalStudent(null)}
        title="O'quvchini kechikkan deb qayd etish"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
            <strong style={{ color: 'var(--text)' }}>{lateModalStudent?.name}</strong> darsga kechikib keldi. Kechikish sababini kiriting:
          </p>

          <Input
            label="Kechikish sababi (majburiy)"
            required
            placeholder="Masalan: 15 minut, tirbandlik yoki uzrli sabab..."
            value={lateReason}
            onChange={(e) => setLateReason(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <Button variant="secondary" onClick={() => setLateModalStudent(null)}>
              Bekor qilish
            </Button>
            <Button
              isLoading={saveMutation.isPending}
              onClick={handleConfirmLate}
              style={{ backgroundColor: '#f59e0b', color: '#ffffff' }}
            >
              Kechikkan deb saqlash
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
