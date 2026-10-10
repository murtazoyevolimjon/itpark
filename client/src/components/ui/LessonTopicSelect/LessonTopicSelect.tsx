'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, ChevronDown, Check, Sparkles } from 'lucide-react';

interface LessonItem {
  id: string;
  title: string;
  desc?: string;
  createdAt?: string;
}

interface LessonTopicSelectProps {
  groupId: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}

export const LessonTopicSelect: React.FC<LessonTopicSelectProps> = ({
  groupId,
  value,
  onChange,
  disabled = false,
  placeholder = "Dars mavzusini tanlang yoki yozing...",
  label = "Dars mavzusi (Ustiga bossangiz mavzular chiqadi)",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load lessons for this group (sorted newest first)
  useEffect(() => {
    if (!groupId) return;
    try {
      const saved = localStorage.getItem(`group_lessons_${groupId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLessons(parsed);
          // Auto prefill if value is empty
          if (!value && parsed[0]?.title) {
            onChange(parsed[0].title);
          }
          return;
        }
      }

      // Default sample topics if nothing entered yet
      const defaults: LessonItem[] = [
        { id: '2', title: "1-Mavzu: Asosiy tushunchalar va amaliyot", createdAt: "03.10.2026" },
        { id: '1', title: "Kirish: Kurs strukturasi va qoidalar", createdAt: "01.10.2026" },
      ];
      setLessons(defaults);
      if (!value) {
        onChange(defaults[0].title);
      }
    } catch {
      // ignore
    }
  }, [groupId]);

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
        <label
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 600,
            color: '#475569',
            marginBottom: '6px',
          }}
        >
          {label}
        </label>
      )}

      {/* Input container */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          cursor: disabled ? 'not-allowed' : 'pointer',
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
          style={{
            width: '100%',
            height: '44px',
            padding: '0 40px 0 16px',
            borderRadius: '14px',
            border: isOpen ? '1.5px solid #0d9488' : '1px solid rgba(226, 232, 240, 0.95)',
            background: disabled ? '#f8fafc' : '#ffffff',
            fontSize: '14px',
            fontWeight: 500,
            color: '#1e293b',
            outline: 'none',
            boxShadow: isOpen ? '0 0 0 3px rgba(13, 148, 136, 0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />

        <div
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: `translateY(-50%) rotate(${isOpen ? '180deg' : '0deg'})`,
            transition: 'transform 0.2s ease',
            color: '#64748b',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronDown size={18} />
        </div>
      </div>

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
            boxShadow: '0 16px 36px rgba(15, 23, 42, 0.12)',
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
              <BookOpen size={14} /> Kiritilgan mavzular (Oxirgilari birinchilikda):
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {lessons.length} ta mavzu
            </span>
          </div>

          <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '6px' }}>
            {lessons.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Hozircha guruh mavzulari kiritilmagan. Yuqorida xohlagan mavzuni yozishingiz mumkin.
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
