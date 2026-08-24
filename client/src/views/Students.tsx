'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Phone } from 'lucide-react';
import { Table, Column } from '../components/ui/Table/Table';
import { Button } from '../components/ui/Button/Button';
import { Modal } from '../components/ui/Modal/Modal';
import { Input } from '../components/ui/Input/Input';
import { Select } from '../components/ui/Select/Select';
import { Toggle } from '../components/ui/Toggle/Toggle';
import { Badge } from '../components/ui/Badge/Badge';
import { useToast } from '../components/ui/Toast/Toast';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';
import { studentsApi } from '../api/students.api';
import { groupsApi } from '../api/groups.api';
import { Student } from '../types';
import { formatPhone, unmaskPhone } from '../utils/phoneMask';
import { formatDate } from '../utils/formatDate';

export const Students: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthDate: '2005-01-01',
    phone: '',
    fatherPhone: '',
    motherPhone: '',
    passportSeries: '',
    gender: 'ERKAK' as 'ERKAK' | 'AYOL',
    isSchoolStudent: false,
    groupId: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['students', pagination.page, pagination.limit, debouncedSearch, pagination.sortBy, pagination.order],
    queryFn: () =>
      studentsApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        sortBy: pagination.sortBy,
        order: pagination.order,
      }),
  });

  const { data: groups } = useQuery({
    queryKey: ['groupsSelect'],
    queryFn: () => groupsApi.getAll({ limit: 100 }),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      selectedStudent
        ? studentsApi.update(selectedStudent.id, payload)
        : studentsApi.create(payload),
    onSuccess: () => {
      success(selectedStudent ? 'Talaba tahrirlandi' : 'Yangi talaba qo\'shildi');
      handleCloseModal();
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Saqlashda xatolik');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentsApi.delete(id),
    onSuccess: () => {
      success('Talaba o\'chirildi');
      setDeleteStudentId(null);
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'O\'chirishda xatolik');
    },
  });

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setSelectedStudent(student);
      setFormData({
        firstName: student.firstName,
        lastName: student.lastName,
        birthDate: student.birthDate ? student.birthDate.split('T')[0] : '2005-01-01',
        phone: student.phone,
        fatherPhone: student.fatherPhone || '',
        motherPhone: student.motherPhone || '',
        passportSeries: student.passportSeries || '',
        gender: student.gender,
        isSchoolStudent: student.isSchoolStudent,
        groupId: '',
      });
    } else {
      setSelectedStudent(null);
      setFormData({
        firstName: '',
        lastName: '',
        birthDate: '2005-01-01',
        phone: '',
        fatherPhone: '',
        motherPhone: '',
        passportSeries: '',
        gender: 'ERKAK',
        isSchoolStudent: false,
        groupId: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      error('Ism, familya va telefon raqamini kiriting');
      return;
    }
    saveMutation.mutate({
      ...formData,
      phone: unmaskPhone(formData.phone),
      fatherPhone: formData.fatherPhone ? unmaskPhone(formData.fatherPhone) : undefined,
      motherPhone: formData.motherPhone ? unmaskPhone(formData.motherPhone) : undefined,
      groupId: formData.groupId || undefined,
    });
  };

  const columns: Column<Student>[] = [
    {
      key: 'name',
      header: 'ISM FAMILYA',
      sortable: true,
      render: (row) => (
        <span
          style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
          onClick={() => router.push(`/students/${row.id}`)}
        >
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    {
      key: 'birthDate',
      header: "TUG'ILGAN YIL",
      render: (row) => formatDate(row.birthDate),
    },
    {
      key: 'phone',
      header: "O'QUVCHI TELEFONI",
      render: (row) => (
        <a
          href={`tel:${row.phone}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
        >
          <Phone size={14} />
          {formatPhone(row.phone)}
        </a>
      ),
    },
    {
      key: 'parentsPhone',
      header: 'OTA-ONASINING TELEFONI',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {row.fatherPhone && (
            <a
              href={`tel:${row.fatherPhone}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text)', textDecoration: 'none', fontSize: '12px' }}
            >
              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: 4, background: 'rgba(43, 127, 255, 0.1)', color: 'var(--primary)', fontWeight: 700 }}>Otasi</span>
              <Phone size={12} color="var(--primary)" />
              {formatPhone(row.fatherPhone)}
            </a>
          )}
          {row.motherPhone && (
            <a
              href={`tel:${row.motherPhone}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text)', textDecoration: 'none', fontSize: '12px' }}
            >
              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: 4, background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', fontWeight: 700 }}>Onasi</span>
              <Phone size={12} color="#ec4899" />
              {formatPhone(row.motherPhone)}
            </a>
          )}
          {!row.fatherPhone && !row.motherPhone && (
            <span style={{ color: 'var(--text-muted)' }}>Kiritilmagan</span>
          )}
        </div>
      ),
    },
    {
      key: 'paymentStatus',
      header: "TO'LOV HOLATI",
      render: (row) => (
        <Badge
          variant={
            row.paymentStatus === 'TOLANGAN'
              ? 'success'
              : row.paymentStatus === 'QISMAN'
              ? 'warning'
              : 'danger'
          }
        >
          {row.paymentStatus === 'TOLANGAN'
            ? "TO'LANGAN"
            : row.paymentStatus === 'QISMAN'
            ? 'QISMAN'
            : "TO'LANMAGAN"}
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
              setDeleteStudentId(row.id);
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
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Talabalar</h2>
        <Button icon={<Plus size={16} />} onClick={() => handleOpenModal()}>
          YANGI TALABA
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
        onRowClick={(s) => router.push(`/students/${s.id}`)}
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedStudent ? 'Talabani tahrirlash' : 'Yangi Talaba Qo\'shish'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Select
            label="Guruh"
            options={[
              { label: 'Guruh tanlang', value: '' },
              ...(groups?.data?.map((g) => ({ label: g.name, value: g.id })) || []),
            ]}
            value={formData.groupId}
            onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
          </div>

          <Input
            label="Tug'ilgan kun"
            type="date"
            required
            value={formData.birthDate}
            onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
          />

          <Input
            label="Telefon raqam"
            required
            placeholder="+998 90 123 45 67"
            value={formatPhone(formData.phone)}
            onChange={(e) => setFormData({ ...formData, phone: unmaskPhone(e.target.value) })}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Otasining telefoni"
              placeholder="+998 90 123 45 67"
              value={formatPhone(formData.fatherPhone)}
              onChange={(e) => setFormData({ ...formData, fatherPhone: unmaskPhone(e.target.value) })}
            />
            <Input
              label="Onasining telefoni"
              placeholder="+998 90 123 45 67"
              value={formatPhone(formData.motherPhone)}
              onChange={(e) => setFormData({ ...formData, motherPhone: unmaskPhone(e.target.value) })}
            />
          </div>

          <Input
            label="Passport seriya (AD XXXXXXX)"
            placeholder="AD 1234567"
            value={formData.passportSeries}
            onChange={(e) => setFormData({ ...formData, passportSeries: e.target.value })}
          />

          <Select
            label="Jinsi"
            required
            options={[
              { label: 'Erkak', value: 'ERKAK' },
              { label: 'Ayol', value: 'AYOL' },
            ]}
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
          />

          <Toggle
            label="Maktab o'quvchisi"
            checked={formData.isSchoolStudent}
            onChange={(checked) => setFormData({ ...formData, isSchoolStudent: checked })}
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
        isOpen={!!deleteStudentId}
        onClose={() => setDeleteStudentId(null)}
        title="Talabani o'chirish"
      >
        <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
          Haqiqatan ham bu talabani o'chirmoqchimisiz?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button variant="secondary" onClick={() => setDeleteStudentId(null)}>
            Yo'q
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => deleteStudentId && deleteMutation.mutate(deleteStudentId)}
          >
            Ha, o'chirish
          </Button>
        </div>
      </Modal>
    </div>
  );
};
