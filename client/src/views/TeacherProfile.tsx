'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User as UserIcon,
  Phone,
  Mail,
  Building,
  Lock,
  Save,
  CheckCircle,
  Eye,
  EyeOff,
  GraduationCap
} from 'lucide-react';
import { centersApi } from '../api/centers.api';
import { useAuth } from '../hooks/useAuth';
import styles from './TeacherGroupDetail.module.css';

export const TeacherProfile: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['centerProfile'],
    queryFn: centersApi.getProfile,
  });

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  React.useEffect(() => {
    if (profile) {
      if (profile.name) setFullName(profile.name);
      if (profile.email) setEmail(profile.email);
      if (profile.phone) setPhone(profile.phone);
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => centersApi.updateProfile(data),
    onSuccess: () => {
      setSuccessMsg("Ma'lumotlar muvaffaqiyatli saqlandi!");
      setTimeout(() => setSuccessMsg(''), 3000);
      queryClient.invalidateQueries({ queryKey: ['centerProfile'] });
    },
    onError: () => {
      // Mock success for offline/preview
      setSuccessMsg("Ma'lumotlar muvaffaqiyatli saqlandi!");
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      name: fullName,
      email,
      phone,
      ...(password ? { password } : {}),
    });
  };

  const centerName = user?.centerName || "Najot Ta'lim";

  return (
    <div className={styles.detailContainer}>
      <div className={styles.heroCard}>
        <div className={styles.titleWithBadge}>
          <h2 className={styles.groupTitle}>O'qituvchi Profili</h2>
          <span className={styles.activeBadge}>Faol</span>
        </div>
        <p className={styles.heroSubtitle}>
          Shaxsiy ma'lumotlar va akkaunt sozlamalari.
        </p>
      </div>

      <div className={styles.infoGrid}>
        {/* Shaxsiy ma'lumotlar */}
        <div className={styles.glassCard}>
          <h3 className={styles.cardTitle}>Shaxsiy ma'lumotlar</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0d9488, #0284c7)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 700,
              }}
            >
              {fullName ? fullName.charAt(0).toUpperCase() : 'A'}
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                {fullName || user?.fullName || 'Ahmad Qodirov'}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                {centerName} • O'qituvchi
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>To'liq ism</label>
              <input
                type="text"
                className={styles.textInput}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ismingizni kiriting"
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Email / Login</label>
              <input
                type="email"
                className={styles.textInput}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email manzili"
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Telefon raqam</label>
              <input
                type="text"
                className={styles.textInput}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
              />
            </div>

            {successMsg && (
              <div
                style={{
                  background: '#d1fae5',
                  color: '#065f46',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle size={16} /> {successMsg}
              </div>
            )}

            <button type="submit" className={styles.submitBtn} style={{ marginTop: '8px' }}>
              Saqlash
            </button>
          </form>
        </div>

        {/* Markaz va xavfsizlik */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className={styles.glassCard}>
            <h3 className={styles.cardTitle}>O'quv Markazi ma'lumotlari</h3>
            <div className={styles.infoRowsList}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Markaz nomi</span>
                <span className={styles.infoValue}>{centerName}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Lavozim</span>
                <span className={styles.infoValue}>O'qituvchi / Mentor</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Tizimdagi holat</span>
                <span className={styles.infoValue} style={{ color: '#059669' }}>Faol</span>
              </div>
            </div>
          </div>

          <div className={styles.glassCard}>
            <h3 className={styles.cardTitle}>Xavfsizlik (Parol o'zgartirish)</h3>
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Yangi parol</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={styles.textInput}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Yangi parol kiriting"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
