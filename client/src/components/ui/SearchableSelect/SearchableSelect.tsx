'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check, User, Phone } from 'lucide-react';
import styles from './SearchableSelect.module.css';

export interface SearchableSelectOption {
  value: string | number;
  label: string;
  subLabel?: string;
  phone?: string;
  avatarText?: string;
  badge?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  label?: string;
  required?: boolean;
  options: SearchableSelectOption[];
  value?: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  emptyMessage?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  required,
  options = [],
  value,
  onChange,
  placeholder = 'Tanlang...',
  searchPlaceholder = "Qidirish (ism, familiya yoki telefon)...",
  error,
  disabled = false,
  className = '',
  id,
  emptyMessage = "Talaba topilmadi",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);

  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

  // Selected Option
  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value));
  }, [options, value]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;

    const query = searchQuery.toLowerCase().trim();
    const queryDigits = query.replace(/\D/g, '');

    return options.filter((opt) => {
      const labelMatch = opt.label.toLowerCase().includes(query);
      const subLabelMatch = opt.subLabel?.toLowerCase().includes(query);
      const badgeMatch = opt.badge?.toLowerCase().includes(query);

      let phoneMatch = false;
      if (opt.phone || opt.subLabel) {
        const phoneDigits = (opt.phone || opt.subLabel || '').replace(/\D/g, '');
        if (queryDigits && phoneDigits.includes(queryDigits)) {
          phoneMatch = true;
        }
      }

      return labelMatch || subLabelMatch || badgeMatch || phoneMatch;
    });
  }, [options, searchQuery]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setFocusedIndex(-1);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex >= 0 && optionsListRef.current) {
      const list = optionsListRef.current;
      const element = list.children[focusedIndex] as HTMLElement;
      if (element) {
        element.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          const opt = filteredOptions[focusedIndex];
          if (!opt.disabled) {
            onChange(String(opt.value));
            setIsOpen(false);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (opt: SearchableSelectOption) => {
    if (opt.disabled) return;
    onChange(String(opt.value));
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const getInitials = (label: string, fallback?: string) => {
    if (fallback) return fallback;
    const parts = label.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return label.slice(0, 2).toUpperCase() || 'U';
  };

  return (
    <div className={`${styles.wrapper} ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}

      <div className={styles.control}>
        <button
          type="button"
          id={selectId}
          className={[
            styles.trigger,
            isOpen ? styles.isOpen : '',
            error ? styles.hasError : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {selectedOption ? (
            <div className={styles.selectedContent}>
              <div className={styles.avatar}>
                {getInitials(selectedOption.label, selectedOption.avatarText)}
              </div>
              <div className={styles.selectedInfo}>
                <span className={styles.selectedLabel}>{selectedOption.label}</span>
                {selectedOption.subLabel && (
                  <span className={styles.selectedSubLabel}>{selectedOption.subLabel}</span>
                )}
                {selectedOption.badge && (
                  <span className={styles.selectedBadge}>{selectedOption.badge}</span>
                )}
              </div>
            </div>
          ) : (
            <span className={styles.placeholder}>{placeholder}</span>
          )}

          <div className={styles.actions}>
            {selectedOption && !disabled && (
              <span
                role="button"
                tabIndex={0}
                className={styles.clearBtn}
                onClick={handleClear}
                onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
                title="Tozalash"
              >
                <X size={14} />
              </span>
            )}
            <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
              <ChevronDown size={16} />
            </span>
          </div>
        </button>

        {isOpen && (
          <div className={styles.dropdown} role="listbox">
            {/* Search Input Box */}
            <div className={styles.searchBox} onClick={(e) => e.stopPropagation()}>
              <span className={styles.searchIcon}>
                <Search size={15} />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className={styles.searchInput}
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusedIndex(0);
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  title="Qidiruvni tozalash"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Results count header */}
            <div className={styles.countHeader}>
              <span>
                {filteredOptions.length === 0
                  ? 'Natija yo\'q'
                  : `${filteredOptions.length} ta natija`}
              </span>
              {searchQuery && (
                <span>Filtr faol</span>
              )}
            </div>

            {/* Options List */}
            <div className={styles.optionsList} ref={optionsListRef}>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, idx) => {
                  const isSelected = String(opt.value) === String(value);
                  const isFocused = idx === focusedIndex;

                  return (
                    <div
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      className={[
                        styles.option,
                        isSelected ? styles.optionSelected : '',
                        isFocused ? styles.optionFocused : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => handleSelect(opt)}
                      onMouseEnter={() => setFocusedIndex(idx)}
                    >
                      <div className={styles.optionMain}>
                        <div className={styles.optionAvatar}>
                          {getInitials(opt.label, opt.avatarText)}
                        </div>
                        <div className={styles.optionText}>
                          <span className={styles.optionLabel}>{opt.label}</span>
                          <div className={styles.optionMeta}>
                            {opt.subLabel && (
                              <span className={styles.optionPhone}>
                                <Phone size={11} />
                                {opt.subLabel}
                              </span>
                            )}
                            {opt.badge && (
                              <span className={styles.optionBadge}>{opt.badge}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <span className={styles.checkIcon}>
                          <Check size={16} />
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyState}>
                  <Search size={22} className={styles.emptyIcon} />
                  <span className={styles.emptyTitle}>{emptyMessage}</span>
                  <span className={styles.emptySubtitle}>
                    "{searchQuery}" bo'yicha hech qanday talaba topilmadi
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};
