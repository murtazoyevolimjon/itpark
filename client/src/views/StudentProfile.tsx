'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, User, Phone, Calendar, Users, CalendarCheck, DollarSign, Award, Send, CheckCircle2 } from 'lucide-react';
import { Card } from '../components/ui/Card/Card';
import { Button } from '../components/ui/Button/Button';
import { Badge } from '../components/ui/Badge/Badge';
import { Table, Column } from '../components/ui/Table/Table';
import { studentsApi } from '../api/students.api';
import { formatDate } from '../utils/formatDate';
import { formatMoney } from '../utils/formatMoney';
import { formatPhone } from '../utils/phoneMask';
import { parseStudentCreds } from '../lib/credentials';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import styles from './StudentProfile.module.css';

export const StudentProfile: React.FC = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'groups' | 'attendance' | 'payments'>('groups');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const { data: student, isLoading } = useQuery({
    queryKey: ['studentProfile', id],
    queryFn: () => studentsApi.getOne(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Skeleton height="160px" />
        <Skeleton height="300px" />
      </div>
    );
  }

  if (!student) {
    return <div>Talaba topilmadi</div>;
  }

  const creds = parseStudentCreds(student.passportSeries, student.phone);
  const isStudentTgConnected = !!creds?.tgChatId;
  const isParentTgConnected = !!creds?.parentTgChatId;

  const handleSendTestToStudent = async () => {
    if (!creds?.tgChatId) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_message',
          chatId: creds.tgChatId,
          text: `🔔 <b>IT Park Xabarnomasi</b>\n\nAssalomu alaykum <b>${student.firstName} ${student.lastName}</b>!\nBu markaz ma'muriyatidan sinov xabarnomasi. Tizim to'g'ri bog'langan.`,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult('Xabar bot orqali yuborildi!');
      } else {
        setTestResult('Xatolik: ' + (data.error || 'Yuborib bo\'lmadi'));
      }
    } catch {
      setTestResult('Xatolik yuz berdi');
    } finally {
      setTestSending(false);
      setTimeout(() => setTestResult(null), 4000);
    }
  };

  const groupColumns: Column<any>[] = [
    {
      key: 'name',
      header: 'GURUH NOMI',
      render: (row) => (
        <span
          style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
          onClick={() => router.push(`/groups/${row.group?.id}`)}
        >
          {row.group?.name}
        </span>
      ),
    },
    {
      key: 'course',
      header: 'KURS',
      render: (row) => row.group?.course?.name,
    },
    {
      key: 'teacher',
      header: 'USTOZ',
      render: (row) =>
        row.group?.teacher
          ? `${row.group.teacher.firstName} ${row.group.teacher.lastName}`
          : '-',
    },
    {
      key: 'joinedAt',
      header: "A'ZO BO'LGAN SANA",
      render: (row) => formatDate(row.joinedAt),
    },
  ];

  const attendanceColumns: Column<any>[] = [
    {
      key: 'date',
      header: 'SANA',
      render: (row) => formatDate(row.date),
    },
    {
      key: 'status',
      header: 'HOLAT',
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
      key: 'amount',
      header: 'SUMMA',
      render: (row) => formatMoney(row.amount),
    },
    {
      key: 'paymentDate',
      header: 'TO\'LOV SANASI',
      render: (row) => formatDate(row.paymentDate),
    },
    {
      key: 'method',
      header: 'USULI',
      render: (row) => <Badge variant="secondary">{row.method}</Badge>,
    },
    {
      key: 'status',
      header: 'HOLAT',
      render: (row) => (
        <Badge variant={row.status === 'TOLANGAN' ? 'success' : 'danger'}>
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="outline" size="sm" onClick={() => router.push('/students')}>
          <ArrowLeft size={16} /> Orqaga
        </Button>
        <h2 className={styles.title}>
          {student.firstName} {student.lastName}
        </h2>
        <Badge variant={student.status === 'FAOL' ? 'success' : 'secondary'}>
          {student.status}
        </Badge>
      </div>

      {/* Student Personal Info Card */}
      <Card>
        <div className={styles.infoGrid}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Shaxsiy ma'lumotlar</div>
            <div style={{ fontWeight: '600', fontSize: '15px' }}>
              {student.firstName} {student.lastName}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} /> Tug'ilgan: {formatDate(student.birthDate)}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} /> Jinsi: {student.gender === 'ERKAK' ? 'Erkak' : 'Ayol'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Kontaktlar</div>
            <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} color="var(--primary)" /> {formatPhone(student.phone)}
            </div>
            {student.fatherPhone && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Otasining tel: {formatPhone(student.fatherPhone)}
              </div>
            )}
            {student.motherPhone && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Onasining tel: {formatPhone(student.motherPhone)}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Davomat Foizi</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary)' }}>
                {student.attendancePercentage}%
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                ({student.presentCount} / {student.totalAttendances})
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Qo'shimcha</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {student.passportSeries && (
                <span style={{ fontSize: '13px', fontWeight: 500 }}>
                  Pasport: {student.passportSeries}
                </span>
              )}
              {student.isSchoolStudent && (
                <Badge variant="primary">Maktab o'quvchisi</Badge>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Telegram Xabarnomalar</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <span style={{ fontWeight: 600 }}>O'quvchi:</span>
                {isStudentTgConnected ? (
                  <Badge variant="success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Ulangan {creds?.tgUser ? `(@${creds.tgUser})` : ''}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Ulanmagan</Badge>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <span style={{ fontWeight: 600 }}>Ota-ona:</span>
                {isParentTgConnected ? (
                  <Badge variant="success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Ulangan
                  </Badge>
                ) : (
                  <Badge variant="secondary">Ulanmagan</Badge>
                )}
              </div>
              {isStudentTgConnected && (
                <div style={{ marginTop: '4px' }}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSendTestToStudent}
                    disabled={testSending}
                    style={{ fontSize: '11px', padding: '3px 8px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Send size={12} /> {testSending ? 'Yuborilmoqda...' : 'Sinov xabari'}
                  </Button>
                  {testResult && (
                    <div style={{ fontSize: '11px', color: testResult.includes('Xatolik') ? '#ef4444' : '#10b981', marginTop: '3px' }}>
                      {testResult}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Card>
        <div className={styles.tabsContainer}>
          <Button
            variant={activeTab === 'groups' ? 'primary' : 'outline'}
            onClick={(e) => {
              setActiveTab('groups');
              e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }}
            className={styles.tabBtn}
          >
            <Users size={16} /> Guruhlari ({student.studentGroups?.length || 0})
          </Button>
          <Button
            variant={activeTab === 'attendance' ? 'primary' : 'outline'}
            onClick={(e) => {
              setActiveTab('attendance');
              e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }}
            className={styles.tabBtn}
          >
            <CalendarCheck size={16} /> Davomat tarixi
          </Button>
          <Button
            variant={activeTab === 'payments' ? 'primary' : 'outline'}
            onClick={(e) => {
              setActiveTab('payments');
              e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }}
            className={styles.tabBtn}
          >
            <DollarSign size={16} /> To'lovlar tarixi
          </Button>
        </div>

        {activeTab === 'groups' && (
          <Table columns={groupColumns} data={student.studentGroups || []} />
        )}
        {activeTab === 'attendance' && (
          <Table columns={attendanceColumns} data={student.attendances || []} />
        )}
        {activeTab === 'payments' && (
          <Table columns={paymentColumns} data={student.payments || []} />
        )}
      </Card>
    </div>
  );
};
