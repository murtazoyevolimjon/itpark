'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, FileSpreadsheet, FileText } from 'lucide-react';
import { Table, Column } from '../components/ui/Table/Table';
import { Button } from '../components/ui/Button/Button';
import { ExportDropdown } from '../components/ui/ExportDropdown/ExportDropdown';
import { Modal } from '../components/ui/Modal/Modal';
import { Input } from '../components/ui/Input/Input';
import { Select } from '../components/ui/Select/Select';
import { Badge } from '../components/ui/Badge/Badge';
import { useToast } from '../components/ui/Toast/Toast';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';
import { teachersApi } from '../api/teachers.api';
import { Teacher } from '../types';
import { formatPhone, unmaskPhone } from '../utils/phoneMask';
import { formatMoney } from '../utils/formatMoney';
import { exportToExcel, exportToPdf } from '../utils/exportData';

export const Teachers: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [deleteTeacherId, setDeleteTeacherId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    passportSeries: '',
    salaryType: 'FIXED' as 'FIXED' | 'PERCENT',
    salaryValue: '',
    status: 'FAOL',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['teachers', pagination.page, pagination.limit, debouncedSearch, pagination.sortBy, pagination.order],
    queryFn: () =>
      teachersApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        sortBy: pagination.sortBy,
        order: pagination.order,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      selectedTeacher
        ? teachersApi.update(selectedTeacher.id, payload)
        : teachersApi.create(payload),
    onSuccess: () => {
      success(selectedTeacher ? 'Ustoz tahrirlandi' : 'Yangi ustoz qo\'shildi');
      handleCloseModal();
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Saqlashda xatolik');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => teachersApi.delete(id),
    onSuccess: () => {
      success('Ustoz o\'chirildi');
      setDeleteTeacherId(null);
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'O\'chirishda xatolik');
    },
  });

  const handleOpenModal = (teacher?: Teacher) => {
    if (teacher) {
      setSelectedTeacher(teacher);
      setFormData({
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        phone: teacher.phone,
        passportSeries: teacher.passportSeries || '',
        salaryType: teacher.salaryType,
        salaryValue: teacher.salaryValue.toString(),
        status: teacher.status,
      });
    } else {
      setSelectedTeacher(null);
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        passportSeries: '',
        salaryType: 'FIXED',
        salaryValue: '',
        status: 'FAOL',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTeacher(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.salaryValue) {
      error('Barcha majburiy maydonlarni to\'ldiring');
      return;
    }
    saveMutation.mutate({
      ...formData,
      phone: unmaskPhone(formData.phone),
      salaryValue: Number(formData.salaryValue),
    });
  };

  const columns: Column<Teacher>[] = [
    {
      key: 'name',
      header: 'ISM FAMILYA',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 600 }}>
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'TELEFON',
      render: (row) => formatPhone(row.phone),
    },
    {
      key: 'salary',
      header: 'MAOSH',
      render: (row) =>
        row.salaryType === 'FIXED'
          ? formatMoney(row.salaryValue)
          : `${row.salaryValue}% (Foiz)`,
    },
    {
      key: 'groupsCount',
      header: 'GURUHLAR',
      render: (row) => `${row._count?.groups || 0} ta`,
    },
    {
      key: 'status',
      header: 'HOLATI',
      render: (row) => (
        <Badge variant={row.status === 'FAOL' ? 'success' : 'danger'}>
          {row.status}
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
              setDeleteTeacherId(row.id);
            }}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  const handleExportExcel = () => {
    if (!data?.data || data.data.length === 0) {
      error("Yuklab olish uchun ma'lumot mavjud emas");
      return;
    }

    const exportColumns = [
      { header: 'Ism Familya', key: 'name' },
      { header: 'Telefon', key: 'phone' },
      { header: 'Passport seriya', key: 'passportSeries' },
      { header: 'Maosh turi', key: 'salaryType' },
      { header: 'Maosh miqdori / foizi', key: 'salary' },
      { header: 'Guruhlar soni', key: 'groupsCount' },
      { header: 'Holati', key: 'status' },
    ];

    const exportRows = data.data.map((t) => ({
      name: `${t.firstName} ${t.lastName}`,
      phone: formatPhone(t.phone),
      passportSeries: t.passportSeries || '-',
      salaryType: t.salaryType === 'FIXED' ? 'Fikslangan' : 'Foiz',
      salary: t.salaryType === 'FIXED' ? formatMoney(t.salaryValue) : `${t.salaryValue}%`,
      groupsCount: `${t._count?.groups || 0} ta`,
      status: t.status === 'FAOL' ? 'FAOL' : 'NOFAOL',
    }));

    exportToExcel({
      filename: `Oqituvchilar_Royxati_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Oqituvchilar',
      columns: exportColumns,
      data: exportRows,
    });
    success('Excel fayl yuklab olindi!');
  };

  const handleExportPdf = () => {
    if (!data?.data || data.data.length === 0) {
      error("Yuklab olish uchun ma'lumot mavjud emas");
      return;
    }

    const exportColumns = [
      { header: 'Ism Familya', key: 'name' },
      { header: 'Telefon', key: 'phone' },
      { header: 'Maosh turi', key: 'salaryType' },
      { header: 'Maosh / Foiz', key: 'salary' },
      { header: 'Guruhlar', key: 'groupsCount' },
      { header: 'Holat', key: 'status' },
    ];

    const exportRows = data.data.map((t) => ({
      name: `${t.firstName} ${t.lastName}`,
      phone: formatPhone(t.phone),
      salaryType: t.salaryType === 'FIXED' ? 'Fikslangan' : 'Foiz',
      salary: t.salaryType === 'FIXED' ? formatMoney(t.salaryValue) : `${t.salaryValue}%`,
      groupsCount: `${t._count?.groups || 0} ta`,
      status: t.status === 'FAOL' ? 'FAOL' : 'NOFAOL',
    }));

    exportToPdf({
      filename: `Oqituvchilar_Royxati_${new Date().toISOString().split('T')[0]}`,
      title: "O'QITUVCHILAR (USTOZLAR) RO'YXATI",
      columns: exportColumns,
      data: exportRows,
    });
    success('PDF fayl yuklab olindi!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>Ustozlar</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            O'quv markazining barcha o'qituvchilari ro'yxati
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <ExportDropdown
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
          />
          <Button icon={<Plus size={16} />} onClick={() => handleOpenModal()}>
            YANGI USTOZ
          </Button>
        </div>
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
        title={selectedTeacher ? 'Ustozni tahrirlash' : 'Yangi Ustoz Qo\'shish'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Ism"
            required
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          />

          <Input
            label="Familya"
            required
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          />

          <Input
            label="Telefon raqam"
            required
            placeholder="+998 90 123 45 67"
            value={formatPhone(formData.phone)}
            onChange={(e) => setFormData({ ...formData, phone: unmaskPhone(e.target.value) })}
          />

          <Input
            label="Passport seriya (AD XXXXXXX)"
            placeholder="AD 1234567"
            value={formData.passportSeries}
            onChange={(e) => setFormData({ ...formData, passportSeries: e.target.value })}
          />

          <Select
            label="Maosh turi"
            required
            options={[
              { label: 'Belgilangan (Fixed - so\'mda)', value: 'FIXED' },
              { label: 'Foiz (Percent - %)', value: 'PERCENT' },
            ]}
            value={formData.salaryType}
            onChange={(e) => setFormData({ ...formData, salaryType: e.target.value as any })}
          />

          <Input
            label={formData.salaryType === 'FIXED' ? 'Maosh summasi (so\'m)' : 'Foiz stavkasi (%)'}
            type="number"
            required
            placeholder={formData.salaryType === 'FIXED' ? '4500000' : '50'}
            value={formData.salaryValue}
            onChange={(e) => setFormData({ ...formData, salaryValue: e.target.value })}
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTeacherId}
        onClose={() => setDeleteTeacherId(null)}
        title="Ustozni o'chirish"
      >
        <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
          Haqiqatan ham bu ustozni o'chirmoqchimisiz?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button variant="secondary" onClick={() => setDeleteTeacherId(null)}>
            Yo'q
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => deleteTeacherId && deleteMutation.mutate(deleteTeacherId)}
          >
            Ha, o'chirish
          </Button>
        </div>
      </Modal>
    </div>
  );
};
