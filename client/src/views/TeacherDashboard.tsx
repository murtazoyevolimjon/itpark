'use client';

import React, { useState } from 'react';
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

export const TeacherDashboard: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['teacherGroups'],
    queryFn: () => groupsApi.getAll({ limit: 100 }),
  });

  const groups: Group[] = groupsData?.data || [];

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.course?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.room?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '16px',
          padding: '24px 28px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '650px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              fontSize: '12px',
              color: '#93c5fd',
              marginBottom: '12px',
            }}
          >
            <Sparkles size={14} />
            <span>O'qituvchi Kabineti</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
            Assalomu alaykum, {user?.fullName || "O'qituvchi"}!
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
            Bu yerda siz o'zingizga biriktirilgan guruhlarni ko'rishingiz, o'quvchilar ro'yxatini kuzatishingiz va darslar bo'yicha davomat olishingiz mumkin.
          </p>
        </div>

        {/* Quick action button */}
        <div
          style={{
            marginTop: '20px',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <Button
            onClick={() => router.push('/teacher/attendance')}
            icon={<CalendarCheck size={16} />}
            style={{
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)',
            }}
          >
            Bugungi davomatni olish
          </Button>
        </div>
      </div>

      {/* Header and Search */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>
            Mening Guruhlarim ({filteredGroups.length})
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            Faqat sizga biriktirilgan o'quv guruhlari
          </p>
        </div>

        <div style={{ width: '280px', maxWidth: '100%' }}>
          <Input
            placeholder="Guruh yoki kurs bo'yicha qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search size={16} />}
          />
        </div>
      </div>

      {/* Groups List */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton height="160px" />
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
                background: 'var(--background)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <Users size={32} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              {searchTerm ? "Qidiruv bo'yicha guruh topilmadi" : "Sizga hali guruh biriktirilmagan"}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '400px', margin: 0 }}>
              {searchTerm
                ? "Boshqa so'z bilan qidirib ko'ring yoki qidiruvni tozalang."
                : "Admin sizni yangi guruhlarga biriktirgandan so'ng, ular shu yerda ko'rinadi."}
            </p>
          </div>
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px',
          }}
        >
          {filteredGroups.map((group) => {
            const studentCount = group._count?.studentGroups ?? 0;

            return (
              <Card
                key={group.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  {/* Top Bar: Name & Status */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '14px',
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          color: 'var(--text)',
                          margin: '0 0 4px 0',
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
                          fontWeight: 600,
                        }}
                      >
                        <BookOpen size={14} />
                        <span>{group.course?.name || "Kurs ko'rsatilmagan"}</span>
                      </div>
                    </div>

                    <Badge variant={group.status === 'FAOL' ? 'success' : 'secondary'}>
                      {group.status}
                    </Badge>
                  </div>

                  {/* Details grid */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      background: 'var(--background)',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      marginBottom: '16px',
                      fontSize: '13px',
                    }}
                  >
                    {/* Time */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} /> Dars vaqti:
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                        {group.startTime} - {group.endTime}
                      </span>
                    </div>

                    {/* Room */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <DoorOpen size={14} /> Xona:
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                        {group.room?.name || 'Xona belgilanmagan'}
                      </span>
                    </div>

                    {/* Students Count */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={14} /> O'quvchilar soni:
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: studentCount > 0 ? '#10b981' : 'var(--text-muted)',
                        }}
                      >
                        {studentCount} nafar
                      </span>
                    </div>

                    {/* Days */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} /> Kunlar:
                      </span>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {group.days && group.days.length > 0 ? (
                          group.days.map((day) => (
                            <span
                              key={day}
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                background: 'rgba(59, 130, 246, 0.1)',
                                color: '#3b82f6',
                                padding: '2px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              {DAY_LABELS[day] || day}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button
                    fullWidth
                    icon={<CalendarCheck size={16} />}
                    onClick={() => router.push(`/teacher/attendance?groupId=${group.id}`)}
                  >
                    Davomat olish
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
