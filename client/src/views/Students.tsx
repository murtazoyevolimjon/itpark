'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Phone, Users, FileSpreadsheet, FileText } from 'lucide-react';
import { Table, Column } from '../components/ui/Table/Table';
import { Button } from '../components/ui/Button/Button';
import { ExportDropdown } from '../components/ui/ExportDropdown/ExportDropdown';
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
import { exportToExcel, exportToPdf } from '../utils/exportData';

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
    queryFn: () => groupsApi.getAll({ limit: 1000 }),
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
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group'] });
      queryClient.invalidateQueries({ queryKey: ['groupsSelect'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['studentProfile'] });
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
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['studentProfile'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'O\'chirishda xatolik');
    },
  });

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setSelectedStudent(student);
      const studentGroupsList = student.studentGroups || (student as any).student_groups || [];
      const currentGroupId =
        (studentGroupsList.length > 0
          ? studentGroupsList[0]?.groupId || (studentGroupsList[0] as any)?.group?.id
          : '') ||
        (student as any)?.groupId ||
        '';

      setFormData({
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        birthDate: student.birthDate ? student.birthDate.split('T')[0] : '2005-01-01',
        phone: student.phone || '',
        fatherPhone: student.fatherPhone || '',
        motherPhone: student.motherPhone || '',
        passportSeries: student.passportSeries || '',
        gender: student.gender || 'ERKAK',
        isSchoolStudent: !!student.isSchoolStudent,
        groupId: currentGroupId,
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
      groupId: formData.groupId || '',
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
      key: 'group',
      header: 'GURUH',
      render: (row) => {
        const sgList = row.studentGroups || (row as any).student_groups || [];
        const group = sgList[0]?.group;
        if (!group) {
          return <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>-</span>;
        }
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(43, 127, 255, 0.1)',
              color: 'var(--primary)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: '1px solid rgba(43, 127, 255, 0.2)',
              transition: 'all 0.2s',
            }}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/groups/${group.id}`);
            }}
            title={group.name}
          >
            <Users size={13} />
            {group.name}
            {sgList.length > 1 && (
              <span style={{ fontSize: '10px', opacity: 0.8, background: 'rgba(43,127,255,0.2)', padding: '1px 4px', borderRadius: '4px' }}>
                +{sgList.length - 1}
              </span>
            )}
          </span>
        );
      },
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

  const handleExportExcel = () => {
    if (!data?.data || data.data.length === 0) {
      error("Yuklab olish uchun ma'lumot mavjud emas");
      return;
    }

    const exportColumns = [
      { header: 'Ism Familya', key: 'name' },
      { header: 'Guruh', key: 'group' },
      { header: "Tug'ilgan sana", key: 'birthDate' },
      { header: "O'quvchi telefoni", key: 'phone' },
      { header: 'Otasining telefoni', key: 'fatherPhone' },
      { header: 'Onasining telefoni', key: 'motherPhone' },
      { header: 'Passport seriya', key: 'passportSeries' },
      { header: 'Jinsi', key: 'gender' },
      { header: "To'lov holati", key: 'paymentStatus' },
    ];

    const exportRows = data.data.map((s) => ({
      name: `${s.firstName} ${s.lastName}`,
      group: (s.studentGroups || (s as any).student_groups || [])
        .map((sg: any) => sg.group?.name)
        .filter(Boolean)
        .join(', ') || '-',
      birthDate: formatDate(s.birthDate),
      phone: formatPhone(s.phone),
      fatherPhone: s.fatherPhone ? formatPhone(s.fatherPhone) : '-',
      motherPhone: s.motherPhone ? formatPhone(s.motherPhone) : '-',
      passportSeries: s.passportSeries || '-',
      gender: s.gender === 'ERKAK' ? 'Erkak' : 'Ayol',
      paymentStatus: s.paymentStatus === 'TOLANGAN' ? "TO'LANGAN" : s.paymentStatus === 'QISMAN' ? 'QISMAN' : "TO'LANMAGAN",
    }));

    exportToExcel({
      filename: `Talabalar_Royxati_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Talabalar',
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
      { header: 'Guruh', key: 'group' },
      { header: "Tug'ilgan sana", key: 'birthDate' },
      { header: "O'quvchi tel", key: 'phone' },
      { header: 'Otasi tel', key: 'fatherPhone' },
      { header: 'Onasi tel', key: 'motherPhone' },
      { header: 'Jinsi', key: 'gender' },
      { header: "To'lov holati", key: 'paymentStatus' },
    ];

    const exportRows = data.data.map((s) => ({
      name: `${s.firstName} ${s.lastName}`,
      group: (s.studentGroups || (s as any).student_groups || [])
        .map((sg: any) => sg.group?.name)
        .filter(Boolean)
        .join(', ') || '-',
      birthDate: formatDate(s.birthDate),
      phone: formatPhone(s.phone),
      fatherPhone: s.fatherPhone ? formatPhone(s.fatherPhone) : '-',
      motherPhone: s.motherPhone ? formatPhone(s.motherPhone) : '-',
      gender: s.gender === 'ERKAK' ? 'Erkak' : 'Ayol',
      paymentStatus: s.paymentStatus === 'TOLANGAN' ? "TO'LANGAN" : s.paymentStatus === 'QISMAN' ? 'QISMAN' : "TO'LANMAGAN",
    }));

    exportToPdf({
      filename: `Talabalar_Royxati_${new Date().toISOString().split('T')[0]}`,
      title: "TALABALAR RO'YXATI",
      columns: exportColumns,
      data: exportRows,
    });
    success('PDF fayl yuklab olindi!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>Talabalar</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            O'quv markazidagi barcha ro'yxatdan o'tgan talabalar
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <ExportDropdown
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
          />
          <Button icon={<Plus size={16} />} onClick={() => handleOpenModal()}>
            YANGI TALABA
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
