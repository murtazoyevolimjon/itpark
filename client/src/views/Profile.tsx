'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building, User, Phone, Calendar, Lock, Save, Eye, EyeOff, GraduationCap, ShieldCheck } from 'lucide-react';
import { Card } from '../components/ui/Card/Card';
import { Input } from '../components/ui/Input/Input';
import { Button } from '../components/ui/Button/Button';
import { useToast } from '../components/ui/Toast/Toast';
import { centersApi } from '../api/centers.api';
import { formatDate } from '../utils/formatDate';
import { formatPhone, unmaskPhone } from '../utils/phoneMask';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import { useAuth } from '../hooks/useAuth';

export const Profile: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['centerProfile'],
    queryFn: centersApi.getProfile,
  });

  const isTeacher = user?.role === 'TEACHER' || profile?.isTeacher;

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
  });

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Sync profileForm once loaded
  React.useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || user?.fullName || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
    }
  }, [profile, user]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => centersApi.updateProfile(data),
    onSuccess: () => {
      success(isTeacher ? "Ma'lumotlaringiz yangilandi!" : "Markaz ma'lumotlari yangilandi!");
      queryClient.invalidateQueries({ queryKey: ['centerProfile'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Yangilashda xatolik');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: any) => centersApi.changePassword(data),
    onSuccess: () => {
      success("Parol muvaffaqiyatli o'zgartirildi!");
      setPasswordForm({ oldPassword: '', newPassword: '' });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "Parolni o'zgartirishda xatolik");
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      ...profileForm,
      phone: unmaskPhone(profileForm.phone),
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.oldPassword || !passwordForm.newPassword) {
      error('Parollarni kiriting');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      error("Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }
    changePasswordMutation.mutate(passwordForm);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Skeleton height="140px" />
        <Skeleton height="300px" />
      </div>
    );
  }

  const initialLetter = (profileForm.name || user?.fullName || (isTeacher ? 'O' : 'M'))
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700 }}>
        {isTeacher ? "Mening Profilim" : "Markaz Profili"}
      </h2>

      {/* Top Banner Card */}
      <Card style={{ background: 'var(--primary-grad)', color: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '28px',
            }}
          >
            {initialLetter}
          </div>
          <div>
            <h3 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>
              {profile?.name || user?.fullName}
            </h3>
            {isTeacher ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', opacity: 0.95, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  O'QITUVCHI • {profile?.centerName || user?.centerName || 'IT Park'}
                </span>
                {(profile?.login || user?.email) && (
                  <span style={{ fontSize: '12px', background: 'rgba(255, 255, 255, 0.25)', padding: '2px 8px', borderRadius: '6px' }}>
                    Login: {profile?.login || user?.email}
                  </span>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '13px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '4px 0 0 0' }}>
                {profile?.email}
              </p>
            )}
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '20px' }}>
        {/* Main Details Form */}
        <Card>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isTeacher ? <GraduationCap size={18} color="var(--primary)" /> : <Building size={18} color="var(--primary)" />}
            {isTeacher ? "Shaxsiy ma'lumotlar" : "Asosiy ma'lumotlar"}
          </h3>

          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label={isTeacher ? "F.I.SH (To'liq ism)" : "Markaz Nomi"}
              required
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
            />

            {/* If TEACHER: show teacher's own login (NEVER center login!) */}
            {isTeacher ? (
              <Input
                label="O'qituvchi logini"
                disabled
                value={profile?.login || user?.email || ''}
              />
            ) : (
              <Input
                label="Email"
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              />
            )}

            <Input
              label={isTeacher ? "Telefon Raqam" : "Markaz Telefon Raqami"}
              required
              value={formatPhone(profileForm.phone)}
              onChange={(e) => setProfileForm({ ...profileForm, phone: unmaskPhone(e.target.value) })}
            />

            {isTeacher ? (
              <Input
                label="Biriktirilgan Markaz"
                disabled
                value={profile?.centerName || user?.centerName || 'IT Park'}
                icon={<Building size={16} />}
              />
            ) : (
              <Input
                label="Ro'yxatdan O'tgan Sana (Faqat o'qish uchun)"
                disabled
                value={formatDate(profile?.registeredAt)}
                icon={<Calendar size={16} />}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button type="submit" icon={<Save size={16} />} isLoading={updateProfileMutation.isPending}>
                SAQLASH
              </Button>
            </div>
          </form>
        </Card>

        {/* Change Password Form */}
        <Card>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} color="var(--primary)" />
            Parolni o'zgartirish
          </h3>

          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Input
                label="Eski parol"
                type={showOldPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '38px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <Input
                label="Yangi parol"
                type={showNewPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '38px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button type="submit" variant="secondary" isLoading={changePasswordMutation.isPending}>
                PAROLNI O'ZGARTIRISH
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
