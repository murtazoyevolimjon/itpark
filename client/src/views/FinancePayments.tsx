'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Column } from '../components/ui/Table/Table';
import { Badge } from '../components/ui/Badge/Badge';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';
import { paymentsApi } from '../api/payments.api';
import { Payment } from '../types';
import { formatMoney } from '../utils/formatMoney';
import { formatDate } from '../utils/formatDate';

export const FinancePayments: React.FC = () => {
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['payments', pagination.page, pagination.limit, debouncedSearch, pagination.sortBy, pagination.order],
    queryFn: () =>
      paymentsApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        sortBy: pagination.sortBy,
        order: pagination.order,
      }),
  });

  const columns: Column<Payment>[] = [
    {
      key: 'student',
      header: 'TALABA',
      render: (row) => (
        <span style={{ fontWeight: 600 }}>
          {row.student ? `${row.student.firstName} ${row.student.lastName}` : '-'}
        </span>
      ),
    },
    {
      key: 'receivedBy',
      header: 'QABUL QILDI',
      render: (row) => row.receivedBy?.fullName || 'Admin',
    },
    {
      key: 'amount',
      header: 'SUMMA',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--success-text)' }}>
          {formatMoney(row.amount)}
        </span>
      ),
    },
    {
      key: 'paymentDate',
      header: 'TO\'LOV SANASI',
      sortable: true,
      render: (row) => formatDate(row.paymentDate),
    },
    {
      key: 'course',
      header: 'KURS',
      render: (row) => row.course?.name || row.group?.name || '-',
    },
    {
      key: 'status',
      header: 'HOLATI',
      render: (row) => (
        <Badge
          variant={
            row.status === 'TOLANGAN'
              ? 'success'
              : row.status === 'QISMAN'
              ? 'warning'
              : 'danger'
          }
        >
          {row.status === 'TOLANGAN'
            ? 'TO\'LANGAN'
            : row.status === 'QISMAN'
            ? 'QISMAN'
            : 'TO\'LANMAGAN'}
        </Badge>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>To'lovlar Tarixi</h2>
      </div>

      <Table
        columns={columns}
        data={data?.data || []}
        total={data?.total || 0}
        page={pagination.page}
        limit={pagination.limit}
        search={pagination.search}
        sortBy={pagination.sortBy}
        order={pagination.order}
        isLoading={isLoading}
        onPageChange={pagination.setPage}
        onLimitChange={pagination.setLimit}
        onSearchChange={pagination.setSearch}
        onSortChange={pagination.handleSortChange}
      />
    </div>
  );
};
