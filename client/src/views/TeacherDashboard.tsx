'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Users,
  CalendarCheck,
  BookOpen,
  DoorOpen,
  Clock,
  Calendar,
  Search,
  ArrowRight,
  Sparkles,
  GraduationCap,
  Activity,
  Flame,
} from 'lucide-react';
import { Card } from '../components/ui/Card/Card';
import { Button } from '../components/ui/Button/Button';
import { Badge } from '../components/ui/Badge/Badge';
import { Input } from '../components/ui/Input/Input';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import { groupsApi } from '../api/groups.api';
import { useAuth } from '../hooks/useAuth';
import { Group, GroupDay } from '../types';

const DAY_LABELS: Record<GroupDay, string> = {
  DUSH: 'Dush',
  SESH: 'Sesh',
  CHOR: 'Chor',
  PAY: 'Pay',
  JU: 'Jum',
  SHAN: 'Shan',
  YAK: 'Yak',
};

const DAY_MAP_BY_INDEX: GroupDay[] = ['YAK', 'DUSH', 'SESH', 'CHOR', 'PAY', 'JU', 'SHAN'];

export const TeacherDashboard: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['teacherGroups'],
    queryFn: () => groupsApi.getAll({ limit: 100 }),
  });

  const groups: Group[] = groupsData?.data || [];

  const todayDayCode = DAY_MAP_BY_INDEX[new Date().getDay()];

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return groups.filter((g) =>
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.course?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.room?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [groups, searchTerm]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalGroups = groups.length;
    const totalStudents = groups.reduce(
      (acc, g) => acc + (g._count?.studentGroups ?? 0),
      0
    );
    const todayGroups = groups.filter((g) => g.days?.includes(todayDayCode));

    return { totalGroups, totalStudents, todayGroupsCount: todayGroups.length };
  }, [groups, todayDayCode]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '100%' }}>
      {/* HERO WELCOME BANNER */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.98) 100%)',
          borderRadius: '20px',
          padding: '24px 28px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 30px -8px rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '720px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: 'rgba(59, 130, 246, 0.18)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              fontSize: '12px',
              fontWeight: 700,
              color: '#93c5fd',
              marginBottom: '12px',
            }}
          >
            <Sparkles size={14} />
            <span>O'qituvchi Boshqaruv Markazi</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(20px, 4vw, 28px)',
              fontWeight: 800,
              margin: '0 0 8px 0',
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
            }}
          >
            Assalomu alaykum, {user?.fullName || "O'qituvchi"}!
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: 1.55 }}>
            Sizga biriktirilgan dars guruhlarini kuzatib boring, dars jadvallarini ko'ring va dars boshlanganda davomatni tez va oson qayd eting.
          </p>

          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <Button
              onClick={() => router.push('/teacher/attendance')}
              icon={<CalendarCheck size={17} />}
              style={{
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                fontWeight: 700,
                padding: '10px 20px',
                borderRadius: '10px',
              }}
            >
              Bugungi Davomatni Olish
            </Button>
          </div>
        </div>
      </div>

      {/* METRICS STATS BAR */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: '16px',
        }}
      >
        {/* Metric 1 */}
        <Card style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid var(--border)' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <BookOpen size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>
              {stats.totalGroups}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
              Guruhlarim soni
            </div>
          </div>
        </Card>

        {/* Metric 2 */}
        <Card style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid var(--border)' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <GraduationCap size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>
              {stats.totalStudents}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
              Jami o'quvchilarim
            </div>
          </div>
        </Card>

        {/* Metric 3 */}
        <Card style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid var(--border)' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Flame size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>
              {stats.todayGroupsCount}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
              Bugungi darslar ({DAY_LABELS[todayDayCode] || 'Bugun'})
            </div>
          </div>
        </Card>
      </div>

      {/* FILTER & HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            Mening Guruhlarim ({filteredGroups.length})
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            Dars o'tadigan o'quv guruhlaringiz ro'yxati
          </p>
        </div>

        <div style={{ width: '320px', maxWidth: '100%' }}>
          <Input
            placeholder="Guruh, kurs yoki xona nomi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search size={16} />}
          />
        </div>
      </div>

      {/* GROUPS GRID */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 330px), 1fr))', gap: '20px' }}>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton height="180px" />
            </Card>
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <div
            style={{
              textAlign: 'center',
              padding: '48px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <Users size={32} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              {searchTerm ? "Qidiruv bo'yicha guruh topilmadi" : "Sizga hali guruh biriktirilmagan"}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '420px', margin: 0 }}>
              {searchTerm
                ? "Boshqa so'z bilan qidirib ko'ring yoki qidiruv matnini tozalang."
                : "Administrator sizni o'quv guruhlariga biriktirganidan so'ng barcha guruhlaringiz shu yerda avtomatik chiqadi."}
            </p>
          </div>
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
            gap: '20px',
          }}
        >
          {filteredGroups.map((group) => {
            const studentCount = group._count?.studentGroups ?? 0;
            const isTodayClass = group.days?.includes(todayDayCode);

            return (
              <Card
                key={group.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '16px',
                  border: isTodayClass ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid var(--border)',
                  background: isTodayClass ? 'linear-gradient(180deg, rgba(59, 130, 246, 0.04) 0%, var(--card) 100%)' : 'var(--card)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {isTodayClass && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                    }}
                  />
                )}

                <div>
                  {/* Top Bar: Name & Status */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '14px',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: '17px',
                          fontWeight: 800,
                          color: 'var(--text)',
                          margin: '0 0 6px 0',
                          lineHeight: 1.25,
                        }}
                      >
                        {group.name}
                      </h3>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          color: 'var(--primary)',
                          fontWeight: 700,
                        }}
                      >
                        <BookOpen size={14} />
                        <span>{group.course?.name || "Kurs belgilanmagan"}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <Badge variant={group.status === 'FAOL' ? 'success' : 'secondary'}>
                        {group.status}
                      </Badge>
                      {isTodayClass && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#3b82f6',
                            background: 'rgba(59, 130, 246, 0.12)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            letterSpacing: '0.02em',
                          }}
                        >
                          Bugun dars
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details Container */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      background: 'var(--background)',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      marginBottom: '16px',
                      fontSize: '13px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {/* Time */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} /> Dars vaqti:
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                        {group.startTime || '--:--'} - {group.endTime || '--:--'}
                      </span>
                    </div>

                    {/* Room */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <DoorOpen size={14} /> Xona:
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                        {group.room?.name || '-'}
                      </span>
                    </div>

                    {/* Students Count */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={14} /> O'quvchilar soni:
                      </span>
                      <span
                        style={{
                          fontWeight: 800,
                          color: studentCount > 0 ? '#10b981' : 'var(--text-muted)',
                        }}
                      >
                        {studentCount} nafar
                      </span>
                    </div>

                    {/* Days */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} /> Dars kunlari:
                      </span>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {group.days && group.days.length > 0 ? (
                          group.days.map((day) => {
                            const isThisDay = day === todayDayCode;
                            return (
                              <span
                                key={day}
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  background: isThisDay ? '#3b82f6' : 'var(--card-subtle)',
                                  color: isThisDay ? '#ffffff' : 'var(--text-muted)',
                                  padding: '2px 7px',
                                  borderRadius: '5px',
                                  border: isThisDay ? 'none' : '1px solid var(--border)',
                                }}
                              >
                                {DAY_LABELS[day] || day}
                              </span>
                            );
                          })
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Button */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <Button
                    fullWidth
                    icon={<CalendarCheck size={16} />}
                    onClick={() => router.push(`/teacher/attendance?groupId=${group.id}`)}
                    style={{
                      fontWeight: 700,
                      borderRadius: '10px',
                    }}
                  >
                    Davomat Olish
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
