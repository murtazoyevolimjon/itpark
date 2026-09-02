'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  FileText,
  UserCheck,
  BookOpen,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Calendar,
  Layers,
} from 'lucide-react';
import { Table, Column } from '../components/ui/Table/Table';
import { Button } from '../components/ui/Button/Button';
import { ExportDropdown } from '../components/ui/ExportDropdown/ExportDropdown';
import { Modal } from '../components/ui/Modal/Modal';
import { Input } from '../components/ui/Input/Input';
import { Select } from '../components/ui/Select/Select';
import { SearchableSelect } from '../components/ui/SearchableSelect/SearchableSelect';
import { Badge } from '../components/ui/Badge/Badge';
import { useToast } from '../components/ui/Toast/Toast';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';
import { paymentsApi } from '../api/payments.api';
import { studentsApi } from '../api/students.api';
import { groupsApi } from '../api/groups.api';
import { Payment } from '../types';
import { formatMoney } from '../utils/formatMoney';
import { formatDate } from '../utils/formatDate';
import { formatPhone } from '../utils/phoneMask';
import { exportToExcel, exportToPdf } from '../utils/exportData';

const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
];

export const FinancePayments: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);

  // Current month in YYYY-MM
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);

  // New Payment Form State
  const [formData, setFormData] = useState({
    studentId: '',
    groupId: '',
    selectedMonth: currentMonthStr,
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'NAQD',
    status: 'TOLANGAN',
    allowOverride: false,
  });

  // Edit Payment Form State
  const [editFormData, setEditFormData] = useState({
    id: '',
    studentName: '',
    studentId: '',
    groupId: '',
    courseId: '',
    amount: '',
    paymentDate: '',
    method: 'NAQD',
    status: 'TOLANGAN',
  });

  // Main Payments Query
  const { data, isLoading } = useQuery({
    queryKey: ['payments', pagination.page, pagination.limit, debouncedSearch, pagination.sortBy, pagination.order],
    queryFn: () =>
      paymentsApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        sortBy: pagination.sortBy,
        order: pagination.order,
      }),
  });

  // Students query (with limit 1000 for full searchable select)
  const { data: students } = useQuery({
    queryKey: ['studentsSelect'],
    queryFn: () => studentsApi.getAll({ limit: 1000 }),
  });

  // Groups query
  const { data: allGroups } = useQuery({
    queryKey: ['groupsSelect'],
    queryFn: () => groupsApi.getAll({ limit: 200 }),
  });

  // Specific student payments query (for validation and history)
  const { data: studentPaymentsData } = useQuery({
    queryKey: ['studentPayments', formData.studentId],
    queryFn: () => paymentsApi.getAll({ studentId: formData.studentId, limit: 100 }),
    enabled: !!formData.studentId,
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

  // Format student options for SearchableSelect
  const studentOptions = useMemo(() => {
    return (
      students?.data?.map((s) => {
        const groupsCount = s.studentGroups?.length || 0;
        const groupLabel =
          groupsCount === 1
            ? s.studentGroups?.[0]?.group?.name
            : groupsCount > 1
            ? `${groupsCount} ta guruh/kurs`
            : undefined;

        return {
          value: s.id,
          label: `${s.firstName} ${s.lastName}`,
          subLabel: s.phone ? formatPhone(s.phone) : undefined,
          phone: s.phone,
          avatarText: `${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase(),
          badge: groupLabel,
        };
      }) || []
    );
  }, [students]);

  // Selected student object
  const selectedStudent = useMemo(() => {
    return students?.data?.find((s) => s.id === formData.studentId);
  }, [students, formData.studentId]);

  // Selected student's enrolled groups
  const studentEnrolledGroups = useMemo(() => {
    if (!selectedStudent?.studentGroups) return [];
    return selectedStudent.studentGroups
      .map((sg) => sg.group)
      .filter((g): g is NonNullable<typeof g> => !!g);
  }, [selectedStudent]);

  // Currently selected group object
  const currentGroup = useMemo(() => {
    if (formData.groupId) {
      return (
        studentEnrolledGroups.find((g) => g.id === formData.groupId) ||
        allGroups?.data?.find((g) => g.id === formData.groupId)
      );
    }
    return studentEnrolledGroups[0] || null;
  }, [formData.groupId, studentEnrolledGroups, allGroups]);

  // When student changes, automatically set first group & default price
  const handleStudentChange = (studentId: string) => {
    const st = students?.data?.find((s) => s.id === studentId);
    const firstGroup = st?.studentGroups?.[0]?.group;
    const price = firstGroup?.course?.price;

    setFormData((prev) => ({
      ...prev,
      studentId,
      groupId: firstGroup?.id || '',
      amount: price ? String(price) : prev.amount,
      allowOverride: false,
    }));
  };

  // When group changes, update price recommendation
  const handleGroupChange = (groupId: string) => {
    const grp =
      studentEnrolledGroups.find((g) => g.id === groupId) ||
      allGroups?.data?.find((g) => g.id === groupId);
    const price = grp?.course?.price;

    setFormData((prev) => ({
      ...prev,
      groupId,
      amount: price ? String(price) : prev.amount,
      allowOverride: false,
    }));
  };

  // When month changes, update date & check payment status
  const handleMonthChange = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const now = new Date();
    let paymentDate = '';

    if (now.getFullYear() === year && now.getMonth() + 1 === month) {
      paymentDate = now.toISOString().split('T')[0];
    } else {
      paymentDate = `${year}-${String(month).padStart(2, '0')}-05`;
    }

    setFormData((prev) => ({
      ...prev,
      selectedMonth: monthStr,
      paymentDate,
      allowOverride: false,
    }));
  };

  // Calculate payment status for selected student, group, and month
  const monthPaymentAnalysis = useMemo(() => {
    if (!formData.studentId || !formData.selectedMonth) return null;

    const [year, month] = formData.selectedMonth.split('-').map(Number);
    const payments = studentPaymentsData?.data || [];

    const matchingPayments = payments.filter((p) => {
      if (!p.paymentDate) return false;
      const pDate = new Date(p.paymentDate);
      const isMonthMatch = pDate.getFullYear() === year && pDate.getMonth() + 1 === month;
      const isGroupMatch = !formData.groupId || !p.groupId || p.groupId === formData.groupId;
      return isMonthMatch && isGroupMatch;
    });

    const totalPaid = matchingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const coursePrice = currentGroup?.course?.price || 0;
    const isFullyPaid = coursePrice > 0 && totalPaid >= coursePrice;
    const isPartiallyPaid = totalPaid > 0 && totalPaid < coursePrice;
    const remainingDebt = Math.max(0, coursePrice - totalPaid);

    const monthObj = monthOptions.find((m) => m.value === formData.selectedMonth);

    return {
      monthLabel: monthObj?.label || `${MONTH_NAMES[month - 1]} ${year}`,
      matchingPayments,
      totalPaid,
      coursePrice,
      isFullyPaid,
      isPartiallyPaid,
      remainingDebt,
    };
  }, [formData.studentId, formData.selectedMonth, formData.groupId, studentPaymentsData, currentGroup, monthOptions]);

  // Adjust amount recommendation when month/payment analysis updates
  useEffect(() => {
    if (monthPaymentAnalysis) {
      if (monthPaymentAnalysis.isPartiallyPaid && monthPaymentAnalysis.remainingDebt > 0) {
        setFormData((prev) => ({ ...prev, amount: String(monthPaymentAnalysis.remainingDebt) }));
      }
    }
  }, [monthPaymentAnalysis?.remainingDebt, monthPaymentAnalysis?.isPartiallyPaid]);

  // CREATE MUTATION
  const createMutation = useMutation({
    mutationFn: (payload: any) => paymentsApi.create(payload),
    onSuccess: () => {
      success("To'lov muvaffaqiyatli qabul qilindi!");
      setIsModalOpen(false);
      setFormData({
        studentId: '',
        groupId: '',
        selectedMonth: currentMonthStr,
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        method: 'NAQD',
        status: 'TOLANGAN',
        allowOverride: false,
      });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['studentPayments'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "To'lov saqlashda xatolik yuz berdi");
    },
  });

  // UPDATE MUTATION
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => paymentsApi.update(id, data),
    onSuccess: () => {
      success("To'lov muvaffaqiyatli tahrirlandi!");
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['studentPayments'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "To'lovni tahrirlashda xatolik yuz berdi");
    },
  });

  // DELETE MUTATION
  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentsApi.delete(id),
    onSuccess: () => {
      success("To'lov muvaffaqiyatli o'chirildi!");
      setIsDeleteModalOpen(false);
      setDeletingPayment(null);
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['studentPayments'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "To'lovni o'chirishda xatolik yuz berdi");
    },
  });

  // Handle Create Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId) {
      error("Iltimos, talabani tanlang");
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      error("Iltimos, to'g'ri to'lov summasini kiriting");
      return;
    }

    if (monthPaymentAnalysis?.isFullyPaid && !formData.allowOverride) {
      error(`Ushbu talaba ${monthPaymentAnalysis.monthLabel} oyi uchun to'lovni to'liq to'lagan. Tasdiqlash belgisini yoqing yoki boshqa oyni tanlang.`);
      return;
    }

    const assignedGroupId = formData.groupId || currentGroup?.id || null;
    const assignedCourseId = currentGroup?.courseId || null;

    createMutation.mutate({
      studentId: formData.studentId,
      groupId: assignedGroupId,
      courseId: assignedCourseId,
      amount: Number(formData.amount),
      paymentDate: formData.paymentDate,
      method: formData.method,
      status: formData.status,
    });
  };

  // Open Edit Modal
  const handleOpenEdit = (payment: Payment) => {
    const studentFullName = payment.student
      ? `${payment.student.firstName} ${payment.student.lastName}`
      : 'Noma\'lum talaba';

    setEditFormData({
      id: payment.id,
      studentName: studentFullName,
      studentId: payment.studentId,
      groupId: payment.groupId || '',
      courseId: payment.courseId || '',
      amount: String(payment.amount),
      paymentDate: payment.paymentDate ? payment.paymentDate.split('T')[0] : '',
      method: payment.method || 'NAQD',
      status: payment.status || 'TOLANGAN',
    });
    setIsEditModalOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.amount || Number(editFormData.amount) <= 0) {
      error("To'g'ri to'lov summasini kiriting");
      return;
    }

    updateMutation.mutate({
      id: editFormData.id,
      data: {
        groupId: editFormData.groupId || null,
        courseId: editFormData.courseId || null,
        amount: Number(editFormData.amount),
        paymentDate: editFormData.paymentDate,
        method: editFormData.method,
        status: editFormData.status,
      },
    });
  };

  // Open Delete Modal
  const handleOpenDelete = (payment: Payment) => {
    setDeletingPayment(payment);
    setIsDeleteModalOpen(true);
  };

  // Export handlers
  const handleExportExcel = () => {
    if (!data?.data || data.data.length === 0) {
      error("Yuklab olish uchun ma'lumot mavjud emas");
      return;
    }

    const exportColumns = [
      { header: 'Talaba (Ism Familya)', key: 'studentName' },
      { header: 'Qabul qildi', key: 'receivedByName' },
      { header: 'Summa', key: 'amount' },
      { header: "To'lov sanasi", key: 'paymentDate' },
      { header: "To'lov usuli", key: 'method' },
      { header: 'Kurs / Guruh', key: 'courseName' },
      { header: 'Holati', key: 'status' },
    ];

    const exportRows = data.data.map((p) => ({
      studentName: p.student ? `${p.student.firstName} ${p.student.lastName}` : '-',
      receivedByName: p.receivedBy?.fullName || 'Administrator',
      amount: formatMoney(p.amount),
      paymentDate: formatDate(p.paymentDate),
      method: p.method || 'NAQD',
      courseName: p.course?.name || p.group?.name || '-',
      status: p.status === 'TOLANGAN' ? "TO'LANGAN" : p.status === 'QISMAN' ? 'QISMAN' : "TO'LANMAGAN",
    }));

    exportToExcel({
      filename: `Tolovlar_Tarixi_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Tolovlar',
      columns: exportColumns,
      data: exportRows,
    });
    success('Excel fayl yuklab olindi!');
  };

  const handleExportPdf = () => {
    if (!data?.data || data.data.length === 0) {
      error("Yuklab olish uchun ma'lumot mavjud emas");
      return;
    }

    const exportColumns = [
      { header: 'Talaba', key: 'studentName' },
      { header: 'Qabul qildi', key: 'receivedByName' },
      { header: 'Summa', key: 'amount' },
      { header: 'Sana', key: 'paymentDate' },
      { header: 'Usul', key: 'method' },
      { header: 'Kurs/Guruh', key: 'courseName' },
      { header: 'Holat', key: 'status' },
    ];

    const exportRows = data.data.map((p) => ({
      studentName: p.student ? `${p.student.firstName} ${p.student.lastName}` : '-',
      receivedByName: p.receivedBy?.fullName || 'Admin',
      amount: formatMoney(p.amount),
      paymentDate: formatDate(p.paymentDate),
      method: p.method || 'NAQD',
      courseName: p.course?.name || p.group?.name || '-',
      status: p.status === 'TOLANGAN' ? "TO'LANGAN" : p.status === 'QISMAN' ? 'QISMAN' : "TO'LANMAGAN",
    }));

    exportToPdf({
      filename: `Tolovlar_Tarixi_${new Date().toISOString().split('T')[0]}`,
      title: "TO'LOVLAR TARIXI JURNALI",
      columns: exportColumns,
      data: exportRows,
    });
    success('PDF fayl yuklab olindi!');
  };

  // Table Columns with Actions
  const columns: Column<Payment>[] = [
    {
      key: 'student',
      header: 'TALABA',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>
          {row.student ? `${row.student.firstName} ${row.student.lastName}` : '-'}
        </span>
      ),
    },
    {
      key: 'receivedBy',
      header: 'QABUL QILDI',
      render: (row) => row.receivedBy?.fullName || 'Administrator',
    },
    {
      key: 'amount',
      header: 'SUMMA',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 700, color: '#10b981' }}>
          {formatMoney(row.amount)}
        </span>
      ),
    },
    {
      key: 'paymentDate',
      header: "TO'LOV SANASI",
      sortable: true,
      render: (row) => formatDate(row.paymentDate),
    },
    {
      key: 'method',
      header: "TO'LOV USULI",
      render: (row) => (
        <Badge variant="secondary">
          {row.method || 'NAQD'}
        </Badge>
      ),
    },
    {
      key: 'course',
      header: 'KURS / GURUH',
      render: (row) => row.course?.name || row.group?.name || '-',
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
            ? 'QISMAN'
            : "TO'LANMAGAN"}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'AMALLAR',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card-subtle)',
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
            onClick={() => handleOpenEdit(row)}
            title="To'lovni tahrirlash"
          >
            <Edit2 size={13} color="var(--primary)" />
            <span>Tahrirlash</span>
          </button>
          <button
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
            onClick={() => handleOpenDelete(row)}
            title="To'lovni o'chirish"
          >
            <Trash2 size={13} />
            <span>O'chirish</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>To'lovlar Tarixi</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            O'quv markaziga amalga oshirilgan barcha to'lovlar jurnali
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <ExportDropdown
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
          />
          <Button icon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
            To'lov qabul qilish
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <Table
        columns={columns}
        data={data?.data || []}
        total={data?.total || 0}
        page={pagination.page}
        limit={pagination.limit}
        search={pagination.search}
        sortBy={pagination.sortBy}
        order={pagination.order}
        isLoading={isLoading}
        onPageChange={pagination.setPage}
        onLimitChange={pagination.setLimit}
        onSearchChange={pagination.setSearch}
        onSortChange={pagination.handleSortChange}
      />

      {/* 1. TO'LOV QABUL QILISH MODALI */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="To'lov qabul qilish"
        maxWidth="600px"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Talaba tanlash */}
          <SearchableSelect
            label="Talaba"
            required
            options={studentOptions}
            value={formData.studentId}
            onChange={handleStudentChange}
            placeholder="Talabani qidiring yoki tanlang..."
            searchPlaceholder="Ism, familiya yoki telefon raqami bilan qidirish..."
          />

          {/* Talaba tanlanganda qo'shimcha guruh va kurslar */}
          {selectedStudent && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '14px',
                backgroundColor: 'var(--card-subtle)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}
            >
              {/* Talaba profili va telefon */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={16} color="var(--primary)" />
                  <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '14px' }}>
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </span>
                </div>
                {selectedStudent.phone && (
                  <Badge variant="secondary">{formatPhone(selectedStudent.phone)}</Badge>
                )}
              </div>

              {/* Guruh / Fan tanlash (agar 2 yoki undan ko'p fanga qatnashsa) */}
              {studentEnrolledGroups.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}>
                    Qaysi guruh / fan uchun to'lov qilinmoqda?
                  </label>
                  <Select
                    options={studentEnrolledGroups.map((g) => ({
                      label: `${g.name} (${g.course?.name ? `${g.course.name} • ` : ''}${formatMoney(g.course?.price || 0)} so'm/oy)`,
                      value: g.id,
                    }))}
                    value={formData.groupId || studentEnrolledGroups[0]?.id || ''}
                    onChange={(e) => handleGroupChange(e.target.value)}
                  />
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  ⚠️ Talaba hozirda faol guruhga biriktirilmagan (Umumiy to'lov sifatida saqlanadi)
                </div>
              )}

              {/* To'lov Oyi / Davri tanlash */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}>
                  To'lov oyi / Davri
                </label>
                <Select
                  options={monthOptions.map((m) => ({
                    label: m.label,
                    value: m.value,
                  }))}
                  value={formData.selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                />
              </div>

              {/* Oylik to'lov tahlili va ogohlantirishlar */}
              {monthPaymentAnalysis && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  {/* Holat 1: Ushbu oyda allaqachon to'liq to'langan */}
                  {monthPaymentAnalysis.isFullyPaid && (
                    <div
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        fontSize: '12.5px',
                        color: 'var(--text)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 700 }}>
                        <AlertTriangle size={16} />
                        <span>Diqqat: Ushbu oy uchun to'lov to'liq amalga oshirilgan!</span>
                      </div>
                      <p style={{ margin: 0, lineHeight: 1.5, color: 'var(--text-muted)' }}>
                        <strong>{selectedStudent.firstName} {selectedStudent.lastName}</strong> ushbu guruh uchun{' '}
                        <strong style={{ color: 'var(--text)' }}>{monthPaymentAnalysis.monthLabel}</strong> oyida jami{' '}
                        <strong style={{ color: '#10b981' }}>{formatMoney(monthPaymentAnalysis.totalPaid)} so'm</strong> to'lagan (Kurs oylik narxi:{' '}
                        {formatMoney(monthPaymentAnalysis.coursePrice)} so'm).
                      </p>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        💡 Agar o'tgan oylardan qarzdorlik bo'lsa, yuqoridagi <strong>"To'lov oyi"</strong> bo'limidan o'sha oyni (masalan, Avgust) tanlang.
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                        <input
                          type="checkbox"
                          checked={formData.allowOverride}
                          onChange={(e) => setFormData({ ...formData, allowOverride: e.target.checked })}
                        />
                        Shunga qaramay qo'shimcha to'lov kiritish
                      </label>
                    </div>
                  )}

                  {/* Holat 2: Ushbu oy uchun qisman to'langan */}
                  {monthPaymentAnalysis.isPartiallyPaid && (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        fontSize: '12.5px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontWeight: 600 }}>
                        <Clock size={16} />
                        <span>
                          {monthPaymentAnalysis.monthLabel}: To'langan {formatMoney(monthPaymentAnalysis.totalPaid)} so'm • Qolgan qarz: {formatMoney(monthPaymentAnalysis.remainingDebt)} so'm
                        </span>
                      </div>
                      <button
                        type="button"
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #f59e0b',
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#f59e0b',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '11px',
                        }}
                        onClick={() => setFormData({ ...formData, amount: String(monthPaymentAnalysis.remainingDebt) })}
                      >
                        Qarzni qo'yish
                      </button>
                    </div>
                  )}

                  {/* Holat 3: Ushbu oyda to'lov qilinmagan */}
                  {!monthPaymentAnalysis.isFullyPaid && !monthPaymentAnalysis.isPartiallyPaid && monthPaymentAnalysis.coursePrice > 0 && (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        fontSize: '12.5px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 600 }}>
                        <Info size={16} />
                        <span>
                          {monthPaymentAnalysis.monthLabel}: Oylik to'lov summasi: {formatMoney(monthPaymentAnalysis.coursePrice)} so'm
                        </span>
                      </div>
                      <button
                        type="button"
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--primary)',
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '11px',
                        }}
                        onClick={() => setFormData({ ...formData, amount: String(monthPaymentAnalysis.coursePrice) })}
                      >
                        Summani qo'yish
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Summa */}
          <Input
            label="Summa (so'mda)"
            type="number"
            required
            placeholder="500000"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          />

          {/* To'lov turi */}
          <Select
            label="To'lov turi"
            options={[
              { label: 'Naqd pul', value: 'NAQD' },
              { label: 'Plastik karta (Click/Payme)', value: 'KARTA' },
              { label: "Bank o'tkazmasi", value: 'OTKAZMA' },
            ]}
            value={formData.method}
            onChange={(e) => setFormData({ ...formData, method: e.target.value })}
          />

          {/* To'lov sanasi */}
          <Input
            label="To'lov sanasi"
            type="date"
            required
            value={formData.paymentDate}
            onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
          />

          {/* Modal Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              type="submit"
              isLoading={createMutation.isPending}
              disabled={monthPaymentAnalysis?.isFullyPaid && !formData.allowOverride}
            >
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. TO'LOVNI TAHRIRLASH MODALI */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="To'lovni tahrirlash"
        maxWidth="540px"
      >
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Talaba ismi (statik) */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--card-subtle)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <UserCheck size={18} color="var(--primary)" />
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Talaba</div>
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '14px' }}>
                {editFormData.studentName}
              </div>
            </div>
          </div>

          {/* Guruh / Kurs tanlash */}
          <Select
            label="Kurs / Guruh"
            options={[
              { label: 'Guruh tanlanmagan (Umumiy)', value: '' },
              ...(allGroups?.data?.map((g) => ({
                label: `${g.name} (${g.course?.name || 'Kurs'})`,
                value: g.id,
              })) || []),
            ]}
            value={editFormData.groupId}
            onChange={(e) => {
              const grp = allGroups?.data?.find((g) => g.id === e.target.value);
              setEditFormData({
                ...editFormData,
                groupId: e.target.value,
                courseId: grp?.courseId || editFormData.courseId,
              });
            }}
          />

          {/* Summa */}
          <Input
            label="Summa (so'mda)"
            type="number"
            required
            value={editFormData.amount}
            onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
          />

          {/* To'lov turi */}
          <Select
            label="To'lov turi"
            options={[
              { label: 'Naqd pul', value: 'NAQD' },
              { label: 'Plastik karta (Click/Payme)', value: 'KARTA' },
              { label: "Bank o'tkazmasi", value: 'OTKAZMA' },
            ]}
            value={editFormData.method}
            onChange={(e) => setEditFormData({ ...editFormData, method: e.target.value })}
          />

          {/* To'lov sanasi */}
          <Input
            label="To'lov sanasi"
            type="date"
            required
            value={editFormData.paymentDate}
            onChange={(e) => setEditFormData({ ...editFormData, paymentDate: e.target.value })}
          />

          {/* Holati */}
          <Select
            label="To'lov holati"
            options={[
              { label: "TO'LANGAN", value: 'TOLANGAN' },
              { label: 'QISMAN', value: 'QISMAN' },
              { label: "TO'LANMAGAN (Bekor qilingan)", value: 'TOLANMAGAN' },
            ]}
            value={editFormData.status}
            onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
              O'zgarishlarni saqlash
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. TO'LOVNI O'CHIRISH TASDIQLASH MODALI */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="To'lovni o'chirish"
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
                  Talaba: <strong>{deletingPayment.student ? `${deletingPayment.student.firstName} ${deletingPayment.student.lastName}` : '-'}</strong>
                  <br />
                  Summa: <strong style={{ color: '#10b981' }}>{formatMoney(deletingPayment.amount)}</strong>
                  <br />
                  Sana: {formatDate(deletingPayment.paymentDate)}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={deleteMutation.isPending}
              onClick={() => deletingPayment && deleteMutation.mutate(deletingPayment.id)}
            >
              Ha, o'chirilsin
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
