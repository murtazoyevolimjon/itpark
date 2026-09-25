'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, CalendarCheck, Lock } from 'lucide-react';
import { Card } from '../components/ui/Card/Card';
import { Button } from '../components/ui/Button/Button';
import { Select } from '../components/ui/Select/Select';
import { Input } from '../components/ui/Input/Input';
import { Badge } from '../components/ui/Badge/Badge';
import { useToast } from '../components/ui/Toast/Toast';
import { groupsApi } from '../api/groups.api';
import { attendanceApi } from '../api/attendance.api';
import { AttendanceStatus } from '../types';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import { useAuth } from '../hooks/useAuth';

export const AttendanceTake: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { user } = useAuth();

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );

  // Student attendance statuses state map: studentId -> status
  const [studentStatuses, setStudentStatuses] = useState<
    Record<string, AttendanceStatus>
  >({});

  const { data: groups } = useQuery({
    queryKey: ['groupsSelect'],
    queryFn: () => groupsApi.getAll({ limit: 100 }),
  });

  // Auto-select first group if available
  useEffect(() => {
    if (groups?.data && groups.data.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups.data[0].id);
    }
  }, [groups, selectedGroupId]);

  // Fetch selected group details to get list of students
  const { data: groupDetail, isLoading: isGroupLoading } = useQuery({
    queryKey: ['groupDetailAttendance', selectedGroupId],
    queryFn: () => groupsApi.getOne(selectedGroupId),
    enabled: !!selectedGroupId,
  });

  // Fetch existing attendance records for the selected group and date
  const { data: existingAttendance, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['existingAttendance', selectedGroupId, attendanceDate],
    queryFn: () => attendanceApi.getByGroup(selectedGroupId, attendanceDate),
    enabled: !!selectedGroupId && !!attendanceDate,
  });

  // Map of saved attendances for selected group and date: studentId -> status
  const savedAttendancesMap = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    if (Array.isArray(existingAttendance)) {
      existingAttendance.forEach((att: any) => {
        if (att.studentId && att.status) {
          map[att.studentId] = att.status;
        }
      });
    }
    return map;
  }, [existingAttendance]);

  const hasAnySavedAttendance = Object.keys(savedAttendancesMap).length > 0;

  // Saqlash uchun o'zgarishlar borligini tekshirish
  const hasPendingAttendanceUpdates = useMemo(() => {
    // Admin yoki Owner doimo xohlagan paytda o'zgartira oladi
    if (user?.role !== 'TEACHER') return true;

    if (!hasAnySavedAttendance) return true;
    if (!groupDetail?.studentGroups) return false;
    return groupDetail.studentGroups.some((sg: any) => {
      const stId = sg.student?.id || sg.studentId;
      if (!stId) return false;
      const saved = savedAttendancesMap[stId];
      const current = studentStatuses[stId];
      if (!saved) return true;
      if (saved === 'KELMAGAN' && current === 'KECHIKKAN') return true;
      return false;
    });
  }, [user, hasAnySavedAttendance, groupDetail?.studentGroups, savedAttendancesMap, studentStatuses]);

  // Sync student statuses with default 'KELGAN' OR existing saved statuses
  useEffect(() => {
    if (groupDetail?.studentGroups) {
      const initialMap: Record<string, AttendanceStatus> = {};
      groupDetail.studentGroups.forEach((sg) => {
        if (sg.student) {
          initialMap[sg.student.id] = 'KELGAN';
        }
      });

      // Override with existing saved attendance if available
      if (Array.isArray(existingAttendance) && existingAttendance.length > 0) {
        existingAttendance.forEach((att: any) => {
          if (att.studentId && att.status) {
            initialMap[att.studentId] = att.status;
          }
        });
      }

      setStudentStatuses(initialMap);
    }
  }, [groupDetail, existingAttendance]);

  const bulkMutation = useMutation({
    mutationFn: (payload: any) => attendanceApi.bulkSave(payload),
    onSuccess: () => {
      success('Davomat muvaffaqiyatli saqlandi!');
      queryClient.invalidateQueries({ queryKey: ['attendanceStats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardAttendance'] });
      queryClient.invalidateQueries({ queryKey: ['existingAttendance', selectedGroupId, attendanceDate] });
      router.push('/attendance');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Davomat saqlashda xatolik');
    },
  });

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    const isTeacher = user?.role === 'TEACHER';
    const savedStatus = savedAttendancesMap[studentId];

    if (isTeacher && savedStatus) {
      // 1. Agar avval KELGAN yoki KECHIKKAN bo'lsa - o'zgartirib bo'lmaydi
      if (savedStatus === 'KELGAN' || savedStatus === 'KECHIKKAN') {
        error("Davomat saqlangan! O'qituvchi ushbu talabaning holatini qayta o'zgartira olmaydi.");
        return;
      }

      // 2. Agar avval KELMAGAN bo'lsa - faqat KECHIKKAN deb o'zgartirish mumkin
      if (savedStatus === 'KELMAGAN' && status === 'KELGAN') {
        error('Kelmagan talabani faqat "Kechikkan" deb o\'zgartirish mumkin!');
        return;
      }
    }

    setStudentStatuses((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSave = () => {
    if (!selectedGroupId) {
      error('Guruhni tanlang');
      return;
    }

    if (hasAnySavedAttendance && !hasPendingAttendanceUpdates) {
      error("Ushbu sana uchun davomat allaqachon saqlangan va o'zgarishlar yo'q!");
      return;
    }

    const records = Object.entries(studentStatuses).map(([studentId, status]) => ({
      studentId,
      status,
    }));

    if (records.length === 0) {
      error('Guruhda talabalar topilmadi');
      return;
    }

    bulkMutation.mutate({
      groupId: selectedGroupId,
      date: attendanceDate,
      records,
    });
  };

  const groupOptions = [
    { label: 'Guruhni tanlang', value: '' },
    ...(groups?.data?.map((g) => ({ label: g.name, value: g.id })) || []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button variant="outline" size="sm" onClick={() => router.push('/attendance')}>
          <ArrowLeft size={16} /> Orqaga
        </Button>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Davomat olish</h2>
      </div>

      {/* Selectors Card */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <Select
            label="Guruh"
            options={groupOptions}
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          />
          <Input
            label="Sana"
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
          />
        </div>
      </Card>

      {/* Students Attendance Table Card */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
            {groupDetail?.name || 'Talabalar ro\'yxati'}
          </h3>
          <Button
            icon={hasAnySavedAttendance && !hasPendingAttendanceUpdates ? <Lock size={16} /> : <Save size={16} />}
            isLoading={bulkMutation.isPending}
            onClick={handleSave}
            disabled={!selectedGroupId || isGroupLoading || (hasAnySavedAttendance && !hasPendingAttendanceUpdates)}
            variant={hasAnySavedAttendance && hasPendingAttendanceUpdates ? 'primary' : (hasAnySavedAttendance ? 'outline' : 'primary')}
          >
            {hasAnySavedAttendance
              ? (hasPendingAttendanceUpdates ? 'KECHIKKANLARNI SAQLASH' : 'DAVOMAT SAQLANGAN')
              : 'SAQLASH'}
          </Button>
        </div>

        {/* Informative Banner when attendance already saved */}
        {hasAnySavedAttendance && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              fontSize: '13px',
              color: 'var(--text)',
              marginBottom: '16px',
            }}
          >
            <Lock size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
            <div>
              <strong>Ushbu sana uchun davomat saqlangan.</strong> Qoidaga ko'ra uni qayta o'zgartirib bo'lmaydi. Faqat kelmagan talaba darsga yetib kelsa, uni <strong>"Kechikkan"</strong> deb belgilashingiz mumkin (bir marta).
            </div>
          </div>
        )}

        {isGroupLoading ? (
          <Skeleton height="200px" />
        ) : !groupDetail?.studentGroups || groupDetail.studentGroups.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Ushbu guruhda hali birorta ham talaba mavjud emas.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>#</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>TALABA</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>TELEFON</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>DAVOMAT HOLATI</th>
                </tr>
              </thead>
              <tbody>
                {groupDetail.studentGroups.map((sg, idx) => {
                  const student = sg.student;
                  if (!student) return null;
                  const currentStatus = studentStatuses[student.id] || 'KELGAN';
                  const savedStatus = savedAttendancesMap[student.id];

                  const isTeacher = user?.role === 'TEACHER';
                  // 1. Agar teacher bo'lsa va avval KELGAN yoki KECHIKKAN deb saqlangan bo'lsa - qulflangan
                  const isLocked = isTeacher && (savedStatus === 'KELGAN' || savedStatus === 'KECHIKKAN');
                  // 2. Agar teacher bo'lsa va avval KELMAGAN deb saqlangan bo'lsa - faqat KECHIKKAN deb o'zgartirish mumkin
                  const isKelmaganSaved = isTeacher && savedStatus === 'KELMAGAN';

                  return (
                    <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{student.firstName} {student.lastName}</span>
                          {isLocked && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              <Lock size={12} />
                            </span>
                          )}
                        </div>
                        {isKelmaganSaved && (
                          <div style={{ fontSize: '11px', color: currentStatus === 'KECHIKKAN' ? '#ca8a04' : '#ef4444', fontWeight: 500, marginTop: '2px' }}>
                            {currentStatus === 'KECHIKKAN' ? '✓ Kechikkan deb belgilandi' : '⚠️ Kelmagan (kelsa "Kechikkan" qiling)'}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px' }}>{student.phone}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '16px', alignItems: 'center' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: isLocked || isKelmaganSaved ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: currentStatus === 'KELGAN' ? 600 : 400, opacity: isLocked || isKelmaganSaved ? 0.35 : 1 }}>
                            <input
                              type="radio"
                              name={`att-${student.id}`}
                              value="KELGAN"
                              disabled={isLocked || isKelmaganSaved}
                              checked={currentStatus === 'KELGAN'}
                              onChange={() => handleStatusChange(student.id, 'KELGAN')}
                              style={{ accentColor: '#2b7fff' }}
                            />
                            <Badge variant="success">KELGAN</Badge>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: isLocked ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: currentStatus === 'KELMAGAN' ? 600 : 400, opacity: isLocked ? 0.35 : 1 }}>
                            <input
                              type="radio"
                              name={`att-${student.id}`}
                              value="KELMAGAN"
                              disabled={isLocked}
                              checked={currentStatus === 'KELMAGAN'}
                              onChange={() => handleStatusChange(student.id, 'KELMAGAN')}
                              style={{ accentColor: '#dc2626' }}
                            />
                            <Badge variant="danger">KELMAGAN</Badge>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: isLocked ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: currentStatus === 'KECHIKKAN' ? 600 : 400, opacity: isLocked ? 0.35 : 1 }}>
                            <input
                              type="radio"
                              name={`att-${student.id}`}
                              value="KECHIKKAN"
                              disabled={isLocked}
                              checked={currentStatus === 'KECHIKKAN'}
                              onChange={() => handleStatusChange(student.id, 'KECHIKKAN')}
                              style={{ accentColor: '#ca8a04' }}
                            />
                            <Badge variant="warning">KECHIKKAN</Badge>
                          </label>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
