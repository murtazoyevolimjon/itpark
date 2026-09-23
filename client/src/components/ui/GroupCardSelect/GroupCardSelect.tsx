'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Calendar, Users, X } from 'lucide-react';
import styles from './GroupCardSelect.module.css';

export interface GroupCardSelectProps {
  label?: string;
  required?: boolean;
  groups: any[];
  value?: string;
  onChange: (groupId: string, group?: any) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  allowEmpty?: boolean;
  emptyOptionLabel?: string;
  disabled?: boolean;
  inline?: boolean;
  className?: string;
  id?: string;
}

export interface CourseBadgeConfig {
  tag: string;
  color: string;
  bg: string;
  border: string;
}

/**
 * Maps course / group names to the exact badges & colors seen in Image 2
 */
export const getCourseBadge = (courseName?: string, groupName?: string): CourseBadgeConfig => {
  const text = `${courseName || ''} ${groupName || ''}`.toLowerCase();

  // 1. Kompyuter savodxonligi -> KS (Blue)
  if (text.includes('kompyuter') || text.includes('savodxon')) {
    return { tag: 'KS', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.18)', border: '#3b82f6' };
  }
  // 2. Frontend / React / Web -> FE (Purple)
  if (text.includes('front') || text.includes('react') || text.includes('html') || text.includes('css')) {
    return { tag: 'FE', color: '#c084fc', bg: 'rgba(168, 85, 247, 0.18)', border: '#a855f7' };
  }
  // 3. Dasturlash / Backend / Foundation -> DAS (Amber/Gold)
  if (text.includes('dasturlash') || text.includes('back') || text.includes('node') || text.includes('python') || text.includes('foundation')) {
    return { tag: 'DAS', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.18)', border: '#f59e0b' };
  }
  // 4. Ingliz tili -> ING (Green/Emerald)
  if (text.includes('ingliz') || text.includes('english')) {
    return { tag: 'ING', color: '#34d399', bg: 'rgba(16, 185, 129, 0.18)', border: '#10b981' };
  }
  // 5. Rus tili -> RUS (Orange)
  if (text.includes('rus')) {
    return { tag: 'RUS', color: '#fb923c', bg: 'rgba(249, 115, 22, 0.18)', border: '#f97316' };
  }
  // 6. Grafik dizayn -> GD (Pink)
  if (text.includes('grafik') || text.includes('dizayn') || text.includes('design') || text.includes('photoshop')) {
    return { tag: 'GD', color: '#f472b6', bg: 'rgba(236, 72, 153, 0.18)', border: '#ec4899' };
  }
  // 7. Matematika -> MAT (Indigo)
  if (text.includes('matematika') || text.includes('math')) {
    return { tag: 'MAT', color: '#818cf8', bg: 'rgba(99, 102, 241, 0.18)', border: '#6366f1' };
  }
  // 8. SMM / Marketing -> SMM (Rose)
  if (text.includes('smm') || text.includes('market')) {
    return { tag: 'SMM', color: '#fb7185', bg: 'rgba(244, 63, 94, 0.18)', border: '#f43f5e' };
  }
  // 9. Kiberxavfsizlik -> KIB (Cyan)
  if (text.includes('kiber') || text.includes('security')) {
    return { tag: 'KIB', color: '#22d3ee', bg: 'rgba(6, 182, 212, 0.18)', border: '#06b6d4' };
  }
  // 10. Robototexnika -> ROB (Teal)
  if (text.includes('robot')) {
    return { tag: 'ROB', color: '#2dd4bf', bg: 'rgba(20, 184, 166, 0.18)', border: '#14b8a6' };
  }

  // Fallback generation based on words
  const raw = (courseName || groupName || 'Guruh').trim();
  const words = raw.split(/\s+/).filter(Boolean);
  let tag = 'GUR';
  if (words.length >= 2) {
    tag = (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1 && words[0].length >= 3) {
    tag = words[0].slice(0, 3).toUpperCase();
  }

  return { tag, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.18)', border: '#0ea5e9' };
};

/**
 * Extracts and formats the start time (e.g. "16:00")
 */
export const getGroupTime = (startTime?: string, groupName?: string): string => {
  if (startTime) {
    return startTime.slice(0, 5);
  }
  if (groupName) {
    const match = groupName.match(/^(\d{1,2}:\d{2})/);
    if (match) return match[1].padStart(5, '0');
  }
  return '--:--';
};

/**
 * Removes redundant leading times like "16:00 " from the group title
 */
export const cleanGroupTitle = (name?: string, courseName?: string): string => {
  if (!name) return courseName || 'Guruh';
  const cleaned = name.replace(/^\d{1,2}:\d{2}\s*/, '').trim();
  if (cleaned.length > 0) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return name;
};

/**
 * Formats group days dynamically.
 * Converts DUSH, CHOR, JU -> "Dush-Chor-Juma"
 * Converts SESH, PAY, SHAN -> "Sesh-Pay-Shan"
 * Handles any changes made by the admin.
 */
export const formatGroupDays = (rawDays?: any, groupName?: string): { text: string; variant: 'odd' | 'even' | 'other' } => {
  let daysArray: string[] = [];

  if (Array.isArray(rawDays)) {
    daysArray = rawDays;
  } else if (typeof rawDays === 'string') {
    const trimmed = rawDays.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) daysArray = parsed;
      } catch (e) {
        daysArray = trimmed.slice(1, -1).split(',').map((s) => s.replace(/['"]/g, '').trim());
      }
    } else if (trimmed.includes(',')) {
      daysArray = trimmed.split(',').map((s) => s.trim());
    } else if (trimmed) {
      daysArray = [trimmed];
    }
  }

  if (daysArray.length > 0) {
    const upperDays = daysArray.map((d) => String(d).toUpperCase().trim());

    // Standard Dush-Chor-Juma
    const isOdd =
      upperDays.length === 3 &&
      upperDays.includes('DUSH') &&
      upperDays.includes('CHOR') &&
      (upperDays.includes('JU') || upperDays.includes('JUMA'));

    if (isOdd) {
      return { text: 'Dush-Chor-Juma', variant: 'odd' };
    }

    // Standard Sesh-Pay-Shan
    const isEven =
      upperDays.length === 3 &&
      upperDays.includes('SESH') &&
      upperDays.includes('PAY') &&
      upperDays.includes('SHAN');

    if (isEven) {
      return { text: 'Sesh-Pay-Shan', variant: 'even' };
    }

    const dayNameMap: Record<string, string> = {
      DUSH: 'Dush',
      SESH: 'Sesh',
      CHOR: 'Chor',
      PAY: 'Pay',
      JU: 'Juma',
      JUMA: 'Juma',
      SHAN: 'Shan',
      YAK: 'Yak',
    };

    const order = ['DUSH', 'SESH', 'CHOR', 'PAY', 'JU', 'JUMA', 'SHAN', 'YAK'];
    const sorted = [...upperDays].sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    const formatted = sorted.map((d) => dayNameMap[d] || d).join('-');
    return { text: formatted || 'Dush-Chor-Juma', variant: 'other' };
  }

  // Fallback to group name if days array is not set
  if (groupName) {
    const lower = groupName.toLowerCase();
    if (lower.includes('dush') || lower.includes('chor') || lower.includes('jum')) {
      return { text: 'Dush-Chor-Juma', variant: 'odd' };
    }
    if (lower.includes('sesh') || lower.includes('pay') || lower.includes('shan')) {
      return { text: 'Sesh-Pay-Shan', variant: 'even' };
    }
  }

  return { text: 'Dush-Chor-Juma', variant: 'odd' };
};

export const GroupCardSelect: React.FC<GroupCardSelectProps> = ({
  label,
  required,
  groups = [],
  value,
  onChange,
  placeholder = '-- Yangi guruhni tanlang --',
  searchPlaceholder = "Guruh, fan yoki o'qituvchi bo'yicha qidirish...",
  allowEmpty = false,
  emptyOptionLabel = "Guruhsiz (Proba / Sinov darsi)",
  disabled = false,
  inline = false,
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (inline) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inline]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 60);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Find currently selected group
  const selectedGroup = useMemo(() => {
    if (!value) return null;
    return groups.find((g) => String(g.id) === String(value)) || null;
  }, [groups, value]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const query = searchQuery.toLowerCase().trim();

    return groups.filter((g) => {
      const name = (g.name || '').toLowerCase();
      const course = (g.course?.name || '').toLowerCase();
      const teacher = `${g.teacher?.firstName || ''} ${g.teacher?.lastName || ''}`.toLowerCase();
      const time = (g.startTime || '').toLowerCase();
      const days = Array.isArray(g.days) ? g.days.join(' ').toLowerCase() : '';

      return (
        name.includes(query) ||
        course.includes(query) ||
        teacher.includes(query) ||
        time.includes(query) ||
        days.includes(query)
      );
    });
  }, [groups, searchQuery]);

  const handleSelectGroup = (groupId: string, group?: any) => {
    onChange(groupId, group);
    if (!inline) {
      setIsOpen(false);
    }
  };

  /**
   * Renders a single group card matching Image 2
   */
  const renderCard = (group: any, isSelected: boolean, isPreview: boolean = false) => {
    const isProbaEmpty = group.id === '__empty__';
    const badgeConfig = isProbaEmpty
      ? { tag: 'PRO', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', border: '#64748b' }
      : getCourseBadge(group.course?.name, group.name);

    const timeStr = isProbaEmpty ? '--:--' : getGroupTime(group.startTime, group.name);
    const titleStr = isProbaEmpty ? (emptyOptionLabel || 'Guruhsiz') : cleanGroupTitle(group.name, group.course?.name);

    let teacherStr = "O'qituvchi biriktirilmagan";
    if (isProbaEmpty) {
      teacherStr = "Sinov darsi / biriktirilmagan";
    } else if (group.teacher) {
      teacherStr = `${group.teacher.firstName} ${group.teacher.lastName}`.trim();
    } else if (group.course?.name) {
      teacherStr = group.course.name;
    }

    const daysInfo = isProbaEmpty
      ? { text: 'Sinov', variant: 'other' as const }
      : formatGroupDays(group.days, group.name);

    const variantClass =
      daysInfo.variant === 'odd'
        ? styles.weekdayOdd
        : daysInfo.variant === 'even'
        ? styles.weekdayEven
        : styles.weekdayOther;

    return (
      <div
        key={group.id}
        className={`${styles.groupCard} ${isSelected ? styles.groupCardSelected : ''} ${isPreview ? styles.selectedCardPreview : ''}`}
        style={{ borderLeftColor: badgeConfig.border }}
        onClick={isPreview ? undefined : () => handleSelectGroup(isProbaEmpty ? '' : group.id, isProbaEmpty ? null : group)}
      >
        <div className={styles.cardLeft}>
          {/* Time Pill */}
          <div className={styles.timePill}>{timeStr}</div>

          {/* Info Column */}
          <div className={styles.infoCol}>
            <div
              className={styles.courseTag}
              style={{
                color: badgeConfig.color,
                backgroundColor: badgeConfig.bg,
              }}
            >
              {badgeConfig.tag}
            </div>
            <div className={styles.groupTitle} title={group.name}>
              {titleStr}
            </div>
            <div className={styles.teacherName} title={teacherStr}>
              {teacherStr}
            </div>
          </div>
        </div>

        {/* Right Section: Weekday Badge (replaces dots) */}
        <div className={styles.cardRight}>
          <div className={`${styles.weekdayBadge} ${variantClass}`}>
            <Calendar size={12} />
            <span>{daysInfo.text}</span>
          </div>

          {isSelected && !isPreview && (
            <div className={styles.checkIndicator}>
              <Check size={13} strokeWidth={3} />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`${styles.wrapper} ${className}`} ref={wrapperRef}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}

      {/* INLINE MODE */}
      {inline ? (
        <div className={styles.inlineContainer}>
          <div className={styles.searchBox}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className={styles.cardsList}>
            {allowEmpty &&
              renderCard(
                { id: '__empty__', name: emptyOptionLabel, days: [], startTime: '' },
                !value
              )}

            {filteredGroups.length === 0 ? (
              <div className={styles.emptyState}>Guruhlar topilmadi</div>
            ) : (
              filteredGroups.map((g) => renderCard(g, String(g.id) === String(value)))
            )}
          </div>
        </div>
      ) : (
        /* DROPDOWN MODE */
        <>
          <button
            type="button"
            id={id}
            disabled={disabled}
            className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''} ${disabled ? styles.triggerDisabled : ''}`}
            onClick={() => setIsOpen((prev) => !prev)}
          >
            {selectedGroup ? (
              renderCard(selectedGroup, false, true)
            ) : allowEmpty && !value ? (
              renderCard({ id: '__empty__', name: emptyOptionLabel, days: [], startTime: '' }, false, true)
            ) : (
              <div className={styles.placeholder}>
                <Users size={18} />
                <span>{placeholder}</span>
              </div>
            )}

            <ChevronDown
              size={18}
              className={`${styles.chevronIcon} ${isOpen ? styles.chevronOpen : ''}`}
            />
          </button>

          {isOpen && (
            <div className={styles.dropdown}>
              <div className={styles.searchBox}>
                <Search size={15} className={styles.searchIcon} />
                <input
                  ref={searchInputRef}
                  type="text"
                  className={styles.searchInput}
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className={styles.cardsList}>
                {allowEmpty &&
                  renderCard(
                    { id: '__empty__', name: emptyOptionLabel, days: [], startTime: '' },
                    !value
                  )}

                {filteredGroups.length === 0 ? (
                  <div className={styles.emptyState}>Guruhlar topilmadi</div>
                ) : (
                  filteredGroups.map((g) => renderCard(g, String(g.id) === String(value)))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
