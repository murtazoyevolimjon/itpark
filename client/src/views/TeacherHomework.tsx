'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../hooks/useLanguage';
import { groupsApi } from '../api/groups.api';
import { Group } from '../types';
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
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch groups
  const { data: groupsData, isLoading: isGroupsLoading } = useQuery({
    queryKey: ['teacherGroupsList'],
    queryFn: () => groupsApi.getAll({ limit: 100 }),
  });

  const allGroups: Group[] = groupsData?.data || [];

  // Set default targetGroupId when groups load
  useEffect(() => {
    if (allGroups.length > 0 && !targetGroupId) {
      setTargetGroupId(allGroups[0].id);
    }
  }, [allGroups, targetGroupId]);

  // Load homeworks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('all_teacher_homeworks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHomeworkList(parsed);
          return;
        }
      }

      // Default sample homeworks if empty
      const samples: HomeworkItem[] = [
        {
          id: 'hw-sample-1',
          groupId: allGroups[0]?.id || 'g1',
          groupName: allGroups[0]?.name || 'Dush-Chor-Juma 16:00 FRONTEND',
          courseName: 'Frontend',
          title: "React Components & Props amaliy mashg'ulot",
          desc: "Figma dizayni bo'yicha Header va Sidebar komponentlarini yarating, prop turlarini tekshiring va responsivlikni ta'minlang.",
          deadline: '2026-10-15 20:00',
          createdAt: '10.10.2026',
        },
      ];
      setHomeworkList(samples);
      localStorage.setItem('all_teacher_homeworks', JSON.stringify(samples));
    } catch {
      // ignore
    }
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
    if (file) processFile(file);
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save new homework
  const handleSaveHomework = () => {
    if (!hwTitle.trim()) {
      setErrorMessage(dict.teacher?.homeworkTitlePlaceholder || 'Vazifa mavzusini kiriting');
      return;
    }
    const targetGroup = allGroups.find((g) => g.id === targetGroupId) || allGroups[0];

    const newHw: HomeworkItem = {
      id: 'hw-' + Date.now(),
      groupId: targetGroup?.id || 'g-custom',
      groupName: targetGroup?.name || 'Guruh',
      courseName: targetGroup?.course?.name,
      title: hwTitle.trim(),
      desc: hwDesc.trim(),
      deadline: hwDeadline || 'Muddati belgilanmagan',
      file: attachedFile,
      createdAt: new Date().toLocaleDateString('uz-UZ'),
    };

    const updated = [newHw, ...homeworkList];
    setHomeworkList(updated);
    try {
      localStorage.setItem('all_teacher_homeworks', JSON.stringify(updated));
      if (newHw.groupId) {
        localStorage.setItem(`group_homeworks_${newHw.groupId}`, JSON.stringify(updated));
      }
    } catch {
      // ignore
    }

    // Reset form
    setHwTitle('');
    setHwDesc('');
    setHwDeadline('');
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setErrorMessage('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Delete homework
  const handleDeleteHomework = (id: string) => {
    const updated = homeworkList.filter((item) => item.id !== id);
    setHomeworkList(updated);
    try {
      localStorage.setItem('all_teacher_homeworks', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Filter homeworks by selected group
  const filteredHomeworks = useMemo(() => {
    if (selectedGroupId === 'all') return homeworkList;
    return homeworkList.filter((h) => h.groupId === selectedGroupId);
  }, [homeworkList, selectedGroupId]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>
            {dict.teacher?.homework || 'Uyga vazifa'}
          </h2>
          <p className={styles.pageSubtitle}>
            Guruhlar uchun topshiriqlar yaratish va materiallarni biriktirish
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
              <span>Vazifa muvaffaqiyatli saqlandi va o'quvchilarga yuborildi!</span>
            </div>
          )}

          {/* Target Group Selector */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {dict.teacher?.selectGroup || 'Guruhni tanlang'}
            </label>
            <select
              className={styles.inputField}
              value={targetGroupId}
              onChange={(e) => setTargetGroupId(e.target.value)}
            >
              {allGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} {g.course?.name ? `(${g.course.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {dict.teacher?.homeworkTitle || 'Vazifa mavzusi'}
            </label>
            <input
              type="text"
              className={styles.inputField}
              placeholder={dict.teacher?.homeworkTitlePlaceholder || "Masalan: 5-mavzu bo'yicha amaliy topshiriq"}
              value={hwTitle}
              onChange={(e) => setHwTitle(e.target.value)}
            />
          </div>

          {/* Deadline */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {dict.teacher?.homeworkDeadline || 'Topshirish muddati (Deadline)'}
            </label>
            <input
              type="datetime-local"
              className={styles.inputField}
              value={hwDeadline}
              onChange={(e) => setHwDeadline(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {dict.teacher?.homeworkDesc || 'Vazifa talablari va tavsifi'}
            </label>
            <textarea
              className={styles.textAreaField}
              rows={3}
              placeholder={dict.teacher?.homeworkDescPlaceholder || "Topshiriq shartlari, talablar va yo'riqnoma..."}
              value={hwDesc}
              onChange={(e) => setHwDesc(e.target.value)}
            />
          </div>

          {/* File Upload Dropzone (Req 1.2) */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {dict.teacher?.fileUploadTitle || 'Fayl biriktirish'}
            </label>

            {!attachedFile ? (
              <div
                className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <div className={styles.dropZoneIcon}>
                  <UploadCloud size={28} />
                </div>
                <div className={styles.dropZoneText}>
                  <span className={styles.dropZoneTitle}>
                    {dict.teacher?.fileUploadDesc || 'Faylni bu yerga sudrab tashlang yoki tanlang'}
                  </span>
                  <span className={styles.dropZoneSub}>
                    {dict.teacher?.fileUploadHint || 'PDF, DOCX, ZIP, XLSX, JPG, PNG (maksimal 50MB)'}
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
                      {formatFileSize(attachedFile.size)} • <CheckCircle size={11} color="#16a34a" /> {dict.teacher?.fileSelected || 'Yuklandi'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.removeFileBtn}
                  onClick={handleRemoveFile}
                  title={dict.teacher?.removeFile || "O'chirish"}
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
          >
            {dict.teacher?.saveLesson || 'Vazifani saqlash'}
          </button>
        </div>

        {/* Right Col: Homework List */}
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
                {dict.teacher?.noHomeworkYet || 'Hozircha ushbu guruh uchun uyga vazifalar belgilanmagan.'}
              </p>
            </div>
          ) : (
            <div className={styles.hwItemsList}>
              {filteredHomeworks.map((hw) => (
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
                      <span className={styles.deadlineLabel}>
                        {dict.teacher?.deadlineLabel || 'Muddat'}:
                      </span>
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
                        title={dict.teacher?.downloadFile || 'Yuklab olish'}
                      >
                        <Download size={15} />
                        <span>{dict.teacher?.downloadFile || 'Yuklab olish'}</span>
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
