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
  CheckCheck,
  MessageSquare,
  Sparkles,
  Users,
} from 'lucide-react';
import { Card } from '../components/ui/Card/Card';
import { Button } from '../components/ui/Button/Button';
import { Select } from '../components/ui/Select/Select';
import { Input } from '../components/ui/Input/Input';
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

  // Form statuses state: studentId -> status
  const [studentStatuses, setStudentStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({});

  // Note modal state
  const [noteModalStudent, setNoteModalStudent] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [tempNote, setTempNote] = useState<string>('');

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

  // Initialize or sync student statuses
  useEffect(() => {
    if (groupDetail?.studentGroups) {
      const initialStatuses: Record<string, AttendanceStatus> = {};
      const initialNotes: Record<string, string> = {};

      groupDetail.studentGroups.forEach((sg: any) => {
        const student = sg.student;
        if (student) {
          const saved = savedAttendancesMap[student.id];
          if (saved) {
            initialStatuses[student.id] = saved.status;
            initialNotes[student.id] = saved.note || '';
          } else {
            // Default to KELGAN for new attendance
            initialStatuses[student.id] = 'KELGAN';
            initialNotes[student.id] = '';
          }
        }
      });

      setStudentStatuses(initialStatuses);
      setStudentNotes(initialNotes);
    }
  }, [groupDetail, savedAttendancesMap]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: (payload: any) => attendanceApi.bulkSave(payload),
    onSuccess: () => {
      success('Davomat muvaffaqiyatli saqlandi!');
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

  // Handle changing status
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setStudentStatuses((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  // Mark all as KELGAN
  const handleMarkAllPresent = () => {
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

  // Submit attendance
  const handleSaveAttendance = () => {
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
      note: studentNotes[sg.student.id] || null,
    }));

    saveMutation.mutate({
      groupId: selectedGroupId,
      date: attendanceDate,
      records,
    });
  };

  // Open note modal
  const handleOpenNoteModal = (studentId: string, studentName: string) => {
    setNoteModalStudent({ id: studentId, name: studentName });
    setTempNote(studentNotes[studentId] || '');
  };

  // Save note
  const handleSaveNote = () => {
    if (!noteModalStudent) return;
    setStudentNotes((prev) => ({
      ...prev,
      [noteModalStudent.id]: tempNote.trim(),
    }));
    setNoteModalStudent(null);
    setTempNote('');
    success("Izoh saqlandi");
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
    Object.values(studentStatuses).forEach((st) => {
      if (st === 'KELGAN') kelgan++;
      else if (st === 'KELMAGAN') kelmagan++;
      else if (st === 'KECHIKKAN') kechikkan++;
    });
    return { kelgan, kelmagan, kechikkan, total: studentsList.length };
  }, [studentStatuses, studentsList]);

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

      {/* Informational Banner */}
      {selectedGroupId && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '12px',
            background: hasAnySavedAttendance ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)',
            border: hasAnySavedAttendance ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(59, 130, 246, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {hasAnySavedAttendance ? (
              <CheckCircle2 size={18} color="#10b981" />
            ) : (
              <CalendarCheck size={18} color="#3b82f6" />
            )}
            <span style={{ fontSize: '13px', color: 'var(--text)' }}>
              {hasAnySavedAttendance
                ? "✓ Ushbu sana uchun davomat oldin saqlangan. Kerakli o'quvchi holatini o'zgartirib, 'Davomatni yangilash' tugmasini bosing."
                : "ℹ️ O'quvchilar davomatini belgilang va 'Davomatni saqlash' tugmasini bosing."}
            </span>
          </div>

          <Button size="sm" variant="outline" onClick={handleMarkAllPresent}>
            <CheckCheck size={15} /> Barchasini kelgan qilish
          </Button>
        </div>
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

          {/* Action Button: ALWAYS VISIBLE AND ACTIVE */}
          <Button
            icon={<Save size={16} />}
            isLoading={saveMutation.isPending}
            onClick={handleSaveAttendance}
            disabled={!selectedGroupId || studentsList.length === 0}
          >
            {hasAnySavedAttendance ? 'DAVOMATNI YANGILASH' : 'DAVOMATNI SAQLASH'}
          </Button>
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
              const note = studentNotes[studentId];

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
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{formatPhone(student.phone)}</span>
                        {note && (
                          <span style={{ color: '#f59e0b', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <MessageSquare size={12} /> {note}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Attendance Interactive Buttons: ALWAYS CLICKABLE */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Kelgan button */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(studentId, 'KELGAN')}
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

                    {/* Kelmagan button */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(studentId, 'KELMAGAN')}
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

                    {/* Kechikkan button */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(studentId, 'KECHIKKAN')}
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
                          currentStatus === 'KECHIKKAN'
                            ? '2px solid #f59e0b'
                            : '1px solid var(--border)',
                        background:
                          currentStatus === 'KECHIKKAN' ? '#f59e0b' : 'var(--surface)',
                        color: currentStatus === 'KECHIKKAN' ? '#ffffff' : 'var(--text)',
                      }}
                    >
                      <Clock size={15} /> Kechikkan
                    </button>

                    {/* Note Button (optional for adding reason/comment) */}
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenNoteModal(
                          studentId,
                          `${student.firstName} ${student.lastName}`
                        )
                      }
                      title="Izoh qo'shish yoki tahrirlash"
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        border: note ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border)',
                        background: note ? 'rgba(245, 158, 11, 0.1)' : 'var(--surface)',
                        color: note ? '#d97706' : 'var(--text-muted)',
                      }}
                    >
                      <MessageSquare size={14} />
                      {note ? 'Izoh' : '+Izoh'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Save Button for long lists */}
        {studentsList.length > 5 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <Button
              icon={<Save size={16} />}
              isLoading={saveMutation.isPending}
              onClick={handleSaveAttendance}
              disabled={!selectedGroupId || studentsList.length === 0}
            >
              {hasAnySavedAttendance ? 'DAVOMATNI YANGILASH' : 'DAVOMATNI SAQLASH'}
            </Button>
          </div>
        )}
      </Card>

      {/* Note Modal */}
      <Modal
        isOpen={!!noteModalStudent}
        onClose={() => setNoteModalStudent(null)}
        title="O'quvchiga izoh qo'shish"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
            <strong style={{ color: 'var(--text)' }}>{noteModalStudent?.name}</strong> uchun davomat izohi:
          </p>

          <Input
            label="Izoh (masalan: 15 minut kechikdi, shamollagan, va h.k.)"
            placeholder="Izoh matnini kiriting..."
            value={tempNote}
            onChange={(e) => setTempNote(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <Button variant="secondary" onClick={() => setNoteModalStudent(null)}>
              Bekor qilish
            </Button>
            <Button onClick={handleSaveNote}>
              Saqlash
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
