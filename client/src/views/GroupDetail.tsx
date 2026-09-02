'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Edit2,
  AlertTriangle,
  CreditCard,
  UserCheck,
  CheckCircle,
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
import { paymentsApi } from '../api/payments.api';
import { formatDate } from '../utils/formatDate';
import { formatMoney } from '../utils/formatMoney';
import { formatPhone, unmaskPhone } from '../utils/phoneMask';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';

const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
];

export const GroupDetail: React.FC = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [activeTab, setActiveTab] = useState<'attendanceTake' | 'students' | 'attendanceHistory' | 'payments'>('attendanceTake');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedPaymentMonth, setSelectedPaymentMonth] = useState<string>(currentMonthStr);

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

  // Payments Modals in Group Detail
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payFormData, setPayFormData] = useState({
    studentId: '',
    studentName: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'NAQD',
  });

  const [isEditPayModalOpen, setIsEditPayModalOpen] = useState(false);
  const [editPayFormData, setEditPayFormData] = useState({
    id: '',
    studentName: '',
    amount: '',
    paymentDate: '',
    method: 'NAQD',
    status: 'TOLANGAN',
  });

  const [isDeletePayModalOpen, setIsDeletePayModalOpen] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<any>(null);

  // Queries
  const { data: group, isLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: () => groupsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: groupPaymentsData } = useQuery({
    queryKey: ['groupPayments', id],
    queryFn: () => paymentsApi.getAll({ groupId: id, limit: 300 }),
    enabled: !!id,
  });

  // Month options generator (past 6 months, current month, next 2 months)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string; year: number; month: number }[] = [];
    const now = new Date();

    for (let i = -6; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const value = `${year}-${String(month + 1).padStart(2, '0')}`;
      let label = `${MONTH_NAMES[month]} ${year}`;
      if (i === 0) label += ' (Joriy oy)';
      else if (i === -1) label += " (O'tgan oy)";
      else if (i === 1) label += ' (Kelgusi oy)';

      options.push({ value, label, year, month });
    }
    return options;
  }, []);

  // Merge group payments from query and group object
  const allGroupPayments = useMemo(() => {
    const list = groupPaymentsData?.data || group?.payments || [];
    return list;
  }, [groupPaymentsData, group?.payments]);

  // Compute student payment rows for the selected month
  const studentPaymentRows = useMemo(() => {
    if (!group?.studentGroups) return [];

    const [year, month] = selectedPaymentMonth.split('-').map(Number);
    const coursePrice = group.course?.price || 0;

    return group.studentGroups
      .map((sg: any) => {
        const student = sg.student;
        if (!student) return null;

        const studentPaymentsInMonth = allGroupPayments.filter((p: any) => {
          if (!p.paymentDate || p.status === 'TOLANMAGAN') return false;
          const pDate = new Date(p.paymentDate);
          const isMonthMatch = pDate.getFullYear() === year && pDate.getMonth() + 1 === month;
          const isStudentMatch = p.studentId === student.id;
          return isMonthMatch && isStudentMatch;
        });

        const paidAmount = studentPaymentsInMonth.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        const lastPayment = studentPaymentsInMonth[0] || null;

        let status: 'TOLANGAN' | 'QISMAN' | 'TOLANMAGAN' = 'TOLANMAGAN';
        if (coursePrice > 0) {
          if (paidAmount >= coursePrice) {
            status = 'TOLANGAN';
          } else if (paidAmount > 0) {
            status = 'QISMAN';
          } else {
            status = 'TOLANMAGAN';
          }
        } else if (paidAmount > 0) {
          status = 'TOLANGAN';
        }

        const remainingDebt = Math.max(0, coursePrice - paidAmount);

        return {
          studentId: student.id,
          student,
          coursePrice,
          paidAmount,
          remainingDebt,
          status,
          lastPayment,
          paymentDate: lastPayment?.paymentDate,
          method: lastPayment?.method,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [group?.studentGroups, group?.course?.price, allGroupPayments, selectedPaymentMonth]);

  // Payment statistics for current group & month
  const paymentStats = useMemo(() => {
    const total = studentPaymentRows.length;
    const paidCount = studentPaymentRows.filter((r) => r.status === 'TOLANGAN').length;
    const partialCount = studentPaymentRows.filter((r) => r.status === 'QISMAN').length;
    const unpaidCount = studentPaymentRows.filter((r) => r.status === 'TOLANMAGAN').length;
    const totalCollected = studentPaymentRows.reduce((sum, r) => sum + r.paidAmount, 0);
    const totalExpected = studentPaymentRows.reduce((sum, r) => sum + r.coursePrice, 0);

    return {
      total,
      paidCount,
      partialCount,
      unpaidCount,
      totalCollected,
      totalExpected,
    };
  }, [studentPaymentRows]);

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
      queryClient.invalidateQueries({ queryKey: ['groupPayments', id] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Guruhdan chiqarishda xatolik yuz berdi');
    },
  });

  // Create Payment Mutation
  const createPaymentMutation = useMutation({
    mutationFn: (payload: any) => paymentsApi.create(payload),
    onSuccess: () => {
      success("To'lov muvaffaqiyatli qabul qilindi!");
      setIsPayModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['groupPayments', id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "To'lovni saqlashda xatolik yuz berdi");
    },
  });

  // Update Payment Mutation
  const updatePaymentMutation = useMutation({
    mutationFn: ({ pId, data }: { pId: string; data: any }) => paymentsApi.update(pId, data),
    onSuccess: () => {
      success("To'lov muvaffaqiyatli tahrirlandi!");
      setIsEditPayModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['groupPayments', id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "To'lovni tahrirlashda xatolik yuz berdi");
    },
  });

  // Delete Payment Mutation
  const deletePaymentMutation = useMutation({
    mutationFn: (pId: string) => paymentsApi.delete(pId),
    onSuccess: () => {
      success("To'lov muvaffaqiyatli o'chirildi!");
      setIsDeletePayModalOpen(false);
      setDeletingPayment(null);
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['groupPayments', id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "To'lovni o'chirishda xatolik yuz berdi");
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

  // Open Accept Payment Modal for specific student
  const handleOpenPayModal = (student: any, remainingDebt?: number) => {
    const coursePrice = group?.course?.price || 0;
    const defaultAmount = remainingDebt && remainingDebt > 0 ? remainingDebt : coursePrice;

    const [year, month] = selectedPaymentMonth.split('-').map(Number);
    const now = new Date();
    let paymentDate = '';

    if (now.getFullYear() === year && now.getMonth() + 1 === month) {
      paymentDate = now.toISOString().split('T')[0];
    } else {
      paymentDate = `${year}-${String(month).padStart(2, '0')}-05`;
    }

    setPayFormData({
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      amount: defaultAmount ? String(defaultAmount) : '',
      paymentDate,
      method: 'NAQD',
    });
    setIsPayModalOpen(true);
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payFormData.amount || Number(payFormData.amount) <= 0) {
      error("To'lov summasini to'g'ri kiriting");
      return;
    }

    createPaymentMutation.mutate({
      studentId: payFormData.studentId,
      groupId: id,
      courseId: group?.courseId || null,
      amount: Number(payFormData.amount),
      paymentDate: payFormData.paymentDate,
      method: payFormData.method,
      status: 'TOLANGAN',
    });
  };

  // Open Edit Payment Modal
  const handleOpenEditPayment = (payment: any, studentName: string) => {
    if (!payment) return;
    setEditPayFormData({
      id: payment.id,
      studentName,
      amount: String(payment.amount),
      paymentDate: payment.paymentDate ? payment.paymentDate.split('T')[0] : '',
      method: payment.method || 'NAQD',
      status: payment.status || 'TOLANGAN',
    });
    setIsEditPayModalOpen(true);
  };

  const handleEditPaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPayFormData.amount || Number(editPayFormData.amount) <= 0) {
      error("To'lov summasini to'g'ri kiriting");
      return;
    }

    updatePaymentMutation.mutate({
      pId: editPayFormData.id,
      data: {
        groupId: id,
        courseId: group?.courseId || null,
        amount: Number(editPayFormData.amount),
        paymentDate: editPayFormData.paymentDate,
        method: editPayFormData.method,
        status: editPayFormData.status,
      },
    });
  };

  // Open Delete Payment Modal
  const handleOpenDeletePayment = (payment: any, studentName: string) => {
    if (!payment) return;
    setDeletingPayment({
      ...payment,
      studentName,
    });
    setIsDeletePayModalOpen(true);
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

  // Group Students Payment Status Table Columns
  const paymentStatusColumns: Column<any>[] = [
    {
      key: 'student',
      header: 'TALABA',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--primary-grad)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '12px',
              flexShrink: 0,
            }}
          >
            {row.student?.firstName?.[0]}
            {row.student?.lastName?.[0]}
          </div>
          <div>
            <div
              style={{ fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}
              onClick={() => router.push(`/students/${row.student?.id}`)}
            >
              {row.student?.firstName} {row.student?.lastName}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {formatPhone(row.student?.phone)}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'coursePrice',
      header: 'KURS NARXI',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
          {formatMoney(row.coursePrice)}
        </span>
      ),
    },
    {
      key: 'paidAmount',
      header: "TO'LANGAN SUMMA",
      render: (row) => (
        <span
          style={{
            fontWeight: 700,
            color: row.paidAmount > 0 ? '#10b981' : 'var(--text-muted)',
          }}
        >
          {formatMoney(row.paidAmount)}
        </span>
      ),
    },
    {
      key: 'paymentDate',
      header: 'TO\'LOV SANASI & USULI',
      render: (row) => {
        if (!row.paymentDate) return <span style={{ color: 'var(--text-muted)' }}>-</span>;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{formatDate(row.paymentDate)}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {row.method || 'NAQD'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'HOLATI',
      render: (row) => (
        <Badge
          variant={
            row.status === 'TOLANGAN'
              ? 'success'
              : row.status === 'QISMAN'
              ? 'warning'
              : 'danger'
          }
        >
          {row.status === 'TOLANGAN'
            ? "TO'LANGAN"
            : row.status === 'QISMAN'
            ? `QISMAN (Qarz: ${formatMoney(row.remainingDebt)})`
            : "TO'LANMAGAN"}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'AMALLAR',
      render: (row) => {
        const studentName = `${row.student?.firstName || ''} ${row.student?.lastName || ''}`;

        if (row.status === 'TOLANGAN' && row.lastPayment) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Button
                size="sm"
                variant="outline"
                icon={<Edit2 size={13} />}
                onClick={() => handleOpenEditPayment(row.lastPayment, studentName)}
                title="To'lovni tahrirlash"
              >
                Tahrirlash
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={<Trash2 size={13} />}
                onClick={() => handleOpenDeletePayment(row.lastPayment, studentName)}
                title="To'lovni o'chirish"
              >
                O'chirish
              </Button>
            </div>
          );
        }

        return (
          <Button
            size="sm"
            variant="primary"
            icon={<Plus size={14} />}
            onClick={() => handleOpenPayModal(row.student, row.remainingDebt)}
          >
            To'lov qabul qilish
          </Button>
        );
      },
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
            <DollarSign size={16} /> To'lovlar Holati
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
                {studentsList.map((sg: any) => {
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
                        backgroundColor: 'var(--card-subtle)',
                        border: '1px solid var(--border)',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      {/* Student info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '200px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--primary-grad)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '13px',
                          }}
                        >
                          {student.firstName[0]}
                          {student.lastName[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px' }}>
                            {student.firstName} {student.lastName}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {formatPhone(student.phone)}
                          </div>
                        </div>
                      </div>

                      {/* Status toggle buttons */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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

        {/* TAB 4: GURUH TALABALARI TO'LOVLAR HOLATI (GROUP PAYMENTS & DEBT OVERVIEW) */}
        {activeTab === 'payments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Controls & Month Filter */}
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
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                  To'lov oyi / Davri:
                </span>
                <select
                  value={selectedPaymentMonth}
                  onChange={(e) => setSelectedPaymentMonth(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--primary)',
                    backgroundColor: 'var(--card)',
                    color: 'var(--text)',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status counter badges */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    fontWeight: 600,
                  }}
                >
                  Jami talabalar: <strong>{paymentStats.total}</strong>
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(22, 163, 74, 0.15)',
                    color: '#16a34a',
                    border: '1px solid rgba(22, 163, 74, 0.3)',
                    fontWeight: 700,
                  }}
                >
                  ✓ To'laganlar: <strong>{paymentStats.paidCount}</strong>
                </span>
                {paymentStats.partialCount > 0 && (
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '6px 12px',
                      borderRadius: '16px',
                      backgroundColor: 'rgba(202, 138, 4, 0.15)',
                      color: '#ca8a04',
                      border: '1px solid rgba(202, 138, 4, 0.3)',
                      fontWeight: 700,
                    }}
                  >
                    ⏳ Qisman: <strong>{paymentStats.partialCount}</strong>
                  </span>
                )}
                <span
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(220, 38, 38, 0.15)',
                    color: '#dc2626',
                    border: '1px solid rgba(220, 38, 38, 0.3)',
                    fontWeight: 700,
                  }}
                >
                  ⚠️ Qarzdorlar: <strong>{paymentStats.unpaidCount}</strong>
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: 'var(--primary)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    fontWeight: 700,
                  }}
                >
                  💰 Yig'ilgan: <strong>{formatMoney(paymentStats.totalCollected)}</strong> / {formatMoney(paymentStats.totalExpected)}
                </span>
              </div>
            </div>

            {/* Students Payment Status Table */}
            {totalStudents === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <Users size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <h4>Guruhda talabalar mavjud emas</h4>
                <p style={{ fontSize: '13px', marginTop: '4px', marginBottom: '16px' }}>
                  To'lovlarni ko'rish uchun avval guruhga talaba qo'shing.
                </p>
                <Button icon={<UserPlus size={16} />} onClick={() => setIsAddStudentModalOpen(true)}>
                  Talaba qo'shish
                </Button>
              </div>
            ) : (
              <Table columns={paymentStatusColumns} data={studentPaymentRows} />
            )}
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
          <Input
            label="Ism"
            required
            placeholder="Ali"
            value={studentForm.firstName}
            onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
          />

          <Input
            label="Familiya"
            required
            placeholder="Valiyev"
            value={studentForm.lastName}
            onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
          />

          <Input
            label="Telefon raqami"
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
              Qo'shish
            </Button>
          </div>
        </form>
      </Modal>

      {/* 1. Quick Accept Payment Modal for Specific Student */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="To'lov Qabul Qilish"
        maxWidth="500px"
      >
        <form onSubmit={handlePaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--card-subtle)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Talaba</div>
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '14px' }}>
                {payFormData.studentName}
              </div>
            </div>
            <Badge variant="secondary">{group?.name}</Badge>
          </div>

          <Input
            label="Summa (so'mda)"
            type="number"
            required
            value={payFormData.amount}
            onChange={(e) => setPayFormData({ ...payFormData, amount: e.target.value })}
          />

          <Select
            label="To'lov turi"
            options={[
              { label: 'Naqd pul', value: 'NAQD' },
              { label: 'Plastik karta (Click/Payme)', value: 'KARTA' },
              { label: "Bank o'tkazmasi", value: 'OTKAZMA' },
            ]}
            value={payFormData.method}
            onChange={(e) => setPayFormData({ ...payFormData, method: e.target.value })}
          />

          <Input
            label="To'lov sanasi"
            type="date"
            required
            value={payFormData.paymentDate}
            onChange={(e) => setPayFormData({ ...payFormData, paymentDate: e.target.value })}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsPayModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" isLoading={createPaymentMutation.isPending}>
              To'lovni Saqlash
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Edit Payment Modal */}
      <Modal
        isOpen={isEditPayModalOpen}
        onClose={() => setIsEditPayModalOpen(false)}
        title="To'lovni Tahrirlash"
        maxWidth="500px"
      >
        <form onSubmit={handleEditPaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--card-subtle)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Talaba</div>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '14px' }}>
              {editPayFormData.studentName}
            </div>
          </div>

          <Input
            label="Summa (so'mda)"
            type="number"
            required
            value={editPayFormData.amount}
            onChange={(e) => setEditPayFormData({ ...editPayFormData, amount: e.target.value })}
          />

          <Select
            label="To'lov turi"
            options={[
              { label: 'Naqd pul', value: 'NAQD' },
              { label: 'Plastik karta (Click/Payme)', value: 'KARTA' },
              { label: "Bank o'tkazmasi", value: 'OTKAZMA' },
            ]}
            value={editPayFormData.method}
            onChange={(e) => setEditPayFormData({ ...editPayFormData, method: e.target.value })}
          />

          <Input
            label="To'lov sanasi"
            type="date"
            required
            value={editPayFormData.paymentDate}
            onChange={(e) => setEditPayFormData({ ...editPayFormData, paymentDate: e.target.value })}
          />

          <Select
            label="Holati"
            options={[
              { label: "TO'LANGAN", value: 'TOLANGAN' },
              { label: 'QISMAN', value: 'QISMAN' },
              { label: "TO'LANMAGAN (Bekor qilingan)", value: 'TOLANMAGAN' },
            ]}
            value={editPayFormData.status}
            onChange={(e) => setEditPayFormData({ ...editPayFormData, status: e.target.value })}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsEditPayModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" isLoading={updatePaymentMutation.isPending}>
              O'zgarishlarni Saqlash
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Delete Payment Modal */}
      <Modal
        isOpen={isDeletePayModalOpen}
        onClose={() => setIsDeletePayModalOpen(false)}
        title="To'lovni O'chirish"
        maxWidth="440px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Trash2 size={20} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                Haqiqatan ham ushbu to'lovni o'chirmoqchimisiz?
              </p>
              {deletingPayment && (
                <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Talaba: <strong>{deletingPayment.studentName}</strong>
                  <br />
                  Summa: <strong style={{ color: '#10b981' }}>{formatMoney(deletingPayment.amount)}</strong>
                  <br />
                  Sana: {formatDate(deletingPayment.paymentDate)}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsDeletePayModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={deletePaymentMutation.isPending}
              onClick={() => deletingPayment && deletePaymentMutation.mutate(deletingPayment.id)}
            >
              Ha, o'chirilsin
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
