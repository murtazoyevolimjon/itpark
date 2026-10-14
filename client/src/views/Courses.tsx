'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Table, Column } from '../components/ui/Table/Table';
import { Button } from '../components/ui/Button/Button';
import { Modal } from '../components/ui/Modal/Modal';
import { Input } from '../components/ui/Input/Input';
import { useToast } from '../components/ui/Toast/Toast';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';
import { useLanguage } from '../hooks/useLanguage';
import { coursesApi } from '../api/courses.api';
import { Course } from '../types';
import { formatMoney } from '../utils/formatMoney';

export const Courses: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { t } = useLanguage();
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [deleteCourseId, setDeleteCourseId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['courses', pagination.page, pagination.limit, debouncedSearch, pagination.sortBy, pagination.order],
    queryFn: () =>
      coursesApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        sortBy: pagination.sortBy,
        order: pagination.order,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      selectedCourse
        ? coursesApi.update(selectedCourse.id, payload)
        : coursesApi.create(payload),
    onSuccess: () => {
      success(selectedCourse ? t('edit') : t('add'));
      handleCloseModal();
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Xatolik yuz berdi');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => coursesApi.delete(id),
    onSuccess: () => {
      success(t('delete'));
      setDeleteCourseId(null);
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Xatolik yuz berdi');
    },
  });

  const handleOpenModal = (course?: Course) => {
    if (course) {
      setSelectedCourse(course);
      setFormData({
        name: course.name,
        price: course.price.toString(),
        description: course.description || '',
      });
    } else {
      setSelectedCourse(null);
      setFormData({ name: '', price: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCourse(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      error('Majburiy maydonlarni to\'ldiring');
      return;
    }
    saveMutation.mutate({
      name: formData.name,
      price: Number(formData.price),
      description: formData.description,
    });
  };

  const columns: Column<Course>[] = [
    {
      key: 'name',
      header: t('courseName'),
      sortable: true,
      render: (row) => <span style={{ fontWeight: 700 }}>{row.name}</span>,
    },
    {
      key: 'price',
      header: t('coursePrice'),
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
          {formatMoney(row.price)} / oy
        </span>
      ),
    },
    {
      key: 'description',
      header: 'IZOH',
      render: (row) => row.description || '-',
    },
    {
      key: 'action',
      header: t('action'),
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
              setDeleteCourseId(row.id);
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
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{t('courses')}</h2>
        <Button icon={<Plus size={16} />} onClick={() => handleOpenModal()}>
          {t('newCourse')}
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

      {/* Course Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedCourse ? t('edit') : t('newCourse')}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label={t('courseName')}
            required
            placeholder="Frontend React"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Input
            label={t('coursePrice')}
            type="number"
            required
            placeholder="450000"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          />

          <Input
            label="Izoh"
            placeholder="Kurs haqida qisqacha"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
        isOpen={!!deleteCourseId}
        onClose={() => setDeleteCourseId(null)}
        title={t('delete')}
      >
        <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
          Haqiqatan ham bu kursni o'chirmoqchimisiz?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button variant="secondary" onClick={() => setDeleteCourseId(null)}>
            {t('no')}
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => deleteCourseId && deleteMutation.mutate(deleteCourseId)}
          >
            {t('yes')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
