'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Key, FileSpreadsheet, FileText, Eye, EyeOff, CalendarCheck, Users, Copy, Check, DollarSign, Coins } from 'lucide-react';
import { Table, Column } from '../components/ui/Table/Table';
import { Button } from '../components/ui/Button/Button';
import { ExportDropdown } from '../components/ui/ExportDropdown/ExportDropdown';
import { Modal } from '../components/ui/Modal/Modal';
import { Input } from '../components/ui/Input/Input';
import { Select } from '../components/ui/Select/Select';
import { Badge } from '../components/ui/Badge/Badge';
import { GroupCardSelect } from '../components/ui/GroupCardSelect/GroupCardSelect';
import { TeacherSalaryModal } from '../components/ui/TeacherSalaryModal/TeacherSalaryModal';
import { useToast } from '../components/ui/Toast/Toast';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';
import { useLanguage } from '../hooks/useLanguage';
import { teachersApi } from '../api/teachers.api';
import { groupsApi } from '../api/groups.api';
import { Teacher } from '../types';
import { formatPhone, unmaskPhone } from '../utils/phoneMask';
import { formatMoney } from '../utils/formatMoney';
import { exportToExcel, exportToPdf } from '../utils/exportData';

export const Teachers: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { t, dict } = useLanguage();
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [deleteTeacherId, setDeleteTeacherId] = useState<string | null>(null);

  // Salary modal state
  const [salaryTeacher, setSalaryTeacher] = useState<Teacher | null>(null);

  // Credentials visibility and copy states
  const [showTeacherPassMap, setShowTeacherPassMap] = useState<Record<string, boolean>>({});
  const [copiedTeacherId, setCopiedTeacherId] = useState<string | null>(null);

  // Password reset modal state
  const [passwordModalTeacher, setPasswordModalTeacher] = useState<Teacher | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Attendance & groups modal state
  const [attendanceTeacher, setAttendanceTeacher] = useState<Teacher | null>(null);

  // Fetch groups for selected teacher in modal
  const { data: teacherGroupsData, isLoading: isTeacherGroupsLoading } = useQuery({
    queryKey: ['teacherGroupsModal', attendanceTeacher?.id],
    queryFn: () => groupsApi.getAll({ teacherId: attendanceTeacher?.id, limit: 100 }),
    enabled: !!attendanceTeacher?.id,
  });
  const teacherGroups = teacherGroupsData?.data || [];

  // Eye toggle states
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    login: '',
    password: '',
    status: 'FAOL',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['teachers', pagination.page, pagination.limit, debouncedSearch, pagination.sortBy, pagination.order],
    queryFn: () =>
      teachersApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        sortBy: pagination.sortBy,
        order: pagination.order,
      }),
    placeholderData: keepPreviousData,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      selectedTeacher
        ? teachersApi.update(selectedTeacher.id, payload)
        : teachersApi.create(payload),
    onSuccess: () => {
      success(selectedTeacher ? 'Ustoz tahrirlandi' : 'Yangi ustoz qo\'shildi');
      handleCloseModal();
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teachersSelect'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Saqlashda xatolik');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => teachersApi.delete(id),
    onSuccess: () => {
      success('Ustoz o\'chirildi');
      setDeleteTeacherId(null);
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teachersSelect'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'O\'chirishda xatolik');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: ({ id, pass }: { id: string; pass: string }) =>
      teachersApi.update(id, { password: pass }),
    onSuccess: () => {
      success('O\'qituvchi paroli muvaffaqiyatli yangilandi!');
      setPasswordModalTeacher(null);
      setNewPassword('');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Parolni yangilashda xatolik');
    },
  });

  const handleOpenModal = (teacher?: Teacher) => {
    if (teacher) {
      setSelectedTeacher(teacher);
      setFormData({
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        phone: teacher.phone,
        login: teacher.login || '',
        password: teacher.password || '',
        status: teacher.status,
      });
    } else {
      setSelectedTeacher(null);
      const randPin = Math.floor(100000 + Math.random() * 900000).toString();
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        login: '',
        password: randPin,
        status: 'FAOL',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTeacher(null);
    setShowFormPassword(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      error('Barcha majburiy maydonlarni to\'ldiring');
      return;
    }
    // Salary and passport are no longer entered here: a new teacher gets the defaults and an edited one keeps its values
    const payload: any = {
      ...formData,
      phone: unmaskPhone(formData.phone),
    };
    if (formData.login) {
      payload.login = formData.login.trim().toLowerCase();
    }
    if (formData.password) {
      payload.password = formData.password.trim();
    } else {
      delete payload.password;
    }

    if (selectedTeacher) {
      saveMutation.mutate(payload);
      return;
    }

    // New teacher: close the form at once and save in the background; if it is rejected the form comes back filled in
    const snapshot = formData;
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    handleCloseModal();
    teachersApi
      .create(payload)
      .then((created: any) => {
        success(`${fullName} qo'shildi. Login: ${created?.login || payload.login || '-'}, parol: ${created?.password || payload.password || '-'}`);
        queryClient.invalidateQueries({ queryKey: ['teachers'] });
        queryClient.invalidateQueries({ queryKey: ['teachersSelect'] });
      })
      .catch((err: any) => {
        error(`${fullName}: ${err.response?.data?.message || 'Saqlashda xatolik'}`);
        setSelectedTeacher(null);
        setFormData(snapshot);
        setIsModalOpen(true);
      });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalTeacher || !newPassword.trim()) {
      error('Yangi parolni kiriting');
      return;
    }
    passwordMutation.mutate({
      id: passwordModalTeacher.id,
      pass: newPassword.trim(),
    });
  };

  const columns: Column<Teacher>[] = [
    {
      key: 'name',
      header: dict.teachersPage.colName,
      sortable: true,
      render: (row) => (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setSalaryTeacher(row);
          }}
          title={dict.teachersPage.salaryCalcLink}
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>
            {row.firstName} {row.lastName}
          </span>
          <span style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 500 }}>
            {dict.teachersPage.salaryCalcLink}
          </span>
        </div>
      ),
    },
    {
      key: 'login',
      header: dict.teachersPage.colLogin,
      render: (row) => {
        const isPassVisible = !!showTeacherPassMap[row.id];
        const teacherLogin = row.login || unmaskPhone(row.phone);
        const teacherPass = row.password || 'teacher123';
        const isCopied = copiedTeacherId === row.id;

        return (
          <div
            style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  color: '#60a5fa',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                }}
              >
                @{teacherLogin}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(
                    `👤 ${dict.teachersPage.title}: ${row.firstName} ${row.lastName}\n🔑 Login: ${teacherLogin}\n🔒 Parol: ${teacherPass}\n🌐 Kirish: ${window.location.origin}/login`
                  );
                  setCopiedTeacherId(row.id);
                  success(dict.teachersPage.copiedCreds);
                  setTimeout(() => setCopiedTeacherId(null), 2000);
                }}
                title={dict.teachersPage.copyCredsTitle}
                style={{
                  background: isCopied ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '5px',
                  padding: '2px 5px',
                  cursor: 'pointer',
                  color: isCopied ? '#ffffff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s',
                }}
              >
                {isCopied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '11.5px',
                  color: isPassVisible ? '#fbbf24' : 'var(--text-muted)',
                  fontWeight: isPassVisible ? 700 : 500,
                  fontFamily: 'monospace',
                }}
              >
                {isPassVisible ? teacherPass : '••••••'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTeacherPassMap((prev) => ({ ...prev, [row.id]: !prev[row.id] }));
                }}
                title={isPassVisible ? dict.loginPage.hidePassword : dict.loginPage.showPassword}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
              >
                {isPassVisible ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
        );
      },
    },
    {
      key: 'phone',
      header: dict.teachersPage.colPhone,
      render: (row) => formatPhone(row.phone),
    },
    {
      key: 'salary',
      header: dict.paymentsTotal,
      render: (row) => {
        const rateText =
          row.salaryType === 'FIXED'
            ? row.salaryValue >= 1000000
              ? formatMoney(row.salaryValue)
              : `${formatMoney(row.salaryValue)} ${dict.teachersPage.perStudent}`
            : `${row.salaryValue}${dict.teachersPage.percentRate}`;
        const stats = row.salaryStats;

        return (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setSalaryTeacher(row);
            }}
            title={dict.teachersPage.salaryCalcLink}
            style={{
              cursor: 'pointer',
              display: 'inline-flex',
              flexDirection: 'column',
              gap: '3px',
              padding: '5px 10px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.16)';
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.25)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#10b981' }}>
                {formatMoney(stats?.totalCollected ?? 0)}
              </span>
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {stats && (
                <>
                  <span
                    style={{
                      color: stats.paidStudents > 0 ? '#34d399' : '#94a3b8',
                      fontWeight: 600,
                    }}
                  >
                    {stats.paidStudents} {dict.teachersPage.paidCount}
                  </span>
                </>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'groupsCount',
      header: dict.teachersPage.colGroups,
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setAttendanceTeacher(row);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '8px',
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.28)',
            color: '#60a5fa',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title={dict.teachersPage.colGroups}
        >
          <CalendarCheck size={13} />
          <span>{row._count?.groups || 0} {dict.teachersPage.groupsCount}</span>
        </button>
      ),
    },
    {
      key: 'status',
      header: dict.teachersPage.colStatus,
      render: (row) => (
        <Badge variant={row.status === 'FAOL' ? 'success' : 'danger'}>
          {row.status === 'FAOL' ? t('active') : t('inactive')}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: dict.teachersPage.colAction,
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            size="sm"
            variant="outline"
            title={dict.teachersPage.salaryCalcLink}
            style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
            onClick={(e) => {
              e.stopPropagation();
              setSalaryTeacher(row);
            }}
          >
            <DollarSign size={14} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            title={dict.teachersPage.colGroups}
            style={{ color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.4)' }}
            onClick={(e) => {
              e.stopPropagation();
              setAttendanceTeacher(row);
            }}
          >
            <CalendarCheck size={14} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            title={t('edit')}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenModal(row);
            }}
          >
            <Edit2 size={14} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            title={dict.teachersPage.resetPasswordTitle}
            style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
            onClick={(e) => {
              e.stopPropagation();
              setPasswordModalTeacher(row);
              setNewPassword('');
            }}
          >
            <Key size={14} />
          </Button>
          <Button
            size="sm"
            variant="danger"
            title={t('delete')}
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTeacherId(row.id);
            }}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  const handleExportExcel = () => {
    if (!data?.data || data.data.length === 0) {
      error("Yuklab olish uchun ma'lumot mavjud emas");
      return;
    }

    const exportColumns = [
      { header: 'Ism Familiya', key: 'name' },
      { header: 'Telefon', key: 'phone' },
      { header: 'Pasport seriyasi', key: 'passportSeries' },
      { header: "Jami to'lovlar", key: 'salary' },
      { header: 'To\'lagan talabalar', key: 'paidCount' },
      { header: 'Guruhlar soni', key: 'groupsCount' },
      { header: 'Holati', key: 'status' },
    ];

    const exportRows = data.data.map((t) => ({
      name: `${t.firstName} ${t.lastName}`,
      phone: formatPhone(t.phone),
      passportSeries: t.passportSeries || '-',
      salary: t.salaryStats ? formatMoney(t.salaryStats.totalCollected) : '-',
      paidCount: t.salaryStats ? `${t.salaryStats.paidStudents} ta` : '-',
      groupsCount: `${t._count?.groups || 0} ta`,
      status: t.status === 'FAOL' ? 'FAOL' : 'NOFAOL',
    }));

    exportToExcel({
      filename: `Oqituvchilar_Royxati_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Oqituvchilar',
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
      { header: 'Ism Familiya', key: 'name' },
      { header: 'Telefon', key: 'phone' },
      { header: "Jami to'lovlar", key: 'salary' },
      { header: 'Guruhlar soni', key: 'groupsCount' },
      { header: 'Holati', key: 'status' },
    ];

    const exportRows = data.data.map((t) => ({
      name: `${t.firstName} ${t.lastName}`,
      phone: formatPhone(t.phone),
      salary: t.salaryStats ? formatMoney(t.salaryStats.totalCollected) : '-',
      groupsCount: `${t._count?.groups || 0} ta`,
      status: t.status === 'FAOL' ? 'FAOL' : 'NOFAOL',
    }));

    exportToPdf({
      filename: `Oqituvchilar_Royxati_${new Date().toISOString().split('T')[0]}`,
      title: "O'QITUVCHILAR (USTOZLAR) RO'YXATI",
      columns: exportColumns,
      data: exportRows,
    });
    success('PDF fayl yuklab olindi!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>{dict.teachersPage.title}</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {dict.teachersPage.subtitle}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <ExportDropdown
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
          />
          <Button icon={<Plus size={16} />} onClick={() => handleOpenModal()}>
            {dict.teachersPage.newTeacherBtn}
          </Button>
        </div>
      </div>

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
        onRowClick={(teacher) => setSalaryTeacher(teacher)}
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedTeacher ? dict.teachersPage.modalEditTitle : dict.teachersPage.modalAddTitle}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label={dict.employeesPage.firstName || 'Ism'}
            required
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          />

          <Input
            label={dict.employeesPage.lastName || 'Familiya'}
            required
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          />

          <Input
            label={t('phone')}
            required
            placeholder="+998 90 123 45 67"
            value={formatPhone(formData.phone)}
            onChange={(e) => setFormData({ ...formData, phone: unmaskPhone(e.target.value) })}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <Input
                label="Login (tizimga kirish uchun - yunik)"
                placeholder="anvar_rustamov"
                value={formData.login}
                onChange={(e) => setFormData({ ...formData, login: e.target.value.toLowerCase().replace(/\s+/g, '') })}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const base = (formData.firstName ? formData.firstName.toLowerCase().replace(/[^a-z0-9]/g, '') : '') || 'ustoz';
                    const randomCode = Math.floor(1000 + Math.random() * 9000);
                    setFormData({ ...formData, login: `${base}_${randomCode}` });
                  }}
                  style={{
                    fontSize: '11px',
                    color: '#60a5fa',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  🎲 Tasodifiy login
                </button>
                {formData.phone && (
                  <button
                    type="button"
                    onClick={() => {
                      const clean = unmaskPhone(formData.phone);
                      if (clean) setFormData({ ...formData, login: clean });
                    }}
                    style={{
                      fontSize: '11px',
                      color: '#a78bfa',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    📱 Telefoni
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                {selectedTeacher ? "Parol (ko'rish yoki yangilash)" : "Boshlang'ich parol"}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showFormPassword ? 'text' : 'password'}
                  placeholder="Parolni kiriting"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowFormPassword((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'color 0.15s',
                  }}
                  title={showFormPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                >
                  {showFormPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const randPass = Math.floor(100000 + Math.random() * 900000).toString();
                  setFormData({ ...formData, password: randPass });
                }}
                style={{
                  alignSelf: 'flex-start',
                  fontSize: '11px',
                  color: '#60a5fa',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                  marginTop: '2px',
                }}
              >
                🎲 6-raqamli tasodifiy parol
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              {t('cancel')}
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              {t('save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!passwordModalTeacher}
        onClose={() => {
          setPasswordModalTeacher(null);
          setNewPassword('');
          setShowResetPassword(false);
        }}
        title={dict.teachersPage.resetPasswordTitle}
      >
        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text)' }}>
              {passwordModalTeacher?.firstName} {passwordModalTeacher?.lastName}
            </strong>{' '}
            uchun yangi parol o'rnating. O'qituvchi logini:{' '}
            <strong style={{ color: 'var(--primary)' }}>
              {passwordModalTeacher?.login || passwordModalTeacher?.phone || '-'}
            </strong>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
              {dict.teachersPage.newPasswordLabel} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showResetPassword ? 'text' : 'password'}
                required
                placeholder="123456"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
              />
              <button
                type="button"
                onClick={() => setShowResetPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'color 0.15s',
                }}
                title={showResetPassword ? dict.loginPage.hidePassword : dict.loginPage.showPassword}
              >
                {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setPasswordModalTeacher(null);
                setNewPassword('');
              }}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" isLoading={passwordMutation.isPending}>
              {t('save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTeacherId}
        onClose={() => setDeleteTeacherId(null)}
        title={dict.teachersPage.deleteTitle}
      >
        <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
          {dict.teachersPage.deleteConfirm}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button variant="secondary" onClick={() => setDeleteTeacherId(null)}>
            {t('no')}
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => deleteTeacherId && deleteMutation.mutate(deleteTeacherId)}
          >
            {t('yes')}, {t('delete')}
          </Button>
        </div>
      </Modal>

      {/* Teacher Groups & Attendance Selection Modal */}
      <Modal
        isOpen={!!attendanceTeacher}
        onClose={() => setAttendanceTeacher(null)}
        title={`${attendanceTeacher?.firstName || ''} ${attendanceTeacher?.lastName || ''} — Guruhlari va Davomat`}
        maxWidth="540px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              color: '#93c5fd',
              lineHeight: 1.4,
            }}
          >
            <CalendarCheck size={18} style={{ flexShrink: 0, color: '#3b82f6' }} />
            <span>
              Davomat olish uchun kerakli guruh ustiga bosing:
            </span>
          </div>

          {isTeacherGroupsLoading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Guruhlar yuklanmoqda...
            </div>
          ) : teacherGroups.length === 0 ? (
            <div
              style={{
                padding: '28px 16px',
                textAlign: 'center',
                backgroundColor: 'var(--card-subtle)',
                borderRadius: '12px',
                border: '1px dashed var(--border)',
                color: 'var(--text-muted)',
                fontSize: '13.5px',
              }}
            >
              Ushbu ustozga hozircha guruh biriktirilmagan.
            </div>
          ) : (
            <GroupCardSelect
              inline={true}
              groups={teacherGroups}
              value=""
              onChange={(groupId) => {
                if (groupId) {
                  setAttendanceTeacher(null);
                  router.push(`/attendance/take?groupId=${groupId}`);
                }
              }}
              searchPlaceholder="Guruh nomi, fan yoki vaqt bo'yicha qidirish..."
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <Button variant="secondary" onClick={() => setAttendanceTeacher(null)}>
              {t('close')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Teacher Monthly Salary Breakdown Modal */}
      <TeacherSalaryModal
        isOpen={!!salaryTeacher}
        onClose={() => setSalaryTeacher(null)}
        teacherId={salaryTeacher?.id || ''}
        teacherName={salaryTeacher ? `${salaryTeacher.firstName} ${salaryTeacher.lastName}` : ''}
      />
    </div>
  );
};
