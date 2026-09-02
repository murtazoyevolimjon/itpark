'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  GraduationCap,
  BookOpen,
  Folder,
  DoorOpen,
  Briefcase,
  UserPlus,
  DollarSign,
  CreditCard,
  Phone,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  FolderPlus,
  Search,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { Card } from '../components/ui/Card/Card';
import { Input } from '../components/ui/Input/Input';
import { Select } from '../components/ui/Select/Select';
import { SearchableSelect } from '../components/ui/SearchableSelect/SearchableSelect';
import { Button } from '../components/ui/Button/Button';
import { ExportDropdown } from '../components/ui/ExportDropdown/ExportDropdown';
import { Badge } from '../components/ui/Badge/Badge';
import { Modal } from '../components/ui/Modal/Modal';
import { Toggle } from '../components/ui/Toggle/Toggle';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import { useToast } from '../components/ui/Toast/Toast';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { dashboardApi } from '../api/dashboard.api';
import { groupsApi } from '../api/groups.api';
import { studentsApi } from '../api/students.api';
import { paymentsApi } from '../api/payments.api';
import { formatPhone, unmaskPhone } from '../utils/phoneMask';
import { formatMoney } from '../utils/formatMoney';
import { formatDate } from '../utils/formatDate';
import { exportToExcel, exportToPdf } from '../utils/exportData';
import styles from './Dashboard.module.css';

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<'student' | 'payment'>('student');

  // Proba section state
  const [probaSearch, setProbaSearch] = useState('');
  const [isAddProbaModalOpen, setIsAddProbaModalOpen] = useState(false);
  const [isAssignGroupModalOpen, setIsAssignGroupModalOpen] = useState(false);
  const [isEditProbaModalOpen, setIsEditProbaModalOpen] = useState(false);
  const [isDeleteProbaModalOpen, setIsDeleteProbaModalOpen] = useState(false);

  const [selectedProbaStudent, setSelectedProbaStudent] = useState<any>(null);
  const [targetGroupId, setTargetGroupId] = useState('');

  // Form for Adding New Student / Proba Student (matches Image 3)
  const [probaForm, setProbaForm] = useState({
    firstName: '',
    lastName: '',
    birthDate: '2005-01-01',
    phone: '',
    fatherPhone: '',
    motherPhone: '',
    passportSeries: '',
    gender: 'ERKAK' as 'ERKAK' | 'AYOL',
    isSchoolStudent: false,
  });

  // Form for Editing Student
  const [editProbaForm, setEditProbaForm] = useState({
    id: '',
    firstName: '',
    lastName: '',
    birthDate: '2005-01-01',
    phone: '',
    fatherPhone: '',
    motherPhone: '',
    passportSeries: '',
    gender: 'ERKAK' as 'ERKAK' | 'AYOL',
    isSchoolStudent: false,
  });

  // Bottom quick forms state
  const [studentForm, setStudentForm] = useState({
    groupId: '',
    firstName: '',
    lastName: '',
    phone: '',
    birthDate: '2005-01-01',
    gender: 'ERKAK' as 'ERKAK' | 'AYOL',
  });

  const [paymentForm, setPaymentForm] = useState({
    studentId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
  });

  // Queries
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: dashboardApi.getStats,
  });

  const { data: groupsData } = useQuery({
    queryKey: ['groupsSelect'],
    queryFn: () => groupsApi.getAll({ limit: 100 }),
  });

  const { data: studentsData } = useQuery({
    queryKey: ['studentsSelect'],
    queryFn: () => studentsApi.getAll({ limit: 1000 }),
  });

  // Proba Students List filtered by search
  const probaStudents = stats?.probaStudents || [];
  const filteredProbaStudents = useMemo(() => {
    if (!probaSearch) return probaStudents;
    const q = probaSearch.toLowerCase().trim();
    return probaStudents.filter(
      (st: any) =>
        st.studentName.toLowerCase().includes(q) ||
        (st.phone && st.phone.includes(q)) ||
        (st.fatherPhone && st.fatherPhone.includes(q)) ||
        (st.motherPhone && st.motherPhone.includes(q)) ||
        (st.passportSeries && st.passportSeries.toLowerCase().includes(q))
    );
  }, [probaStudents, probaSearch]);

  // Mutations
  // 1. Add Proba Student
  const createProbaStudentMutation = useMutation({
    mutationFn: (payload: any) => studentsApi.create({ ...payload, groupId: null }),
    onSuccess: () => {
      success("Yangi talaba proba darsi ro'yxatiga muvaffaqiyatli qo'shildi!");
      setIsAddProbaModalOpen(false);
      setProbaForm({
        firstName: '',
        lastName: '',
        birthDate: '2005-01-01',
        phone: '',
        fatherPhone: '',
        motherPhone: '',
        passportSeries: '',
        gender: 'ERKAK',
        isSchoolStudent: false,
      });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['studentsSelect'] });
    },
    onError: (err: any) => error(err.response?.data?.message || 'Xatolik yuz berdi'),
  });

  // 2. Assign Proba Student to Group
  const assignGroupMutation = useMutation({
    mutationFn: ({ groupId, studentId }: { groupId: string; studentId: string }) =>
      groupsApi.addStudent(groupId, studentId),
    onSuccess: (_, variables) => {
      const groupName = groupsData?.data?.find((g) => g.id === variables.groupId)?.name || 'guruhga';
      success(`Talaba ${groupName} guruhiga muvaffaqiyatli biriktirildi va proba ro'yxatidan chiqarildi!`);
      setIsAssignGroupModalOpen(false);
      setSelectedProbaStudent(null);
      setTargetGroupId('');
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['studentsSelect'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group'] });
    },
    onError: (err: any) => error(err.response?.data?.message || 'Guruhga biriktirishda xatolik yuz berdi'),
  });

  // 3. Update Proba Student
  const updateProbaStudentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => studentsApi.update(id, data),
    onSuccess: () => {
      success("Talaba ma'lumotlari muvaffaqiyatli tahrirlandi!");
      setIsEditProbaModalOpen(false);
      setSelectedProbaStudent(null);
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['studentsSelect'] });
    },
    onError: (err: any) => error(err.response?.data?.message || 'Tahrirlashda xatolik yuz berdi'),
  });

  // 4. Delete Proba Student
  const deleteProbaStudentMutation = useMutation({
    mutationFn: (id: string) => studentsApi.delete(id),
    onSuccess: () => {
      success("Talaba proba ro'yxatidan o'chirildi!");
      setIsDeleteProbaModalOpen(false);
      setSelectedProbaStudent(null);
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['studentsSelect'] });
    },
    onError: (err: any) => error(err.response?.data?.message || "O'chirishda xatolik yuz berdi"),
  });

  // Bottom quick forms mutations
  const createStudentMutation = useMutation({
    mutationFn: (payload: any) => studentsApi.create(payload),
    onSuccess: () => {
      success(t('add') + ' ' + t('students'));
      setStudentForm({
        groupId: '',
        firstName: '',
        lastName: '',
        phone: '',
        birthDate: '2005-01-01',
        gender: 'ERKAK',
      });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['studentsSelect'] });
    },
    onError: (err: any) => error(err.response?.data?.message || 'Xatolik yuz berdi'),
  });

  const createPaymentMutation = useMutation({
    mutationFn: (payload: any) => paymentsApi.create(payload),
    onSuccess: () => {
      success(t('add') + ' ' + t('financePayments'));
      setPaymentForm({
        studentId: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
      });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group'] });
    },
    onError: (err: any) => error(err.response?.data?.message || 'Xatolik yuz berdi'),
  });

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.firstName || !studentForm.lastName || !studentForm.phone) {
      error('Majburiy maydonlarni to\'ldiring');
      return;
    }
    createStudentMutation.mutate({
      ...studentForm,
      phone: unmaskPhone(studentForm.phone),
    });
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.studentId || !paymentForm.amount) {
      error('Talaba va summani kiriting');
      return;
    }
    const selectedSt = studentsData?.data?.find((s) => s.id === paymentForm.studentId);
    const firstGrp = selectedSt?.studentGroups?.[0];

    createPaymentMutation.mutate({
      ...paymentForm,
      groupId: firstGrp?.groupId || null,
      courseId: firstGrp?.group?.courseId || null,
      amount: Number(paymentForm.amount),
    });
  };

  // Handlers for Proba Student
  const handleAddProbaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!probaForm.firstName || !probaForm.lastName || !probaForm.phone) {
      error('Ism, Familiya va Telefon raqamini to\'ldiring');
      return;
    }

    createProbaStudentMutation.mutate({
      ...probaForm,
      phone: unmaskPhone(probaForm.phone),
      fatherPhone: probaForm.fatherPhone ? unmaskPhone(probaForm.fatherPhone) : null,
      motherPhone: probaForm.motherPhone ? unmaskPhone(probaForm.motherPhone) : null,
      birthDate: probaForm.birthDate ? new Date(probaForm.birthDate).toISOString() : new Date().toISOString(),
    });
  };

  const handleOpenAssignGroup = (student: any) => {
    setSelectedProbaStudent(student);
    setTargetGroupId(groupsData?.data?.[0]?.id || '');
    setIsAssignGroupModalOpen(true);
  };

  const handleAssignGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProbaStudent || !targetGroupId) {
      error('Iltimos, guruhni tanlang');
      return;
    }

    assignGroupMutation.mutate({
      groupId: targetGroupId,
      studentId: selectedProbaStudent.id,
    });
  };

  const handleOpenEditProba = (student: any) => {
    setSelectedProbaStudent(student);
    setEditProbaForm({
      id: student.id,
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      birthDate: student.birthDate ? student.birthDate.split('T')[0] : '2005-01-01',
      phone: formatPhone(student.phone) || '',
      fatherPhone: student.fatherPhone ? formatPhone(student.fatherPhone) : '',
      motherPhone: student.motherPhone ? formatPhone(student.motherPhone) : '',
      passportSeries: student.passportSeries || '',
      gender: student.gender || 'ERKAK',
      isSchoolStudent: !!student.isSchoolStudent,
    });
    setIsEditProbaModalOpen(true);
  };

  const handleEditProbaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProbaForm.firstName || !editProbaForm.lastName || !editProbaForm.phone) {
      error('Ism, Familiya va Telefon raqamini to\'ldiring');
      return;
    }

    updateProbaStudentMutation.mutate({
      id: editProbaForm.id,
      data: {
        firstName: editProbaForm.firstName,
        lastName: editProbaForm.lastName,
        birthDate: editProbaForm.birthDate ? new Date(editProbaForm.birthDate).toISOString() : undefined,
        phone: unmaskPhone(editProbaForm.phone),
        fatherPhone: editProbaForm.fatherPhone ? unmaskPhone(editProbaForm.fatherPhone) : null,
        motherPhone: editProbaForm.motherPhone ? unmaskPhone(editProbaForm.motherPhone) : null,
        passportSeries: editProbaForm.passportSeries || null,
        gender: editProbaForm.gender,
        isSchoolStudent: editProbaForm.isSchoolStudent,
      },
    });
  };

  const handleOpenDeleteProba = (student: any) => {
    setSelectedProbaStudent(student);
    setIsDeleteProbaModalOpen(true);
  };

  // Stat Items
  const statItems = [
    {
      key: 'students',
      label: t('students'),
      val: stats?.studentsCount ?? 0,
      icon: Users,
      color: '#2b7fff',
      bg: 'rgba(43, 127, 255, 0.12)',
    },
    {
      key: 'teachers',
      label: t('teachers'),
      val: stats?.teachersCount ?? 0,
      icon: GraduationCap,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
    },
    {
      key: 'courses',
      label: t('courses'),
      val: stats?.coursesCount ?? 0,
      icon: BookOpen,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
    },
    {
      key: 'groups',
      label: t('groups'),
      val: stats?.groupsCount ?? 0,
      icon: Folder,
      color: '#9333ea',
      bg: 'rgba(147, 51, 234, 0.12)',
    },
    {
      key: 'rooms',
      label: t('rooms'),
      val: stats?.roomsCount ?? 0,
      icon: DoorOpen,
      color: '#06b6d4',
      bg: 'rgba(6, 182, 212, 0.12)',
    },
    {
      key: 'employees',
      label: t('employees'),
      val: stats?.employeesCount ?? 0,
      icon: Briefcase,
      color: '#ec4899',
      bg: 'rgba(236, 72, 153, 0.12)',
    },
  ];

  // Export handlers for Proba Students
  const handleExportProbaExcel = () => {
    if (!probaStudents || probaStudents.length === 0) {
      error("Yuklab olish uchun proba talabalari mavjud emas");
      return;
    }

    const exportColumns = [
      { header: 'Talaba (Ism Familya)', key: 'studentName' },
      { header: "O'quvchi telefoni", key: 'phone' },
      { header: 'Otasining telefoni', key: 'fatherPhone' },
      { header: 'Onasining telefoni', key: 'motherPhone' },
      { header: 'Passport seriyasi', key: 'passportSeries' },
      { header: "Tug'ilgan sana", key: 'birthDate' },
      { header: "Qo'shilgan sana", key: 'createdAt' },
      { header: 'Holati', key: 'status' },
    ];

    const exportRows = probaStudents.map((item: any) => ({
      studentName: item.studentName,
      phone: formatPhone(item.phone),
      fatherPhone: item.fatherPhone ? formatPhone(item.fatherPhone) : '-',
      motherPhone: item.motherPhone ? formatPhone(item.motherPhone) : '-',
      passportSeries: item.passportSeries || '-',
      birthDate: formatDate(item.birthDate),
      createdAt: formatDate(item.createdAt),
      status: "PROBA / SINOV DARSI",
    }));

    exportToExcel({
      filename: `Proba_Darslar_Royxati_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Proba Darsdagilar',
      columns: exportColumns,
      data: exportRows,
    });
    success('Excel fayl yuklab olindi!');
  };

  const handleExportProbaPdf = () => {
    if (!probaStudents || probaStudents.length === 0) {
      error("Yuklab olish uchun proba talabalari mavjud emas");
      return;
    }

    const exportColumns = [
      { header: 'Talaba', key: 'studentName' },
      { header: 'Telefon', key: 'phone' },
      { header: 'Otasi tel', key: 'fatherPhone' },
      { header: 'Onasi tel', key: 'motherPhone' },
      { header: 'Passport', key: 'passportSeries' },
      { header: "Qo'shilgan sana", key: 'createdAt' },
      { header: 'Holat', key: 'status' },
    ];

    const exportRows = probaStudents.map((item: any) => ({
      studentName: item.studentName,
      phone: formatPhone(item.phone),
      fatherPhone: item.fatherPhone ? formatPhone(item.fatherPhone) : '-',
      motherPhone: item.motherPhone ? formatPhone(item.motherPhone) : '-',
      passportSeries: item.passportSeries || '-',
      createdAt: formatDate(item.createdAt),
      status: "PROBA",
    }));

    exportToPdf({
      filename: `Proba_Darslar_Royxati_${new Date().toISOString().split('T')[0]}`,
      title: "PROBA DARSIGA KELADIGANLAR RO'YXATI (SINOV DARSI)",
      columns: exportColumns,
      data: exportRows,
    });
    success('PDF fayl yuklab olindi!');
  };

  // Debtors Export
  const unpaidStudents = stats?.unpaidStudents || [];

  const handleExportDebtorsExcel = () => {
    if (!unpaidStudents || unpaidStudents.length === 0) {
      error("Yuklab olish uchun qarzdorlar mavjud emas");
      return;
    }

    const exportColumns = [
      { header: 'Talaba (Ism Familya)', key: 'studentName' },
      { header: 'Guruhi', key: 'groupName' },
      { header: "O'quvchi telefoni", key: 'studentPhone' },
      { header: 'Otasining telefoni', key: 'fatherPhone' },
      { header: 'Onasining telefoni', key: 'motherPhone' },
      { header: 'Kurs narxi', key: 'coursePrice' },
      { header: 'Qarzdorlik summasi', key: 'debtAmount' },
      { header: "To'lov holati", key: 'paymentStatus' },
    ];

    const exportRows = unpaidStudents.map((item: any) => ({
      studentName: item.studentName,
      groupName: item.groupName,
      studentPhone: formatPhone(item.studentPhone),
      fatherPhone: item.fatherPhone ? formatPhone(item.fatherPhone) : '-',
      motherPhone: item.motherPhone ? formatPhone(item.motherPhone) : '-',
      coursePrice: formatMoney(item.coursePrice),
      debtAmount: formatMoney(item.debtAmount),
      paymentStatus: item.paymentStatus === 'QISMAN' ? "QISMAN TO'LANGAN" : "TO'LANMAGAN",
    }));

    exportToExcel({
      filename: `Qarzdorlar_Royxati_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Qarzdorlar',
      columns: exportColumns,
      data: exportRows,
    });
    success('Excel fayl yuklab olindi!');
  };

  const handleExportDebtorsPdf = () => {
    if (!unpaidStudents || unpaidStudents.length === 0) {
      error("Yuklab olish uchun qarzdorlar mavjud emas");
      return;
    }

    const exportColumns = [
      { header: 'Talaba', key: 'studentName' },
      { header: 'Guruhi', key: 'groupName' },
      { header: "O'quvchi tel", key: 'studentPhone' },
      { header: 'Otasi tel', key: 'fatherPhone' },
      { header: 'Onasi tel', key: 'motherPhone' },
      { header: 'Kurs narxi', key: 'coursePrice' },
      { header: 'Qarzdorlik', key: 'debtAmount' },
      { header: 'Holat', key: 'paymentStatus' },
    ];

    const exportRows = unpaidStudents.map((item: any) => ({
      studentName: item.studentName,
      groupName: item.groupName,
      studentPhone: formatPhone(item.studentPhone),
      fatherPhone: item.fatherPhone ? formatPhone(item.fatherPhone) : '-',
      motherPhone: item.motherPhone ? formatPhone(item.motherPhone) : '-',
      coursePrice: formatMoney(item.coursePrice),
      debtAmount: formatMoney(item.debtAmount),
      paymentStatus: item.paymentStatus === 'QISMAN' ? 'QISMAN' : "TO'LANMAGAN",
    }));

    exportToPdf({
      filename: `Qarzdorlar_Royxati_${new Date().toISOString().split('T')[0]}`,
      title: "TO'LOV QILMAGAN O'QUVCHILAR RO'YXATI (QARZDORLAR)",
      columns: exportColumns,
      data: exportRows,
    });
    success('PDF fayl yuklab olindi!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. 2x3 Stat Cards */}
      <div className={styles.statsGrid}>
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>{item.label}</span>
                <div className={styles.statIcon} style={{ backgroundColor: item.bg, color: item.color }}>
                  <Icon size={18} />
                </div>
              </div>
              {isStatsLoading ? (
                <Skeleton width="60px" height="28px" />
              ) : (
                <span className={styles.statValue}>{item.val}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* 2. Proba Darsga Keladiganlar Ro'yxati (Sinov Darsi) Section */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'rgba(6, 182, 212, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#06b6d4',
              }}
            >
              <UserCheck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                Proba darsiga keladiganlar (Sinov darsi)
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Markazga yangi kelgan va guruhga biriktirilmagan sinov darsi o'quvchilari
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Proba o'quvchilarni izlash..."
                value={probaSearch}
                onChange={(e) => setProbaSearch(e.target.value)}
                style={{
                  padding: '7px 12px 7px 30px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--card-subtle)',
                  color: 'var(--text)',
                  fontSize: '12.5px',
                  outline: 'none',
                  minWidth: '220px',
                }}
              />
            </div>

            <ExportDropdown
              size="sm"
              onExportExcel={handleExportProbaExcel}
              onExportPdf={handleExportProbaPdf}
            />

            <Badge variant="primary">
              {probaStudents.length} ta o'quvchi
            </Badge>

            <Button
              size="sm"
              variant="primary"
              icon={<Plus size={15} />}
              onClick={() => setIsAddProbaModalOpen(true)}
            >
              Yangi Talaba Qo'shish
            </Button>
          </div>
        </div>

        {isStatsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Skeleton height="40px" />
            <Skeleton height="40px" />
            <Skeleton height="40px" />
          </div>
        ) : filteredProbaStudents.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--card-subtle)', borderRadius: 'var(--radius-sm)' }}>
            <UserCheck size={32} color="var(--primary)" style={{ margin: '0 auto 8px', opacity: 0.6 }} />
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>
              {probaSearch ? "Qidiruv bo'yicha proba talabasi topilmadi" : "Hozirda proba darsida turgan talabalar mavjud emas"}
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px', marginBottom: '14px' }}>
              Yangi kelgan o'quvchini qo'shish uchun quyidagi tugmani bosing
            </div>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setIsAddProbaModalOpen(true)}>
              + Yangi Talaba Qo'shish
            </Button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>O'QUVCHI (ISM FAMILYA)</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>TUG'ILGAN SANA</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>TELEFON RAQAMI</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>OTA-ONASINING TELEFONI</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>PASSPORT SERIYA</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>RO'YXATGA OLINGAN</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>HOLATI</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'center' }}>AMALLAR</th>
                </tr>
              </thead>
              <tbody>
                {filteredProbaStudents.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s' }}>
                    {/* Ism Familiya */}
                    <td style={{ padding: '14px', fontWeight: 600, color: 'var(--text)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            background: 'rgba(6, 182, 212, 0.2)',
                            color: '#06b6d4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {item.firstName?.[0]}
                          {item.lastName?.[0]}
                        </div>
                        <div>
                          <div>{item.studentName}</div>
                          {item.isSchoolStudent && (
                            <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>
                              Maktab o'quvchisi
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Tug'ilgan sana */}
                    <td style={{ padding: '14px', color: 'var(--text-muted)' }}>
                      {formatDate(item.birthDate)}
                    </td>

                    {/* O'quvchi telefoni */}
                    <td style={{ padding: '14px' }}>
                      {item.phone && item.phone !== '-' ? (
                        <a
                          href={`tel:${item.phone}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}
                        >
                          <Phone size={13} />
                          {formatPhone(item.phone)}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>

                    {/* Ota-onasining telefoni */}
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.fatherPhone && (
                          <a
                            href={`tel:${item.fatherPhone}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text)', textDecoration: 'none', fontSize: '12px' }}
                          >
                            <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: 4, background: 'rgba(43, 127, 255, 0.1)', color: 'var(--primary)', fontWeight: 700 }}>Otasi</span>
                            <Phone size={11} color="var(--primary)" />
                            {formatPhone(item.fatherPhone)}
                          </a>
                        )}
                        {item.motherPhone && (
                          <a
                            href={`tel:${item.motherPhone}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text)', textDecoration: 'none', fontSize: '12px' }}
                          >
                            <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: 4, background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', fontWeight: 700 }}>Onasi</span>
                            <Phone size={11} color="#ec4899" />
                            {formatPhone(item.motherPhone)}
                          </a>
                        )}
                        {!item.fatherPhone && !item.motherPhone && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Kiritilmagan</span>
                        )}
                      </div>
                    </td>

                    {/* Passport seriya */}
                    <td style={{ padding: '14px', color: 'var(--text-muted)' }}>
                      {item.passportSeries || '-'}
                    </td>

                    {/* Ro'yxatga olingan */}
                    <td style={{ padding: '14px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {formatDate(item.createdAt)}
                    </td>

                    {/* Holati */}
                    <td style={{ padding: '14px' }}>
                      <Badge variant="warning">
                        PROBA / SINOV
                      </Badge>
                    </td>

                    {/* Amallar */}
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<FolderPlus size={13} />}
                          onClick={() => handleOpenAssignGroup(item)}
                          title="Guruhga qo'shish"
                        >
                          Guruhga qo'shish
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<Edit2 size={13} />}
                          onClick={() => handleOpenEditProba(item)}
                          title="Tahrirlash"
                        >
                          Tahrirlash
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          icon={<Trash2 size={13} />}
                          onClick={() => handleOpenDeleteProba(item)}
                          title="O'chirish"
                        >
                          O'chirish
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 3. Unpaid / Debtor Students Section */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <CreditCard size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                To'lov qilmagan o'quvchilar ro'yxati (Qarzdorlar)
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                To'lovni amalga oshirmagan yoki qisman to'lagan o'quvchilar va ularning bog'lanish ma'lumotlari
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <ExportDropdown
              size="sm"
              onExportExcel={handleExportDebtorsExcel}
              onExportPdf={handleExportDebtorsPdf}
            />
            <Badge variant="warning">
              {unpaidStudents.length} ta qarzdor
            </Badge>
          </div>
        </div>

        {isStatsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Skeleton height="40px" />
            <Skeleton height="40px" />
            <Skeleton height="40px" />
          </div>
        ) : unpaidStudents.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--card-subtle)', borderRadius: 'var(--radius-sm)' }}>
            <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>Barcha o'quvchilar to'lovlarni to'liq amalga oshirgan</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Hozirda qarzdor o'quvchilar mavjud emas 🎉</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>O'QUVCHI (ISM FAMILYA)</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>GURUHI</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>O'QUVCHI TELEFONI</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>OTA-ONASINING TELEFONI</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>KURS NARXI</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>QARZDORLIK</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>TO'LOV HOLATI</th>
                </tr>
              </thead>
              <tbody>
                {unpaidStudents.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s' }}>
                    {/* Ism Familiya */}
                    <td style={{ padding: '14px', fontWeight: 600, color: 'var(--text)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                          {item.studentName.charAt(0)}
                        </div>
                        <span>{item.studentName}</span>
                      </div>
                    </td>

                    {/* Guruh */}
                    <td style={{ padding: '14px' }}>
                      <Badge variant="primary">{item.groupName}</Badge>
                    </td>

                    {/* Talaba telefoni */}
                    <td style={{ padding: '14px' }}>
                      {item.studentPhone && item.studentPhone !== '-' ? (
                        <a
                          href={`tel:${item.studentPhone}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}
                        >
                          <Phone size={14} />
                          {formatPhone(item.studentPhone)}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>

                    {/* Ota-onasi telefoni */}
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.fatherPhone && (
                          <a
                            href={`tel:${item.fatherPhone}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text)', textDecoration: 'none', fontSize: '12px' }}
                          >
                            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: 4, background: 'rgba(43, 127, 255, 0.1)', color: 'var(--primary)', fontWeight: 700 }}>Otasi</span>
                            <Phone size={12} color="var(--primary)" />
                            {formatPhone(item.fatherPhone)}
                          </a>
                        )}
                        {item.motherPhone && (
                          <a
                            href={`tel:${item.motherPhone}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text)', textDecoration: 'none', fontSize: '12px' }}
                          >
                            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: 4, background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', fontWeight: 700 }}>Onasi</span>
                            <Phone size={12} color="#ec4899" />
                            {formatPhone(item.motherPhone)}
                          </a>
                        )}
                        {!item.fatherPhone && !item.motherPhone && (
                          <span style={{ color: 'var(--text-muted)' }}>Kiritilmagan</span>
                        )}
                      </div>
                    </td>

                    {/* Kurs narxi */}
                    <td style={{ padding: '14px', color: 'var(--text-muted)' }}>
                      {formatMoney(item.coursePrice)}
                    </td>

                    {/* Qarz summasi */}
                    <td style={{ padding: '14px', fontWeight: 700, color: '#ef4444' }}>
                      {formatMoney(item.debtAmount)}
                    </td>

                    {/* To'lov holati */}
                    <td style={{ padding: '14px' }}>
                      <Badge variant={item.paymentStatus === 'QISMAN' ? 'warning' : 'danger'}>
                        {item.paymentStatus === 'QISMAN' ? "QISMAN TO'LANGAN" : "TO'LANMAGAN"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 4. Quick Actions & Recent Data */}
      <div className={styles.bottomSection}>
        <Card>
          <div className={styles.tabHeaders}>
            <button
              className={`${styles.tabBtn} ${activeTab === 'student' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('student')}
            >
              <UserPlus size={16} />
              <span>{t('newStudent')}</span>
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'payment' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('payment')}
            >
              <DollarSign size={16} />
              <span>{t('financePayments')}</span>
            </button>
          </div>

          <div style={{ marginTop: '20px' }}>
            {activeTab === 'student' ? (
              <form onSubmit={handleStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Select
                  label={t('groups')}
                  options={[
                    { label: "Guruhsiz (Proba / Sinov darsi)", value: '' },
                    ...(groupsData?.data?.map((g) => ({ label: g.name, value: g.id })) || []),
                  ]}
                  value={studentForm.groupId}
                  onChange={(e) => setStudentForm({ ...studentForm, groupId: e.target.value })}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Input
                    label={t('firstName')}
                    placeholder="Ali"
                    value={studentForm.firstName}
                    onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                    required
                  />
                  <Input
                    label={t('lastName')}
                    placeholder="Valiyev"
                    value={studentForm.lastName}
                    onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                    required
                  />
                </div>
                <Input
                  label={t('phone')}
                  placeholder="+998 90 123 45 67"
                  value={formatPhone(studentForm.phone)}
                  onChange={(e) => setStudentForm({ ...studentForm, phone: unmaskPhone(e.target.value) })}
                  required
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Input
                    label={t('birthDate')}
                    type="date"
                    value={studentForm.birthDate}
                    onChange={(e) => setStudentForm({ ...studentForm, birthDate: e.target.value })}
                    required
                  />
                  <Select
                    label={t('gender')}
                    options={[
                      { label: 'Erkak', value: 'ERKAK' },
                      { label: 'Ayol', value: 'AYOL' },
                    ]}
                    value={studentForm.gender}
                    onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as any })}
                  />
                </div>
                <Button type="submit" isLoading={createStudentMutation.isPending} style={{ marginTop: '8px' }}>
                  {t('save')}
                </Button>
              </form>
            ) : (
              <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <SearchableSelect
                  label={t('students')}
                  options={
                    studentsData?.data?.map((s) => ({
                      label: `${s.firstName} ${s.lastName}`,
                      value: s.id,
                      phone: s.phone,
                      groupName: s.studentGroups?.[0]?.group?.name || (s.studentGroups?.[0] as any)?.name,
                    })) || []
                  }
                  value={paymentForm.studentId}
                  onChange={(val) => setPaymentForm({ ...paymentForm, studentId: val })}
                  placeholder="Talabani ism yoki telefon raqami orqali qidiring..."
                  required
                />
                <Input
                  label={t('amount')}
                  type="number"
                  placeholder="500000"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  required
                />
                <Input
                  label={t('date')}
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  required
                />
                <Button type="submit" isLoading={createPaymentMutation.isPending} style={{ marginTop: '8px' }}>
                  {t('save')}
                </Button>
              </form>
            )}
          </div>
        </Card>
      </div>

      {/* ================= MODALS ================= */}

      {/* MODAL 1: YANGI TALABA QO'SHISH (Exact match with Image 3) */}
      <Modal
        isOpen={isAddProbaModalOpen}
        onClose={() => setIsAddProbaModalOpen(false)}
        title="Yangi Talaba Qo'shish"
        maxWidth="540px"
      >
        <form onSubmit={handleAddProbaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Ism & Familya */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Input
              label="Ism"
              placeholder="Ali"
              required
              value={probaForm.firstName}
              onChange={(e) => setProbaForm({ ...probaForm, firstName: e.target.value })}
            />
            <Input
              label="Familya"
              placeholder="Valiyev"
              required
              value={probaForm.lastName}
              onChange={(e) => setProbaForm({ ...probaForm, lastName: e.target.value })}
            />
          </div>

          {/* Tug'ilgan kun */}
          <Input
            label="Tug'ilgan kun"
            type="date"
            required
            value={probaForm.birthDate}
            onChange={(e) => setProbaForm({ ...probaForm, birthDate: e.target.value })}
          />

          {/* Telefon raqam */}
          <Input
            label="Telefon raqam"
            placeholder="+998 90 123 45 67"
            required
            value={formatPhone(probaForm.phone)}
            onChange={(e) => setProbaForm({ ...probaForm, phone: unmaskPhone(e.target.value) })}
          />

          {/* Otasi & Onasi telefoni */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Input
              label="Otasining telefoni"
              placeholder="+998 90 123 45 67"
              value={formatPhone(probaForm.fatherPhone)}
              onChange={(e) => setProbaForm({ ...probaForm, fatherPhone: unmaskPhone(e.target.value) })}
            />
            <Input
              label="Onasining telefoni"
              placeholder="+998 90 123 45 67"
              value={formatPhone(probaForm.motherPhone)}
              onChange={(e) => setProbaForm({ ...probaForm, motherPhone: unmaskPhone(e.target.value) })}
            />
          </div>

          {/* Passport seriya */}
          <Input
            label="Passport seriya (AD XXXXXXX)"
            placeholder="AD 1234567"
            value={probaForm.passportSeries}
            onChange={(e) => setProbaForm({ ...probaForm, passportSeries: e.target.value.toUpperCase() })}
          />

          {/* Jinsi */}
          <Select
            label="Jinsi"
            required
            options={[
              { label: 'Erkak', value: 'ERKAK' },
              { label: 'Ayol', value: 'AYOL' },
            ]}
            value={probaForm.gender}
            onChange={(e) => setProbaForm({ ...probaForm, gender: e.target.value as any })}
          />

          {/* Maktab o'quvchisi toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0' }}>
            <Toggle
              checked={probaForm.isSchoolStudent}
              onChange={(checked) => setProbaForm({ ...probaForm, isSchoolStudent: checked })}
              label="Maktab o'quvchisi"
            />
          </div>

          {/* Modal buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAddProbaModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" isLoading={createProbaStudentMutation.isPending} style={{ minWidth: '120px' }}>
              SAQLASH
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: GURUHGA BIRIKTIRISH (Assign Proba Student to Group) */}
      <Modal
        isOpen={isAssignGroupModalOpen}
        onClose={() => setIsAssignGroupModalOpen(false)}
        title="Guruhga Qo'shish"
        maxWidth="480px"
      >
        <form onSubmit={handleAssignGroupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedProbaStudent && (
            <div
              style={{
                padding: '14px 16px',
                backgroundColor: 'var(--card-subtle)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'var(--primary-grad)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                {selectedProbaStudent.firstName?.[0]}
                {selectedProbaStudent.lastName?.[0]}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '15px' }}>
                  {selectedProbaStudent.studentName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {formatPhone(selectedProbaStudent.phone)}
                </div>
              </div>
            </div>
          )}

          <Select
            label="Qaysi guruhga qo'shmoqchisiz? *"
            required
            options={
              groupsData?.data?.map((g) => ({
                label: `${g.name} (${g.course?.name || ''} • ${formatMoney(g.course?.price)}/oy)`,
                value: g.id,
              })) || []
            }
            value={targetGroupId}
            onChange={(e) => setTargetGroupId(e.target.value)}
          />

          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              fontSize: '12px',
              color: 'var(--text)',
              lineHeight: 1.4,
            }}
          >
            💡 Talaba guruhga qo'shilgandan so'ng, avtomatik tarzda <strong>proba darsi ro'yxatidan chiqariladi</strong> va guruh a'zosiga aylanadi.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAssignGroupModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" isLoading={assignGroupMutation.isPending}>
              Guruhga Qo'shish
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: TAHRIRLASH */}
      <Modal
        isOpen={isEditProbaModalOpen}
        onClose={() => setIsEditProbaModalOpen(false)}
        title="Talaba Ma'lumotlarini Tahrirlash"
        maxWidth="540px"
      >
        <form onSubmit={handleEditProbaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Input
              label="Ism"
              placeholder="Ali"
              required
              value={editProbaForm.firstName}
              onChange={(e) => setEditProbaForm({ ...editProbaForm, firstName: e.target.value })}
            />
            <Input
              label="Familya"
              placeholder="Valiyev"
              required
              value={editProbaForm.lastName}
              onChange={(e) => setEditProbaForm({ ...editProbaForm, lastName: e.target.value })}
            />
          </div>

          <Input
            label="Tug'ilgan kun"
            type="date"
            required
            value={editProbaForm.birthDate}
            onChange={(e) => setEditProbaForm({ ...editProbaForm, birthDate: e.target.value })}
          />

          <Input
            label="Telefon raqam"
            placeholder="+998 90 123 45 67"
            required
            value={formatPhone(editProbaForm.phone)}
            onChange={(e) => setEditProbaForm({ ...editProbaForm, phone: unmaskPhone(e.target.value) })}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Input
              label="Otasining telefoni"
              placeholder="+998 90 123 45 67"
              value={formatPhone(editProbaForm.fatherPhone)}
              onChange={(e) => setEditProbaForm({ ...editProbaForm, fatherPhone: unmaskPhone(e.target.value) })}
            />
            <Input
              label="Onasining telefoni"
              placeholder="+998 90 123 45 67"
              value={formatPhone(editProbaForm.motherPhone)}
              onChange={(e) => setEditProbaForm({ ...editProbaForm, motherPhone: unmaskPhone(e.target.value) })}
            />
          </div>

          <Input
            label="Passport seriya (AD XXXXXXX)"
            placeholder="AD 1234567"
            value={editProbaForm.passportSeries}
            onChange={(e) => setEditProbaForm({ ...editProbaForm, passportSeries: e.target.value.toUpperCase() })}
          />

          <Select
            label="Jinsi"
            required
            options={[
              { label: 'Erkak', value: 'ERKAK' },
              { label: 'Ayol', value: 'AYOL' },
            ]}
            value={editProbaForm.gender}
            onChange={(e) => setEditProbaForm({ ...editProbaForm, gender: e.target.value as any })}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0' }}>
            <Toggle
              checked={editProbaForm.isSchoolStudent}
              onChange={(checked) => setEditProbaForm({ ...editProbaForm, isSchoolStudent: checked })}
              label="Maktab o'quvchisi"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsEditProbaModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" isLoading={updateProbaStudentMutation.isPending}>
              O'zgarishlarni Saqlash
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: O'CHIRISH */}
      <Modal
        isOpen={isDeleteProbaModalOpen}
        onClose={() => setIsDeleteProbaModalOpen(false)}
        title="Talabani O'chirish"
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
                Haqiqatan ham ushbu talabani o'chirmoqchimisiz?
              </p>
              {selectedProbaStudent && (
                <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Talaba: <strong>{selectedProbaStudent.studentName}</strong>
                  <br />
                  Telefon: {formatPhone(selectedProbaStudent.phone)}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsDeleteProbaModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={deleteProbaStudentMutation.isPending}
              onClick={() => selectedProbaStudent && deleteProbaStudentMutation.mutate(selectedProbaStudent.id)}
            >
              Ha, o'chirilsin
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
