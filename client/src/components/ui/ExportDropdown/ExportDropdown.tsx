'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '../Button/Button';
import styles from './ExportDropdown.module.css';

interface ExportDropdownProps {
  onExportExcel: () => void;
  onExportPdf: () => void;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  onExportExcel,
  onExportPdf,
  label = 'Yuklab olish',
  size = 'md',
  variant = 'outline',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleExcel = () => {
    setIsOpen(false);
    onExportExcel();
  };

  const handlePdf = () => {
    setIsOpen(false);
    onExportPdf();
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <Button
        type="button"
        size={size}
        variant={variant}
        icon={<Download size={size === 'sm' ? 14 : 16} />}
        onClick={() => setIsOpen((prev) => !prev)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        <span>{label}</span>
        <ChevronDown
          size={14}
          style={{
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </Button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          <button type="button" className={styles.menuItem} onClick={handleExcel}>
            <div className={styles.iconWrapper} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <FileSpreadsheet size={16} />
            </div>
            <div className={styles.itemContent}>
              <span className={styles.itemTitle}>Excel (.xlsx)</span>
              <span className={styles.itemSubtitle}>Jadval shaklida</span>
            </div>
          </button>

          <button type="button" className={styles.menuItem} onClick={handlePdf}>
            <div className={styles.iconWrapper} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              <FileText size={16} />
            </div>
            <div className={styles.itemContent}>
              <span className={styles.itemTitle}>PDF (.pdf)</span>
              <span className={styles.itemSubtitle}>Hisobot shaklida</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
