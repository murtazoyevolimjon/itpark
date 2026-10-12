'use client';

import React, { useState } from 'react';
import { useStudentPortal, StudentHomeworkItem } from '../../hooks/useStudentPortal';
import {
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  FileText,
  FileArchive,
  Download,
  ExternalLink,
  Send,
  Star,
  MessageSquare,
  Sparkles,
  Search,
  Filter,
  Check,
} from 'lucide-react';
import styles from './StudentHomework.module.css';

export const StudentHomework: React.FC = () => {
  const { homeworks, submissions, submitHomework, group } = useStudentPortal();

  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'SUBMITTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHw, setSelectedHw] = useState<StudentHomeworkItem | null>(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionComment, setSubmissionComment] = useState('');
  const [submitSuccessNotice, setSubmitSuccessNotice] = useState(false);

  // Filter homeworks
  const filteredHw = homeworks.filter((hw) => {
    const isSubmitted = !!submissions[hw.id];
    if (filterTab === 'PENDING' && isSubmitted) return false;
    if (filterTab === 'SUBMITTED' && !isSubmitted) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        hw.title.toLowerCase().includes(q) ||
        hw.desc.toLowerCase().includes(q) ||
        (hw.courseName && hw.courseName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenSubmitModal = (hw: StudentHomeworkItem) => {
    setSelectedHw(hw);
    const existing = submissions[hw.id];
    if (existing) {
      setSubmissionLink(existing.submissionLink || '');
      setSubmissionComment(existing.comment || '');
    } else {
      setSubmissionLink('');
      setSubmissionComment('');
    }
    setSubmitSuccessNotice(false);
  };

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHw || !submissionLink.trim()) return;

    submitHomework(selectedHw.id, submissionLink.trim(), submissionComment.trim());
    setSubmitSuccessNotice(true);
    setTimeout(() => {
      setSelectedHw(null);
      setSubmitSuccessNotice(false);
    }, 1200);
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={styles.container}>
      {/* 1. Header Banner */}
      <section className={styles.headerSection}>
        <div className={styles.headerText}>
          <div className={styles.pageBadge}>
            <BookOpen size={13} />
            <span>Amaliy topshiriqlar</span>
          </div>
          <h1 className={styles.title}>Uyga vazifalar</h1>
          <p className={styles.subtitle}>
            Ustoz tomonidan berilgan vazifalarni o'z vaqtida topshiring, +50 XP va IT-Coins ballarini qo'lga kiriting!
          </p>
        </div>

        {/* Stats Pill */}
        <div className={styles.hwStatsCard}>
          <div className={styles.statsPillItem}>
            <span className={styles.statsNum}>{homeworks.length}</span>
            <span className={styles.statsLabel}>Jami vazifalar</span>
          </div>
          <div className={styles.statsDivider} />
          <div className={styles.statsPillItem}>
            <span className={styles.statsNumGreen}>
              {Object.keys(submissions).length}
            </span>
            <span className={styles.statsLabel}>Topshirilgan</span>
          </div>
          <div className={styles.statsDivider} />
          <div className={styles.statsPillItem}>
            <span className={styles.statsNumOrange}>
              {Math.max(0, homeworks.length - Object.keys(submissions).length)}
            </span>
            <span className={styles.statsLabel}>Kutilmoqda</span>
          </div>
        </div>
      </section>

      {/* 2. Controls & Tabs Bar */}
      <section className={styles.controlsBar}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Vazifa nomi yoki talablari bo'yicha qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterPills}>
          <button
            className={`${styles.filterPill} ${filterTab === 'ALL' ? styles.filterPillActive : ''}`}
            onClick={() => setFilterTab('ALL')}
          >
            Barchasi ({homeworks.length})
          </button>
          <button
            className={`${styles.filterPill} ${filterTab === 'PENDING' ? styles.filterPillActive : ''}`}
            onClick={() => setFilterTab('PENDING')}
          >
            ⏱ Kutilmoqda ({Math.max(0, homeworks.length - Object.keys(submissions).length)})
          </button>
          <button
            className={`${styles.filterPill} ${filterTab === 'SUBMITTED' ? styles.filterPillActive : ''}`}
            onClick={() => setFilterTab('SUBMITTED')}
          >
            ✓ Topshirilgan ({Object.keys(submissions).length})
          </button>
        </div>
      </section>

      {/* 3. Homework Cards Grid */}
      <section className={styles.hwGrid}>
        {filteredHw.length === 0 ? (
          <div className={styles.emptyCard}>
            <BookOpen size={40} className={styles.emptyIcon} />
            <h3>Ushbu toifada vazifalar topilmadi</h3>
            <p>Ustoz yangi topshiriq biriktirganida bu yerda darhol aks etadi.</p>
          </div>
        ) : (
          filteredHw.map((hw) => {
            const sub = submissions[hw.id];
            const isDone = !!sub;

            return (
              <div key={hw.id} className={styles.hwCard}>
                <div className={styles.hwCardHeader}>
                  <div className={styles.hwHeaderTags}>
                    <span className={styles.courseTag}>
                      {hw.courseName || group?.course?.name || 'Frontend'}
                    </span>
                    <span className={styles.xpTag}>+50 XP • 5 Coins</span>
                  </div>

                  <span
                    className={isDone ? styles.statusBadgeDone : styles.statusBadgePending}
                  >
                    {isDone ? '✓ Topshirildi' : '⏱ Kutilmoqda'}
                  </span>
                </div>

                <h3 className={styles.hwTitle}>{hw.title}</h3>
                <p className={styles.hwDesc}>{hw.desc}</p>

                {/* Attached File by Teacher */}
                {hw.file && (
                  <a
                    href={hw.file.dataUrl}
                    download={hw.file.name}
                    className={styles.attachedFileBox}
                  >
                    <FileText size={18} className={styles.fileIcon} />
                    <div className={styles.fileMeta}>
                      <span className={styles.fileName}>{hw.file.name}</span>
                      <span className={styles.fileSize}>
                        {formatFileSize(hw.file.size)}
                      </span>
                    </div>
                    <Download size={16} className={styles.downloadIcon} />
                  </a>
                )}

                <div className={styles.hwMetaRow}>
                  <div className={styles.deadlineContainer}>
                    <Clock size={14} className={styles.clockIcon} />
                    <span>Muddati: <strong>{hw.deadline}</strong></span>
                  </div>
                  <span className={styles.createdDateText}>Berildi: {hw.createdAt}</span>
                </div>

                {/* Graded Feedback Box if available */}
                {isDone && sub.grade && (
                  <div className={styles.feedbackBox}>
                    <div className={styles.gradeHeader}>
                      <Star size={15} className={styles.starIcon} />
                      <span>Baholandi: <strong>{sub.grade}/100</strong></span>
                    </div>
                    {sub.teacherFeedback && (
                      <p className={styles.feedbackText}>{sub.teacherFeedback}</p>
                    )}
                  </div>
                )}

                {/* Bottom Actions */}
                <div className={styles.hwCardFooter}>
                  {isDone ? (
                    <button
                      onClick={() => handleOpenSubmitModal(hw)}
                      className={styles.btnViewSub}
                    >
                      Topshirilgan javobni ko'rish / Yangilash
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenSubmitModal(hw)}
                      className={styles.btnSubmit}
                    >
                      <Send size={15} />
                      <span>Vazifani topshirish</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* 4. Homework Submit Modal */}
      {selectedHw && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setSelectedHw(null)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalBadge}>Topshiriq topshirish</div>
              <button
                className={styles.closeBtn}
                onClick={() => setSelectedHw(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSubmit} className={styles.modalForm}>
              <h3 className={styles.modalHwTitle}>{selectedHw.title}</h3>
              <p className={styles.modalHwDesc}>{selectedHw.desc}</p>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Loyiha havolasi (GitHub, Figma, Vercel yoki Google Drive) *
                </label>
                <div className={styles.inputWrap}>
                  <ExternalLink size={16} className={styles.inputIcon} />
                  <input
                    type="url"
                    required
                    placeholder="https://github.com/username/project"
                    value={submissionLink}
                    onChange={(e) => setSubmissionLink(e.target.value)}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Ustoz uchun izoh yoki savol (ixtiyoriy)
                </label>
                <textarea
                  rows={3}
                  placeholder="Vazifani bajarishda duch kelgan qiyinchiliklar yoki izohlaringiz..."
                  value={submissionComment}
                  onChange={(e) => setSubmissionComment(e.target.value)}
                  className={styles.formTextarea}
                />
              </div>

              {submitSuccessNotice && (
                <div className={styles.successAlert}>
                  <CheckCircle2 size={16} />
                  <span>Vazifangiz muvaffaqiyatli saqlandi va ustozga yuborildi!</span>
                </div>
              )}

              <div className={styles.modalBtnRow}>
                <button
                  type="button"
                  onClick={() => setSelectedHw(null)}
                  className={styles.btnCancel}
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className={styles.btnConfirmSubmit}
                >
                  <Send size={15} />
                  <span>Topshirishni tasdiqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
