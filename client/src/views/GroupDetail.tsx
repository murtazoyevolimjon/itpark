'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, CalendarCheck, DollarSign, Clock, MapPin, GraduationCap } from 'lucide-react';
import { Card } from '../components/ui/Card/Card';
import { Button } from '../components/ui/Button/Button';
import { Badge } from '../components/ui/Badge/Badge';
import { Table, Column } from '../components/ui/Table/Table';
import { groupsApi } from '../api/groups.api';
import { formatDate } from '../utils/formatDate';
import { formatMoney } from '../utils/formatMoney';
import { formatPhone } from '../utils/phoneMask';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';

export const GroupDetail: React.FC = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'students' | 'attendance' | 'payments'>('students');

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: () => groupsApi.getOne(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Skeleton height="140px" />
        <Skeleton height="300px" />
      </div>
    );
  }

  if (!group) {
    return <div>Guruh topilmadi</div>;
  }

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
      key: 'joinedAt',
      header: 'QO\'SHILGAN SANA',
      render: (row) => formatDate(row.joinedAt),
    },
  ];

  const attendanceColumns: Column<any>[] = [
    {
      key: 'student',
      header: 'TALABA',
      render: (row) => `${row.student?.firstName} ${row.student?.lastName}`,
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
  ];

  const paymentColumns: Column<any>[] = [
    {
      key: 'student',
      header: 'TALABA',
      render: (row) => `${row.student?.firstName} ${row.student?.lastName}`,
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
      key: 'method',
      header: 'USULI',
      render: (row) => <Badge variant="secondary">{row.method}</Badge>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button variant="outline" size="sm" onClick={() => router.push('/groups')}>
          <ArrowLeft size={16} /> Orqaga
        </Button>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{group.name}</h2>
        <Badge variant={group.status === 'FAOL' ? 'success' : 'danger'}>
          {group.status}
        </Badge>
      </div>

      {/* Info Header Card */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Kurs</div>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>{group.course?.name}</div>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}>
              {formatMoney(group.course?.price)}/oy
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Ustoz</div>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <GraduationCap size={16} color="var(--primary)" />
              {group.teacher?.firstName} {group.teacher?.lastName}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatPhone(group.teacher?.phone)}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Dars vaqti & Xona</div>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} color="var(--primary)" />
              {group.startTime} - {group.endTime}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} /> {group.room?.name} ({group.room?.number}-xona)
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Kunlar</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {group.days?.map((d) => (
                <Badge key={d} variant="secondary">
                  {d}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Card>
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
          <Button
            variant={activeTab === 'students' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('students')}
          >
            <Users size={16} /> Talabalar ({group.studentGroups?.length || 0})
          </Button>
          <Button
            variant={activeTab === 'attendance' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('attendance')}
          >
            <CalendarCheck size={16} /> Davomat jurnali
          </Button>
          <Button
            variant={activeTab === 'payments' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('payments')}
          >
            <DollarSign size={16} /> To'lovlar tarixi
          </Button>
        </div>

        {activeTab === 'students' && (
          <Table columns={studentColumns} data={group.studentGroups || []} />
        )}
        {activeTab === 'attendance' && (
          <Table columns={attendanceColumns} data={group.attendances || []} />
        )}
        {activeTab === 'payments' && (
          <Table columns={paymentColumns} data={group.payments || []} />
        )}
      </Card>
    </div>
  );
};
