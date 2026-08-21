'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Table, Column } from '../components/ui/Table/Table';
import { Button } from '../components/ui/Button/Button';
import { Modal } from '../components/ui/Modal/Modal';
import { Input } from '../components/ui/Input/Input';
import { Select } from '../components/ui/Select/Select';
import { Badge } from '../components/ui/Badge/Badge';
import { useToast } from '../components/ui/Toast/Toast';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';
import { expensesApi } from '../api/expenses.api';
import { Expense } from '../types';
import { formatMoney } from '../utils/formatMoney';
import { formatDate } from '../utils/formatDate';

export const FinanceExpenses: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    type: 'IJARA' as any,
    ownerName: '',
    status: 'TOLANGAN' as any,
    note: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', pagination.page, pagination.limit, debouncedSearch, pagination.sortBy, pagination.order],
    queryFn: () =>
      expensesApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        sortBy: pagination.sortBy,
        order: pagination.order,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      selectedExpense
        ? expensesApi.update(selectedExpense.id, payload)
        : expensesApi.create(payload),
    onSuccess: () => {
      success(selectedExpense ? 'Chiqim tahrirlandi' : 'Yangi chiqim qo\'shildi');
      handleCloseModal();
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Saqlashda xatolik');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => {
      success('Chiqim o\'chirildi');
      setDeleteExpenseId(null);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'O\'chirishda xatolik');
    },
  });

  const handleOpenModal = (expense?: Expense) => {
    if (expense) {
      setSelectedExpense(expense);
      setFormData({
        date: expense.date ? expense.date.split('T')[0] : '',
        amount: expense.amount.toString(),
        type: expense.type,
        ownerName: expense.ownerName || '',
        status: expense.status,
        note: expense.note || '',
      });
    } else {
      setSelectedExpense(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        type: 'IJARA',
        ownerName: '',
        status: 'TOLANGAN',
        note: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedExpense(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.type) {
      error('Summa va turini kiriting');
      return;
    }
    saveMutation.mutate({
      ...formData,
      amount: Number(formData.amount),
    });
  };

  const columns: Column<Expense>[] = [
    {
      key: 'date',
      header: 'SANA',
      sortable: true,
      render: (row) => formatDate(row.date),
    },
    {
      key: 'amount',
      header: 'QIYMAT',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--danger-text)' }}>
          {formatMoney(row.amount)}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'TURI',
      render: (row) => (
        <Badge variant="secondary">
          {row.type === 'USTOZ_MAOSHI'
            ? 'USTOZ MAOSHI'
            : row.type}
        </Badge>
      ),
    },
    {
      key: 'ownerName',
      header: 'EGASI',
      render: (row) => row.ownerName || '-',
    },
    {
      key: 'status',
      header: 'HOLATI',
      render: (row) => (
        <Badge variant={row.status === 'TOLANGAN' ? 'success' : 'danger'}>
          {row.status === 'TOLANGAN' ? 'TO\'LANGAN' : 'KUTILMOQDA'}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: 'ACTION',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenModal(row);
            }}
          >
            <Edit2 size={14} />
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteExpenseId(row.id);
            }}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Chiqimlar</h2>
        <Button icon={<Plus size={16} />} onClick={() => handleOpenModal()}>
          YANGI CHIQIM
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedExpense ? 'Chiqimni tahrirlash' : 'Yangi Chiqim Qo\'shish'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Chiqim sanasi"
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />

          <Input
            label="Qiymat / Summa (so'm)"
            type="number"
            required
            placeholder="1200000"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          />

          <Select
            label="Chiqim turi"
            required
            options={[
              { label: 'IJARA', value: 'IJARA' },
              { label: 'KOMMUNAL', value: 'KOMMUNAL' },
              { label: 'REKLAMA', value: 'REKLAMA' },
              { label: 'USTOZ MAOSHI', value: 'USTOZ_MAOSHI' },
              { label: 'BOSHQA', value: 'BOSHQA' },
            ]}
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
          />

          <Input
            label="Egasi / Qabul qiluvchi"
            placeholder="Bino egasi / REK"
            value={formData.ownerName}
            onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
          />

          <Select
            label="Holati"
            required
            options={[
              { label: 'TO\'LANGAN', value: 'TOLANGAN' },
              { label: 'KUTILMOQDA', value: 'KUTILMOQDA' },
            ]}
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
          />

          <Input
            label="Izoh (ixtiyoriy)"
            placeholder="Avgust oyi ijara haqi"
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Bekor qilish
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteExpenseId}
        onClose={() => setDeleteExpenseId(null)}
        title="Chiqimni o'chirish"
      >
        <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
          Haqiqatan ham bu chiqimni o'chirmoqchimisiz?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button variant="secondary" onClick={() => setDeleteExpenseId(null)}>
            Yo'q
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => deleteExpenseId && deleteMutation.mutate(deleteExpenseId)}
          >
            Ha, o'chirish
          </Button>
        </div>
      </Modal>
    </div>
  );
};
