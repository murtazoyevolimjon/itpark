'use client';

import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck,
  Plus,
  UserX,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  AlertCircle,
  GraduationCap,
  Briefcase,
  UserCheck,
  CreditCard,
  AlertTriangle,
  Calendar,
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
  BarChart,
  Bar,
} from 'recharts';
import { Card } from '../components/ui/Card/Card';
import { Button } from '../components/ui/Button/Button';
import { Badge } from '../components/ui/Badge/Badge';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import { ExportDropdown } from '../components/ui/ExportDropdown/ExportDropdown';
import { useToast } from '../components/ui/Toast/Toast';
import { attendanceApi } from '../api/attendance.api';
import { dashboardApi } from '../api/dashboard.api';
import { formatPhone } from '../utils/phoneMask';
import { formatMoney } from '../utils/formatMoney';
import { exportToExcel, exportToPdf } from '../utils/exportData';
import { useLanguage } from '../hooks/useLanguage';

export const Attendance: React.FC = () => {
  const router = useRouter();
  const { success, error } = useToast();
  const { t, lang } = useLanguage();

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const minAllowedDate = React.useMemo(() => {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }, []);

  const [filterType, setFilterType] = useState<'custom_date' | 'days'>('days');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [daysFilter, setDaysFilter] = useState<number>(7);

  const queryParams = filterType === 'custom_date' ? { date: selectedDate } : { days: daysFilter };

  const { data, isLoading } = useQuery({
    queryKey: ['attendanceStats', filterType, selectedDate, daysFilter],
    queryFn: () => attendanceApi.getStats(queryParams),
    placeholderData: keepPreviousData,
  });

  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => dashboardApi.getStats(),
  });

  const dailyChart = data?.dailyChart || [];
  const absentStudents = data?.absentStudents || [];
  const groupStats = data?.groupStats || [];

  const handleExportAttendanceExcel = () => {
    if (!absentStudents || absentStudents.length === 0) {
      error(t('noDataToDownload'));
      return;
    }

    const exportColumns = [
      { header: t('date'), key: 'date' },
      { header: `${t('student')} (${t('fullName')})`, key: 'studentName' },
      { header: t('groups'), key: 'groupName' },
      { header: t('phone'), key: 'studentPhone' },
      { header: t('fatherPhone'), key: 'fatherPhone' },
      { header: t('motherPhone'), key: 'motherPhone' },
      { header: t('status'), key: 'status' },
      { header: t('note'), key: 'note' },
    ];

    const exportRows = absentStudents.map((item: any) => ({
      date: item.date,
      studentName: item.studentName,
      groupName: item.groupName,
      studentPhone: formatPhone(item.studentPhone),
      fatherPhone: item.fatherPhone ? formatPhone(item.fatherPhone) : '-',
      motherPhone: item.motherPhone ? formatPhone(item.motherPhone) : '-',
      status: item.status === 'KECHIKKAN' ? t('late') : t('absent'),
      note: item.note || '-',
    }));

    exportToExcel({
      filename: `Attendance_${filterType === 'custom_date' ? selectedDate : `${daysFilter}_days`}`,
      sheetName: 'Absents',
      columns: exportColumns,
      data: exportRows,
    });
    success(t('excelDownloaded'));
  };

  const handleExportAttendancePdf = () => {
    if (!absentStudents || absentStudents.length === 0) {
      error(t('noDataToDownload'));
      return;
    }

    const exportColumns = [
      { header: t('date'), key: 'date' },
      { header: t('student'), key: 'studentName' },
      { header: t('groups'), key: 'groupName' },
      { header: t('phone'), key: 'studentPhone' },
      { header: t('father'), key: 'fatherPhone' },
      { header: t('mother'), key: 'motherPhone' },
      { header: t('status'), key: 'status' },
    ];

    const exportRows = absentStudents.map((item: any) => ({
      date: item.date,
      studentName: item.studentName,
      groupName: item.groupName,
      studentPhone: formatPhone(item.studentPhone),
      fatherPhone: item.fatherPhone ? formatPhone(item.fatherPhone) : '-',
      motherPhone: item.motherPhone ? formatPhone(item.motherPhone) : '-',
      status: item.status === 'KECHIKKAN' ? t('late') : t('absent'),
    }));

    exportToPdf({
      filename: `Attendance_${filterType === 'custom_date' ? selectedDate : `${daysFilter}_days`}`,
      title: t('absentLateTitle').toUpperCase(),
      columns: exportColumns,
      data: exportRows,
    });
    success(t('pdfDownloaded'));
  };

  const periodTitle =
    filterType === 'custom_date'
      ? selectedDate
      : `${lang === 'en' ? 'Last ' : (lang === 'ru' ? 'Последние ' : 'Oxirgi ')}${daysFilter} ${t('daysCount')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>{t('attendanceStats')}</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {t('attendanceSubtitle')}
          </p>
        </div>

        {/* Date Filters Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Quick Date Chips */}
          <div style={{ display: 'flex', background: 'var(--card-subtle, rgba(255,255,255,0.05))', padding: '3px', borderRadius: '10px', border: '1px solid var(--border)', gap: '4px' }}>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(todayStr);
                setFilterType('custom_date');
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: filterType === 'custom_date' && selectedDate === todayStr ? 'var(--primary, #2b7fff)' : 'transparent',
                color: filterType === 'custom_date' && selectedDate === todayStr ? '#ffffff' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              {t('today')}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(yesterdayStr);
                setFilterType('custom_date');
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: filterType === 'custom_date' && selectedDate === yesterdayStr ? 'var(--primary, #2b7fff)' : 'transparent',
                color: filterType === 'custom_date' && selectedDate === yesterdayStr ? '#ffffff' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              {t('yesterday')}
            </button>
            <button
              type="button"
              onClick={() => {
                setDaysFilter(7);
                setFilterType('days');
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: filterType === 'days' && daysFilter === 7 ? 'var(--primary, #2b7fff)' : 'transparent',
                color: filterType === 'days' && daysFilter === 7 ? '#ffffff' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              7 {t('daysCount')}
            </button>
            <button
              type="button"
              onClick={() => {
                setDaysFilter(30);
                setFilterType('days');
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: filterType === 'days' && daysFilter === 30 ? 'var(--primary, #2b7fff)' : 'transparent',
                color: filterType === 'days' && daysFilter === 30 ? '#ffffff' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              30 {t('daysCount')}
            </button>
          </div>

          {/* Direct Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--input-bg, #1a2234)', border: '1px solid var(--border)', borderRadius: '10px', padding: '4px 10px' }}>
            <Calendar size={15} color="var(--primary, #2b7fff)" />
            <input
              type="date"
              value={selectedDate}
              min={minAllowedDate}
              max={todayStr}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                  setFilterType('custom_date');
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <Button icon={<Plus size={16} />} onClick={() => router.push('/attendance/take')}>
            {t('takeAttendance')}
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards: O'quvchilar, O'qituvchilar, Xodimlar, Guruhlar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '12px' }}>
        {/* O'quvchilar */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {t('studentsCount')}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#2b7fff', marginTop: '4px' }}>
                {isStatsLoading ? '...' : `${statsData?.studentsCount ?? 0} ${t('countUnit')}`.trim()}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(43, 127, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2b7fff' }}>
              <UserCheck size={22} />
            </div>
          </div>
        </Card>

        {/* O'qituvchilar */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {t('teachersCount')}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                {isStatsLoading ? '...' : `${statsData?.teachersCount ?? 0} ${t('countUnit')}`.trim()}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <GraduationCap size={22} />
            </div>
          </div>
        </Card>

        {/* Xodimlar */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {t('employeesCount')}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>
                {isStatsLoading ? '...' : `${statsData?.employeesCount ?? 0} ${t('countUnit')}`.trim()}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(139, 92, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
              <Briefcase size={22} />
            </div>
          </div>
        </Card>

        {/* Guruhlar */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {t('groupsCount')}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                {isStatsLoading ? '...' : `${statsData?.groupsCount ?? 0} ${t('countUnit')}`.trim()}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <Users size={22} />
            </div>
          </div>
        </Card>
      </div>

      {/* 1. Absent and Late Students Table */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              <UserX size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                {t('absentLateTitle')} ({periodTitle})
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {t('absentLateDesc')}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <ExportDropdown
              size="sm"
              onExportExcel={handleExportAttendanceExcel}
              onExportPdf={handleExportAttendancePdf}
            />
            <Badge variant="danger">
              {absentStudents.filter((s: any) => s.status === 'KELMAGAN').length} {t('absentCountBadge')}
            </Badge>
            <Badge variant="warning">
              {absentStudents.filter((s: any) => s.status === 'KECHIKKAN').length} {t('lateCountBadge')}
            </Badge>
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Skeleton height="40px" />
            <Skeleton height="40px" />
            <Skeleton height="40px" />
          </div>
        ) : absentStudents.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--card-subtle)', borderRadius: 'var(--radius-sm)' }}>
            <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{periodTitle} {t('noAbsentStudents')}</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>{t('allStudentsPresent')}</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>{t('date').toUpperCase()}</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>{`${t('student')} (${t('fullName')})`.toUpperCase()}</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>{t('groups').toUpperCase()}</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>{t('phone').toUpperCase()}</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>{t('parentPhone').toUpperCase()}</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>{`${t('status')} / ${t('note')}`.toUpperCase()}</th>
                </tr>
              </thead>
              <tbody>
                {absentStudents.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s' }}>
                    {/* Sana */}
                    <td style={{ padding: '14px', fontWeight: 600, color: 'var(--text)' }}>
                      {item.date}
                    </td>

                    {/* Ism Familiya */}
                    <td style={{ padding: '14px', fontWeight: 600, color: 'var(--text)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: item.status === 'KECHIKKAN' ? 'rgba(245, 158, 11, 0.2)' : 'var(--primary-grad)', color: item.status === 'KECHIKKAN' ? '#f59e0b' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
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
                            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: 4, background: 'rgba(43, 127, 255, 0.1)', color: 'var(--primary)', fontWeight: 700 }}>{t('father')}</span>
                            <Phone size={12} color="var(--primary)" />
                            {formatPhone(item.fatherPhone)}
                          </a>
                        )}
                        {item.motherPhone && (
                          <a
                            href={`tel:${item.motherPhone}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text)', textDecoration: 'none', fontSize: '12px' }}
                          >
                            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: 4, background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', fontWeight: 700 }}>{t('mother')}</span>
                            <Phone size={12} color="#ec4899" />
                            {formatPhone(item.motherPhone)}
                          </a>
                        )}
                        {!item.fatherPhone && !item.motherPhone && (
                          <span style={{ color: 'var(--text-muted)' }}>{t('notEntered')}</span>
                        )}
                      </div>
                    </td>

                    {/* Holat / Izoh */}
                    <td style={{ padding: '14px' }}>
                      <Badge variant={item.status === 'KECHIKKAN' ? 'warning' : 'danger'}>
                        {item.status === 'KECHIKKAN' ? t('late') : t('absent')}
                      </Badge>
                      {item.note && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {item.note}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 2. Main Line Chart */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
            {t('attendanceDynamics')} ({periodTitle})
          </h3>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {t('totalRecords')}: <strong>{data?.totalRecords || 0} {t('countUnit')}</strong>
          </div>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          {isLoading ? (
            <Skeleton height="100%" />
          ) : dailyChart.length === 0 ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--text-muted)' }}>
              <AlertCircle size={32} />
              <span>{t('noRecordsFound')}</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyChart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="KELGAN"
                  name={`🔵 ${t('present')}`}
                  stroke="#2b7fff"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#2b7fff' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="KELMAGAN"
                  name={`🔴 ${t('absent')}`}
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#ef4444' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="KECHIKKAN"
                  name={`🟡 ${t('late')}`}
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#f59e0b' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* 3. Per Group Attendance Cards Grid */}
      {groupStats.length > 0 && (
        <>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{t('groupAttendance')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {groupStats.map((g: any) => (
              <Card key={g.groupId}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
                  {g.groupName}
                </h4>
                <div style={{ width: '100%', height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[g]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                      <XAxis dataKey="groupName" hide />
                      <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          color: 'var(--text)',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="KELGAN" name={t('present')} fill="#2b7fff" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="KELMAGAN" name={t('absent')} fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="KECHIKKAN" name={t('late')} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
