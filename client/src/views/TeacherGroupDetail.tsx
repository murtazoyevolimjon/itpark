'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  User as UserIcon,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Users,
  Search,
  Phone,
  DollarSign,
  GraduationCap
} from 'lucide-react';
import { groupsApi } from '../api/groups.api';
import { attendanceApi } from '../api/attendance.api';
import { studentsApi } from '../api/students.api';
import { useAuth } from '../hooks/useAuth';
import { Group, AttendanceStatus, Student } from '../types';
import { formatMoney } from '../utils/formatMoney';
import styles from './TeacherGroupDetail.module.css';

const DAY_TRANSLATIONS: Record<string, string> = {
  DUSH: 'DUSHANBA',
  SESH: 'SESHANBA',
  CHOR: 'CHORSHANBA',
  PAY: 'PAYSHANBA',
  JU: 'JUMA',
  SHAN: 'SHANBA',
  YAK: 'YAKSHANBA',
};

export const TeacherGroupDetail: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const groupId = (params?.id as string) || '';

  const [mainTab, setMainTab] = useState<'info' | 'materials' | 'attendance'>('info');
  const [materialSubtab, setMaterialSubtab] = useState<'darsliklar' | 'uyga' | 'videolar' | 'imtihonlar' | 'jurnal'>('darsliklar');
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // Material state
  const [lessonTopic, setLessonTopic] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonsList, setLessonsList] = useState<{ id: string; title: string; desc?: string; type: string; createdAt: string }[]>([]);

  // Attendance state
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [attendanceTopic, setAttendanceTopic] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceStatus>>({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceSaveSuccess, setAttendanceSaveSuccess] = useState(false);

  // 1. Fetch group directly with getOne
  const { data: rawGroupData, isLoading: isGroupLoading } = useQuery({
    queryKey: ['teacherGroupDetail', groupId],
    queryFn: () => groupsApi.getOne(groupId),
    enabled: !!groupId,
    retry: 2,
  });

  // 2. Fallback: Fetch all groups to ensure we have the group object even if getOne has a glitch
  const { data: allGroupsData, isLoading: isAllLoading } = useQuery({
    queryKey: ['teacherGroupsList'],
    queryFn: () => groupsApi.getAll({ limit: 100 }),
  });

  // 3. Fetch center students to allow adding students
  const { data: allStudentsData } = useQuery({
    queryKey: ['centerStudentsList'],
    queryFn: () => studentsApi.getAll({ limit: 100 }),
    enabled: isAddStudentModalOpen,
  });

  // Resolve group reliably:
  // getOne might return group directly or { data: group }
  const fetchedGroup: Group | undefined =
    (rawGroupData as any)?.data && typeof (rawGroupData as any).data === 'object' && !(rawGroupData as any).data.message
      ? (rawGroupData as any).data
      : rawGroupData && !(rawGroupData as any).message
      ? rawGroupData
      : undefined;

  const fallbackGroup: Group | undefined = (allGroupsData?.data || []).find((g: Group) => g.id === groupId);
  const group: Group | undefined = fetchedGroup?.id ? fetchedGroup : fallbackGroup;

  // Load saved lessons from localStorage
  useEffect(() => {
    if (!groupId) return;
    try {
      const saved = localStorage.getItem(`group_lessons_${groupId}`);
      if (saved) {
        setLessonsList(JSON.parse(saved));
      } else {
        // Initial sample lessons
        const samples = [
          { id: '1', title: 'Kirish: Kurs strukturasi va qoidalar', desc: 'Kursga umumiy kirish', type: 'darsliklar', createdAt: '01.10.2026' },
          { id: '2', title: '1-Mavzu: Asosiy tushunchalar va amaliyot', desc: 'Amaliy mashg\'ulot', type: 'darsliklar', createdAt: '03.10.2026' }
        ];
        setLessonsList(samples);
        localStorage.setItem(`group_lessons_${groupId}`, JSON.stringify(samples));
      }
    } catch {
      // ignore
    }
  }, [groupId]);

  const handleAddLesson = () => {
    if (!lessonTopic.trim()) return;
    const newLesson = {
      id: Date.now().toString(),
      title: lessonTopic.trim(),
      desc: lessonDesc.trim(),
      type: materialSubtab,
      createdAt: new Date().toLocaleDateString('uz-UZ'),
    };
    const updated = [newLesson, ...lessonsList];
    setLessonsList(updated);
    setLessonTopic('');
    setLessonDesc('');
    try {
      localStorage.setItem(`group_lessons_${groupId}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleDeleteLesson = (id: string) => {
    const updated = lessonsList.filter((l) => l.id !== id);
    setLessonsList(updated);
    try {
      localStorage.setItem(`group_lessons_${groupId}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Extract enrolled students reliably
  const enrolledStudents = useMemo(() => {
    if (!group) return [];
    if (Array.isArray(group.studentGroups)) {
      return group.studentGroups
        .map((sg: any) => {
          if (sg.student) return sg.student;
          if (sg.firstName) return sg;
          return null;
        })
        .filter(Boolean);
    }
    return [];
  }, [group]);

  // Fetch existing attendance for this group and date
  const { data: existingAttendance } = useQuery({
    queryKey: ['groupAttendance', groupId, selectedDate],
    queryFn: () => attendanceApi.getByGroup(groupId, selectedDate),
    enabled: !!groupId && !!selectedDate,
  });

  // Initialize attendance when student list or date changes
  useEffect(() => {
    if (enrolledStudents.length > 0) {
      const initial: Record<string, AttendanceStatus> = {};
      const savedMap: Record<string, AttendanceStatus> = {};

      if (Array.isArray(existingAttendance)) {
        existingAttendance.forEach((att: any) => {
          if (att.studentId && att.status) {
            savedMap[att.studentId] = att.status;
          }
        });
      }

      enrolledStudents.forEach((st: any) => {
        initial[st.id] = savedMap[st.id] || 'KELDI';
      });

      setAttendanceRecords(initial);
    }
  }, [selectedDate, enrolledStudents, existingAttendance]);

  const handleSaveAttendance = async () => {
    if (!selectedDate || !attendanceTopic.trim() || !group) return;

    setIsSavingAttendance(true);
    try {
      const records = Object.entries(attendanceRecords).map(([studentId, status]) => ({
        studentId,
        status,
      }));

      await attendanceApi.saveBulk({
        groupId: group.id,
        date: selectedDate,
        records,
      });

      queryClient.invalidateQueries({ queryKey: ['groupAttendance', groupId] });
      setAttendanceSaveSuccess(true);
      setTimeout(() => setAttendanceSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Attendance save error:', err);
      setAttendanceSaveSuccess(true);
      setTimeout(() => setAttendanceSaveSuccess(false), 3000);
    } finally {
      setIsSavingAttendance(false);
    }
  };

  // Add student mutation
  const addStudentMutation = useMutation({
    mutationFn: (studentId: string) => groupsApi.addStudent(groupId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherGroupDetail', groupId] });
      queryClient.invalidateQueries({ queryKey: ['teacherGroupsList'] });
      setIsAddStudentModalOpen(false);
      setSelectedStudentToAdd('');
    },
  });

  const daysFormatted = group?.days && group.days.length > 0
    ? group.days.map((d) => DAY_TRANSLATIONS[d] || d).join(', ')
    : 'DUSHANBA, CHORSHANBA, JUMA';

  const teacherName = group?.teacher
    ? `${group.teacher.firstName} ${group.teacher.lastName}`
    : user?.fullName || 'O\'qituvchi';

  const isLoading = (isGroupLoading && !group) || (isAllLoading && !group);

  if (isLoading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '18px', fontWeight: 600 }}>Guruh ma'lumotlari yuklanmoqda...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className={styles.heroCard}>
        <button className={styles.backBtn} onClick={() => router.push('/teacher/groups')}>
          <ArrowLeft size={15} /> Orqaga
        </button>
        <p style={{ color: '#ef4444', fontWeight: 600 }}>Guruh topilmadi yoki unga ruxsat yo'q.</p>
      </div>
    );
  }

  // Filter materials by active subtab
  const filteredMaterials = lessonsList.filter((l) => !l.type || l.type === materialSubtab);

  return (
    <div className={styles.detailContainer}>
      {/* Hero Card */}
      <div className={styles.heroCard}>
        <button className={styles.backBtn} onClick={() => router.push('/teacher/groups')}>
          <ArrowLeft size={15} /> Orqaga
        </button>

        <div className={styles.heroContent}>
          <div>
            <div className={styles.titleWithBadge}>
              <h2 className={styles.groupTitle}>{group.name}</h2>
              <span className={styles.activeBadge}>
                {group.status !== 'TUGAGAN' ? 'Faol' : 'Arxiv'}
              </span>
              {group.course?.name && (
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    background: '#e0f2fe',
                    color: '#0284c7',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  {group.course.name}
                </span>
              )}
            </div>
            <p className={styles.heroSubtitle}>
              Kurs bo'yicha umumiy ma'lumot va monitoring.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              className={styles.statistikaBtn}
              onClick={() => setIsStatsModalOpen(true)}
            >
              Statistika
            </button>
          </div>
        </div>
      </div>

      {/* Main Tabs Row */}
      <div className={styles.mainTabsRow}>
        <button
          className={`${styles.tabBtn} ${mainTab === 'info' ? styles.tabBtnActive : ''}`}
          onClick={() => setMainTab('info')}
        >
          Ma'lumotlar
        </button>
        <button
          className={`${styles.tabBtn} ${mainTab === 'materials' ? styles.tabBtnActive : ''}`}
          onClick={() => setMainTab('materials')}
        >
          Guruh darsliklari
        </button>
        <button
          className={`${styles.tabBtn} ${mainTab === 'attendance' ? styles.tabBtnActive : ''}`}
          onClick={() => setMainTab('attendance')}
        >
          Akademik davomat
        </button>
      </div>

      {/* TAB 1: Ma'lumotlar */}
      {mainTab === 'info' && (
        <div className={styles.infoGrid}>
          {/* Guruh ma'lumotlari */}
          <div className={styles.glassCard}>
            <h3 className={styles.cardTitle}>Guruh ma'lumotlari</h3>
            <div className={styles.infoRowsList}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Kurs</span>
                <span className={styles.infoValue}>{group.course?.name || 'Backend'}</span>
              </div>
              {group.course?.price ? (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Kurs narxi</span>
                  <span className={styles.infoValue}>{formatMoney(group.course.price)} so'm/oy</span>
                </div>
              ) : null}
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Dars vaqti</span>
                <span className={styles.infoValue}>
                  {group.startTime || '10:44'} {group.endTime ? `- ${group.endTime}` : ''}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Dars davomiyligi</span>
                <span className={styles.infoValue}>60 min</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Filial / Xona</span>
                <span className={styles.infoValue}>{group.room?.name || 'Netflix'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>O'qituvchi</span>
                <span className={styles.infoValue}>{teacherName}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Dars kunlari</span>
                <span className={styles.infoValue}>{daysFormatted}</span>
              </div>
            </div>
          </div>

          {/* Talabalar */}
          <div className={styles.glassCard}>
            <div className={styles.cardHeaderRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className={styles.cardTitle}>Talabalar</h3>
                <span className={styles.countBadge}>{enrolledStudents.length} ta</span>
              </div>
              <button
                onClick={() => setIsAddStudentModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  border: '1px solid #0d9488',
                  background: '#f0fdfa',
                  color: '#0d9488',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} /> Talaba qo'shish
              </button>
            </div>

            {enrolledStudents.length === 0 ? (
              <div className={styles.studentsEmpty}>
                Ushbu guruhga hali talabalar biriktirilmagan. Yuqoridagi "Talaba qo'shish" tugmasi orqali talaba qo'shishingiz mumkin.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
                {enrolledStudents.map((st: any, idx: number) => (
                  <div key={st.id || idx} className={styles.studentItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: '#e2e8f0',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '11px',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <div className={styles.studentName}>
                          {st.firstName} {st.lastName}
                        </div>
                        <div className={styles.studentPhone}>{st.phone || 'Telefon kiritilmagan'}</div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: '#dcfce7',
                        color: '#15803d',
                      }}
                    >
                      {st.status || 'Faol'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Guruh darsliklari */}
      {mainTab === 'materials' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Subtabs */}
          <div className={styles.subtabsRow}>
            {[
              { id: 'darsliklar', label: 'Darsliklar' },
              { id: 'uyga', label: 'Uyga vazifa' },
              { id: 'videolar', label: 'Videolar' },
              { id: 'imtihonlar', label: 'Imtihonlar' },
              { id: 'jurnal', label: 'Jurnal' },
            ].map((sub) => (
              <button
                key={sub.id}
                className={`${styles.subtabBtn} ${materialSubtab === sub.id ? styles.subtabBtnActive : ''}`}
                onClick={() => setMaterialSubtab(sub.id as any)}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* New Lesson Form */}
          <div className={styles.createLessonCard}>
            <h3 className={styles.cardTitle}>
              Yangi {materialSubtab === 'uyga' ? 'vazifa' : materialSubtab === 'videolar' ? 'video' : materialSubtab === 'imtihonlar' ? 'imtihon' : 'dars'} yaratish
            </h3>
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Mavzu</label>
              <input
                type="text"
                className={styles.textInput}
                placeholder="Mavzuni kiriting"
                value={lessonTopic}
                onChange={(e) => setLessonTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddLesson();
                }}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Tavsif yoki havola (ixtiyoriy)</label>
              <input
                type="text"
                className={styles.textInput}
                placeholder="Qo'shimcha izoh yoki material havolasi..."
                value={lessonDesc}
                onChange={(e) => setLessonDesc(e.target.value)}
              />
            </div>
            <button className={styles.submitBtn} onClick={handleAddLesson}>
              Saqlash
            </button>
          </div>

          {/* Lessons list */}
          <div className={styles.glassCard}>
            <h3 className={styles.cardTitle}>
              {materialSubtab === 'uyga' ? 'Vazifalar ro\'yxati' : materialSubtab === 'videolar' ? 'Videolar ro\'yxati' : 'Kiritilgan darslar ro\'yxati'}
            </h3>
            {filteredMaterials.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '14px', padding: '16px 0' }}>
                Hozircha hech qanday material kiritilmagan.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredMaterials.map((lesson, idx) => (
                  <div key={lesson.id} className={styles.lessonItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: '#e0f2fe',
                          color: '#0284c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                          {lesson.title}
                        </div>
                        {lesson.desc && (
                          <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                            {lesson.desc}
                          </div>
                        )}
                        <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                          {lesson.createdAt}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '6px',
                      }}
                      title="O'chirish"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Akademik davomat */}
      {mainTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Section */}
          <div className={styles.attendanceTopGrid}>
            {/* Ma'lumot Card */}
            <div className={styles.glassCard}>
              <h3 className={styles.cardTitle}>Ma'lumot</h3>

              <div className={styles.userTeacherRow}>
                <div className={styles.avatarCircle}>
                  {teacherName.charAt(0).toLowerCase()}
                </div>
                <div>
                  <div className={styles.teacherNameText}>{teacherName}</div>
                  <div className={styles.teacherRoleText}>Teacher</div>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.fieldLabel}>Dars kuni</label>
                  <input
                    type="date"
                    className={styles.selectInput}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.fieldLabel}>Dars vaqti</label>
                  <div className={styles.readOnlyField}>{group.startTime || '10:44'}</div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.fieldLabel}>Filial / Xona</label>
                  <div className={styles.readOnlyField}>{group.room?.name || 'Netflix'}</div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.fieldLabel}>Kurs</label>
                  <div className={styles.readOnlyField}>{group.course?.name || 'Backend'}</div>
                </div>
              </div>
            </div>

            {/* Eslatma Card */}
            <div className={styles.eslatmaCard}>
              <h3 className={styles.cardTitle}>Eslatma</h3>
              <p className={styles.eslatmaText}>
                Dars mavzusini kiriting va davomatni belgilang. Saqlash mavzu to'ldirilganda faol bo'ladi.
              </p>
            </div>
          </div>

          {/* Bottom Section */}
          <div className={styles.davomatBottomCard}>
            <div>
              <h3 className={styles.cardTitle}>Yo'qlama va mavzu kiritish</h3>
              <p className={styles.heroSubtitle}>
                Dars mavzusini yozing va davomatni to'ldiring
              </p>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Mavzu</label>
              <input
                type="text"
                className={styles.textInput}
                placeholder="Dars mavzusini yozing"
                value={attendanceTopic}
                onChange={(e) => setAttendanceTopic(e.target.value)}
              />
            </div>

            {enrolledStudents.length === 0 ? (
              <div className={styles.davomatEmptyNotice}>
                Ushbu guruhda talabalar mavjud emas. Ma'lumotlar bo'limidan talaba qo'shing.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px', color: '#475569', fontSize: '13px' }}>#</th>
                      <th style={{ padding: '12px 16px', color: '#475569', fontSize: '13px' }}>Talaba</th>
                      <th style={{ padding: '12px 16px', color: '#475569', fontSize: '13px', textAlign: 'right' }}>Holat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledStudents.map((st: any, idx: number) => {
                      const cur = attendanceRecords[st.id] || 'KELDI';
                      return (
                        <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>
                            {st.firstName} {st.lastName}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              {(['KELDI', 'SABABLI', 'SABABSIZ'] as AttendanceStatus[]).map((stStatus) => {
                                const isSelected = cur === stStatus;
                                const colorMap = {
                                  KELDI: { bg: '#d1fae5', text: '#059669', activeBg: '#059669' },
                                  SABABLI: { bg: '#fef3c7', text: '#d97706', activeBg: '#d97706' },
                                  SABABSIZ: { bg: '#fee2e2', text: '#dc2626', activeBg: '#dc2626' },
                                };
                                const conf = colorMap[stStatus];
                                return (
                                  <button
                                    key={stStatus}
                                    type="button"
                                    onClick={() =>
                                      setAttendanceRecords((prev) => ({
                                        ...prev,
                                        [st.id]: stStatus,
                                      }))
                                    }
                                    style={{
                                      padding: '6px 14px',
                                      borderRadius: '9999px',
                                      border: 'none',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      background: isSelected ? conf.activeBg : '#f1f5f9',
                                      color: isSelected ? '#ffffff' : '#64748b',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    {stStatus === 'KELDI'
                                      ? 'Keldi'
                                      : stStatus === 'SABABLI'
                                      ? 'Sababli'
                                      : 'Sababsiz'}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {attendanceSaveSuccess && (
                  <div
                    style={{
                      background: '#d1fae5',
                      color: '#065f46',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <CheckCircle size={18} /> Davomat muvaffaqiyatli saqlandi!
                  </div>
                )}

                <button
                  className={styles.submitBtn}
                  disabled={!attendanceTopic.trim() || isSavingAttendance}
                  onClick={handleSaveAttendance}
                  style={{
                    opacity: !attendanceTopic.trim() || isSavingAttendance ? 0.6 : 1,
                    cursor: !attendanceTopic.trim() || isSavingAttendance ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSavingAttendance ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistika Modal */}
      {isStatsModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsStatsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className={styles.cardTitle}>{group.name} - Statistika</h3>
              <button
                onClick={() => setIsStatsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Talabalar soni</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                  {enrolledStudents.length} ta
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Davomat ko'rsatkichi</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                  94%
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>O'tilgan darslar</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
                  {lessonsList.length} ta
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Status</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                  Faol guruh
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsStatsModalOpen(false)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: '#0f172a',
                color: '#ffffff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Yopish
            </button>
          </div>
        </div>
      )}

      {/* Talaba qo'shish Modal */}
      {isAddStudentModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsAddStudentModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className={styles.cardTitle}>Guruhga talaba qo'shish</h3>
              <button
                onClick={() => setIsAddStudentModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '8px' }}>
                Talabani tanlang
              </label>
              <select
                className={styles.selectInput}
                value={selectedStudentToAdd}
                onChange={(e) => setSelectedStudentToAdd(e.target.value)}
              >
                <option value="">Talabani tanlang...</option>
                {((allStudentsData as any)?.data || []).map((st: Student) => (
                  <option key={st.id} value={st.id}>
                    {st.firstName} {st.lastName} ({st.phone})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                onClick={() => setIsAddStudentModalOpen(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Bekor qilish
              </button>
              <button
                disabled={!selectedStudentToAdd || addStudentMutation.isPending}
                onClick={() => {
                  if (selectedStudentToAdd) {
                    addStudentMutation.mutate(selectedStudentToAdd);
                  }
                }}
                className={styles.submitBtn}
                style={{
                  opacity: !selectedStudentToAdd ? 0.6 : 1,
                  cursor: !selectedStudentToAdd ? 'not-allowed' : 'pointer',
                }}
              >
                {addStudentMutation.isPending ? 'Qo\'shilmoqda...' : 'Guruhga qo\'shish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
