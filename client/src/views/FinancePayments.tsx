'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CreditCard, DollarSign } from 'lucide-react';
import { Table, Column } from '../components/ui/Table/Table';
import { Button } from '../components/ui/Button/Button';
import { Modal } from '../components/ui/Modal/Modal';
import { Input } from '../components/ui/Input/Input';
import { Select } from '../components/ui/Select/Select';
import { Badge } from '../components/ui/Badge/Badge';
import { useToast } from '../components/ui/Toast/Toast';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';
import { paymentsApi } from '../api/payments.api';
import { studentsApi } from '../api/students.api';
import { Payment } from '../types';
import { formatMoney } from '../utils/formatMoney';
import { formatDate } from '../utils/formatDate';

export const FinancePayments: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'NAQD',
    status: 'TOLANGAN',
  });

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

  const { data: students } = useQuery({
    queryKey: ['studentsSelect'],
    queryFn: () => studentsApi.getAll({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => paymentsApi.create(payload),
    onSuccess: () => {
      success("To'lov muvaffaqiyatli qabul qilindi!");
      setIsModalOpen(false);
      setFormData({
        studentId: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        method: 'NAQD',
        status: 'TOLANGAN',
      });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceStats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "To'lov saqlashda xatolik yuz berdi");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const studentId = formData.studentId || students?.data?.[0]?.id || '';
    if (!studentId || !formData.amount) {
      error("Talaba va to'lov summasini kiriting");
      return;
    }

    createMutation.mutate({
      ...formData,
      studentId,
      amount: Number(formData.amount),
    });
  };

  const columns: Column<Payment>[] = [
    {
      key: 'student',
      header: 'TALABA',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>
          {row.student ? `${row.student.firstName} ${row.student.lastName}` : '-'}
        </span>
      ),
    },
    {
      key: 'receivedBy',
      header: 'QABUL QILDI',
      render: (row) => row.receivedBy?.fullName || 'Administrator',
    },
    {
      key: 'amount',
      header: 'SUMMA',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 700, color: '#10b981' }}>
          {formatMoney(row.amount)}
        </span>
      ),
    },
    {
      key: 'paymentDate',
      header: "TO'LOV SANASI",
      sortable: true,
      render: (row) => formatDate(row.paymentDate),
    },
    {
      key: 'method',
      header: "TO'LOV USULI",
      render: (row) => (
        <Badge variant="secondary">
          {row.method || 'NAQD'}
        </Badge>
      ),
    },
    {
      key: 'course',
      header: 'KURS / GURUH',
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
            ? "TO'LANGAN"
            : row.status === 'QISMAN'
            ? 'QISMAN'
            : "TO'LANMAGAN"}
        </Badge>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>To'lovlar Tarixi</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            O'quv markaziga amalga oshirilgan barcha to'lovlar jurnali
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
          To'lov qabul qilish
        </Button>
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

      {/* Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="To'lov qabul qilish"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Select
            label="Talaba"
            required
            options={
              students?.data?.map((s) => ({
                label: `${s.firstName} ${s.lastName} (${s.phone})`,
                value: s.id,
              })) || []
            }
            value={formData.studentId}
            onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
          />

          <Input
            label="Summa (so'mda)"
            type="number"
            required
            placeholder="500000"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          />

          <Select
            label="To'lov turi"
            options={[
              { label: 'Naqd pul', value: 'NAQD' },
              { label: 'Plastik karta (Click/Payme)', value: 'KARTA' },
              { label: "Bank o'tkazmasi", value: 'OTKAZMA' },
            ]}
            value={formData.method}
            onChange={(e) => setFormData({ ...formData, method: e.target.value })}
          />

          <Input
            label="To'lov sanasi"
            type="date"
            required
            value={formData.paymentDate}
            onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
