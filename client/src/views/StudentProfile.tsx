'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, User, Phone, Calendar, Users, CalendarCheck, DollarSign, Award } from 'lucide-react';
import { Card } from '../components/ui/Card/Card';
import { Button } from '../components/ui/Button/Button';
import { Badge } from '../components/ui/Badge/Badge';
import { Table, Column } from '../components/ui/Table/Table';
import { studentsApi } from '../api/students.api';
import { formatDate } from '../utils/formatDate';
import { formatMoney } from '../utils/formatMoney';
import { formatPhone } from '../utils/phoneMask';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';

export const StudentProfile: React.FC = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'groups' | 'attendance' | 'payments'>('groups');

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
      header: "A'RO BO'LGAN SANA",
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button variant="outline" size="sm" onClick={() => router.push('/students')}>
          <ArrowLeft size={16} /> Orqaga
        </Button>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>
          {student.firstName} {student.lastName}
        </h2>
        <Badge variant={student.status === 'FAOL' ? 'success' : 'secondary'}>
          {student.status}
        </Badge>
      </div>

      {/* Student Personal Info Card */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
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
                  Passport: {student.passportSeries}
                </span>
              )}
              {student.isSchoolStudent && (
                <Badge variant="primary">Maktab o'quvchisi</Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Card>
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
          <Button
            variant={activeTab === 'groups' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('groups')}
          >
            <Users size={16} /> Guruhlari ({student.studentGroups?.length || 0})
          </Button>
          <Button
            variant={activeTab === 'attendance' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('attendance')}
          >
            <CalendarCheck size={16} /> Davomat tarixi
          </Button>
          <Button
            variant={activeTab === 'payments' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('payments')}
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
