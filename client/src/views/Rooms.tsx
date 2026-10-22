'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Table, Column } from '../components/ui/Table/Table';
import { Button } from '../components/ui/Button/Button';
import { Modal } from '../components/ui/Modal/Modal';
import { Input } from '../components/ui/Input/Input';
import { useToast } from '../components/ui/Toast/Toast';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';
import { useLanguage } from '../hooks/useLanguage';
import { roomsApi } from '../api/rooms.api';
import { Room } from '../types';

export const Rooms: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { t, dict } = useLanguage();
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    floor: '',
    number: '',
    capacity: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['rooms', pagination.page, pagination.limit, debouncedSearch, pagination.sortBy, pagination.order],
    queryFn: () =>
      roomsApi.getAll({
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
      selectedRoom
        ? roomsApi.update(selectedRoom.id, payload)
        : roomsApi.create(payload),
    onSuccess: () => {
      success(selectedRoom ? 'Xona tahrirlandi' : 'Yangi xona qo\'shildi');
      handleCloseModal();
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['roomsSelect'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Saqlashda xatolik');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => roomsApi.delete(id),
    onSuccess: () => {
      success('Xona o\'chirildi');
      setDeleteRoomId(null);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['roomsSelect'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'O\'chirishda xatolik');
    },
  });

  const handleOpenModal = (room?: Room) => {
    if (room) {
      setSelectedRoom(room);
      setFormData({
        name: room.name,
        floor: room.floor.toString(),
        number: room.number,
        capacity: room.capacity.toString(),
      });
    } else {
      setSelectedRoom(null);
      setFormData({ name: '', floor: '1', number: '', capacity: '15' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRoom(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.floor || !formData.number || !formData.capacity) {
      error('Barcha maydonlarni to\'ldiring');
      return;
    }
    saveMutation.mutate({
      name: formData.name,
      floor: Number(formData.floor),
      number: formData.number,
      capacity: Number(formData.capacity),
    });
  };

  const columns: Column<Room>[] = [
    {
      key: 'name',
      header: dict.roomsPage?.colName || 'NOMI',
      sortable: true,
      render: (row) => <span style={{ fontWeight: 600 }}>{row.name}</span>,
    },
    {
      key: 'floor',
      header: dict.roomsPage?.colFloor || 'QAVAT',
      render: (row) => `${row.floor}${dict.roomsPage?.floorSuffix || '-qavat'}`,
    },
    {
      key: 'number',
      header: dict.roomsPage?.colNumber || 'RAQAM',
      render: (row) => `${row.number}${dict.roomsPage?.roomSuffix || '-xona'}`,
    },
    {
      key: 'capacity',
      header: dict.roomsPage?.colCapacity || "SIG'IMI",
      render: (row) => `${row.capacity}${dict.roomsPage?.capacitySuffix || ' kishilik'}`,
    },
    {
      key: 'groupsCount',
      header: dict.roomsPage?.colGroups || 'GURUHLAR',
      render: (row) => `${row._count?.groups || 0} ${dict.countUnit || 'ta'}`,
    },
    {
      key: 'action',
      header: dict.roomsPage?.colAction || 'AMALLAR',
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
              setDeleteRoomId(row.id);
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
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{dict.roomsPage?.title || t('rooms')}</h2>
        <Button icon={<Plus size={16} />} onClick={() => handleOpenModal()}>
          {dict.roomsPage?.newRoom || 'YANGI XONA'}
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
        title={selectedRoom ? (dict.roomsPage?.editRoom || 'Xonani tahrirlash') : (dict.roomsPage?.createRoom || 'Yangi Xona Yaratish')}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label={dict.roomsPage?.nameLabel || "Xona nomi"}
            required
            placeholder="Lab 1"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label={dict.roomsPage?.floorLabel || "Qavat"}
              type="number"
              required
              placeholder="1"
              value={formData.floor}
              onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
            />
            <Input
              label={dict.roomsPage?.numberLabel || "Xona raqami"}
              required
              placeholder="101"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
            />
          </div>

          <Input
            label={dict.roomsPage?.capacityLabel || "Sig'imi (kishilik)"}
            type="number"
            required
            placeholder="15"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
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
        isOpen={!!deleteRoomId}
        onClose={() => setDeleteRoomId(null)}
        title={t('delete')}
      >
        <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
          {dict.roomsPage?.deleteConfirm || "Haqiqatan ham bu xonani o'chirmoqchimisiz?"}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button variant="secondary" onClick={() => setDeleteRoomId(null)}>
            {t('no')}
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => deleteRoomId && deleteMutation.mutate(deleteRoomId)}
          >
            {t('yes')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
