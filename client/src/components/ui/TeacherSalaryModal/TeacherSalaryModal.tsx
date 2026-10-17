'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  DollarSign,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Calendar,
  FileSpreadsheet,
  Printer,
  Search,
  Sparkles,
  Percent,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { teachersApi } from '../../../api/teachers.api';
import { formatMoney } from '../../../utils/formatMoney';
import { formatPhone } from '../../../utils/phoneMask';
import { formatDate } from '../../../utils/formatDate';
import { exportToExcel } from '../../../utils/exportData';
import { Badge } from '../Badge/Badge';
import { Button } from '../Button/Button';
import { Skeleton } from '../Skeleton/Skeleton';
import styles from './TeacherSalaryModal.module.css';

interface TeacherSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  teacherName?: string;
}

export const TeacherSalaryModal: React.FC<TeacherSalaryModalProps> = ({
  isOpen,
  onClose,
  teacherId,
  teacherName,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'groups' | 'students'>('groups');
  const [studentSearch, setStudentSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['teacherSalary', teacherId, selectedMonth],
    queryFn: () => teachersApi.getSalary(teacherId, selectedMonth),
    enabled: isOpen && !!teacherId,
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
    const tName = teacher ? `${teacher.firstName}_${teacher.lastName}` : 'Oqituvchi';
    exportToExcel({
      filename: `Oylik_Hisobot_${tName}_${filter?.selectedMonth || 'barchasi'}`,
      sheetName: 'Maosh hisoboti',
      columns: exportColumns,
      data: exportRows,
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.teacherProfile}>
            <div className={styles.avatar}>
              {teacher?.firstName ? teacher.firstName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h3 className={styles.teacherName}>
                {teacher ? `${teacher.firstName} ${teacher.lastName}` : teacherName || "O'qituvchi Maoshi"}
              </h3>
              <div className={styles.teacherSub}>
                {teacher?.phone && <span>📞 {formatPhone(teacher.phone)}</span>}
                {teacher?.salaryType && (
                  <span
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#60a5fa',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    {teacher.salaryType === 'PERCENT'
                      ? `Stavka: ${teacher.salaryValue}% (Guruh to'lovlaridan foiz)`
                      : `Stavka: ${formatMoney(teacher.salaryValue)} (To'lov qilgan o'quvchi boshiga)`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
            {filter?.availableMonths && filter.availableMonths.length > 0 && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={styles.monthSelect}
              >
                {filter.availableMonths.map((m: any) => (
                  <option key={m.value} value={m.value}>
                    📅 {m.label}
                  </option>
                ))}
              </select>
            )}

            <button onClick={onClose} className={styles.closeBtn} aria-label="Yopish">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Skeleton height="110px" />
              <Skeleton height="260px" />
            </div>
          ) : isError ? (
            <div className={styles.emptyState}>
              <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 12px' }} />
              <p>Ma'lumotlarni yuklashda xatolik yuz berdi</p>
            </div>
          ) : (
            <>
              {/* 4 Stat Cards */}
              <div className={styles.statsGrid}>
                {/* 1. Jami O'quvchilar */}
                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <span className={styles.statLabel}>Jami Talabalar</span>
                    <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                      <Users size={18} />
                    </div>
                  </div>
                  <div className={styles.statValue}>{summary?.totalStudents ?? 0} nafar</div>
                  <div className={styles.statSub}>
                    <span>{summary?.totalGroups ?? 0} ta guruhda</span>
                  </div>
                </div>

                {/* 2. To'lov Qilganlar */}
                <div className={`${styles.statCard} ${styles.statCardHighlight}`}>
                  <div className={styles.statHeader}>
                    <span className={styles.statLabel} style={{ color: '#34d399' }}>To'lov Qilganlar</span>
                    <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                      <CheckCircle2 size={18} />
                    </div>
                  </div>
                  <div className={styles.statValue} style={{ color: '#10b981' }}>
                    {summary?.paidStudentsCount ?? 0} nafar
                  </div>
                  <div className={styles.statSub} style={{ color: '#cbd5e1' }}>
                    <span>
                      Qarzdor: <strong style={{ color: '#f87171' }}>{summary?.unpaidStudentsCount ?? 0}</strong>
                    </span>
                    {summary?.partialStudentsCount > 0 && (
                      <span>| Qisman: <strong style={{ color: '#fbbf24' }}>{summary.partialStudentsCount}</strong></span>
                    )}
                  </div>
                </div>

                {/* 3. Yig'ilgan to'lovlar */}
                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <span className={styles.statLabel}>Yig'ilgan To'lov</span>
                    <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                      <DollarSign size={18} />
                    </div>
                  </div>
                  <div className={styles.statValue} style={{ color: '#fbbf24' }}>
                    {formatMoney(summary?.totalCollected ?? 0)}
                  </div>
                  <div className={styles.statSub}>
                    <span>Talabalar to'lagan jami summa</span>
                  </div>
                </div>

                {/* 4. O'qituvchining Hisoblangan Oyligi */}
                <div className={`${styles.statCard} ${styles.statCardSalary}`}>
                  <div className={styles.statHeader}>
                    <span className={styles.statLabel} style={{ color: '#60a5fa' }}>O'qituvchi Maoshi</span>
                    <div className={styles.statIcon} style={{ background: 'rgba(99, 102, 241, 0.25)', color: '#818cf8' }}>
                      <Sparkles size={18} />
                    </div>
                  </div>
                  <div className={styles.statValueSalary}>
                    {formatMoney(summary?.calculatedSalary ?? 0)}
                  </div>
                  <div className={styles.statSub} style={{ color: '#93c5fd' }}>
                    <span>Joriy hisoblangan yakuniy daromad</span>
                  </div>
                </div>
              </div>

              {/* Salary Calculation Formula Box */}
              {summary?.salaryFormula && (
                <div className={styles.formulaBox}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8' }}>Hisob-kitob formulasi:</span>
                    <span className={styles.formulaText}>
                      <span className={styles.formulaHighlight}>{summary.salaryFormula}</span> ={' '}
                      <strong style={{ color: '#10b981', fontSize: '14px' }}>
                        {formatMoney(summary.calculatedSalary)}
                      </strong>
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Davr: <strong>{filter?.selectedMonthLabel || 'Barcha vaqt'}</strong>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className={styles.tabsBar}>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${activeTab === 'groups' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('groups')}
                >
                  <Layers size={16} />
                  <span>Guruhlar bo'yicha taqsimot ({groups.length})</span>
                </button>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${activeTab === 'students' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('students')}
                >
                  <Users size={16} />
                  <span>O'quvchilar va to'lovlar ({students.length})</span>
                </button>
              </div>

              {/* TAB 1: GROUPS BREAKDOWN */}
              {activeTab === 'groups' && (
                <div className={styles.tableWrap}>
                  <table className={styles.salaryTable}>
                    <thead>
                      <tr>
                        <th>Guruh</th>
                        <th>Kurs & Narxi</th>
                        <th>Jami Talaba</th>
                        <th>To'laganlar</th>
                        <th>To'lamaganlar</th>
                        <th>Guruhdan Tushum</th>
                        <th>Ustoz Maoshi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '28px', color: '#94a3b8' }}>
                            Ushbu o'qituvchiga biriktirilgan guruhlar topilmadi
                          </td>
                        </tr>
                      ) : (
                        groups.map((g: any) => (
                          <tr key={g.groupId}>
                            <td>
                              <span className={styles.groupBadge}>
                                <BookOpen size={13} />
                                <span>{g.groupName}</span>
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{g.courseName}</div>
                              <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                                {formatMoney(g.coursePrice)}
                              </div>
                            </td>
                            <td style={{ fontWeight: 700 }}>{g.totalStudents} ta</td>
                            <td>
                              <span
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  color: '#34d399',
                                  fontWeight: 700,
                                  fontSize: '12px',
                                }}
                              >
                                {g.paidCount} ta to'lagan
                              </span>
                            </td>
                            <td>
                              <span
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: g.unpaidCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                                  color: g.unpaidCount > 0 ? '#f87171' : '#94a3b8',
                                  fontWeight: 600,
                                  fontSize: '12px',
                                }}
                              >
                                {g.unpaidCount} ta qarzdor
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, color: '#fbbf24' }}>
                              {formatMoney(g.totalCollected)}
                            </td>
                            <td style={{ fontWeight: 800, color: '#38bdf8' }}>
                              {formatMoney(g.calculatedSalary)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: STUDENTS PAYMENT LIST */}
              {activeTab === 'students' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        maxWidth: '340px',
                        width: '100%',
                      }}
                    >
                      <Search size={15} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
                      <input
                        type="text"
                        placeholder="O'quvchi ismi yoki telefoni..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px 8px 36px',
                          borderRadius: '10px',
                          background: 'rgba(30, 41, 59, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      icon={<FileSpreadsheet size={15} />}
                      onClick={handleExport}
                      style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                    >
                      Excelga yuklab olish
                    </Button>
                  </div>

                  <div className={styles.tableWrap}>
                    <table className={styles.salaryTable}>
                      <thead>
                        <tr>
                          <th>Talaba</th>
                          <th>Guruh</th>
                          <th>Kurs Narxi</th>
                          <th>To'lagan Summasi</th>
                          <th>Qarzdorlik</th>
                          <th>To'lov Holati</th>
                          <th>To'lov Sanasi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '28px', color: '#94a3b8' }}>
                              Talabalar topilmadi
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((s: any, idx: number) => (
                            <tr key={`${s.studentId}-${s.groupId}-${idx}`}>
                              <td>
                                <div style={{ fontWeight: 700, color: '#ffffff' }}>{s.studentName}</div>
                                <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>{formatPhone(s.studentPhone)}</div>
                              </td>
                              <td>
                                <span style={{ fontSize: '12.5px', color: '#93c5fd' }}>{s.groupName}</span>
                              </td>
                              <td style={{ color: '#94a3b8' }}>{formatMoney(s.coursePrice)}</td>
                              <td style={{ fontWeight: 700, color: s.paidAmount > 0 ? '#10b981' : '#94a3b8' }}>
                                {formatMoney(s.paidAmount)}
                              </td>
                              <td style={{ fontWeight: 600, color: s.remainingDebt > 0 ? '#f87171' : '#10b981' }}>
                                {s.remainingDebt > 0 ? formatMoney(s.remainingDebt) : 'Qarz yo\'q'}
                              </td>
                              <td>
                                <Badge
                                  variant={
                                    s.status === 'TOLANGAN'
                                      ? 'success'
                                      : s.status === 'QISMAN'
                                      ? 'warning'
                                      : 'danger'
                                  }
                                >
                                  {s.status === 'TOLANGAN' ? 'TO\'LANGAN' : s.status === 'QISMAN' ? 'QISMAN' : 'TO\'LANMAGAN'}
                                </Badge>
                              </td>
                              <td style={{ fontSize: '12px', color: '#94a3b8' }}>
                                {s.paymentDate ? formatDate(s.paymentDate) : '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <div className={styles.footerTotal}>
            <span className={styles.footerTotalLabel}>O'qituvchiga to'lanadigan jami summa:</span>
            <span className={styles.footerTotalValue}>
              {formatMoney(summary?.calculatedSalary ?? 0)}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="outline" onClick={onClose}>
              Yopish
            </Button>
            <Button
              variant="primary"
              icon={<FileSpreadsheet size={15} />}
              onClick={handleExport}
            >
              Eksport qilish (Excel)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
