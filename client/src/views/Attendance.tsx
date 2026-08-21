'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { CalendarCheck, Plus } from 'lucide-react';
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
import { attendanceApi } from '../api/attendance.api';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';

export const Attendance: React.FC = () => {
  const router = useRouter();
  const [daysFilter, setDaysFilter] = useState<number>(30);

  const { data, isLoading } = useQuery({
    queryKey: ['attendanceStats', daysFilter],
    queryFn: () => attendanceApi.getStats(daysFilter),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Davomat ko'rsatgichlari</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Select
            options={[
              { label: 'Oxirgi 30 kun', value: 30 },
              { label: 'Oxirgi 15 kun', value: 15 },
              { label: 'Oxirgi 7 kun', value: 7 },
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

      {/* Main Line Chart */}
      <Card>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
          Oxirgi {daysFilter} kunlik davomat ko'rsatgichlari
        </h3>
        <div style={{ width: '100%', height: 320 }}>
          {isLoading ? (
            <Skeleton height="100%" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.dailyChart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="KELGAN"
                  name="🔵 KELGAN"
                  stroke="#2b7fff"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="KELMAGAN"
                  name="🔴 KELMAGAN"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="KECHIKKAN"
                  name="🟡 KECHIKKAN"
                  stroke="#facc15"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Per Group Attendance Cards Grid */}
      <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Guruhlar kesimidagi davomat</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {isLoading
          ? Array.from({ length: 3 }).map((_, idx) => <Skeleton key={idx} height="200px" />)
          : data?.groupStats?.map((g: any) => (
              <Card key={g.groupId}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
                  {g.groupName}
                </h4>
                <div style={{ width: '100%', height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[g]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="groupName" hide />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="KELGAN" name="Kelgan" fill="#2b7fff" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="KELMAGAN" name="Kelmagan" fill="#dc2626" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="KECHIKKAN" name="Kechikkan" fill="#facc15" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            ))}
      </div>
    </div>
  );
};
