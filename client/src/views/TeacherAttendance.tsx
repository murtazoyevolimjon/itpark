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
} from 'lucide-react';
import { Card } from '../components/ui/Card/Card';
import { Button } from '../components/ui/Button/Button';
import { Select } from '../components/ui/Select/Select';
import { Input } from '../components/ui/Input/Input';
import { Badge } from '../components/ui/Badge/Badge';
import { Modal } from '../components/ui/Modal/Modal';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import { useToast } from '../components/ui/Toast/Toast';
import { groupsApi } from '../api/groups.api';
import { attendanceApi } from '../api/attendance.api';
import { AttendanceStatus } from '../types';
import { formatPhone } from '../utils/phoneMask';

export const TeacherAttendance: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const queryGroupId = searchParams.get('groupId') || '';

  const [selectedGroupId, setSelectedGroupId] = useState<string>(queryGroupId);
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

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

  // Fetch group details (to get students)
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
  const savedAttendancesMap = useMemo(() => {
    const map: Record<string, { status: AttendanceStatus; note?: string }> = {};
    if (Array.isArray(existingAttendance)) {
      existingAttendance.forEach((att: any) => {
        if (att.studentId && att.status) {
          map[att.studentId] = {
            status: att.status,
            note: att.note || '',
          };
        }
      });
    }
    return map;
  }, [existingAttendance]);

  const hasAnySavedAttendance = Object.keys(savedAttendancesMap).length > 0;

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
    if (hasAnySavedAttendance) return;
    setStudentStatuses((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  // Mark all as KELGAN (only when taking initial attendance)
  const handleMarkAllPresent = () => {
    if (hasAnySavedAttendance) return;
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

    if (!selectedGroupId) {
      error('Iltimos, guruhni tanlang');
      return;
    }

    const students = groupDetail?.studentGroups || [];
    if (students.length === 0) {
      error("Ushbu guruhda o'quvchilar mavjud emas");
      return;
    }

    const records = students.map((sg: any) => ({
      studentId: sg.student.id,
      status: studentStatuses[sg.student.id] || 'KELGAN',
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

  const groupOptions = [
    { label: 'Guruhni tanlang', value: '' },
    ...groups.map((g) => ({
      label: `${g.name} (${g.course?.name || 'Kurs'})`,
      value: g.id,
    })),
  ];

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
            <ArrowLeft size={16} /> Guruhlarimga qaytish
          </Button>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              Davomat Olish
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Dars mashg'ulotlari bo'yicha davomatni qayd etish
            </p>
          </div>
        </div>

        {/* Live Counters */}
        {studentsList.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              ✓ Kelgan: {summaryCounts.kelgan}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
              ✕ Kelmagan: {summaryCounts.kelmagan}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              🕒 Kechikkan: {summaryCounts.kechikkan}
            </span>
          </div>
        )}
      </div>

      {/* Group & Date Selectors */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <Select
            label="Guruhni tanlang"
            options={groupOptions}
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          />
          <Input
            label="Dars sanasi"
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
          />
        </div>
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
                Davomat saqlangan! (Qayta olib bo'lmaydi)
              </strong>
              Ushbu sana uchun kunlik davomat allaqachon olingan. O'qituvchilar saqlangan davomatni qayta o'zgartira olmaydi.{' '}
              <strong>Yagona ruxsat:</strong> Dars boshida <em>"Kelmagan"</em> deb belgilangan o'quvchi kechikib kelsa, uni <em>"Kechikib keldi"</em> tugmasi orqali sababini yozib <em>"Kechikkan"</em> holatiga o'tkazishingiz mumkin.
            </div>
          </div>
        ) : (
          /* INITIAL TAKING BANNER */
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
              {groupDetail ? `${groupDetail.name} — O'quvchilar ro'yxati (${studentsList.length} nafar)` : "O'quvchilar ro'yxati"}
            </h3>
            {groupDetail?.course && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Kurs: {groupDetail.course.name} | Xona: {groupDetail.room?.name || '-'}
              </span>
            )}
          </div>

          {/* Action Button: Only visible when taking initial attendance */}
          {!hasAnySavedAttendance ? (
            <Button
              icon={<Save size={16} />}
              isLoading={saveMutation.isPending}
              onClick={handleSaveInitialAttendance}
              disabled={!selectedGroupId || studentsList.length === 0}
            >
              DAVOMATNI SAQLASH
            </Button>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', padding: '6px 12px', borderRadius: '8px' }}>
              <Lock size={14} /> Davomat qulflangan
            </div>
          )}
        </div>

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
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {formatPhone(student.phone)}
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
                          onClick={() => handleInitialStatusChange(studentId, 'KELGAN')}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
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
                          onClick={() => handleInitialStatusChange(studentId, 'KELMAGAN')}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
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
