import React from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Pagination } from '../Pagination/Pagination';
import { Skeleton } from '../Skeleton/Skeleton';
import { EmptyState } from '../EmptyState/EmptyState';
import { useLanguage } from '../../../hooks/useLanguage';
import styles from './Table.module.css';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
  isLoading?: boolean;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onSearchChange?: (search: string) => void;
  onSortChange?: (col: string, newOrder: 'asc' | 'desc') => void;
  onRowClick?: (row: T) => void;
}

export function Table<T extends { id: string }>({
  columns,
  data,
  total = 0,
  page = 1,
  limit = 20,
  search = '',
  sortBy,
  order = 'asc',
  isLoading = false,
  onPageChange,
  onLimitChange,
  onSearchChange,
  onSortChange,
  onRowClick,
}: TableProps<T>) {
  const { t } = useLanguage();

  return (
    <div className={styles.container}>
      {/* Search & Limit Control Bar */}
      {(onSearchChange || onLimitChange) && (
        <div className={styles.toolbar}>
          {onSearchChange && (
            <div className={styles.searchWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder={t('search')}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          )}

          {onLimitChange && (
            <div className={styles.limitWrapper}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {t('showing')}:
              </span>
              <select
                className={styles.limitSelect}
                value={limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Table Body */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.sortable ? styles.sortableHeader : ''}
                  onClick={() =>
                    col.sortable &&
                    onSortChange &&
                    onSortChange(col.key, order === 'asc' ? 'desc' : 'asc')
                  }
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className={styles.sortIcon}>
                        {sortBy === col.key ? (
                          order === 'asc' ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          )
                        ) : (
                          <ArrowUpDown size={14} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      <Skeleton height="20px" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState title={t('empty')} description={t('emptySub')} />
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick && onRowClick(row)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {onPageChange && total > 0 && (
        <Pagination
          page={page}
          limit={limit}
          total={total}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
