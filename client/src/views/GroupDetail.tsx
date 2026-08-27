'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  CalendarCheck,
  DollarSign,
  Clock,
  MapPin,
  GraduationCap,
  Save,
  CheckCircle2,
  XCircle,
  Clock3,
  UserPlus,
  Plus,
  Calendar as CalendarIcon,
  CheckCheck,
  Trash2,
} from 'lucide-react';
import { Card } from '../components/ui/Card/Card';
import { Button } from '../components/ui/Button/Button';
import { Badge } from '../components/ui/Badge/Badge';
import { Input } from '../components/ui/Input/Input';
import { Modal } from '../components/ui/Modal/Modal';
import { Select } from '../components/ui/Select/Select';
import { Table, Column } from '../components/ui/Table/Table';
import { useToast } from '../components/ui/Toast/Toast';
import { groupsApi } from '../api/groups.api';
import { attendanceApi } from '../api/attendance.api';
import { studentsApi } from '../api/students.api';
import { formatDate } from '../utils/formatDate';
import { formatMoney } from '../utils/formatMoney';
import { formatPhone, unmaskPhone } from '../utils/phoneMask';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';

export const GroupDetail: React.FC = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'attendanceTake' | 'students' | 'attendanceHistory' | 'payments'>('attendanceTake');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Attendance state for each student: { [studentId]: { status: 'KELGAN' | 'KELMAGAN' | 'KECHIKKAN', note: '' } }
  const [attendanceState, setAttendanceState] = useState<{
    [studentId: string]: { status: 'KELGAN' | 'KELMAGAN' | 'KECHIKKAN'; note: string };
  }>({});

  // Add student modal state
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    birthDate: '2005-01-01',
    gender: 'ERKAK' as 'ERKAK' | 'AYOL',
    status: 'FAOL',
  });

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: () => groupsApi.getOne(id!),
    enabled: !!id,
  });

  // Initialize or update attendanceState when group or selectedDate loads
  useEffect(() => {
    if (group?.studentGroups) {
      const initial: { [studentId: string]: { status: 'KELGAN' | 'KELMAGAN' | 'KECHIKKAN'; note: string } } = {};
      
      const cleanDate = selectedDate.split('T')[0];
      const dateAttendances = (group.attendances || []).filter(
        (a: any) => a.date && a.date.startsWith(cleanDate)
      );

      group.studentGroups.forEach((sg: any) => {
        const studentId = sg.student?.id || sg.studentId;
        if (studentId) {
          const existingAtt = dateAttendances.find((a: any) => a.studentId === studentId);
          initial[studentId] = {
            status: (existingAtt?.status as any) || 'KELGAN',
            note: existingAtt?.note || '',
          };
        }
      });
      setAttendanceState(initial);
    }
  }, [group, selectedDate]);

  // Save attendance mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: (payload: { groupId: string; date: string; records: any[] }) =>
      attendanceApi.bulkSave(payload),
    onSuccess: () => {
      success('Davomat muvaffaqiyatli saqlandi!');
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['attendanceStats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardAttendance'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Davomatni saqlashda xatolik yuz berdi');
    },
  });

  // Add student mutation
  const addStudentMutation = useMutation({
    mutationFn: (payload: any) => studentsApi.create(payload),
    onSuccess: () => {
      success('Talaba guruhga muvaffaqiyatli qo\'shildi!');
      setIsAddStudentModalOpen(false);
      setStudentForm({
        firstName: '',
        lastName: '',
        phone: '',
        birthDate: '2005-01-01',
        gender: 'ERKAK',
        status: 'FAOL',
      });
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Talaba qo\'shishda xatolik yuz berdi');
    },
  });

  // Remove student from group mutation
  const removeStudentMutation = useMutation({
    mutationFn: (studentId: string) => groupsApi.removeStudent(id, studentId),
    onSuccess: () => {
      success('Talaba guruhdan muvaffaqiyatli chiqarildi');
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Guruhdan chiqarishda xatolik yuz berdi');
    },
  });

  const handleSaveAttendance = () => {
    if (!group?.studentGroups || group.studentGroups.length === 0) {
      error('Guruhda talabalar mavjud emas');
      return;
    }

    const records = Object.entries(attendanceState).map(([studentId, data]) => ({
      studentId,
      status: data.status,
      note: data.note || undefined,
    }));

    saveAttendanceMutation.mutate({
      groupId: id,
      date: selectedDate,
      records,
    });
  };

  const handleMarkAll = (status: 'KELGAN' | 'KELMAGAN' | 'KECHIKKAN') => {
    if (!group?.studentGroups) return;
    const updated = { ...attendanceState };
    group.studentGroups.forEach((sg: any) => {
      const studentId = sg.student?.id || sg.studentId;
      if (studentId) {
        updated[studentId] = {
          status,
          note: updated[studentId]?.note || '',
        };
      }
    });
    setAttendanceState(updated);
  };

  const handleStudentStatusChange = (studentId: string, status: 'KELGAN' | 'KELMAGAN' | 'KECHIKKAN') => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleStudentNoteChange = (studentId: string, note: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note,
      },
    }));
  };

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.firstName || !studentForm.lastName || !studentForm.phone) {
      error('Barcha majburiy maydonlarni to\'ldiring');
      return;
    }

    addStudentMutation.mutate({
      ...studentForm,
      phone: unmaskPhone(studentForm.phone),
      groupId: id,
    });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Skeleton height="140px" />
        <Skeleton height="350px" />
      </div>
    );
  }

  if (!group) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h3>Guruh topilmadi</h3>
        <Button variant="outline" onClick={() => router.push('/groups')} style={{ marginTop: '16px' }}>
          Guruhlar ro'yxatiga qaytish
        </Button>
      </div>
    );
  }

  // Count attendance stats for the selected date
  const studentsList = group.studentGroups || [];
  const totalStudents = studentsList.length;
  const presentCount = Object.values(attendanceState).filter((a) => a.status === 'KELGAN').length;
  const absentCount = Object.values(attendanceState).filter((a) => a.status === 'KELMAGAN').length;
  const lateCount = Object.values(attendanceState).filter((a) => a.status === 'KECHIKKAN').length;

  const studentColumns: Column<any>[] = [
    {
      key: 'name',
      header: 'TALABA',
      render: (row) => (
        <span
          style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
          onClick={() => router.push(`/students/${row.student?.id}`)}
        >
          {row.student?.firstName} {row.student?.lastName}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'TELEFON',
      render: (row) => formatPhone(row.student?.phone),
    },
    {
      key: 'gender',
      header: 'JINSI',
      render: (row) => (row.student?.gender === 'AYOL' ? 'Ayol' : 'Erkak'),
    },
    {
      key: 'joinedAt',
      header: 'QO\'SHILGAN SANA',
      render: (row) => formatDate(row.joinedAt || row.createdAt),
    },
    {
      key: 'action',
      header: 'ACTION',
      render: (row) => {
        const studentId = row.student?.id || row.studentId;
        const studentName = `${row.student?.firstName || ''} ${row.student?.lastName || ''}`.trim() || 'Ushbu talaba';
        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              size="sm"
              variant="danger"
              title="Guruhdan chiqarish"
              isLoading={removeStudentMutation.isPending}
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`${studentName}ni ushbu guruhdan chiqarishni tasdiqlaysizmi?`)) {
                  removeStudentMutation.mutate(studentId);
                }
              }}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        );
      },
    },
  ];

  const historyColumns: Column<any>[] = [
    {
      key: 'student',
      header: 'TALABA',
      render: (row) => `${row.student?.firstName || ''} ${row.student?.lastName || ''}`,
    },
    {
      key: 'date',
      header: 'SANA',
      render: (row) => formatDate(row.date),
    },
    {
      key: 'status',
      header: 'STATUS',
      render: (row) => (
        <Badge
          variant={
            row.status === 'KELGAN'
              ? 'success'
              : row.status === 'KELMAGAN'
              ? 'danger'
              : 'warning'
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'note',
      header: 'IZOH',
      render: (row) => row.note || '-',
    },
  ];

  const paymentColumns: Column<any>[] = [
    {
      key: 'student',
      header: 'TALABA',
      render: (row) => `${row.student?.firstName || ''} ${row.student?.lastName || ''}`,
    },
    {
      key: 'amount',
      header: 'SUMMA',
      render: (row) => formatMoney(row.amount),
    },
    {
      key: 'paymentDate',
      header: 'SANASI',
      render: (row) => formatDate(row.paymentDate),
    },
    {
      key: 'status',
      header: 'HOLATI',
      render: (row) => (
        <Badge variant={row.status === 'TOLANGAN' ? 'success' : row.status === 'QISMAN' ? 'warning' : 'danger'}>
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="outline" size="sm" onClick={() => router.push('/groups')}>
            <ArrowLeft size={16} /> Orqaga
          </Button>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              {group.name}
              <Badge variant={group.status === 'FAOL' ? 'success' : 'secondary'}>
                {group.status}
              </Badge>
            </h2>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="primary"
            icon={<UserPlus size={16} />}
            onClick={() => setIsAddStudentModalOpen(true)}
          >
            Talaba Qo'shish
          </Button>
        </div>
      </div>

      {/* Info Cards Grid */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Kurs</div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>{group.course?.name || '-'}</div>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}>
              {formatMoney(group.course?.price)}/oy
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Ustoz</div>
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <GraduationCap size={16} color="var(--primary)" />
              {group.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : '-'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {formatPhone(group.teacher?.phone)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Dars vaqti & Xona</div>
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} color="var(--primary)" />
              {group.startTime} - {group.endTime}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} /> {group.room?.name} ({group.room?.number}-xona)
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Dars kunlari</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {group.days?.map((d: string) => (
                <Badge key={d} variant="secondary">
                  {d}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Main Tabs Container */}
      <Card>
        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <Button
            variant={activeTab === 'attendanceTake' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('attendanceTake')}
          >
            <CalendarCheck size={16} /> Davomat Olish ({totalStudents})
          </Button>
          <Button
            variant={activeTab === 'students' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('students')}
          >
            <Users size={16} /> Talabalar Ro'yxati ({totalStudents})
          </Button>
          <Button
            variant={activeTab === 'attendanceHistory' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('attendanceHistory')}
          >
            <CalendarIcon size={16} /> Davomat Tarixi
          </Button>
          <Button
            variant={activeTab === 'payments' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('payments')}
          >
            <DollarSign size={16} /> To'lovlar Tarixi
          </Button>
        </div>

        {/* TAB 1: DAVOMAT OLISH (TAKE ATTENDANCE) */}
        {activeTab === 'attendanceTake' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Controls bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: 'var(--card-subtle)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Dars sanasi:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--card)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                />
              </div>

              {/* Status counter chips */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '16px', backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                  Jami: <strong>{totalStudents}</strong>
                </span>
                <span style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '16px', backgroundColor: 'rgba(22, 163, 74, 0.15)', color: '#16a34a', border: '1px solid rgba(22, 163, 74, 0.3)' }}>
                  Kelgan: <strong>{presentCount}</strong>
                </span>
                <span style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '16px', backgroundColor: 'rgba(220, 38, 38, 0.15)', color: '#dc2626', border: '1px solid rgba(220, 38, 38, 0.3)' }}>
                  Kelmagan: <strong>{absentCount}</strong>
                </span>
                <span style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '16px', backgroundColor: 'rgba(202, 138, 4, 0.15)', color: '#ca8a04', border: '1px solid rgba(202, 138, 4, 0.3)' }}>
                  Kechikkan: <strong>{lateCount}</strong>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<CheckCheck size={14} />}
                  onClick={() => handleMarkAll('KELGAN')}
                >
                  Hammasini KELGAN qilish
                </Button>
              </div>
            </div>

            {/* Students Attendance List */}
            {totalStudents === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <Users size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <h4>Guruhda talabalar mavjud emas</h4>
                <p style={{ fontSize: '13px', marginTop: '4px', marginBottom: '16px' }}>
                  Davomat olish uchun avval guruhga talaba qo'shing.
                </p>
                <Button icon={<UserPlus size={16} />} onClick={() => setIsAddStudentModalOpen(true)}>
                  Talaba qo'shish
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {studentsList.map((sg: any, index: number) => {
                  const student = sg.student;
                  if (!student) return null;
                  const currentStatus = attendanceState[student.id]?.status || 'KELGAN';
                  const currentNote = attendanceState[student.id]?.note || '';

                  return (
                    <div
                      key={student.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        flexWrap: 'wrap',
                        gap: '12px',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      {/* Student info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--card-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '13px',
                            color: 'var(--primary)',
                          }}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
                            {student.firstName} {student.lastName}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {formatPhone(student.phone)}
                          </div>
                        </div>
                      </div>

                      {/* 3 Status Pill Toggles */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleStudentStatusChange(student.id, 'KELGAN')}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            backgroundColor: currentStatus === 'KELGAN' ? '#16a34a' : 'transparent',
                            color: currentStatus === 'KELGAN' ? '#ffffff' : 'var(--text-muted)',
                            border: currentStatus === 'KELGAN' ? '1px solid #16a34a' : '1px solid var(--border)',
                            boxShadow: currentStatus === 'KELGAN' ? '0 2px 8px rgba(22, 163, 74, 0.3)' : 'none',
                          }}
                        >
                          <CheckCircle2 size={14} />
                          KELGAN
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStudentStatusChange(student.id, 'KELMAGAN')}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            backgroundColor: currentStatus === 'KELMAGAN' ? '#dc2626' : 'transparent',
                            color: currentStatus === 'KELMAGAN' ? '#ffffff' : 'var(--text-muted)',
                            border: currentStatus === 'KELMAGAN' ? '1px solid #dc2626' : '1px solid var(--border)',
                            boxShadow: currentStatus === 'KELMAGAN' ? '0 2px 8px rgba(220, 38, 38, 0.3)' : 'none',
                          }}
                        >
                          <XCircle size={14} />
                          KELMAGAN
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStudentStatusChange(student.id, 'KECHIKKAN')}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            backgroundColor: currentStatus === 'KECHIKKAN' ? '#ca8a04' : 'transparent',
                            color: currentStatus === 'KECHIKKAN' ? '#ffffff' : 'var(--text-muted)',
                            border: currentStatus === 'KECHIKKAN' ? '1px solid #ca8a04' : '1px solid var(--border)',
                            boxShadow: currentStatus === 'KECHIKKAN' ? '0 2px 8px rgba(202, 138, 4, 0.3)' : 'none',
                          }}
                        >
                          <Clock3 size={14} />
                          KECHIKKAN
                        </button>
                      </div>

                      {/* Optional Note input */}
                      <input
                        type="text"
                        placeholder="Izoh / sabab (ixtiyoriy)..."
                        value={currentNote}
                        onChange={(e) => handleStudentNoteChange(student.id, e.target.value)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--input-bg)',
                          color: 'var(--text)',
                          fontSize: '12px',
                          minWidth: '160px',
                          maxWidth: '220px',
                        }}
                      />
                    </div>
                  );
                })}

                {/* Save Attendance Action Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <Button
                    size="lg"
                    icon={<Save size={18} />}
                    isLoading={saveAttendanceMutation.isPending}
                    onClick={handleSaveAttendance}
                    style={{ minWidth: '220px' }}
                  >
                    DAVOMATNI SAQLASH
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TALABALAR RO'YXATI (STUDENTS LIST) */}
        {activeTab === 'students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Guruh a'zolari: {totalStudents} ta talaba
              </span>
              <Button size="sm" icon={<Plus size={16} />} onClick={() => setIsAddStudentModalOpen(true)}>
                Guruhga Talaba Qo'shish
              </Button>
            </div>
            <Table columns={studentColumns} data={studentsList} />
          </div>
        )}

        {/* TAB 3: DAVOMAT TARIXI (ATTENDANCE HISTORY) */}
        {activeTab === 'attendanceHistory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Table columns={historyColumns} data={group.attendances || []} />
          </div>
        )}

        {/* TAB 4: TO'LOVLAR (PAYMENTS HISTORY) */}
        {activeTab === 'payments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Table columns={paymentColumns} data={group.payments || []} />
          </div>
        )}
      </Card>

      {/* Add Student Modal */}
      <Modal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        title="Guruhga Talaba Qo'shish"
      >
        <form onSubmit={handleAddStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Ism"
              required
              placeholder="Ali"
              value={studentForm.firstName}
              onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
            />
            <Input
              label="Familya"
              required
              placeholder="Valiyev"
              value={studentForm.lastName}
              onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
            />
          </div>

          <Input
            label="Telefon raqam"
            required
            placeholder="+998 90 123 45 67"
            value={formatPhone(studentForm.phone)}
            onChange={(e) => setStudentForm({ ...studentForm, phone: unmaskPhone(e.target.value) })}
          />

          <Input
            label="Tug'ilgan sana"
            type="date"
            required
            value={studentForm.birthDate}
            onChange={(e) => setStudentForm({ ...studentForm, birthDate: e.target.value })}
          />

          <Select
            label="Jinsi"
            options={[
              { label: 'Erkak', value: 'ERKAK' },
              { label: 'Ayol', value: 'AYOL' },
            ]}
            value={studentForm.gender}
            onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as any })}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAddStudentModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" isLoading={addStudentMutation.isPending}>
              Guruhga Qo'shish
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
