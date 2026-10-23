'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../hooks/useLanguage';
import { groupsApi } from '../api/groups.api';
import { studentsApi } from '../api/students.api';
import { homeworkApi } from '../api/homework.api';
import { HOMEWORK_ENABLED, HOMEWORK_OFF_NOTICE } from '../lib/featureFlags';
import { Group, Student } from '../types';
import {
  BookOpen,
  UploadCloud,
  File,
  FileText,
  FileArchive,
  Image as ImageIcon,
  CheckCircle,
  Download,
  Trash2,
  Calendar,
  Clock,
  Plus,
  AlertCircle,
  X,
  ExternalLink,
  Users,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Star,
  Send,
  MessageSquare,
} from 'lucide-react';
import styles from './TeacherHomework.module.css';

interface AttachedFile {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

interface HomeworkItem {
  id: string;
  groupId: string;
  groupName: string;
  courseName?: string;
  title: string;
  desc: string;
  deadline: string;
  file?: AttachedFile | null;
  createdAt: string;
}

interface HomeworkSubmission {
  id: string;
  hwId: string;
  groupId: string;
  studentId: string;
  studentName: string;
  studentPhone?: string;
  submissionLink: string;
  comment?: string;
  submittedAt: string;
  status: 'KUTILMOQDA' | 'BAHOLANDI';
  grade?: number;
  teacherFeedback?: string;
}

export const TeacherHomework: React.FC = () => {
  const { dict } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwDeadline, setHwDeadline] = useState('');
  const [targetGroupId, setTargetGroupId] = useState<string>('');
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [submissionsList, setSubmissionsList] = useState<HomeworkSubmission[]>([]);
  const [expandedHwId, setExpandedHwId] = useState<string | null>(null);
  const [gradingInputs, setGradingInputs] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch groups
  const { data: groupsData } = useQuery({
    queryKey: ['teacherGroupsList'],
    queryFn: () => groupsApi.getAll({ limit: 100 }),
  });

  const allGroups: Group[] = groupsData?.data || [];

  // Fetch all students for submission mapping
  const { data: studentsData } = useQuery({
    queryKey: ['teacherAllStudents'],
    queryFn: () => studentsApi.getAll({ limit: 200 }),
  });

  const allStudents: Student[] = (studentsData as any)?.data || [];

  // Set default targetGroupId when groups load
  useEffect(() => {
    if (allGroups.length > 0 && !targetGroupId) {
      setTargetGroupId(allGroups[0].id);
    }
  }, [allGroups, targetGroupId]);

  // Load homeworks from API (with localStorage fallback)
  const loadHomeworks = async () => {
    try {
      const res = await homeworkApi.getAll();
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        setHomeworkList(res.data);
        localStorage.setItem('all_teacher_homeworks', JSON.stringify(res.data));
        return;
      }
    } catch (err) {
      console.warn('Could not load homeworks from server:', err);
    }

    try {
      const saved = localStorage.getItem('all_teacher_homeworks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHomeworkList(parsed);
          return;
        }
      }

      // Default sample homework
      const samples: HomeworkItem[] = [
        {
          id: 'hw-sample-1',
          groupId: allGroups[0]?.id || 'g1',
          groupName: allGroups[0]?.name || 'Dush-Chor-Juma 16:00 FRONTEND',
          courseName: 'Frontend',
          title: "React Components & Props amaliy mashg'ulot",
          desc: "Figma dizayni bo'yicha Header va Sidebar komponentlarini yarating, prop turlarini tekshiring va responsivlikni ta'minlang.",
          deadline: '2026-10-18 20:00',
          createdAt: '10.10.2026',
        },
      ];
      setHomeworkList(samples);
      localStorage.setItem('all_teacher_homeworks', JSON.stringify(samples));
    } catch {}
  };

  // Load submissions from API
  const loadSubmissions = async () => {
    try {
      const res = await homeworkApi.getSubmissions();
      if (res && res.data && Array.isArray(res.data)) {
        setSubmissionsList(res.data);
        return;
      }
    } catch (err) {
      console.warn('Could not load submissions from server:', err);
    }

    try {
      const saved = localStorage.getItem('student_hw_submissions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const list = Object.values(parsed) as HomeworkSubmission[];
          setSubmissionsList(list);
        }
      }
    } catch {}
  };

  useEffect(() => {
    loadHomeworks();
    loadSubmissions();
  }, [allGroups]);

  // File size formatter
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // File format icon
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText size={22} className={styles.fileIconPdf} />;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || ''))
      return <FileArchive size={22} className={styles.fileIconZip} />;
    if (['jpg', 'jpeg', 'png', 'svg', 'webp'].includes(ext || ''))
      return <ImageIcon size={22} className={styles.fileIconImg} />;
    return <File size={22} className={styles.fileIconDefault} />;
  };

  // Process selected file
  const processFile = (file: globalThis.File) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage("Fayl hajmi 50MB dan katta bo'lmasligi kerak!");
      return;
    }
    setErrorMessage('');

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && HOMEWORK_ENABLED) processFile(file);
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save new homework (sends to server API so student sees it immediately)
  const handleSaveHomework = async () => {
    if (!HOMEWORK_ENABLED) {
      setErrorMessage(HOMEWORK_OFF_NOTICE);
      return;
    }
    if (!hwTitle.trim()) {
      setErrorMessage(dict.teacher?.homeworkTitlePlaceholder || 'Vazifa mavzusini kiriting');
      return;
    }

    const targetGroup = allGroups.find((g) => g.id === targetGroupId) || allGroups[0];
    if (!targetGroup) {
      // A homework always belongs to one of the teacher's own groups
      setErrorMessage(dict.teacher?.noGroups || 'Sizga hali guruh biriktirilmagan');
      return;
    }
    setIsSaving(true);
    setErrorMessage('');

    try {
      const payload = {
        groupId: targetGroup?.id || 'all',
        groupName: targetGroup?.name || 'Barcha guruhlar',
        courseName: targetGroup?.course?.name,
        title: hwTitle.trim(),
        desc: hwDesc.trim(),
        deadline: hwDeadline || 'Muddati belgilanmagan',
        file: attachedFile,
      };

      const res = await homeworkApi.create(payload);
      const createdItem = res?.data || {
        id: 'hw-' + Date.now(),
        ...payload,
        createdAt: new Date().toLocaleDateString('uz-UZ'),
      };

      const updated = [createdItem, ...homeworkList];
      setHomeworkList(updated);
      try {
        localStorage.setItem('all_teacher_homeworks', JSON.stringify(updated));
      } catch {}

      // Reset form
      setHwTitle('');
      setHwDesc('');
      setHwDeadline('');
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Vazifani saqlashda xatolik yuz berdi');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete homework
  const handleDeleteHomework = async (id: string) => {
    const updated = homeworkList.filter((item) => item.id !== id);
    setHomeworkList(updated);
    try {
      localStorage.setItem('all_teacher_homeworks', JSON.stringify(updated));
      await homeworkApi.delete(id);
    } catch {}
  };

  // Grade student submission
  const handleGradeSubmission = async (submissionId: string) => {
    const inputs = gradingInputs[submissionId] || { grade: '100', feedback: '' };
    try {
      await homeworkApi.gradeSubmission({
        submissionId,
        grade: Number(inputs.grade) || 100,
        teacherFeedback: inputs.feedback || 'Ajoyib bajarilgan!',
        status: 'BAHOLANDI',
      });

      // Update state locally
      setSubmissionsList((prev) =>
        prev.map((sub) =>
          sub.id === submissionId
            ? {
                ...sub,
                grade: Number(inputs.grade) || 100,
                teacherFeedback: inputs.feedback || 'Ajoyib bajarilgan!',
                status: 'BAHOLANDI',
              }
            : sub
        )
      );
    } catch (err) {
      console.error('Error grading submission:', err);
    }
  };

  // Filter homeworks by selected group
  const filteredHomeworks = useMemo(() => {
    if (selectedGroupId === 'all') return homeworkList;
    return homeworkList.filter((h) => h.groupId === selectedGroupId);
  }, [homeworkList, selectedGroupId]);

  // Helper to get group students
  const getStudentsForGroup = (groupId: string): Student[] => {
    const group = allGroups.find((g) => g.id === groupId);
    if (group && group.studentGroups && group.studentGroups.length > 0) {
      return group.studentGroups.map((sg: any) => sg.student || sg).filter(Boolean);
    }
    // Fallback: match students with studentGroups pointing to this groupId
    return allStudents.filter((st: any) => {
      const sgList = st.studentGroups || st.student_groups || [];
      return sgList.some((sg: any) => sg.groupId === groupId);
    });
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>
            {dict.teacher?.homework || 'Uyga vazifa'}
          </h2>
          <p className={styles.pageSubtitle}>
            Guruhlar uchun topshiriqlar yaratish, o'quvchilar yechimlarini tekshirish va baholash
          </p>
        </div>

        {/* Group Filter Bar */}
        <div className={styles.groupFilterWrap}>
          <label className={styles.filterLabel}>
            {dict.teacher?.selectGroup || 'Guruh:'}
          </label>
          <select
            className={styles.groupSelect}
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            <option value="all">
              {dict.teacher?.allGroups || 'Barcha guruhlar'} ({homeworkList.length})
            </option>
            {allGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!HOMEWORK_ENABLED && (
        <div className={styles.errorAlert} style={{ marginBottom: '16px' }}>
          <AlertCircle size={16} />
          <span>{HOMEWORK_OFF_NOTICE}</span>
        </div>
      )}

      <div className={styles.contentGrid}>
        {/* Left Col: Create Homework Form */}
        <div className={styles.createCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderIcon}>
              <Plus size={18} />
            </div>
            <h3 className={styles.cardTitle}>
              {dict.teacher?.createHomework || 'Yangi uyga vazifa berish'}
            </h3>
          </div>

          {errorMessage && (
            <div className={styles.errorAlert}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {saveSuccess && (
            <div className={styles.successAlert}>
              <CheckCircle size={16} />
              <span>Vazifa saqlandi va o'quvchilarga yuborildi!</span>
            </div>
          )}

          {/* Target Group Selector */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {dict.teacher?.selectGroup || 'Guruhni tanlang'}
            </label>
            <select
              className={styles.fieldInput}
              value={targetGroupId}
              onChange={(e) => setTargetGroupId(e.target.value)}
            >
              {allGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {dict.teacher?.homeworkTitle || 'Vazifa mavzusi'} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className={styles.fieldInput}
              placeholder="Masalan: React Props va State amaliy mashg'ulot"
              value={hwTitle}
              onChange={(e) => setHwTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {dict.teacher?.homeworkDesc || 'Topshiriq shartlari va tavsifi'}
            </label>
            <textarea
              className={styles.fieldTextarea}
              placeholder="Vazifa bo'yicha aniq ko'rsatmalar, talablar va havolalar..."
              value={hwDesc}
              onChange={(e) => setHwDesc(e.target.value)}
              rows={4}
            />
          </div>

          {/* Deadline */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {(dict.teacher as any)?.deadline || 'Topshirish muddati'}
            </label>
            <input
              type="datetime-local"
              className={styles.fieldInput}
              value={hwDeadline}
              onChange={(e) => setHwDeadline(e.target.value)}
            />
          </div>

          {/* File Attachment */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {(dict.teacher as any)?.attachedFile || 'Fayl biriktirish (ixtiyoriy)'}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {!attachedFile ? (
              <div
                className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => HOMEWORK_ENABLED && fileInputRef.current?.click()}
              >
                <UploadCloud size={28} className={styles.dropZoneIcon} />
                <div style={{ textAlign: 'center' }}>
                  <span className={styles.dropZoneText}>
                    Faylni tanlash uchun bosing yoki shu yerga tashlang
                  </span>
                  <span className={styles.dropZoneSub}>
                    PDF, DOCX, ZIP, XLSX, JPG, PNG (maksimal 50MB)
                  </span>
                </div>
              </div>
            ) : (
              <div className={styles.attachedCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  {getFileIcon(attachedFile.name)}
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.attachedFileName} title={attachedFile.name}>
                      {attachedFile.name}
                    </div>
                    <div className={styles.attachedFileSize}>
                      {formatFileSize(attachedFile.size)} • <CheckCircle size={11} color="#16a34a" /> Fayl tanlandi
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.removeFileBtn}
                  onClick={handleRemoveFile}
                  title="O'chirish"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Save Button */}
          <button
            type="button"
            className={styles.saveHwBtn}
            onClick={handleSaveHomework}
            disabled={isSaving || !HOMEWORK_ENABLED}
          >
            {isSaving ? 'Saqlanmoqda...' : 'Vazifani yuborish'}
          </button>
        </div>

        {/* Right Col: Homework List & Student Submissions */}
        <div className={styles.listCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderIcon}>
              <BookOpen size={18} />
            </div>
            <h3 className={styles.cardTitle}>
              {dict.teacher?.homeworkList || 'Berilgan uyga vazifalar'} ({filteredHomeworks.length})
            </h3>
          </div>

          {filteredHomeworks.length === 0 ? (
            <div className={styles.emptyState}>
              <BookOpen size={42} className={styles.emptyIcon} />
              <p className={styles.emptyText}>
                Hozircha ushbu guruh uchun uyga vazifalar belgilanmagan.
              </p>
            </div>
          ) : (
            <div className={styles.hwItemsList}>
              {filteredHomeworks.map((hw) => {
                const isExpanded = expandedHwId === hw.id;
                const hwSubs = submissionsList.filter((s) => s.hwId === hw.id);
                const groupStudents = getStudentsForGroup(hw.groupId);
                const submittedStudentIds = new Set(hwSubs.map((s) => s.studentId));
                const notSubmittedStudents = groupStudents.filter(
                  (st) => !submittedStudentIds.has(st.id)
                );

                return (
                  <div key={hw.id} className={styles.hwItem}>
                    <div className={styles.hwItemHeader}>
                      <div className={styles.hwItemHeaderMain}>
                        <div className={styles.hwBadgesRow}>
                          <span className={styles.groupBadge}>
                            {hw.groupName}
                          </span>
                          {hw.courseName && (
                            <span className={styles.courseBadge}>
                              {hw.courseName}
                            </span>
                          )}
                          <span className={styles.dateBadge}>
                            <Calendar size={12} /> {hw.createdAt}
                          </span>
                        </div>
                        <h4 className={styles.hwTitle}>{hw.title}</h4>
                      </div>

                      <button
                        type="button"
                        className={styles.deleteHwBtn}
                        onClick={() => handleDeleteHomework(hw.id)}
                        title="O'chirish"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {hw.desc && <p className={styles.hwDesc}>{hw.desc}</p>}

                    {/* Deadline row */}
                    {hw.deadline && (
                      <div className={styles.deadlineRow}>
                        <Clock size={14} className={styles.clockIcon} />
                        <span className={styles.deadlineLabel}>Muddat:</span>
                        <span className={styles.deadlineValue}>{hw.deadline}</span>
                      </div>
                    )}

                    {/* Attached File Download Button */}
                    {hw.file && (
                      <div className={styles.downloadFileBox}>
                        <div className={styles.downloadFileInfo}>
                          {getFileIcon(hw.file.name)}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className={styles.downloadFileName} title={hw.file.name}>
                              {hw.file.name}
                            </div>
                            <span className={styles.downloadFileSize}>
                              {formatFileSize(hw.file.size)}
                            </span>
                          </div>
                        </div>

                        <a
                          href={hw.file.dataUrl}
                          download={hw.file.name}
                          className={styles.downloadBtn}
                          title="Yuklab olish"
                        >
                          <Download size={15} />
                          <span>Yuklab olish</span>
                        </a>
                      </div>
                    )}

                    {/* Student Submissions Summary Bar */}
                    <div className={styles.submissionsSummaryBar}>
                      <div className={styles.summaryBadges}>
                        <span className={styles.badgeDone}>
                          <CheckCircle2 size={13} /> {hwSubs.length} ta topshirdi
                        </span>
                        {groupStudents.length > 0 && (
                          <span className={styles.badgePending}>
                            <AlertCircle size={13} /> {notSubmittedStudents.length} ta topshirmadi
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        className={styles.submissionsToggleBtn}
                        onClick={() => setExpandedHwId(isExpanded ? null : hw.id)}
                      >
                        <Users size={14} />
                        <span>
                          {isExpanded ? "Javoblarni yashirish" : `Natijalar & Baholash (${hwSubs.length})`}
                        </span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>

                    {/* Expanded Submissions Section */}
                    {isExpanded && (
                      <div className={styles.submissionsSection}>
                        <div className={styles.subSectionTitle}>
                          <CheckCircle2 size={16} color="#10b981" />
                          <span>Topshirgan o'quvchilar ({hwSubs.length} ta):</span>
                        </div>

                        {hwSubs.length === 0 ? (
                          <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
                            Hozircha hech bir o'quvchi bu vazifani topshirmadi.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {hwSubs.map((sub) => {
                              const currentInput = gradingInputs[sub.id] || {
                                grade: String(sub.grade ?? 100),
                                feedback: sub.teacherFeedback || '',
                              };

                              return (
                                <div key={sub.id} className={styles.submissionCard}>
                                  <div className={styles.subCardHeader}>
                                    <div>
                                      <div className={styles.subStudentName}>{sub.studentName}</div>
                                      {sub.studentPhone && (
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                                          {sub.studentPhone}
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <span
                                        style={{
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          padding: '2px 8px',
                                          borderRadius: '6px',
                                          background: sub.status === 'BAHOLANDI' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                          color: sub.status === 'BAHOLANDI' ? '#059669' : '#d97706',
                                        }}
                                      >
                                        {sub.status === 'BAHOLANDI' ? `✓ Baholandi: ${sub.grade} ball` : '⏱ Kutilmoqda'}
                                      </span>
                                      <div className={styles.subDate}>{sub.submittedAt}</div>
                                    </div>
                                  </div>

                                  {sub.submissionLink && (
                                    <a
                                      href={sub.submissionLink.startsWith('http') ? sub.submissionLink : `https://${sub.submissionLink}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={styles.subLinkBtn}
                                    >
                                      <ExternalLink size={13} />
                                      <span>O'quvchi yechimini ochish (Github / Havola)</span>
                                    </a>
                                  )}

                                  {sub.comment && (
                                    <p className={styles.subCommentText}>
                                      &quot;{sub.comment}&quot;
                                    </p>
                                  )}

                                  {/* Grading Form */}
                                  <div className={styles.gradingRow}>
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      placeholder="Baho (0-100)"
                                      value={currentInput.grade}
                                      onChange={(e) =>
                                        setGradingInputs((prev) => ({
                                          ...prev,
                                          [sub.id]: { ...currentInput, grade: e.target.value },
                                        }))
                                      }
                                      className={styles.gradeInput}
                                    />
                                    <input
                                      type="text"
                                      placeholder="Ustoz fikri yoki izohi..."
                                      value={currentInput.feedback}
                                      onChange={(e) =>
                                        setGradingInputs((prev) => ({
                                          ...prev,
                                          [sub.id]: { ...currentInput, feedback: e.target.value },
                                        }))
                                      }
                                      className={styles.feedbackInput}
                                    />
                                    <button
                                      type="button"
                                      className={styles.saveGradeBtn}
                                      onClick={() => handleGradeSubmission(sub.id)}
                                      disabled={!HOMEWORK_ENABLED}
                                    >
                                      Baholash
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Not submitted students */}
                        {notSubmittedStudents.length > 0 && (
                          <div style={{ marginTop: '10px' }}>
                            <div className={styles.subSectionTitle} style={{ color: '#ef4444', marginBottom: '8px' }}>
                              <AlertCircle size={15} />
                              <span>Hali topshirmagan o'quvchilar ({notSubmittedStudents.length} ta):</span>
                            </div>
                            <div className={styles.notSubmittedList}>
                              {notSubmittedStudents.map((st) => (
                                <span key={st.id} className={styles.notSubmittedBadge}>
                                  ✕ {st.firstName} {st.lastName}
                                  {st.phone && <span style={{ opacity: 0.7 }}>({st.phone})</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
