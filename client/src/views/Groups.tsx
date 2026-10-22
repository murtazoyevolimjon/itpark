'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, CalendarCheck } from 'lucide-react';
import { Table, Column } from '../components/ui/Table/Table';
import { Button } from '../components/ui/Button/Button';
import { Modal } from '../components/ui/Modal/Modal';
import { Input } from '../components/ui/Input/Input';
import { Select } from '../components/ui/Select/Select';
import { Checkbox } from '../components/ui/Checkbox/Checkbox';
import { Badge } from '../components/ui/Badge/Badge';
import { useToast } from '../components/ui/Toast/Toast';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';
import { useLanguage } from '../hooks/useLanguage';
import { groupsApi } from '../api/groups.api';
import { coursesApi } from '../api/courses.api';
import { teachersApi } from '../api/teachers.api';
import { roomsApi } from '../api/rooms.api';
import { Group, GroupDay } from '../types';

export const Groups: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { t, dict } = useLanguage();
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);

  const ALL_DAYS: { key: GroupDay; label: string }[] = [
    { key: 'DUSH', label: dict.days?.DUSH || 'DUSH' },
    { key: 'SESH', label: dict.days?.SESH || 'SESH' },
    { key: 'CHOR', label: dict.days?.CHOR || 'CHOR' },
    { key: 'PAY', label: dict.days?.PAY || 'PAY' },
    { key: 'JU', label: dict.days?.JU || 'JU' },
    { key: 'SHAN', label: dict.days?.SHAN || 'SHAN' },
    { key: 'YAK', label: dict.days?.YAK || 'YAK' },
  ];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    courseId: '',
    teacherId: '',
    roomId: '',
    days: ['DUSH', 'CHOR', 'JU'] as GroupDay[],
    startTime: '09:00',
    endTime: '11:00',
    startDate: new Date().toISOString().split('T')[0],
    status: 'FAOL',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['groups', pagination.page, pagination.limit, debouncedSearch, pagination.sortBy, pagination.order],
    queryFn: () =>
      groupsApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        sortBy: pagination.sortBy,
        order: pagination.order,
      }),
    placeholderData: keepPreviousData,
  });

  const { data: courses } = useQuery({
    queryKey: ['coursesSelect'],
    queryFn: () => coursesApi.getAll({ limit: 100 }),
    enabled: isModalOpen,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const { data: teachers } = useQuery({
    queryKey: ['teachersSelect'],
    queryFn: () => teachersApi.getAll({ limit: 100 }),
    enabled: isModalOpen,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const { data: rooms } = useQuery({
    queryKey: ['roomsSelect'],
    queryFn: () => roomsApi.getAll({ limit: 100 }),
    enabled: isModalOpen,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Auto-sync select options if they arrive after modal opens
  useEffect(() => {
    if (isModalOpen && !selectedGroup) {
      setFormData((prev) => ({
        ...prev,
        courseId: prev.courseId || courses?.data?.[0]?.id || '',
        teacherId: prev.teacherId || teachers?.data?.[0]?.id || '',
        roomId: prev.roomId || rooms?.data?.[0]?.id || '',
      }));
    }
  }, [isModalOpen, selectedGroup, courses?.data, teachers?.data, rooms?.data]);

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      selectedGroup
        ? groupsApi.update(selectedGroup.id, payload)
        : groupsApi.create(payload),
    onSuccess: () => {
      success(selectedGroup ? 'Guruh tahrirlandi' : 'Yangi guruh ochildi');
      handleCloseModal();
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groupsSelect'] });
      queryClient.invalidateQueries({ queryKey: ['group'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Saqlashda xatolik');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => groupsApi.delete(id),
    onSuccess: () => {
      success('Guruh o\'chirildi');
      setDeleteGroupId(null);
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groupsSelect'] });
      queryClient.invalidateQueries({ queryKey: ['group'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'O\'chirishda xatolik');
    },
  });

  const handleOpenModal = (group?: Group) => {
    if (group) {
      setSelectedGroup(group);
      setFormData({
        name: group.name,
        courseId: group.courseId,
        teacherId: group.teacherId,
        roomId: group.roomId,
        days: group.days,
        startTime: group.startTime,
        endTime: group.endTime,
        startDate: group.startDate ? group.startDate.split('T')[0] : '',
        status: group.status,
      });
    } else {
      setSelectedGroup(null);
      setFormData({
        name: '',
        courseId: courses?.data?.[0]?.id || '',
        teacherId: teachers?.data?.[0]?.id || '',
        roomId: rooms?.data?.[0]?.id || '',
        days: ['DUSH', 'CHOR', 'JU'],
        startTime: '09:00',
        endTime: '11:00',
        startDate: new Date().toISOString().split('T')[0],
        status: 'FAOL',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGroup(null);
  };

  const handleDayToggle = (day: GroupDay) => {
    if (formData.days.includes(day)) {
      setFormData({ ...formData, days: formData.days.filter((d) => d !== day) });
    } else {
      setFormData({ ...formData, days: [...formData.days, day] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const courseId = formData.courseId || courses?.data?.[0]?.id || '';
    const teacherId = formData.teacherId || teachers?.data?.[0]?.id || '';
    const roomId = formData.roomId || rooms?.data?.[0]?.id || '';

    if (!formData.name.trim()) {
      error('Guruh nomi yoki raqamini kiriting');
      return;
    }
    if (!courseId) {
      error("Kursni tanlang (agar kurs mavjud bo'lmasa, Kurslar bo'limida kurs yarating)");
      return;
    }
    if (!teacherId) {
      error("Ustozni tanlang (agar ustoz mavjud bo'lmasa, Ustozlar bo'limida ustoz qo'shing)");
      return;
    }
    if (!roomId) {
      error("Xonani tanlang (agar xona mavjud bo'lmasa, Xonalar bo'limida xona qo'shing)");
      return;
    }
    if (formData.days.length === 0) {
      error('Kamida bitta dars kunini tanlang');
      return;
    }

    saveMutation.mutate({
      ...formData,
      courseId,
      teacherId,
      roomId,
    });
  };

  const columns: Column<Group>[] = [
    {
      key: 'course',
      header: t('courses').toUpperCase(),
      render: (row) => row.course?.name || '-',
    },
    {
      key: 'name',
      header: t('groupName'),
      sortable: true,
      render: (row) => (
        <span
          style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
          onClick={() => router.push(`/groups/${row.id}`)}
        >
          {row.name}
        </span>
      ),
    },
    {
      key: 'teacher',
      header: t('teachers').toUpperCase(),
      render: (row) =>
        row.teacher ? `${row.teacher.firstName} ${row.teacher.lastName}` : '-',
    },
    {
      key: 'days',
      header: t('lessonDays'),
      render: (row) => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {row.days?.map((d) => (
            <Badge key={d} variant="secondary">
              {dict.days?.[d as GroupDay] || d}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      header: t('status'),
      render: (row) => (
        <Badge
          variant={
            row.status === 'FAOL'
              ? 'success'
              : row.status === 'TUGAGAN'
              ? 'secondary'
              : 'danger'
          }
        >
          {row.status === 'FAOL' ? t('active') : row.status === 'TUGAGAN' ? t('completed') : t('suspended')}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: t('action'),
      render: (row) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <Button
            size="sm"
            variant="outline"
            title={t('attendance')}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/groups/${row.id}`);
            }}
          >
            <CalendarCheck size={14} color="var(--primary)" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            title={t('edit')}
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
            title={t('delete')}
            onClick={(e) => {
              e.stopPropagation();
              setDeleteGroupId(row.id);
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
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{t('groups')}</h2>
        <Button icon={<Plus size={16} />} onClick={() => handleOpenModal()}>
          {t('newGroup')}
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
        onRowClick={(group) => router.push(`/groups/${group.id}`)}
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedGroup ? t('edit') : t('newGroup')}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label={t('groupName')}
            required
            placeholder="#1 guruh (Frontend)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Select
            label={t('courses')}
            required
            options={courses?.data?.map((c) => ({ label: c.name, value: c.id })) || []}
            value={formData.courseId}
            onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
          />

          <Select
            label={t('teachers')}
            required
            options={
              teachers?.data?.map((t) => ({
                label: `${t.firstName} ${t.lastName}`,
                value: t.id,
              })) || []
            }
            value={formData.teacherId}
            onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
          />

          <Select
            label={t('rooms')}
            required
            options={rooms?.data?.map((r) => ({ label: `${r.name} (${r.number})`, value: r.id })) || []}
            value={formData.roomId}
            onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
          />

          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
              {t('lessonDays')} *
            </label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {ALL_DAYS.map((day) => (
                <Checkbox
                  key={day.key}
                  label={day.label}
                  checked={formData.days.includes(day.key)}
                  onChange={() => handleDayToggle(day.key)}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label={t('startTime')}
              type="time"
              required
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            />
            <Input
              label={t('endTime')}
              type="time"
              required
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            />
          </div>

          <Input
            label={t('startDate')}
            type="date"
            required
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
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
        isOpen={!!deleteGroupId}
        onClose={() => setDeleteGroupId(null)}
        title={t('delete')}
      >
        <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
          {t('confirm')}?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button variant="secondary" onClick={() => setDeleteGroupId(null)}>
            {t('no')}
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => deleteGroupId && deleteMutation.mutate(deleteGroupId)}
          >
            {t('delete')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
