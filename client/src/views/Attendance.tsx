'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Select } from '../components/ui/Select/Select';
import { Badge } from '../components/ui/Badge/Badge';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import { attendanceApi } from '../api/attendance.api';
import { dashboardApi } from '../api/dashboard.api';
import { formatPhone } from '../utils/phoneMask';
import { formatMoney } from '../utils/formatMoney';

export const Attendance: React.FC = () => {
  const router = useRouter();
  const [daysFilter, setDaysFilter] = useState<number>(7);

  const { data, isLoading } = useQuery({
    queryKey: ['attendanceStats', daysFilter],
    queryFn: () => attendanceApi.getStats(daysFilter),
  });

  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => dashboardApi.getStats(),
  });

  const dailyChart = data?.dailyChart || [];
  const absentStudents = data?.absentStudents || [];
  const unpaidStudents = data?.unpaidStudents || [];
  const groupStats = data?.groupStats || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>Davomat ko'rsatgichlari</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            O'quv markazidagi umumiy davomat statistikasi, dars qoldirganlar va to'lov qilmaganlar
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Select
            options={[
              { label: 'Oxirgi 7 kun', value: 7 },
              { label: 'Oxirgi 15 kun', value: 15 },
              { label: 'Oxirgi 30 kun', value: 30 },
            ]}
            value={daysFilter}
            onChange={(e) => setDaysFilter(Number(e.target.value))}
            style={{ width: '160px' }}
          />
          <Button icon={<Plus size={16} />} onClick={() => router.push('/attendance/take')}>
            Davomat olish
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
                O'quvchilar soni
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#2b7fff', marginTop: '4px' }}>
                {isStatsLoading ? '...' : `${statsData?.studentsCount ?? 0} ta`}
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
                O'qituvchilar soni
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                {isStatsLoading ? '...' : `${statsData?.teachersCount ?? 0} ta`}
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
                Xodimlar soni
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>
                {isStatsLoading ? '...' : `${statsData?.employeesCount ?? 0} ta`}
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
                Guruhlar soni
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                {isStatsLoading ? '...' : `${statsData?.groupsCount ?? 0} ta`}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <Users size={22} />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Line Chart */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
            Oxirgi {daysFilter} kunlik davomat grafigi
          </h3>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Jami qaydlar: <strong>{data?.totalRecords || 0} ta</strong>
          </div>
        </div>
        <div style={{ width: '100%', height: 320 }}>
          {isLoading ? (
            <Skeleton height="100%" />
          ) : dailyChart.length === 0 ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--text-muted)' }}>
              <AlertCircle size={32} />
              <span>Oxirgi {daysFilter} kun ichida davomat qaydlari topilmadi</span>
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
                  name="🔵 Kelgan"
                  stroke="#2b7fff"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#2b7fff' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="KELMAGAN"
                  name="🔴 Kelmagan"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#ef4444' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="KECHIKKAN"
                  name="🟡 Kechikkan"
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

      {/* Absent and Late Students Section */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              <UserX size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                Darsga kelmagan va kechikkan o'quvchilar ro'yxati (Oxirgi {daysFilter} kun)
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Qoldirilgan va kech qolingan darslar, o'quvchi va ota-onaning bog'lanish ma'lumotlari
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Badge variant="danger">
              {absentStudents.filter((s: any) => s.status === 'KELMAGAN').length} ta kelmagan
            </Badge>
            <Badge variant="warning">
              {absentStudents.filter((s: any) => s.status === 'KECHIKKAN').length} ta kechikkan
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
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>Oxirgi {daysFilter} kun ichida dars qoldirgan yoki kechikkan o'quvchilar yo'q</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Barcha talabalar darslarga to'liq va o'z vaqtida qatnashmoqda 🎉</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>SANA</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>O'QUVCHI (ISM FAMILYA)</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>GURUHI</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>O'QUVCHI TELEFONI</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>OTA-ONASINING TELEFONI</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>HOLAT / IZOH</th>
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

                    {/* Holat / Izoh */}
                    <td style={{ padding: '14px' }}>
                      <Badge variant={item.status === 'KECHIKKAN' ? 'warning' : 'danger'}>
                        {item.status === 'KECHIKKAN' ? 'KECHIKKAN' : 'KELMAGAN'}
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



      {/* Per Group Attendance Cards Grid */}
      {groupStats.length > 0 && (
        <>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Guruhlar kesimidagi davomat</h3>
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
                      <Bar dataKey="KELGAN" name="Kelgan" fill="#2b7fff" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="KELMAGAN" name="Kelmagan" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="KECHIKKAN" name="Kechikkan" fill="#f59e0b" radius={[4, 4, 0, 0]} />
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
