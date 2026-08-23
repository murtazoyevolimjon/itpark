'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  GraduationCap,
  BookOpen,
  Folder,
  Award,
  FileCheck,
  UserPlus,
  DollarSign,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Card } from '../components/ui/Card/Card';
import { Input } from '../components/ui/Input/Input';
import { Select } from '../components/ui/Select/Select';
import { Button } from '../components/ui/Button/Button';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import { useToast } from '../components/ui/Toast/Toast';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { dashboardApi } from '../api/dashboard.api';
import { groupsApi } from '../api/groups.api';
import { studentsApi } from '../api/students.api';
import { paymentsApi } from '../api/payments.api';
import { formatPhone, unmaskPhone } from '../utils/phoneMask';
import styles from './Dashboard.module.css';

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<'student' | 'payment'>('student');

  // Stats query
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: dashboardApi.getStats,
  });

  // Attendance chart query
  const { data: attendanceData, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['dashboardAttendance'],
    queryFn: () => dashboardApi.getAttendance(30),
  });

  // Groups list for dropdowns
  const { data: groupsData } = useQuery({
    queryKey: ['groupsSelect'],
    queryFn: () => groupsApi.getAll({ limit: 100 }),
  });

  // Students list for payment form dropdown
  const { data: studentsData } = useQuery({
    queryKey: ['studentsSelect'],
    queryFn: () => studentsApi.getAll({ limit: 100 }),
  });

  // Quick Student Form
  const [studentForm, setStudentForm] = useState({
    groupId: '',
    firstName: '',
    lastName: '',
    phone: '',
    birthDate: '2005-01-01',
    gender: 'MALE' as any,
  });

  // Quick Payment Form
  const [paymentForm, setPaymentForm] = useState({
    studentId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
  });

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
      label: t('stats.students'),
      val: stats?.studentsCount ?? 0,
      icon: Users,
      color: '#2b7fff',
      bg: 'rgba(43, 127, 255, 0.12)',
    },
    {
      key: 'teachers',
      label: t('stats.teachers'),
      val: stats?.teachersCount ?? 0,
      icon: GraduationCap,
      color: '#16a34a',
      bg: 'rgba(22, 163, 74, 0.12)',
    },
    {
      key: 'courses',
      label: t('stats.courses'),
      val: stats?.coursesCount ?? 0,
      icon: BookOpen,
      color: '#d97706',
      bg: 'rgba(217, 119, 6, 0.12)',
    },
    {
      key: 'groups',
      label: t('stats.groups'),
      val: stats?.groupsCount ?? 0,
      icon: Folder,
      color: '#9333ea',
      bg: 'rgba(147, 51, 234, 0.12)',
    },
    {
      key: 'graduates',
      label: t('stats.graduates'),
      val: stats?.graduatesCount ?? 0,
      icon: Award,
      color: '#06b6d4',
      bg: 'rgba(6, 182, 212, 0.12)',
    },
    {
      key: 'certificates',
      label: t('stats.certificates'),
      val: stats?.certificatesCount ?? 0,
      icon: FileCheck,
      color: '#ec4899',
      bg: 'rgba(236, 72, 153, 0.12)',
    },
  ];

  const tooltipBg = theme === 'dark' ? '#151c2c' : '#ffffff';
  const tooltipBorder = theme === 'dark' ? '#232d42' : '#e2e8f0';

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

      {/* Main 30-Day Attendance Chart */}
      <Card>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>
          {t('attendanceStats')} ({t('last30days')})
        </h3>
        <div style={{ width: '100%', height: 320 }}>
          {isAttendanceLoading ? (
            <Skeleton height="100%" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={Array.isArray(attendanceData) ? attendanceData : []}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#232d42' : '#e2e8f0'} />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: '12px',
                    color: 'var(--text)',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="present"
                  name={t('present')}
                  stroke="#2b7fff"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="absent"
                  name={t('absent')}
                  stroke="#dc2626"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="late"
                  name={t('late')}
                  stroke="#ca8a04"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
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
