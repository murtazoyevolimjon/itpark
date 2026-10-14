'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Eye,
  EyeOff,
  HardDrive,
  Database,
  RefreshCw,
  Activity,
  BarChart3,
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
  const [showPasswords, setShowPasswords] = useState<{ [id: string]: boolean }>({});

  const toggleShowPassword = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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

  // DB Stats refresh counter
  const [dbRefreshTick, setDbRefreshTick] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Query: Centers
  const { data: centersData, isLoading, refetch } = useQuery({
    queryKey: ['superadmin', 'centers'],
    queryFn: superadminApi.getCenters,
  });

  // Query: DB Stats
  const { data: dbStats, refetch: refetchDbStats } = useQuery({
    queryKey: ['superadmin', 'db-stats', dbRefreshTick],
    queryFn: superadminApi.getDbStats,
    staleTime: 55_000,
  });

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setDbRefreshTick((prev) => prev + 1);
      setLastRefreshed(new Date());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetchDbStats();
    setLastRefreshed(new Date());
    setTimeout(() => setIsRefreshing(false), 600);
  }, [refetchDbStats]);

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
            <span className={styles.addBtnTextDesktop}>Yangi O&apos;quv Markaz Qo&apos;shish</span>
            <span className={styles.addBtnTextMobile}>+ Yangi Markaz</span>
          </button>

          <a href="/dashboard" className={styles.secondaryBtn} title="CRM Paneli">
            <ExternalLink size={16} />
            <span className={styles.navBtnText}>CRM</span>
          </a>

          <button className={styles.logoutBtn} onClick={logout} title="Chiqish">
            <LogOut size={16} />
            <span className={styles.navBtnText}>Chiqish</span>
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

        {/* DATABASE STORAGE MONITOR */}
        <div className={styles.storagePanel}>
          {/* Panel Header */}
          <div className={styles.storagePanelHeader}>
            <div className={styles.storagePanelTitle}>
              <div className={styles.storageIconWrap}>
                <HardDrive size={20} />
              </div>
              <div>
                <div className={styles.storageTitleText}>Supabase Database Monitoring</div>
                <div className={styles.storageTitleSub}>
                  Yangilandi: {lastRefreshed.toLocaleTimeString('uz-UZ')}
                  {' · '}
                  <span className={styles.autoRefreshBadge}>
                    <Activity size={11} />
                    Har 60 soniyada yangilanadi
                  </span>
                </div>
              </div>
            </div>
            <button
              className={`${styles.refreshBtn} ${isRefreshing ? styles.refreshBtnSpin : ''}`}
              onClick={handleManualRefresh}
              title="Hozir yangilash"
            >
              <RefreshCw size={16} />
              <span>Yangilash</span>
            </button>
          </div>

          {/* Main Storage Row */}
          <div className={styles.storageMainRow}>
            {/* Big Progress Circle + Info */}
            <div className={styles.storageCircleWrap}>
              <div className={styles.storageCircleContainer}>
                <svg viewBox="0 0 120 120" className={styles.storageCircleSvg}>
                  <circle
                    cx="60" cy="60" r="52"
                    fill="none"
                    stroke="rgba(255,255,255,0.07)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="60" cy="60" r="52"
                    fill="none"
                    stroke={
                      (dbStats?.usagePercent || 0) > 80 ? '#ef4444' :
                      (dbStats?.usagePercent || 0) > 60 ? '#f59e0b' : '#22c55e'
                    }
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 52}`}
                    strokeDashoffset={`${2 * Math.PI * 52 * (1 - (dbStats?.usagePercent || 0) / 100)}`}
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                </svg>
                <div className={styles.storageCircleInner}>
                  <div className={styles.storagePercent}>
                    {dbStats ? `${dbStats.usagePercent}%` : '—'}
                  </div>
                  <div className={styles.storagePercentLabel}>ishlatilgan</div>
                </div>
              </div>
            </div>

            {/* Usage Details */}
            <div className={styles.storageDetails}>
              <div className={styles.storageDetailCard}>
                <div className={styles.storageDetailIcon} style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                  <Database size={18} />
                </div>
                <div>
                  <div className={styles.storageDetailVal}>
                    {dbStats ? `${dbStats.usedMB.toFixed(1)} MB` : '...'}
                  </div>
                  <div className={styles.storageDetailKey}>Ishlatilgan hajm</div>
                </div>
              </div>

              <div className={styles.storageDetailCard}>
                <div className={styles.storageDetailIcon} style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>
                  <HardDrive size={18} />
                </div>
                <div>
                  <div className={styles.storageDetailVal}>
                    {dbStats ? `${dbStats.limitMB} MB` : '500 MB'}
                  </div>
                  <div className={styles.storageDetailKey}>Jami limit (Free)</div>
                </div>
              </div>

              <div className={styles.storageDetailCard}>
                <div className={styles.storageDetailIcon} style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                  <BarChart3 size={18} />
                </div>
                <div>
                  <div className={styles.storageDetailVal}>
                    {dbStats ? `${(dbStats.limitMB - dbStats.usedMB).toFixed(1)} MB` : '...'}
                  </div>
                  <div className={styles.storageDetailKey}>Bo'sh qolgan joy</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className={styles.storageBarWrap}>
                <div className={styles.storageBarLabel}>
                  <span>0 MB</span>
                  <span>{dbStats ? `${dbStats.usedMB.toFixed(1)} / ${dbStats.limitMB} MB` : 'yuklanmoqda...'}</span>
                  <span>500 MB</span>
                </div>
                <div className={styles.storageBarTrack}>
                  <div
                    className={styles.storageBarFill}
                    style={{
                      width: `${dbStats?.usagePercent || 0}%`,
                      background:
                        (dbStats?.usagePercent || 0) > 80
                          ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                          : (dbStats?.usagePercent || 0) > 60
                          ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                          : 'linear-gradient(90deg, #22c55e, #16a34a)',
                    }}
                  />
                </div>
                {(dbStats?.usagePercent || 0) > 80 && (
                  <div className={styles.storageWarning}>
                    <AlertTriangle size={13} />
                    <span>Disk joyi 80% dan oshdi! Upgrade rejasini ko&apos;rib chiqing.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Table Row Counts */}
            {dbStats?.rowCounts && (
              <div className={styles.storageTableCounts}>
                <div className={styles.storageTableCountsTitle}>
                  <BarChart3 size={14} /> Jadvallar bo&apos;yicha yozuvlar
                </div>
                <div className={styles.storageTableList}>
                  {([
                    { key: 'students', label: "O'quvchilar", color: '#60a5fa' },
                    { key: 'attendance', label: 'Davomat', color: '#34d399' },
                    { key: 'payments', label: "To'lovlar", color: '#a78bfa' },
                    { key: 'groups', label: 'Guruhlar', color: '#f472b6' },
                    { key: 'teachers', label: "O'qituvchilar", color: '#fb923c' },
                    { key: 'users', label: 'Foydalanuvchilar', color: '#38bdf8' },
                    { key: 'expenses', label: 'Xarajatlar', color: '#facc15' },
                    { key: 'centers', label: 'Markazlar', color: '#4ade80' },
                  ] as Array<{ key: string; label: string; color: string }>).map(({ key, label, color }) => {
                    const count = dbStats.rowCounts[key] || 0;
                    const maxCount = Math.max(...Object.values(dbStats.rowCounts as Record<string, number>), 1);
                    const pct = Math.min((count / maxCount) * 100, 100);
                    return (
                      <div key={key} className={styles.storageTableRow}>
                        <span className={styles.storageTableRowLabel}>{label}</span>
                        <div className={styles.storageTableRowBar}>
                          <div
                            className={styles.storageTableRowFill}
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                        <span className={styles.storageTableRowCount}>{count.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
                      <span className={styles.credLabel}>Parol:</span>
                      <span className={styles.credValue}>
                        {center.adminPassword ? (
                          <>
                            <span style={{ color: '#38bdf8', letterSpacing: showPasswords[center.id] ? 'normal' : '2px', fontWeight: 700 }}>
                              {showPasswords[center.id] ? center.adminPassword : '••••••••'}
                            </span>
                            <button
                              className={styles.copyBtn}
                              onClick={() => toggleShowPassword(center.id)}
                              title={showPasswords[center.id] ? "Yashirish" : "Ko'rsatish"}
                            >
                              {showPasswords[center.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button
                              className={styles.copyBtn}
                              onClick={() => handleCopy(center.adminPassword, `pass-${center.id}`)}
                              title="Parolni nusxalash"
                            >
                              {copiedKey === `pass-${center.id}` ? (
                                <Check size={14} color="#34d399" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCenterForPass(center);
                              setNewPasswordInput('');
                              setIsResetPassModalOpen(true);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#818cf8',
                              fontSize: '11px',
                              cursor: 'pointer',
                              padding: 0,
                              textDecoration: 'underline',
                            }}
                          >
                            Parolni belgilash
                          </button>
                        )}
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
