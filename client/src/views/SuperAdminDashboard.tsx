'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Plus,
  Search,
  ExternalLink,
  KeyRound,
  Edit2,
  Trash2,
  Copy,
  Check,
  LogOut,
  Sparkles,
  ShieldCheck,
  Phone,
  Calendar,
  X,
  Lock,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { superadminApi } from '../api/superadmin.api';
import { useSuperAdmin } from '../hooks/useSuperAdmin';
import { useToast } from '../components/ui/Toast/Toast';
import { formatMoney } from '../utils/formatMoney';
import { formatDate } from '../utils/formatDate';
import styles from './SuperAdminDashboard.module.css';

export const SuperAdminDashboard: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useSuperAdmin();
  const { success, error } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<any>(null);

  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [selectedCenterForPass, setSelectedCenterForPass] = useState<any>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCenterForEdit, setSelectedCenterForEdit] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', adminName: '' });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCenterForDelete, setSelectedCenterForDelete] = useState<any>(null);

  // Create Center Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    adminName: '',
    phone: '+998',
    login: '',
    password: '',
  });

  // Query: Centers
  const { data: centersData, isLoading, refetch } = useQuery({
    queryKey: ['superadmin', 'centers'],
    queryFn: superadminApi.getCenters,
  });

  const centers = centersData?.centers || [];

  // Filtered centers
  const filteredCenters = useMemo(() => {
    if (!searchTerm.trim()) return centers;
    const term = searchTerm.toLowerCase();
    return centers.filter(
      (c: any) =>
        c.name?.toLowerCase().includes(term) ||
        c.adminLogin?.toLowerCase().includes(term) ||
        c.phone?.includes(term) ||
        c.adminName?.toLowerCase().includes(term)
    );
  }, [centers, searchTerm]);

  // Aggregated Stats
  const stats = useMemo(() => {
    const totalCenters = centers.length;
    const totalStudents = centers.reduce((sum: number, c: any) => sum + (c.studentsCount || 0), 0);
    const totalGroups = centers.reduce((sum: number, c: any) => sum + (c.groupsCount || 0), 0);
    const totalTeachers = centers.reduce((sum: number, c: any) => sum + (c.teachersCount || 0), 0);
    return { totalCenters, totalStudents, totalGroups, totalTeachers };
  }, [centers]);

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Mutation: Create Center
  const createMutation = useMutation({
    mutationFn: superadminApi.createCenter,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'centers'] });
      setCreatedCredentials({
        name: createForm.name,
        login: data.credentials.login,
        password: data.credentials.password,
      });
      success(`"${createForm.name}" o'quv markazi muvaffaqiyatli yaratildi!`);
      setCreateForm({
        name: '',
        adminName: '',
        phone: '+998',
        login: '',
        password: '',
      });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Markazni yaratishda xatolik');
    },
  });

  // Mutation: Reset Password
  const resetPassMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      superadminApi.updateCenter(id, { newPassword }),
    onSuccess: () => {
      success('Parol muvaffaqiyatli o\'zgartirildi!');
      setIsResetPassModalOpen(false);
      setSelectedCenterForPass(null);
      setNewPasswordInput('');
      refetch();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Parolni o\'zgartirishda xatolik');
    },
  });

  // Mutation: Edit Center
  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      superadminApi.updateCenter(id, data),
    onSuccess: () => {
      success('Markaz ma\'lumotlari saqlandi!');
      setIsEditModalOpen(false);
      setSelectedCenterForEdit(null);
      refetch();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Tahrirlashda xatolik');
    },
  });

  // Mutation: Delete Center
  const deleteMutation = useMutation({
    mutationFn: (id: string) => superadminApi.deleteCenter(id),
    onSuccess: () => {
      success('Markaz o\'chirildi');
      setIsDeleteModalOpen(false);
      setSelectedCenterForDelete(null);
      refetch();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'O\'chirishda xatolik');
    },
  });

  // Mutation: Impersonate (Access Center Dashboard directly)
  const impersonateMutation = useMutation({
    mutationFn: (centerId: string) => superadminApi.impersonateCenter(centerId),
    onSuccess: (data) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', data.tokens.accessToken);
        localStorage.setItem('refreshToken', data.tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      success(`"${data.centerName}" boshqaruviga kirildi!`);
      router.push('/dashboard');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Markazga kirishda xatolik');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.login || !createForm.password) {
      error('Barcha majburiy maydonlarni to\'ldiring');
      return;
    }
    createMutation.mutate(createForm);
  };

  const handleResetPassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput.trim() || !selectedCenterForPass) return;
    resetPassMutation.mutate({
      id: selectedCenterForPass.id,
      newPassword: newPasswordInput.trim(),
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCenterForEdit) return;
    editMutation.mutate({
      id: selectedCenterForEdit.id,
      data: editForm,
    });
  };

  return (
    <div className={styles.container}>
      {/* TOP NAVIGATION BAR */}
      <header className={styles.navbar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <Sparkles size={22} />
          </div>
          <div>
            <div className={styles.brandTitle}>Dasturchi Boshqaruv Markazi</div>
            <div className={styles.brandBadge}>SaaS Super Admin Core</div>
          </div>
        </div>

        <div className={styles.navActions}>
          <button
            className={styles.addBtn}
            onClick={() => {
              setCreatedCredentials(null);
              setIsCreateModalOpen(true);
            }}
          >
            <Plus size={18} />
            <span>Yangi O&apos;quv Markaz Qo&apos;shish</span>
          </button>

          <a href="/dashboard" className={styles.secondaryBtn}>
            <ExternalLink size={16} />
            <span>CRM Paneli</span>
          </a>

          <button className={styles.logoutBtn} onClick={logout} title="Chiqish">
            <LogOut size={16} />
            <span>Chiqish</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className={styles.main}>
        {/* HERO BANNER */}
        <div className={styles.heroBanner}>
          <div className={styles.heroContent}>
            <h2>Multi-Tenant O&apos;quv Markazlar Tarmog&apos;i</h2>
            <p>
              Har bir o&apos;quv markaz to&apos;liq mustaqil: o&apos;z login/paroli, o&apos;z talabalari,
              guruhlari va to&apos;lovlari bilan ishlaydi. Ma&apos;lumotlar mutlaqo aralashib ketmaydi.
            </p>
          </div>
          <div className={styles.heroTag}>
            <ShieldCheck size={16} />
            <span>Izolyatsiyalangan Baza</span>
          </div>
        </div>

        {/* METRICS STATS GRID */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statIconWrap} ${styles.iconCenters}`}>
              <Building2 size={26} />
            </div>
            <div>
              <div className={styles.statValue}>{stats.totalCenters}</div>
              <div className={styles.statLabel}>Jami O&apos;quv Markazlar</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIconWrap} ${styles.iconStudents}`}>
              <Users size={26} />
            </div>
            <div>
              <div className={styles.statValue}>{stats.totalStudents}</div>
              <div className={styles.statLabel}>Barcha Talabalar</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIconWrap} ${styles.iconGroups}`}>
              <BookOpen size={26} />
            </div>
            <div>
              <div className={styles.statValue}>{stats.totalGroups}</div>
              <div className={styles.statLabel}>Faol Guruhlar</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIconWrap} ${styles.iconTeachers}`}>
              <GraduationCap size={26} />
            </div>
            <div>
              <div className={styles.statValue}>{stats.totalTeachers}</div>
              <div className={styles.statLabel}>Jami O&apos;qituvchilar</div>
            </div>
          </div>
        </div>

        {/* CONTROLS BAR */}
        <div className={styles.controlsBar}>
          <div className={styles.searchBox}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Markaz nomi, admin logini yoki telefon bo'yicha qidirish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className={styles.centersCountBadge}>
            Ko&apos;rsatilmoqda: <strong>{filteredCenters.length}</strong> ta o&apos;quv markaz
          </div>
        </div>

        {/* CENTERS GRID */}
        <div className={styles.centersGrid}>
          {isLoading ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateSub}>Markazlar yuklanmoqda...</p>
            </div>
          ) : filteredCenters.length === 0 ? (
            <div className={styles.emptyState}>
              <Building2 size={40} color="#64748b" />
              <div className={styles.emptyStateTitle}>Hech qanday o&apos;quv markaz topilmadi</div>
              <p className={styles.emptyStateSub}>
                Yangi markaz qo&apos;shish uchun yuqoridagi tugmani bosing.
              </p>
            </div>
          ) : (
            filteredCenters.map((center: any) => {
              const initialLetter = (center.name || 'M')[0]?.toUpperCase();
              return (
                <div
                  key={center.id}
                  className={`${styles.centerCard} ${center.isMainCenter ? styles.mainCenterBorder : ''}`}
                >
                  {/* CARD HEADER */}
                  <div className={styles.centerTop}>
                    <div className={styles.centerAvatar}>{initialLetter}</div>
                    <div className={styles.centerMeta}>
                      <h3 className={styles.centerName}>
                        <span>{center.name}</span>
                        {center.isMainCenter ? (
                          <span className={styles.badgeMain}>Asosiy Markaz</span>
                        ) : (
                          <span className={styles.badgeActive}>Faol</span>
                        )}
                      </h3>
                      <p className={styles.centerAdmin}>
                        Mas&apos;ul: <strong>{center.adminName || 'Admin'}</strong>
                      </p>
                    </div>
                  </div>

                  {/* CREDENTIALS INFO */}
                  <div className={styles.credsBox}>
                    <div className={styles.credRow}>
                      <span className={styles.credLabel}>Kirish logini:</span>
                      <span className={styles.credValue}>
                        {center.adminLogin}
                        <button
                          className={styles.copyBtn}
                          onClick={() => handleCopy(center.adminLogin, `login-${center.id}`)}
                          title="Loginni nusxalash"
                        >
                          {copiedKey === `login-${center.id}` ? (
                            <Check size={14} color="#34d399" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </span>
                    </div>

                    <div className={styles.credRow}>
                      <span className={styles.credLabel}>Telefon:</span>
                      <span className={styles.credValue}>{center.phone || '-'}</span>
                    </div>

                    <div className={styles.credRow}>
                      <span className={styles.credLabel}>Yaratilgan:</span>
                      <span className={styles.credValue}>
                        {center.registeredAt ? formatDate(center.registeredAt) : '-'}
                      </span>
                    </div>
                  </div>

                  {/* LIVE STATS COUNTERS */}
                  <div className={styles.centerCounters}>
                    <div className={styles.counterItem}>
                      <div className={styles.counterNumber}>{center.studentsCount}</div>
                      <div className={styles.counterTitle}>Talabalar</div>
                    </div>
                    <div className={styles.counterItem}>
                      <div className={styles.counterNumber}>{center.groupsCount}</div>
                      <div className={styles.counterTitle}>Guruhlar</div>
                    </div>
                    <div className={styles.counterItem}>
                      <div className={styles.counterNumber}>{center.teachersCount}</div>
                      <div className={styles.counterTitle}>Ustozlar</div>
                    </div>
                  </div>

                  {/* ACTIONS FOOTER */}
                  <div className={styles.centerActions}>
                    <button
                      className={styles.impersonateBtn}
                      onClick={() => impersonateMutation.mutate(center.id)}
                      disabled={impersonateMutation.isPending}
                      title="Ushbu markaz boshqaruv paneliga to'g'ridan-to'g'ri kirish"
                    >
                      <ExternalLink size={15} />
                      <span>Markazga Kirish</span>
                    </button>

                    <button
                      className={styles.actionIconBtn}
                      onClick={() => {
                        setSelectedCenterForPass(center);
                        setNewPasswordInput('');
                        setIsResetPassModalOpen(true);
                      }}
                      title="Parolni yangilash"
                    >
                      <KeyRound size={16} />
                    </button>

                    <button
                      className={styles.actionIconBtn}
                      onClick={() => {
                        setSelectedCenterForEdit(center);
                        setEditForm({
                          name: center.name,
                          phone: center.phone || '',
                          adminName: center.adminName || '',
                        });
                        setIsEditModalOpen(true);
                      }}
                      title="Tahrirlash"
                    >
                      <Edit2 size={16} />
                    </button>

                    <button
                      className={`${styles.actionIconBtn} ${styles.deleteIconBtn}`}
                      onClick={() => {
                        setSelectedCenterForDelete(center);
                        setIsDeleteModalOpen(true);
                      }}
                      disabled={center.isMainCenter}
                      title={
                        center.isMainCenter
                          ? "IT Park asosiy markazini o'chirib bo'lmaydi"
                          : "Markazni o'chirish"
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* MODAL 1: YANGI O'QUV MARKAZ QO'SHISH */}
      {isCreateModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Yangi O&apos;quv Markaz Qo&apos;shish</h3>
              <button
                className={styles.closeModalBtn}
                onClick={() => setIsCreateModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {createdCredentials ? (
              <div className={styles.successCredentialsBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700 }}>
                  <Check size={20} />
                  <span>Markaz muvaffaqiyatli ochildi!</span>
                </div>
                <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0 }}>
                  Ushbu login va parolni yangi o&apos;quv markaz ma&apos;muriyatiga yuboring:
                </p>

                <div className={styles.successCredItem}>
                  <span>Markaz nomi:</span>
                  <strong>{createdCredentials.name}</strong>
                </div>
                <div className={styles.successCredItem}>
                  <span>Login:</span>
                  <strong>{createdCredentials.login}</strong>
                </div>
                <div className={styles.successCredItem}>
                  <span>Parol:</span>
                  <strong>{createdCredentials.password}</strong>
                </div>

                <button
                  type="button"
                  className={styles.copyAllBtn}
                  onClick={() => {
                    const text = `🎉 Yangi O'quv Markaz tizimi ochildi!\n🏢 Markaz: ${createdCredentials.name}\n🔑 Login: ${createdCredentials.login}\n🔒 Parol: ${createdCredentials.password}\n🌐 Kirish sahifasi: ${window.location.origin}/login`;
                    handleCopy(text, 'all-creds');
                    success('Login va parol nusxalandi! Telegram orqali yuborishingiz mumkin.');
                  }}
                >
                  {copiedKey === 'all-creds' ? <Check size={16} /> : <Copy size={16} />}
                  <span>Ma&apos;lumotlarni nusxalash (Telegram uchun)</span>
                </button>

                <button
                  type="button"
                  className={styles.modalSubmitBtn}
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setCreatedCredentials(null);
                  }}
                >
                  Tushundim, yakunlash
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} className={styles.modalForm} autoComplete="off">
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>O&apos;quv Markaz Nomi *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Masalan: Najot Ta'lim, PDP Academy, Registon"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Mas&apos;ul Shaxs (Ism-Familiya)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Masalan: Dilshod Rahimov"
                    value={createForm.adminName}
                    onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Aloqa Telefoni</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="+998 90 123 45 67"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Kirish Logini *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Masalan: NAJOT_admin yoki najot@edu.uz"
                    value={createForm.login}
                    onChange={(e) => setCreateForm({ ...createForm, login: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Dastlabki Parol *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Masalan: markaz2026! yoki qwerty321"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className={styles.modalSubmitBtn}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Yaratilmoqda...' : 'Markazni Yaratish'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: PAROLNI YANGILASH */}
      {isResetPassModalOpen && selectedCenterForPass && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Parolni Yangilash</h3>
              <button
                className={styles.closeModalBtn}
                onClick={() => setIsResetPassModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
              <strong>{selectedCenterForPass.name}</strong> markazi uchun yangi parol belgilang:
            </p>

            <form onSubmit={handleResetPassSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Yangi Parol</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Yangi parolni kiriting"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className={styles.modalSubmitBtn}
                disabled={resetPassMutation.isPending}
              >
                {resetPassMutation.isPending ? 'Saqlanmoqda...' : 'Yangi Parolni Saqlash'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TAHRIRLASH */}
      {isEditModalOpen && selectedCenterForEdit && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Markazni Tahrirlash</h3>
              <button
                className={styles.closeModalBtn}
                onClick={() => setIsEditModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Markaz Nomi</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Mas&apos;ul Shaxs</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={editForm.adminName}
                  onChange={(e) => setEditForm({ ...editForm, adminName: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Telefon</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className={styles.modalSubmitBtn}
                disabled={editMutation.isPending}
              >
                {editMutation.isPending ? 'Saqlanmoqda...' : 'O\'zgarishlarni Saqlash'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: O'CHIRISHNI TASDIQLASH */}
      {isDeleteModalOpen && selectedCenterForDelete && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} style={{ color: '#f87171' }}>
                Markazni O&apos;chirish
              </h3>
              <button
                className={styles.closeModalBtn}
                onClick={() => setIsDeleteModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <AlertTriangle size={24} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '14px', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
                Haqiqatan ham <strong>&quot;{selectedCenterForDelete.name}&quot;</strong> o&apos;quv
                markazini o&apos;chirmoqchimisiz? Ushbu markazga tegishli barcha talabalar, guruhlar
                va to&apos;lovlar o&apos;chiriladi.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                className={styles.secondaryBtn}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Bekor qilish
              </button>
              <button
                type="button"
                className={styles.modalSubmitBtn}
                style={{
                  flex: 1,
                  background: '#ef4444',
                  marginTop: 0,
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                }}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(selectedCenterForDelete.id)}
              >
                {deleteMutation.isPending ? 'O\'chirilmoqda...' : 'Ha, o\'chirilsin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
