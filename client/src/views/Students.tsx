'use client';

import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Phone, Users, FileSpreadsheet, FileText, Send } from 'lucide-react';
import { parseStudentCreds } from '../lib/credentials';
import { Table, Column } from '../components/ui/Table/Table';
import { Button } from '../components/ui/Button/Button';
import { ExportDropdown } from '../components/ui/ExportDropdown/ExportDropdown';
import { Modal } from '../components/ui/Modal/Modal';
import { Input } from '../components/ui/Input/Input';
import { GroupCardSelect } from '../components/ui/GroupCardSelect/GroupCardSelect';
import { Badge } from '../components/ui/Badge/Badge';
import { useToast } from '../components/ui/Toast/Toast';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';
import { studentsApi } from '../api/students.api';
import { groupsApi } from '../api/groups.api';
import { askAddExistingStudent } from '../utils/existingStudent';
import { Student } from '../types';
import { formatPhone, unmaskPhone } from '../utils/phoneMask';
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
    phone: '',
    parentPhone: '',
    groupId: '',
  });
  // Which parent field the single "parent phone" input edits, and the group the student had when the form opened
  const [parentField, setParentField] = useState<'fatherPhone' | 'motherPhone'>('fatherPhone');
  const [originalGroupId, setOriginalGroupId] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  // New students are saved in the background: the form is cleared at once so the next one can be typed
  const [pendingSaves, setPendingSaves] = useState(0);

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
    placeholderData: keepPreviousData,
  });

  const { data: groups } = useQuery({
    queryKey: ['groupsSelect'],
    queryFn: () => groupsApi.getAll({ limit: 1000 }),
    enabled: isModalOpen,
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
      queryClient.invalidateQueries({ queryKey: ['studentsSelect'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group'] });
      queryClient.invalidateQueries({ queryKey: ['groupsSelect'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['studentProfile'] });
    },
    onError: async (err: any, variables: any) => {
      // The same person already exists: offer to put that student into the chosen group instead
      const existingId = selectedStudent ? null : askAddExistingStudent(err, variables?.groupId);
      if (!existingId) {
        error(err.response?.data?.message || 'Saqlashda xatolik');
        return;
      }
      try {
        await groupsApi.addStudent(variables.groupId, existingId);
        success("Mavjud talaba guruhga qo'shildi");
        handleCloseModal();
        queryClient.invalidateQueries({ queryKey: ['students'] });
        queryClient.invalidateQueries({ queryKey: ['studentsSelect'] });
        queryClient.invalidateQueries({ queryKey: ['groups'] });
        queryClient.invalidateQueries({ queryKey: ['group'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      } catch (e: any) {
        error(e.response?.data?.message || 'Guruhga qo\'shishda xatolik');
      }
    },
  });

  const refreshStudentQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['students'] });
    queryClient.invalidateQueries({ queryKey: ['studentsSelect'] });
    queryClient.invalidateQueries({ queryKey: ['groups'] });
    queryClient.invalidateQueries({ queryKey: ['group'] });
    queryClient.invalidateQueries({ queryKey: ['groupsSelect'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    queryClient.invalidateQueries({ queryKey: ['studentProfile'] });
  };

  // Creates a student without blocking the form. `snapshot` is what was typed, so a rejected save can bring it back.
  const createInBackground = (payload: any, snapshot: typeof formData) => {
    const fullName = `${snapshot.firstName} ${snapshot.lastName}`.trim();
    setPendingSaves((n) => n + 1);
    studentsApi
      .create(payload)
      .then(() => {
        success(`${fullName} qo'shildi`);
        refreshStudentQueries();
      })
      .catch(async (err: any) => {
        // The same person already exists: offer to put that student into the chosen group instead
        const existingId = askAddExistingStudent(err, payload.groupId);
        if (existingId) {
          try {
            await groupsApi.addStudent(payload.groupId, existingId);
            success(`${fullName} mavjud talaba sifatida guruhga qo'shildi`);
            refreshStudentQueries();
          } catch (e: any) {
            error(`${fullName}: ${e.response?.data?.message || "Guruhga qo'shishda xatolik"}`);
          }
          return;
        }
        error(`${fullName}: ${err.response?.data?.message || 'Saqlashda xatolik'}`);
        // Give the typed data back if the user has not started the next student yet
        setFormData((cur) =>
          !cur.firstName && !cur.lastName && !cur.phone && !cur.parentPhone ? { ...snapshot, groupId: cur.groupId } : cur
        );
      })
      .finally(() => setPendingSaves((n) => Math.max(0, n - 1)));
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentsApi.delete(id),
    onSuccess: () => {
      success('Talaba o\'chirildi');
      setDeleteStudentId(null);
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['studentsSelect'] });
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
        phone: student.phone || '',
        parentPhone: student.fatherPhone || student.motherPhone || '',
        groupId: currentGroupId,
      });
      setParentField(student.fatherPhone ? 'fatherPhone' : student.motherPhone ? 'motherPhone' : 'fatherPhone');
      setOriginalGroupId(currentGroupId);
    } else {
      setSelectedStudent(null);
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        parentPhone: '',
        groupId: '',
      });
      setParentField('fatherPhone');
      setOriginalGroupId('');
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
      error('Ism, familiya va telefon raqamini kiriting');
      return;
    }

    const cleanParentPhone = unmaskPhone(formData.parentPhone);
    if (!cleanParentPhone) {
      error("Ota-onasining telefon raqamini kiriting");
      return;
    }

    const payload: any = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: unmaskPhone(formData.phone),
      [parentField]: cleanParentPhone,
    };
    // Editing must not touch the student's groups unless the group was actually changed:
    // one student may attend several groups, and changing the group replaces the others
    if (!selectedStudent || formData.groupId !== originalGroupId) {
      payload.groupId = formData.groupId || '';
    }

    if (selectedStudent) {
      saveMutation.mutate(payload);
      return;
    }

    // New student: save in the background and leave a clean form (same group) ready for the next one
    const snapshot = formData;
    setFormData({ firstName: '', lastName: '', phone: '', parentPhone: '', groupId: formData.groupId });
    createInBackground(payload, snapshot);
    setTimeout(() => {
      const first = formRef.current?.querySelector('input');
      (first as HTMLInputElement | null)?.focus();
    }, 0);
  };
  const columns: Column<Student>[] = [
    {
      key: 'name',
      header: 'ISM FAMILIYA',
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
      key: 'phones',
      header: 'TELEFONLAR',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <a
            href={`tel:${row.phone}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: 'var(--primary)',
              fontWeight: 600,
              fontSize: '12px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
            title="O'quvchi telefoni"
          >
            <Phone size={12} />
            {formatPhone(row.phone)}
          </a>
          {row.fatherPhone || row.motherPhone ? (
            <a
              href={`tel:${row.fatherPhone || row.motherPhone}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: 'var(--text-muted)',
                fontSize: '11px',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
              title={row.fatherPhone ? "Otasi telefoni" : "Onasi telefoni"}
            >
              <span
                style={{
                  fontSize: '9px',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  background: row.fatherPhone ? 'rgba(43, 127, 255, 0.1)' : 'rgba(236, 72, 153, 0.1)',
                  color: row.fatherPhone ? 'var(--primary)' : '#ec4899',
                  fontWeight: 700,
                }}
              >
                {row.fatherPhone ? 'Otasi' : 'Onasi'}
              </span>
              {formatPhone(row.fatherPhone || row.motherPhone)}
            </a>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>-</span>
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
      key: 'telegram' as any,
      header: 'TELEGRAM BOT',
      render: (row) => {
        const creds = parseStudentCreds(row.passportSeries, row.phone);
        const isStuConnected = !!creds.tgChatId;
        const isParentConnected = !!creds.parentTgChatId;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: isStuConnected ? '#10b981' : 'var(--text-muted)',
                fontWeight: 600,
              }}
              title={isStuConnected ? `O'quvchi ulangan (${creds.tgChatId})` : "O'quvchi ulanmagan"}
            >
              <Send size={11} color={isStuConnected ? '#10b981' : '#94a3b8'} />
              O'quvchi: {isStuConnected ? 'Ulangan' : 'Yo\'q'}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: isParentConnected ? '#38bdf8' : 'var(--text-muted)',
                fontWeight: 600,
              }}
              title={isParentConnected ? `Ota-ona ulangan (${creds.parentTgChatId})` : "Ota-ona ulanmagan"}
            >
              <Send size={11} color={isParentConnected ? '#38bdf8' : '#94a3b8'} />
              Ota-ona: {isParentConnected ? 'Ulangan' : 'Yo\'q'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'action',
      header: 'ACTION',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            title="Tahrirlash"
            style={{
              width: '32px',
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              padding: 0,
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenModal(row);
            }}
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            title="O'chirish"
            style={{
              width: '32px',
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              backgroundColor: '#f87171',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              padding: 0,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setDeleteStudentId(row.id);
            }}
          >
            <Trash2 size={15} color="#ffffff" />
          </button>
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
      { header: 'Ism Familiya', key: 'name' },
      { header: 'Guruh', key: 'group' },
      { header: "O'quvchi telefoni", key: 'phone' },
      { header: 'Otasining telefoni', key: 'fatherPhone' },
      { header: 'Onasining telefoni', key: 'motherPhone' },
      { header: "To'lov holati", key: 'paymentStatus' },
    ];

    const exportRows = data.data.map((s) => ({
      name: `${s.firstName} ${s.lastName}`,
      group: (s.studentGroups || (s as any).student_groups || [])
        .map((sg: any) => sg.group?.name)
        .filter(Boolean)
        .join(', ') || '-',
      phone: formatPhone(s.phone),
      fatherPhone: s.fatherPhone ? formatPhone(s.fatherPhone) : '-',
      motherPhone: s.motherPhone ? formatPhone(s.motherPhone) : '-',
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
      { header: 'Ism Familiya', key: 'name' },
      { header: 'Guruh', key: 'group' },
      { header: "O'quvchi tel", key: 'phone' },
      { header: 'Otasi tel', key: 'fatherPhone' },
      { header: 'Onasi tel', key: 'motherPhone' },
      { header: "To'lov holati", key: 'paymentStatus' },
    ];

    const exportRows = data.data.map((s) => ({
      name: `${s.firstName} ${s.lastName}`,
      group: (s.studentGroups || (s as any).student_groups || [])
        .map((sg: any) => sg.group?.name)
        .filter(Boolean)
        .join(', ') || '-',
      phone: formatPhone(s.phone),
      fatherPhone: s.fatherPhone ? formatPhone(s.fatherPhone) : '-',
      motherPhone: s.motherPhone ? formatPhone(s.motherPhone) : '-',
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
        <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <GroupCardSelect
            label="Guruh"
            groups={groups?.data || []}
            value={formData.groupId}
            onChange={(newId) => setFormData({ ...formData, groupId: newId })}
            allowEmpty={true}
            emptyOptionLabel="Guruhsiz (Proba / Sinov darsi)"
            placeholder="Guruhni tanlang"
            searchPlaceholder="Guruh nomi, fan yoki o'qituvchi bo'yicha qidirish..."
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Ism"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <Input
              label="Familiya"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>

          <Input
            label="Telefon raqam"
            required
            placeholder="+998 90 123 45 67"
            value={formatPhone(formData.phone)}
            onChange={(e) => {
              setFormData({ ...formData, phone: unmaskPhone(e.target.value) });
            }}
          />

          <Input
            label="Ota-onasining telefoni"
            required
            placeholder="+998 90 123 45 67"
            value={formatPhone(formData.parentPhone)}
            onChange={(e) => setFormData({ ...formData, parentPhone: unmaskPhone(e.target.value) })}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            {pendingSaves > 0 && (
              <span style={{ alignSelf: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                Saqlanmoqda: {pendingSaves}
              </span>
            )}
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              {selectedStudent ? 'Bekor qilish' : 'Yopish'}
            </Button>
            <Button type="submit" isLoading={!!selectedStudent && saveMutation.isPending}>
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
