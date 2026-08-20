import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../../hooks/useLanguage';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  limit,
  total,
  onPageChange,
}) => {
  const { t } = useLanguage();
  const totalPages = Math.ceil(total / limit) || 1;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className={styles.container}>
      <div className={styles.info}>
        {startItem}-{endItem} {t('itemsShown')} <strong>{total}</strong>
      </div>

      <div className={styles.controls}>
        <button
          className={styles.btn}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} />
        </button>

        <span className={styles.pageIndicator}>
          {page} / {totalPages}
        </span>

        <button
          className={styles.btn}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
