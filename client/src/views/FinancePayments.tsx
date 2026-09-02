'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CreditCard, DollarSign, FileSpreadsheet, FileText, UserCheck, BookOpen } from 'lucide-react';
import { Table, Column } from '../components/ui/Table/Table';
import { Button } from '../components/ui/Button/Button';
import { ExportDropdown } from '../components/ui/ExportDropdown/ExportDropdown';
import { Modal } from '../components/ui/Modal/Modal';
import { Input } from '../components/ui/Input/Input';
import { Select } from '../components/ui/Select/Select';
import { SearchableSelect } from '../components/ui/SearchableSelect/SearchableSelect';
import { Badge } from '../components/ui/Badge/Badge';
import { useToast } from '../components/ui/Toast/Toast';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';
import { paymentsApi } from '../api/payments.api';
import { studentsApi } from '../api/students.api';
import { Payment } from '../types';
import { formatMoney } from '../utils/formatMoney';
import { formatDate } from '../utils/formatDate';
import { formatPhone } from '../utils/phoneMask';
import { exportToExcel, exportToPdf } from '../utils/exportData';

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
    queryFn: () => studentsApi.getAll({ limit: 1000 }),
  });

  const studentOptions = useMemo(() => {
    return (
      students?.data?.map((s) => {
        const firstGroup = s.studentGroups?.[0]?.group;
        const groupName = firstGroup?.name;
        return {
          value: s.id,
          label: `${s.firstName} ${s.lastName}`,
          subLabel: s.phone ? formatPhone(s.phone) : undefined,
          phone: s.phone,
          avatarText: `${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase(),
          badge: groupName,
        };
      }) || []
    );
  }, [students]);

  const selectedStudent = useMemo(() => {
    return students?.data?.find((s) => s.id === formData.studentId);
  }, [students, formData.studentId]);

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
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "To'lov saqlashda xatolik yuz berdi");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId) {
      error("Iltimos, talabani tanlang");
      return;
    }
    if (!formData.amount) {
      error("Iltimos, to'lov summasini kiriting");
      return;
    }

    const firstGroup = selectedStudent?.studentGroups?.[0];

    createMutation.mutate({
      studentId: formData.studentId,
      groupId: firstGroup?.groupId || null,
      courseId: firstGroup?.group?.courseId || null,
      amount: Number(formData.amount),
      paymentDate: formData.paymentDate,
      method: formData.method,
      status: formData.status,
    });
  };

  const handleExportExcel = () => {
    if (!data?.data || data.data.length === 0) {
      error("Yuklab olish uchun ma'lumot mavjud emas");
      return;
    }

    const exportColumns = [
      { header: 'Talaba (Ism Familya)', key: 'studentName' },
      { header: 'Qabul qildi', key: 'receivedByName' },
      { header: 'Summa', key: 'amount' },
      { header: "To'lov sanasi", key: 'paymentDate' },
      { header: "To'lov usuli", key: 'method' },
      { header: 'Kurs / Guruh', key: 'courseName' },
      { header: 'Holati', key: 'status' },
    ];

    const exportRows = data.data.map((p) => ({
      studentName: p.student ? `${p.student.firstName} ${p.student.lastName}` : '-',
      receivedByName: p.receivedBy?.fullName || 'Administrator',
      amount: formatMoney(p.amount),
      paymentDate: formatDate(p.paymentDate),
      method: p.method || 'NAQD',
      courseName: p.course?.name || p.group?.name || '-',
      status: p.status === 'TOLANGAN' ? "TO'LANGAN" : p.status === 'QISMAN' ? 'QISMAN' : "TO'LANMAGAN",
    }));

    exportToExcel({
      filename: `Tolovlar_Tarixi_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Tolovlar',
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
      { header: 'Talaba', key: 'studentName' },
      { header: 'Qabul qildi', key: 'receivedByName' },
      { header: 'Summa', key: 'amount' },
      { header: 'Sana', key: 'paymentDate' },
      { header: 'Usul', key: 'method' },
      { header: 'Kurs/Guruh', key: 'courseName' },
      { header: 'Holat', key: 'status' },
    ];

    const exportRows = data.data.map((p) => ({
      studentName: p.student ? `${p.student.firstName} ${p.student.lastName}` : '-',
      receivedByName: p.receivedBy?.fullName || 'Admin',
      amount: formatMoney(p.amount),
      paymentDate: formatDate(p.paymentDate),
      method: p.method || 'NAQD',
      courseName: p.course?.name || p.group?.name || '-',
      status: p.status === 'TOLANGAN' ? "TO'LANGAN" : p.status === 'QISMAN' ? 'QISMAN' : "TO'LANMAGAN",
    }));

    exportToPdf({
      filename: `Tolovlar_Tarixi_${new Date().toISOString().split('T')[0]}`,
      title: "TO'LOVLAR TARIXI JURNALI",
      columns: exportColumns,
      data: exportRows,
    });
    success('PDF fayl yuklab olindi!');
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <ExportDropdown
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
          />
          <Button icon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
            To'lov qabul qilish
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

      {/* Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="To'lov qabul qilish"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SearchableSelect
            label="Talaba"
            required
            options={studentOptions}
            value={formData.studentId}
            onChange={(val) => {
              const student = students?.data?.find((s) => s.id === val);
              const firstGroup = student?.studentGroups?.[0]?.group;
              setFormData((prev) => ({
                ...prev,
                studentId: val,
                amount: prev.amount || (firstGroup?.course?.price ? String(firstGroup.course.price) : prev.amount),
              }));
            }}
            placeholder="Talabani qidiring yoki tanlang..."
            searchPlaceholder="Ism, familiya yoki telefon raqami bilan qidirish..."
          />

          {selectedStudent && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--card-subtle)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={16} color="var(--primary)" />
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </span>
                </div>
                {selectedStudent.phone && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {formatPhone(selectedStudent.phone)}
                  </span>
                )}
              </div>

              {selectedStudent.studentGroups && selectedStudent.studentGroups.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <BookOpen size={14} />
                    <span>
                      Guruh: <strong style={{ color: 'var(--text)' }}>{selectedStudent.studentGroups[0].group?.name}</strong>
                    </span>
                  </div>
                  {selectedStudent.studentGroups[0].group?.course?.price && (
                    <button
                      type="button"
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: '1px dashed var(--primary)',
                        background: 'rgba(43, 127, 255, 0.08)',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                      onClick={() => {
                        const price = selectedStudent.studentGroups?.[0]?.group?.course?.price;
                        if (price) {
                          setFormData((prev) => ({ ...prev, amount: String(price) }));
                        }
                      }}
                      title="Kurs narxini to'lov summasiga qo'yish"
                    >
                      Kurs narxi: {formatMoney(selectedStudent.studentGroups[0].group.course.price)} (Qo'yish)
                    </button>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Hozirda faol guruhga biriktirilmagan
                </span>
              )}
            </div>
          )}

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
