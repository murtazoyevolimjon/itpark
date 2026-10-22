'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';
import { Card } from './ui/Card/Card';
import { Button } from './ui/Button/Button';
import { useToast } from './ui/Toast/Toast';
import { useLanguage } from '../hooks/useLanguage';
import { exportToExcel, exportToPdf } from '../utils/exportData';

interface ArchiveRecord {
  date: string;
  group: string;
  student: string;
  phone: string;
  status: string;
  note: string;
}

/**
 * Attendance older than the working window (current + previous month) waits here. The center downloads a
 * month as Excel (every record) and PDF (one summary row per student); only after both files were saved
 * and the user confirmed is the month deleted from the database. Nothing is deleted by itself.
 */
export function AttendanceArchive() {
  const { t } = useLanguage();
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [busyMonth, setBusyMonth] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['attendance-archive'],
    queryFn: async () => (await api.get('/attendance/archive')).data as { months: { month: string; count: number }[] },
    staleTime: 60_000,
  });

  const months = data?.months || [];
  if (months.length === 0) return null;

  const downloadAndDelete = async (month: string) => {
    setBusyMonth(month);
    try {
      const res = await api.get('/attendance/archive', { params: { month } });
      const records: ArchiveRecord[] = res.data.records || [];

      const excelOk = exportToExcel({
        filename: `davomat-${month}`,
        sheetName: month,
        columns: [
          { header: 'Sana', key: 'date' },
          { header: 'Guruh', key: 'group' },
          { header: "O'quvchi", key: 'student' },
          { header: 'Telefon', key: 'phone' },
          { header: 'Holat', key: 'status' },
          { header: 'Izoh', key: 'note' },
        ],
        data: records,
      });

      // The PDF stays small: one row per student and group with the totals of the month
      const summary = new Map<string, Record<string, any>>();
      for (const r of records) {
        const key = `${r.student}|${r.group}|${r.phone}`;
        const row = summary.get(key) || { student: r.student, group: r.group, phone: r.phone, KELGAN: 0, KELMAGAN: 0, KECHIKKAN: 0, total: 0 };
        row[r.status] = (row[r.status] || 0) + 1;
        row.total += 1;
        summary.set(key, row);
      }
      const pdfOk = exportToPdf({
        filename: `davomat-${month}`,
        title: `Davomat hisoboti - ${month}`,
        columns: [
          { header: "O'quvchi", key: 'student' },
          { header: 'Guruh', key: 'group' },
          { header: 'Telefon', key: 'phone' },
          { header: 'Keldi', key: 'KELGAN' },
          { header: 'Kelmadi', key: 'KELMAGAN' },
          { header: 'Kechikdi', key: 'KECHIKKAN' },
          { header: 'Jami', key: 'total' },
        ],
        data: Array.from(summary.values()),
      });

      if (!excelOk || !pdfOk) {
        error(t('archiveFailed'));
        return;
      }

      if (!window.confirm(t('archiveConfirm'))) return;

      await api.delete('/attendance/archive', { params: { month } });
      success(t('archiveDone'));
      queryClient.invalidateQueries({ queryKey: ['attendance-archive'] });
    } catch {
      error(t('archiveFailed'));
    } finally {
      setBusyMonth(null);
    }
  };

  return (
    <Card style={{ padding: '16px 20px' }}>
      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{t('archiveTitle')}</div>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 12px' }}>{t('archiveHint')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {months.map((m) => (
          <div key={m.month} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', color: 'var(--text)' }}>
              <strong>{m.month}</strong> · {m.count} {t('archiveRecords')}
            </span>
            <Button size="sm" onClick={() => downloadAndDelete(m.month)} disabled={busyMonth !== null}>
              {t('archiveDownload')}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
