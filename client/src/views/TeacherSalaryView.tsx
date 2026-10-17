'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Wallet,
  DollarSign,
  Users,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Search,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { teachersApi } from '../api/teachers.api';
import { formatMoney } from '../utils/formatMoney';
import { formatPhone } from '../utils/phoneMask';
import { formatDate } from '../utils/formatDate';
import { exportToExcel } from '../utils/exportData';
import { Badge } from '../components/ui/Badge/Badge';
import { Button } from '../components/ui/Button/Button';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import { useAuth } from '../hooks/useAuth';

export const TeacherSalaryView: React.FC = () => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'groups' | 'students'>('groups');
  const [studentSearch, setStudentSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['teacherSalary', 'me', selectedMonth],
    queryFn: () => teachersApi.getSalary('me', selectedMonth),
  });

  const teacher = data?.teacher;
  const summary = data?.summary;
  const filter = data?.filter;
  const groups = data?.groups || [];
  const students = data?.students || [];

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(
      (s: any) =>
        s.studentName.toLowerCase().includes(q) ||
        s.studentPhone.includes(q) ||
        s.groupName.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const handleExport = () => {
    if (!students || students.length === 0) return;
    const exportColumns = [
      { header: '№', key: 'index' },
      { header: 'Talaba F.I.SH', key: 'studentName' },
      { header: 'Telefon', key: 'studentPhone' },
      { header: 'Guruh', key: 'groupName' },
      { header: 'Kurs narxi', key: 'coursePrice' },
      { header: 'To\'langan summa', key: 'paidAmount' },
      { header: 'Qarzdorlik', key: 'remainingDebt' },
      { header: 'Holati', key: 'statusText' },
      { header: 'To\'lov sanasi', key: 'paymentDate' },
    ];
    const exportRows = students.map((s: any, idx: number) => ({
      index: idx + 1,
      studentName: s.studentName,
      studentPhone: formatPhone(s.studentPhone),
      groupName: s.groupName,
      coursePrice: formatMoney(s.coursePrice),
      paidAmount: formatMoney(s.paidAmount),
      remainingDebt: formatMoney(s.remainingDebt),
      statusText: s.status === 'TOLANGAN' ? 'To\'langan' : s.status === 'QISMAN' ? 'Qisman' : 'To\'lanmagan',
      paymentDate: s.paymentDate ? formatDate(s.paymentDate) : '-',
    }));
    const tName = teacher ? `${teacher.firstName}_${teacher.lastName}` : user?.fullName || 'Oqituvchi';
    exportToExcel({
      filename: `Mening_Oylik_Hisobim_${tName}_${filter?.selectedMonth || 'barchasi'}`,
      sheetName: 'Maosh hisoboti',
      columns: exportColumns,
      data: exportRows,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Page Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)',
          borderRadius: '20px',
          padding: '24px 28px',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 12px 30px -10px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 800,
              boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
              flexShrink: 0,
            }}
          >
            <Wallet size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                Mening Oylik Maoshim
              </h1>
              {teacher && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                  }}
                >
                  {teacher.salaryType === 'PERCENT'
                    ? `Stavka: ${teacher.salaryValue}% (To'lovlardan foiz)`
                    : `Stavka: ${teacher.salaryValue >= 1000000 ? formatMoney(teacher.salaryValue) : `${formatMoney(teacher.salaryValue)} / to'lagan o'quvchi`}`}
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Guruhlaringizdagi o'quvchilar to'lovlari va sizning hisoblangan oylik maoshingiz
            </p>
          </div>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '4px 10px',
            }}
          >
            <Calendar size={15} color="var(--text-muted)" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text)',
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {filter?.availableMonths?.map((m: any) => (
                <option key={m.value} value={m.value} style={{ background: '#1e293b', color: '#ffffff' }}>
                  {m.label}
                </option>
              )) || <option value="all">Barcha davrlar</option>}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            style={{
              borderColor: 'rgba(16, 185, 129, 0.4)',
              color: '#10b981',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Excel hisobot</span>
          </Button>
        </div>
      </div>

      {/* 4 Large KPI Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Jami o'quvchilar */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          }}
        >
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
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Jami o'quvchilarim
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
              {isLoading ? '...' : `${summary?.totalStudents || 0} ta`}
            </div>
            <div style={{ fontSize: '11.5px', color: '#60a5fa', marginTop: '2px' }}>
              {summary?.groupsCount || 0} ta guruhda
            </div>
          </div>
        </div>

        {/* Card 2: To'lov qilganlar */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          }}
        >
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
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
              To'lov qilgan o'quvchilar
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
              {isLoading ? '...' : `${summary?.paidStudentsCount || 0} / ${summary?.totalStudents || 0}`}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {summary?.unpaidStudentsCount || 0} ta to'lamagan o'quvchi
            </div>
          </div>
        </div>

        {/* Card 3: Yig'ilgan summa */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(14, 165, 233, 0.15)',
              color: '#0ea5e9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Yig'ilgan to'lovlar summasi
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0ea5e9', marginTop: '2px' }}>
              {isLoading ? '...' : formatMoney(summary?.totalCollected || 0)}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Qarzdorlik: {formatMoney(summary?.totalDebt || 0)}
            </div>
          </div>
        </div>

        {/* Card 4: Hisoblangan maosh */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.3) 100%)',
            border: '2px solid rgba(16, 185, 129, 0.45)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 8px 24px -6px rgba(16, 185, 129, 0.3)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#10b981',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
            }}
          >
            <Sparkles size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#a7f3d0', fontWeight: 700 }}>
              💰 Mening Hisoblangan Maoshim
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
              {isLoading ? '...' : formatMoney(summary?.calculatedSalary || 0)}
            </div>
            <div style={{ fontSize: '11.5px', color: '#a7f3d0', marginTop: '2px' }}>
              {teacher?.salaryType === 'PERCENT'
                ? `Tushumdan ${teacher.salaryValue}% stavka`
                : `${summary?.paidStudentsCount || 0} ta o'quvchi to'lovi bo'yicha`}
            </div>
          </div>
        </div>
      </div>

      {/* Formula & Explanation Box */}
      {summary && (
        <div
          style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '14px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <span style={{ fontSize: '20px' }}>💡</span>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa' }}>
              Maosh qanday hisoblandi:
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text)', marginLeft: '8px' }}>
              {summary.calculationFormula}
            </span>
          </div>
        </div>
      )}

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('groups')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'groups' ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'groups' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <Layers size={16} />
          <span>Guruhlar bo'yicha taqsimot ({groups.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('students')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'students' ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'students' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <Users size={16} />
          <span>O'quvchilar va to'lov holati ({students.length})</span>
        </button>
      </div>

      {/* Tab 1: Groups breakdown */}
      {activeTab === 'groups' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '16px' }}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--card)', borderRadius: '16px', padding: '20px' }}>
                <Skeleton height="120px" />
              </div>
            ))
          ) : groups.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
              Ushbu davrda guruhlar bo'yicha to'lovlar topilmadi
            </div>
          ) : (
            groups.map((g: any) => (
              <div
                key={g.groupId}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                      {g.groupName}
                    </h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Kurs: {g.courseName}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#60a5fa',
                    }}
                  >
                    {formatMoney(g.coursePrice)}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>O'quvchilar</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                      {g.totalStudents} ta
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>To'laganlar</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>
                      {g.paidStudentsCount} ta
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Yig'ilgan mablag'</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>
                      {formatMoney(g.totalCollected)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ustoz ulushi</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#34d399' }}>
                      {formatMoney(g.teacherShare)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Students list */}
      {activeTab === 'students' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search bar */}
          <div style={{ maxWidth: '380px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--card)',
              }}
            >
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Talaba ismi, telefon yoki guruh..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '13px',
                  color: 'var(--text)',
                  width: '100%',
                }}
              />
            </div>
          </div>

          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>№</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>O'QUVCHI F.I.SH</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>TELEFON</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>GURUH</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>KURS NARXI</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>TO'LANGAN</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>QARZDORLIK</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>HOLATI</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>TO'LOV SANASI</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={9} style={{ padding: '12px 16px' }}>
                          <Skeleton height="20px" />
                        </td>
                      </tr>
                    ))
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        O'quvchilar ro'yxati topilmadi
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s: any, idx: number) => (
                      <tr
                        key={`${s.studentId}-${s.groupId}`}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text)' }}>
                          {s.studentName}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                          {formatPhone(s.studentPhone)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'rgba(59, 130, 246, 0.12)',
                              color: '#60a5fa',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}
                          >
                            {s.groupName}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text)' }}>
                          {formatMoney(s.coursePrice)}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 700 }}>
                          {formatMoney(s.paidAmount)}
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            color: s.remainingDebt > 0 ? '#ef4444' : 'var(--text-muted)',
                            fontWeight: s.remainingDebt > 0 ? 700 : 500,
                          }}
                        >
                          {formatMoney(s.remainingDebt)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant={s.status === 'TOLANGAN' ? 'success' : s.status === 'QISMAN' ? 'warning' : 'danger'}>
                            {s.status === 'TOLANGAN' ? 'To\'langan' : s.status === 'QISMAN' ? 'Qisman' : 'To\'lanmagan'}
                          </Badge>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                          {s.paymentDate ? formatDate(s.paymentDate) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
