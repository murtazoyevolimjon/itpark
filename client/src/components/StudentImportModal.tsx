'use client';

import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download } from 'lucide-react';
import { api } from '../api/axios';
import { Modal } from './ui/Modal/Modal';
import { Button } from './ui/Button/Button';
import { GroupCardSelect } from './ui/GroupCardSelect/GroupCardSelect';
import { useLanguage } from '../hooks/useLanguage';
import { exportToExcel } from '../utils/exportData';
import { parseStudentsSheet, ParsedStudentRow } from '../utils/parseStudentsSheet';
import { groupLocalPhone, localPhoneDigits } from '../utils/uzPhone';

const TEXT = {
  uz: {
    title: "Excel orqali o'quvchilarni qo'shish",
    hint: "Ro'yxatni Excel (.xlsx, .xls) yoki CSV fayl qilib yuklang. Telefon raqamlarga +998 o'zi qo'shiladi (masalan 88-579-03-09 → +998 88 579 03 09). Ota-ona telefoni ixtiyoriy.",
    group: "Guruh (ixtiyoriy, hammasi shu guruhga qo'shiladi)",
    file: 'Fayl tanlash',
    template: 'Namuna yuklab olish',
    swap: "Ism va familiyani almashtirish (faylda \"Ism Familiya\" tartibida bo'lsa)",
    found: "Topildi",
    ready: "Qo'shiladi",
    bad: "Xato (o'tkazib yuboriladi)",
    colName: 'Familiya Ism',
    colPhone: 'Telefon',
    colParent: 'Ota-ona',
    problemName: "Ism/familiya yo'q",
    problemPhone: "Telefon noto'g'ri",
    showing: "Dastlabki 100 qator ko'rsatilgan",
    start: "Qo'shishni boshlash",
    cancel: 'Bekor qilish',
    close: 'Yopish',
    running: "Qo'shilmoqda…",
    done: "Tayyor: {n} ta o'quvchi qo'shildi",
    skipped: "{n} ta o'tkazib yuborildi",
    readError: "Faylni o'qib bo'lmadi. Excel yoki CSV fayl tanlang.",
    empty: "Faylda o'quvchi topilmadi",
    sampleSheet: "O'quvchilar",
    headers: ['Ism', 'Familiya', 'Telefon', "Ota-onasining telefoni"],
  },
  en: {
    title: 'Add students from Excel',
    hint: 'Upload the list as an Excel (.xlsx, .xls) or CSV file. +998 is added to phone numbers automatically (88-579-03-09 → +998 88 579 03 09). The parent phone is optional.',
    group: 'Group (optional, everyone is added to it)',
    file: 'Choose file',
    template: 'Download template',
    swap: 'Swap first and last name (if the file is in "First Last" order)',
    found: 'Found',
    ready: 'Will be added',
    bad: 'Errors (skipped)',
    colName: 'Last First',
    colPhone: 'Phone',
    colParent: 'Parent',
    problemName: 'Name missing',
    problemPhone: 'Invalid phone',
    showing: 'First 100 rows shown',
    start: 'Start adding',
    cancel: 'Cancel',
    close: 'Close',
    running: 'Adding…',
    done: 'Done: {n} students added',
    skipped: '{n} skipped',
    readError: 'Could not read the file. Choose an Excel or CSV file.',
    empty: 'No students found in the file',
    sampleSheet: 'Students',
    headers: ['First name', 'Last name', 'Phone', 'Parent phone'],
  },
  ru: {
    title: 'Добавить учеников из Excel',
    hint: 'Загрузите список в виде файла Excel (.xlsx, .xls) или CSV. +998 добавляется к номерам автоматически (88-579-03-09 → +998 88 579 03 09). Телефон родителя необязателен.',
    group: 'Группа (необязательно, все будут добавлены в неё)',
    file: 'Выбрать файл',
    template: 'Скачать образец',
    swap: 'Поменять имя и фамилию местами (если в файле порядок «Имя Фамилия»)',
    found: 'Найдено',
    ready: 'Будет добавлено',
    bad: 'Ошибки (пропускаются)',
    colName: 'Фамилия Имя',
    colPhone: 'Телефон',
    colParent: 'Родитель',
    problemName: 'Нет имени',
    problemPhone: 'Неверный телефон',
    showing: 'Показаны первые 100 строк',
    start: 'Начать добавление',
    cancel: 'Отмена',
    close: 'Закрыть',
    running: 'Добавление…',
    done: 'Готово: добавлено учеников — {n}',
    skipped: 'Пропущено: {n}',
    readError: 'Не удалось прочитать файл. Выберите файл Excel или CSV.',
    empty: 'В файле не найдено учеников',
    sampleSheet: 'Ученики',
    headers: ['Имя', 'Фамилия', 'Телефон', 'Телефон родителя'],
  },
} as const;

const CHUNK = 400;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  groups: any[];
  onImported: () => void;
}

const showPhone = (digits: string) => (digits ? `+998 ${groupLocalPhone(localPhoneDigits(digits))}` : '-');

export const StudentImportModal: React.FC<Props> = ({ isOpen, onClose, groups, onImported }) => {
  const { lang } = useLanguage();
  const tx = TEXT[(lang as 'uz' | 'en' | 'ru') in TEXT ? (lang as 'uz' | 'en' | 'ru') : 'uz'];
  const fileRef = useRef<HTMLInputElement>(null);

  const [matrix, setMatrix] = useState<unknown[][] | null>(null);
  const [swapNames, setSwapNames] = useState(false);
  const [groupId, setGroupId] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [skippedList, setSkippedList] = useState<{ row: number; name: string; reason: string }[]>([]);
  const [running, setRunning] = useState(false);

  const parsed = matrix ? parseStudentsSheet(matrix, { swapNames }) : null;
  const good = parsed ? parsed.rows.filter((r) => !r.problem) : [];
  const badCount = parsed ? parsed.rows.length - good.length : 0;

  const reset = () => {
    setMatrix(null);
    setSwapNames(false);
    setMessage(null);
    setSkippedList([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    if (running) return;
    reset();
    onClose();
  };

  const handleFile = async (file: File | undefined) => {
    setMessage(null);
    setSkippedList([]);
    if (!file) return;
    try {
      const isCsv = /\.csv$/i.test(file.name);
      const wb = isCsv
        ? XLSX.read(await file.text(), { type: 'string' })
        : XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' });
      if (!rows.some((r) => (r as unknown[]).some((c) => String(c).trim()))) {
        setMatrix(null);
        setMessage({ kind: 'error', text: tx.empty });
        return;
      }
      setMatrix(rows as unknown[][]);
    } catch {
      setMatrix(null);
      setMessage({ kind: 'error', text: tx.readError });
    }
  };

  const downloadTemplate = () => {
    exportToExcel({
      filename: 'oquvchilar-namuna',
      sheetName: tx.sampleSheet,
      columns: [
        { header: tx.headers[0], key: 'a' },
        { header: tx.headers[1], key: 'b' },
        { header: tx.headers[2], key: 'c' },
        { header: tx.headers[3], key: 'd' },
      ],
      data: [
        { a: 'Ali', b: 'Valiyev', c: '90 123 45 67', d: '91 234 56 78' },
        { a: 'Vali', b: 'Aliyev', c: '88-579-03-09', d: '' },
      ],
    });
  };

  const startImport = async () => {
    if (!good.length || running) return;
    setRunning(true);
    setMessage(null);
    let created = 0;
    const skipped: { row: number; name: string; reason: string }[] = [];
    try {
      for (let i = 0; i < good.length; i += CHUNK) {
        const slice = good.slice(i, i + CHUNK);
        const res = await api.post('/students/import', {
          groupId: groupId || undefined,
          rows: slice.map((r) => ({ firstName: r.firstName, lastName: r.lastName, phone: r.phone, parentPhone: r.parentPhone })),
        });
        created += res.data.created || 0;
        for (const s of res.data.skipped || []) skipped.push({ ...s, row: slice[s.row - 1]?.line ?? s.row });
      }
      setMessage({ kind: 'ok', text: `${tx.done.replace('{n}', String(created))}${skipped.length ? `. ${tx.skipped.replace('{n}', String(skipped.length))}` : ''}` });
      setSkippedList(skipped);
      setMatrix(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      const data = err?.response?.data;
      created += data?.created || 0;
      setMessage({ kind: 'error', text: data?.message || tx.readError });
    } finally {
      setRunning(false);
      if (created > 0) onImported();
    }
  };

  const problemText = (p: ParsedStudentRow['problem']) => (p === 'name' ? tx.problemName : p === 'phone' ? tx.problemPhone : '');

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={tx.title} maxWidth="760px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{tx.hint}</p>

        <GroupCardSelect
          label={tx.group}
          groups={groups}
          value={groupId}
          onChange={setGroupId}
          allowEmpty={true}
          emptyOptionLabel="—"
          placeholder="—"
          searchPlaceholder="…"
        />

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button type="button" icon={<Upload size={15} />} onClick={() => fileRef.current?.click()} disabled={running}>
            {tx.file}
          </Button>
          <Button type="button" variant="secondary" icon={<Download size={15} />} onClick={downloadTemplate}>
            {tx.template}
          </Button>
        </div>

        {message && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              background: message.kind === 'ok' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              color: message.kind === 'ok' ? '#10b981' : '#f87171',
            }}
          >
            {message.text}
          </div>
        )}

        {skippedList.length > 0 && (
          <div style={{ maxHeight: '140px', overflow: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
            {skippedList.slice(0, 200).map((s, i) => (
              <div key={i}>
                #{s.row} {s.name} — {s.reason}
              </div>
            ))}
          </div>
        )}

        {parsed && parsed.rows.length > 0 && (
          <>
            {parsed.splitFullName && (
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: 'var(--text)' }}>
                <input type="checkbox" checked={swapNames} onChange={(e) => setSwapNames(e.target.checked)} />
                {tx.swap}
              </label>
            )}

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', fontWeight: 700 }}>
              <span style={{ color: 'var(--text)' }}>{tx.found}: {parsed.rows.length}</span>
              <span style={{ color: '#10b981' }}>{tx.ready}: {good.length}</span>
              {badCount > 0 && <span style={{ color: '#f87171' }}>{tx.bad}: {badCount}</span>}
            </div>

            <div style={{ maxHeight: '260px', overflow: 'auto', border: '1px solid var(--border)', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 10px' }}>#</th>
                    <th style={{ padding: '8px 10px' }}>{tx.colName}</th>
                    <th style={{ padding: '8px 10px' }}>{tx.colPhone}</th>
                    <th style={{ padding: '8px 10px' }}>{tx.colParent}</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 100).map((r) => (
                    <tr key={r.line} style={{ background: r.problem ? 'rgba(239,68,68,0.08)' : undefined }}>
                      <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{r.line}</td>
                      <td style={{ padding: '6px 10px', color: 'var(--text)' }}>{`${r.lastName} ${r.firstName}`.trim() || '-'}</td>
                      <td style={{ padding: '6px 10px', color: r.problem === 'phone' ? '#f87171' : 'var(--text)' }}>
                        {r.problem ? problemText(r.problem) : showPhone(r.phone)}
                      </td>
                      <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{showPhone(r.parentPhone)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsed.rows.length > 100 && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tx.showing}</span>}
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '6px' }}>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={running}>
            {message?.kind === 'ok' ? tx.close : tx.cancel}
          </Button>
          <Button type="button" onClick={startImport} isLoading={running} disabled={!good.length || running}>
            {running ? tx.running : `${tx.start}${good.length ? ` (${good.length})` : ''}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
