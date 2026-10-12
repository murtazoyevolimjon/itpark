'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, ChevronDown, Check, AlertCircle, Lock } from 'lucide-react';

export interface LessonItem {
  id: string;
  title: string;
  desc?: string;
  createdAt?: string;
}

export interface LessonTopicSelectProps {
  groupId: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  required?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  lastLessonTopic?: string;
  pastTopics?: { title: string; date?: string }[];
}

export const LessonTopicSelect: React.FC<LessonTopicSelectProps> = ({
  groupId,
  value,
  onChange,
  disabled = false,
  placeholder = "Dars mavzusini tanlang yoki yozing...",
  label = "Dars mavzusi",
  required = true,
  hasError = false,
  errorMessage,
  lastLessonTopic,
  pastTopics = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load and merge topics for this group (past attendances + local storage)
  useEffect(() => {
    if (!groupId) return;
    const combined: LessonItem[] = [];
    const seen = new Set<string>();

    // 1. Add past attendance topics if provided (newest first)
    if (pastTopics && Array.isArray(pastTopics)) {
      pastTopics.forEach((pt, idx) => {
        const title = pt.title ? pt.title.trim() : '';
        if (title && !seen.has(title)) {
          seen.add(title);
          combined.push({
            id: `past-${idx}`,
            title,
            createdAt: pt.date,
          });
        }
      });
    }

    // 2. Add from localStorage group_lessons_
    try {
      const saved = localStorage.getItem(`group_lessons_${groupId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any, idx: number) => {
            const title = item.title ? item.title.trim() : '';
            if (title && !seen.has(title)) {
              seen.add(title);
              combined.push({
                id: item.id || `local-${idx}`,
                title,
                createdAt: item.createdAt,
              });
            }
          });
        }
      }
    } catch {}

    // 3. Fallback defaults if completely empty
    if (combined.length === 0) {
      combined.push(
        { id: '2', title: "1-Mavzu: Asosiy tushunchalar va amaliyot", createdAt: "10.10.2026" },
        { id: '1', title: "Kirish: Kurs strukturasi va qoidalar", createdAt: "05.10.2026" }
      );
    }

    setLessons(combined);
  }, [groupId, pastTopics]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectTopic = (title: string) => {
    onChange(title);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {label && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '6px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <label
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: hasError ? '#ef4444' : '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{label}</span>
            {required && !disabled && (
              <span
                style={{
                  color: '#ef4444',
                  fontSize: '11px',
                  fontWeight: 800,
                  background: 'rgba(239, 68, 68, 0.12)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                }}
              >
                * Majburiy
              </span>
            )}
            {disabled && (
              <span
                style={{
                  color: '#d97706',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: 'rgba(245, 158, 11, 0.12)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Lock size={11} /> Qulflangan
              </span>
            )}
          </label>

          {/* Right badge: Oxirgi dars yoki mavzular soni */}
          {!disabled && lastLessonTopic ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#0d9488', fontWeight: 600 }}>
              <BookOpen size={12} />
              <span>Oxirgi dars: <strong>{lastLessonTopic}</strong></span>
            </div>
          ) : (
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
              {lessons.length} ta mavzu mavjud
            </span>
          )}
        </div>
      )}

      {/* Input container */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onClick={() => {
            if (!disabled) setIsOpen(true);
          }}
          style={{
            width: '100%',
            height: '46px',
            padding: disabled ? '0 16px' : '0 42px 0 16px',
            borderRadius: '14px',
            border: hasError
              ? '1.5px solid #ef4444'
              : isOpen
              ? '1.5px solid #0d9488'
              : disabled
              ? '1px solid rgba(226, 232, 240, 0.8)'
              : '1px solid rgba(226, 232, 240, 0.95)',
            background: disabled
              ? 'rgba(241, 245, 249, 0.75)'
              : hasError
              ? 'rgba(254, 242, 242, 0.7)'
              : '#ffffff',
            fontSize: '14px',
            fontWeight: disabled ? 700 : 500,
            color: disabled ? '#0f172a' : '#1e293b',
            outline: 'none',
            boxShadow: hasError
              ? '0 0 0 3px rgba(239, 68, 68, 0.2)'
              : isOpen
              ? '0 0 0 3px rgba(13, 148, 136, 0.18)'
              : '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />

        {!disabled && (
          <div
            onClick={() => {
              if (!disabled) setIsOpen(!isOpen);
            }}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: `translateY(-50%) rotate(${isOpen ? '180deg' : '0deg'})`,
              transition: 'transform 0.2s ease',
              color: hasError ? '#ef4444' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
            }}
          >
            <ChevronDown size={18} />
          </div>
        )}
      </div>

      {/* Error message */}
      {hasError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#ef4444',
            fontSize: '12px',
            fontWeight: 700,
            marginTop: '6px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <AlertCircle size={14} />
          <span>{errorMessage || "Dars mavzusini tanlash yoki yozish majburiy! Mavzusiz davomat olib bo'lmaydi."}</span>
        </div>
      )}

      {/* Floating Popup Dropdown when clicked */}
      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid rgba(226, 232, 240, 0.95)',
            boxShadow: '0 16px 36px rgba(15, 23, 42, 0.14)',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              background: '#f8fafc',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0d9488', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={14} /> Mavzuni bosing yoki o'zingiz yangi yozing:
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {lessons.length} ta mavzu
            </span>
          </div>

          <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '6px' }}>
            {lessons.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Hozircha saqlangan mavzular yo'q. Yuqoridagi maydonga dars mavzusini qo'lda yozing.
              </div>
            ) : (
              lessons.map((lesson, idx) => {
                const isSelected = value.trim() === lesson.title.trim();
                return (
                  <div
                    key={lesson.id || idx}
                    onClick={() => handleSelectTopic(lesson.title)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(204, 251, 241, 0.6)' : 'transparent',
                      color: isSelected ? '#0f766e' : '#1e293b',
                      transition: 'background 0.15s ease',
                      marginBottom: '2px',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          background: isSelected ? '#0d9488' : '#e2e8f0',
                          color: isSelected ? '#ffffff' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: isSelected ? 700 : 600 }}>
                          {lesson.title}
                        </div>
                        {lesson.createdAt && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                            {lesson.createdAt}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={16} color="#0d9488" strokeWidth={2.5} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
