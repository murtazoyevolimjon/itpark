'use client';

import React, { useState, useEffect } from 'react';
import { Check, Plus, BookOpen } from 'lucide-react';
import styles from './SubjectSelect.module.css';

export interface SubjectItem {
  id: string;
  name: string;
  tag: string;
  color: string;
  bg: string;
}

export const PREDEFINED_SUBJECTS: SubjectItem[] = [
  { id: 'fe', name: 'Frontend', tag: 'FE', color: '#c084fc', bg: 'rgba(168, 85, 247, 0.18)' },
  { id: 'be', name: 'Backend', tag: 'BE', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.18)' },
  { id: 'mat', name: 'Matematika', tag: 'MAT', color: '#818cf8', bg: 'rgba(99, 102, 241, 0.18)' },
  { id: 'ing', name: 'Ingliz tili', tag: 'ING', color: '#34d399', bg: 'rgba(16, 185, 129, 0.18)' },
  { id: 'ks', name: 'Kompyuter savodxonligi', tag: 'KS', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.18)' },
  { id: 'rus', name: 'Rus tili', tag: 'RUS', color: '#fb923c', bg: 'rgba(249, 115, 22, 0.18)' },
  { id: 'gd', name: 'Grafik dizayn', tag: 'GD', color: '#f472b6', bg: 'rgba(236, 72, 153, 0.18)' },
  { id: 'ai', name: "AI (Sun'iy intellekt)", tag: 'AI', color: '#22d3ee', bg: 'rgba(6, 182, 212, 0.18)' },
  { id: 'ona', name: 'Ona tili', tag: 'ONA', color: '#2dd4bf', bg: 'rgba(20, 184, 166, 0.18)' },
];

/**
 * Validates that the subject name is a genuine subject and not gibberish or numbers
 */
export const validateSubjectName = (name: string): { isValid: boolean; error?: string } => {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return { isValid: false, error: "Iltimos, o'quvchi qaysi fanga kelishini tanlang yoki kiriting" };
  }
  if (trimmed.length < 2) {
    return { isValid: false, error: "Fan nomi kamida 2 ta harfdan iborat bo'lishi kerak" };
  }
  if (/^\d+$/.test(trimmed)) {
    return { isValid: false, error: "Fan nomi faqat raqamlardan iborat bo'lishi mumkin emas" };
  }
  const letters = trimmed.match(/[a-zA-Zа-яА-ЯёЁўЎқҚғҒҳҲ]/g);
  if (!letters || letters.length < 2) {
    return { isValid: false, error: "Iltimos, to'g'ri fan nomini kiriting" };
  }
  return { isValid: true };
};

export interface SubjectSelectProps {
  label?: string;
  required?: boolean;
  value?: string;
  onChange: (subject: string) => void;
  error?: string;
  className?: string;
}

export const SubjectSelect: React.FC<SubjectSelectProps> = ({
  label = 'Qaysi fanga keladi? (Fan)',
  required = true,
  value = '',
  onChange,
  error,
  className = '',
}) => {
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [customSubject, setCustomSubject] = useState('');

  // Synchronize state with incoming value
  useEffect(() => {
    if (!value) {
      setIsOtherSelected(false);
      setCustomSubject('');
      return;
    }

    const matched = PREDEFINED_SUBJECTS.find(
      (s) => s.name.toLowerCase() === value.trim().toLowerCase()
    );

    if (matched) {
      setIsOtherSelected(false);
      setCustomSubject('');
    } else {
      setIsOtherSelected(true);
      setCustomSubject(value);
    }
  }, [value]);

  const handleSelectPredefined = (subj: SubjectItem) => {
    setIsOtherSelected(false);
    setCustomSubject('');
    onChange(subj.name);
  };

  const handleSelectOther = () => {
    setIsOtherSelected(true);
    onChange(customSubject);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomSubject(val);
    onChange(val);
  };

  return (
    <div className={`${styles.container} ${className}`}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}

      {/* Grid of subjects */}
      <div className={styles.grid}>
        {PREDEFINED_SUBJECTS.map((s) => {
          const isSelected = !isOtherSelected && value?.toLowerCase() === s.name.toLowerCase();
          return (
            <button
              key={s.id}
              type="button"
              className={`${styles.subjectCard} ${isSelected ? styles.subjectCardActive : ''}`}
              onClick={() => handleSelectPredefined(s)}
            >
              <span
                className={styles.tag}
                style={{ color: s.color, backgroundColor: s.bg }}
              >
                {s.tag}
              </span>
              <span className={styles.subjectName} title={s.name}>
                {s.name}
              </span>
              {isSelected && <Check size={14} className={styles.checkIcon} />}
            </button>
          );
        })}

        {/* Other subject option */}
        <button
          type="button"
          className={`${styles.subjectCard} ${styles.otherCard} ${
            isOtherSelected ? styles.subjectCardActive : ''
          }`}
          onClick={handleSelectOther}
        >
          <Plus size={14} style={{ color: 'var(--text-muted)' }} />
          <span className={styles.subjectName}>+ Boshqa fan</span>
          {isOtherSelected && <Check size={14} className={styles.checkIcon} />}
        </button>
      </div>

      {/* Custom Subject Input if other is chosen */}
      {isOtherSelected && (
        <div className={styles.customInputWrapper}>
          <input
            type="text"
            className={styles.customInput}
            placeholder="Fan nomini kiriting (masalan: Robototexnika, Fizika, Kimyo)..."
            value={customSubject}
            onChange={handleCustomChange}
            autoFocus
          />
        </div>
      )}

      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};
