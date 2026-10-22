'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Briefcase } from 'lucide-react';
import { Table, Column } from '../components/ui/Table/Table';
import { Card } from '../components/ui/Card/Card';
import { Button } from '../components/ui/Button/Button';
import { Modal } from '../components/ui/Modal/Modal';
import { Input } from '../components/ui/Input/Input';
import { Badge } from '../components/ui/Badge/Badge';
import { EmptyState } from '../components/ui/EmptyState/EmptyState';
import { useToast } from '../components/ui/Toast/Toast';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';
import { useLanguage } from '../hooks/useLanguage';
import { employeesApi } from '../api/employees.api';
import { Employee } from '../types';
import { formatPhone, unmaskPhone } from '../utils/phoneMask';
import { formatMoney } from '../utils/formatMoney';

export const Employees: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { t, dict } = useLanguage();
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    position: '',
    salary: '',
    hiredAt: new Date().toISOString().split('T')[0],
    status: 'FAOL',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['employees', pagination.page, pagination.limit, debouncedSearch, pagination.sortBy, pagination.order],
    queryFn: () =>
      employeesApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        sortBy: pagination.sortBy,
        order: pagination.order,
      }),
    placeholderData: keepPreviousData,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      selectedEmployee
        ? employeesApi.update(selectedEmployee.id, payload)
        : employeesApi.create(payload),
    onSuccess: () => {
      success(selectedEmployee ? 'Xodim tahrirlandi' : 'Yangi xodim qo\'shildi');
      handleCloseModal();
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Saqlashda xatolik');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => employeesApi.delete(id),
    onSuccess: () => {
      success('Xodim o\'chirildi');
      setDeleteEmployeeId(null);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'O\'chirishda xatolik');
    },
  });

  const handleOpenModal = (employee?: Employee) => {
    if (employee) {
      setSelectedEmployee(employee);
      setFormData({
        firstName: employee.firstName,
        lastName: employee.lastName,
        phone: employee.phone,
        position: employee.position,
        salary: employee.salary.toString(),
        hiredAt: employee.hiredAt ? employee.hiredAt.split('T')[0] : '',
        status: employee.status,
      });
    } else {
      setSelectedEmployee(null);
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        position: '',
        salary: '',
        hiredAt: new Date().toISOString().split('T')[0],
        status: 'FAOL',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.position || !formData.salary) {
      error('Barcha majburiy maydonlarni to\'ldiring');
      return;
    }
    saveMutation.mutate({
      ...formData,
      phone: unmaskPhone(formData.phone),
      salary: Number(formData.salary),
    });
  };

  const columns: Column<Employee>[] = [
    {
      key: 'name',
      header: 'ISM FAMILIYA',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 600 }}>
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    {
      key: 'position',
      header: dict.employeesPage?.colPosition || 'LAVOZIM',
      render: (row) => row.position,
    },
    {
      key: 'phone',
      header: dict.employeesPage?.colPhone || 'TELEFON',
      render: (row) => formatPhone(row.phone),
    },
    {
      key: 'salary',
      header: dict.employeesPage?.colSalary || 'MAOSH',
      render: (row) => formatMoney(row.salary),
    },
    {
      key: 'status',
      header: dict.employeesPage?.colStatus || 'HOLATI',
      render: (row) => (
        <Badge variant={row.status === 'FAOL' ? 'success' : 'danger'}>
          {row.status === 'FAOL' ? (dict.employeesPage?.statusActive || 'FAOL') : (dict.employeesPage?.statusInactive || 'NOFAOL')}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: dict.employeesPage?.colAction || 'AMALLAR',
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
              setDeleteEmployeeId(row.id);
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
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{dict.employeesPage?.title || t('employees')}</h2>
        <Button icon={<Plus size={16} />} onClick={() => handleOpenModal()}>
          {dict.employeesPage?.newEmployee || "XODIM QO'SHISH"}
        </Button>
      </div>

      {!isLoading && data?.data?.length === 0 ? (
        <Card style={{ padding: '48px' }}>
          <EmptyState
            title={dict.employeesPage?.emptyTitle || "Malumot bo'sh"}
            description={dict.employeesPage?.emptyDesc || "Hozircha o'quv markazingizga birorta ham xodim qo'shilmagan."}
            icon={<Briefcase size={40} color="var(--primary)" />}
            action={
              <Button icon={<Plus size={16} />} onClick={() => handleOpenModal()}>
                {dict.employeesPage?.newEmployee || "XODIM QO'SHISH"}
              </Button>
            }
          />
        </Card>
      ) : (
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
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedEmployee ? 'Xodimni tahrirlash' : 'Xodim Qo\'shish'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label={dict.employeesPage?.firstName || "Ism"}
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <Input
              label={dict.employeesPage?.lastName || "Familiya"}
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>

          <Input
            label={dict.employeesPage?.position || "Lavozim"}
            required
            placeholder="Administrator / Menejer"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          />

          <Input
            label={dict.employeesPage?.phone || "Telefon"}
            required
            placeholder="+998 90 123 45 67"
            value={formatPhone(formData.phone)}
            onChange={(e) => setFormData({ ...formData, phone: unmaskPhone(e.target.value) })}
          />

          <Input
            label={dict.employeesPage?.salary || "Maosh summasi"}
            type="number"
            required
            placeholder="3500000"
            value={formData.salary}
            onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
          />

          <Input
            label={dict.employeesPage?.hiredAt || "Ishga qabul qilingan sana"}
            type="date"
            required
            value={formData.hiredAt}
            onChange={(e) => setFormData({ ...formData, hiredAt: e.target.value })}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              {t('cancel')}
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              {t('save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteEmployeeId}
        onClose={() => setDeleteEmployeeId(null)}
        title={t('delete')}
      >
        <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
          {dict.employeesPage?.deleteConfirm || "Haqiqatan ham bu xodimni o'chirmoqchimisiz?"}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button variant="secondary" onClick={() => setDeleteEmployeeId(null)}>
            {t('no')}
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => deleteEmployeeId && deleteMutation.mutate(deleteEmployeeId)}
          >
            {t('yes')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
