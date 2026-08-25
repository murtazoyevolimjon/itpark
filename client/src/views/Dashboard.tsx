'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Card } from '../components/ui/Card/Card';
import { Input } from '../components/ui/Input/Input';
import { Select } from '../components/ui/Select/Select';
import { Button } from '../components/ui/Button/Button';
import { ExportDropdown } from '../components/ui/ExportDropdown/ExportDropdown';
import { Badge } from '../components/ui/Badge/Badge';
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
import { exportToExcel, exportToPdf } from '../utils/exportData';
import styles from './Dashboard.module.css';

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<'student' | 'payment'>('student');

  // Forms state
  const [studentForm, setStudentForm] = useState({
    groupId: '',
    firstName: '',
    lastName: '',
    phone: '',
    birthDate: '2005-01-01',
    gender: 'MALE',
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
    queryFn: () => studentsApi.getAll({ limit: 100 }),
  });

  // Mutations
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
        gender: 'MALE',
      });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
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
    createPaymentMutation.mutate({
      ...paymentForm,
      amount: Number(paymentForm.amount),
    });
  };

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
      {/* 2x3 Stat Cards */}
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

      {/* Unpaid / Debtor Students Section */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <CreditCard size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                To'lov qilmagan o'quvchilar ro'yxati (Qarzdorlar)
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
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

      {/* Quick Actions & Recent Data */}
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

          {activeTab === 'student' ? (
            <form onSubmit={handleStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Select
                label={t('groups')}
                options={(groupsData?.data || []).map((g) => ({ label: g.name, value: g.id }))}
                value={studentForm.groupId}
                onChange={(e) => setStudentForm({ ...studentForm, groupId: e.target.value })}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  label={t('firstName')}
                  required
                  value={studentForm.firstName}
                  onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                />
                <Input
                  label={t('lastName')}
                  required
                  value={studentForm.lastName}
                  onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                />
              </div>

              <Input
                label={t('phone')}
                required
                placeholder="+998 90 123 45 67"
                value={formatPhone(studentForm.phone)}
                onChange={(e) => setStudentForm({ ...studentForm, phone: unmaskPhone(e.target.value) })}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Button type="submit" isLoading={createStudentMutation.isPending}>
                  {t('save')}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Select
                label={t('students')}
                required
                options={(studentsData?.data || []).map((s) => ({
                  label: `${s.firstName} ${s.lastName} (${formatPhone(s.phone)})`,
                  value: s.id,
                }))}
                value={paymentForm.studentId}
                onChange={(e) => setPaymentForm({ ...paymentForm, studentId: e.target.value })}
              />

              <Input
                label="To'lov summasi (so'm)"
                type="number"
                required
                placeholder="500000"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              />

              <Input
                label="Sana"
                type="date"
                required
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Button type="submit" isLoading={createPaymentMutation.isPending}>
                  {t('save')}
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Quick Help Card */}
        <Card style={{ background: 'var(--primary-grad)', color: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
              {t('appName')} Platformasi
            </h3>
            <p style={{ opacity: 0.9, fontSize: '13px', lineHeight: 1.6 }}>
              {t('tagline')}. Barcha kurslar, guruhlar, talabalar davomati hamda moliya amallarini bitta joyda boshqaring.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
            <div style={{ padding: '6px 12px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)', fontWeight: 700, fontSize: '12px' }}>
              24/7 Monitoring
            </div>
            <div style={{ padding: '6px 12px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)', fontWeight: 700, fontSize: '12px' }}>
              Multi-tenant
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
