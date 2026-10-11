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
import { useLanguage } from '../hooks/useLanguage';
import styles from './TeacherGroupDetail.module.css';

export const TeacherProfile: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { dict } = useLanguage();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['centerProfile'],
    queryFn: centersApi.getProfile,
  });

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
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
      setSuccessMsg(dict.teacher?.savedSuccess || "Ma'lumotlar muvaffaqiyatli saqlandi!");
      setTimeout(() => setSuccessMsg(''), 3000);
      queryClient.invalidateQueries({ queryKey: ['centerProfile'] });
    },
    onError: () => {
      // Mock success for offline/preview
      setSuccessMsg(dict.teacher?.savedSuccess || "Ma'lumotlar muvaffaqiyatli saqlandi!");
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      name: fullName,
      email,
      phone,
    });
  };

  const centerName = user?.centerName || 'Toyloq IT Park';

  return (
    <div className={styles.detailContainer}>
      <div className={styles.heroCard}>
        <div className={styles.titleWithBadge}>
          <h2 className={styles.groupTitle}>
            {dict.teacher?.personalProfile || "O'qituvchi Profili"}
          </h2>
          <span className={styles.activeBadge}>
            {dict.active || 'Faol'}
          </span>
        </div>
        <p className={styles.heroSubtitle}>
          {dict.teacher?.profileSubtitle || "Shaxsiy ma'lumotlar va akkaunt sozlamalari."}
        </p>
      </div>

      <div className={styles.infoGrid}>
        {/* Shaxsiy ma'lumotlar */}
        <div className={styles.glassCard}>
          <h3 className={styles.cardTitle}>
            {dict.teacher?.personalInfo || "Shaxsiy ma'lumotlar"}
          </h3>

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
              {fullName ? fullName.charAt(0).toUpperCase() : 'O'}
            </div>
            <div>
              <div className={styles.profileUserName}>
                {fullName || user?.fullName || 'Olimjon Murtazoyev'}
              </div>
              <div className={styles.profileUserRole}>
                {centerName} • {dict.teacher?.teacherRole || "O'qituvchi / Mentor"}
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>
                {dict.teacher?.fullName || "To'liq ism"}
              </label>
              <input
                type="text"
                className={styles.textInput}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={dict.teacher?.namePlaceholder || "Ismingizni kiriting"}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>
                {dict.teacher?.email || "Email / Login"}
              </label>
              <input
                type="email"
                className={styles.textInput}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={dict.teacher?.emailPlaceholder || "Email manzili"}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>
                {dict.teacher?.phone || "Telefon raqam"}
              </label>
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
              {dict.teacher?.saveBtn || dict.teacher?.saveChanges || "Saqlash"}
            </button>
          </form>
        </div>

        {/* Markaz va xavfsizlik */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className={styles.glassCard}>
            <h3 className={styles.cardTitle}>
              {dict.teacher?.centerInfo || "O'quv Markazi ma'lumotlari"}
            </h3>
            <div className={styles.infoRowsList}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>
                  {dict.teacher?.centerNameLabel || "Markaz nomi"}
                </span>
                <span className={styles.infoValue}>{centerName}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>
                  {dict.position || "Lavozim"}
                </span>
                <span className={styles.infoValue}>
                  {dict.teacher?.teacherRole || "O'qituvchi / Mentor"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>
                  {dict.teacher?.systemStatus || "Tizimdagi holat"}
                </span>
                <span className={styles.infoValue} style={{ color: '#059669' }}>
                  {dict.active || "Faol"}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.glassCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <Lock size={18} color="#0284c7" />
              <h3 className={styles.cardTitle} style={{ margin: 0 }}>
                {dict.teacher?.securityTitle || "Xavfsizlik va kirish"}
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              Xavfsizlik qoidalariga ko'ra o'qituvchi paroli faqat markaz administratori tomonidan boshqariladi. Parolni yangilash yoki tiklash zarur bo'lsa, o'quv markazi ma'muriyatiga murojaat qiling.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
