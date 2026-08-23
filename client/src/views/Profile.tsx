'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building, Mail, Phone, Calendar, Lock, Save } from 'lucide-react';
import { Card } from '../components/ui/Card/Card';
import { Input } from '../components/ui/Input/Input';
import { Button } from '../components/ui/Button/Button';
import { useToast } from '../components/ui/Toast/Toast';
import { centersApi } from '../api/centers.api';
import { formatDate } from '../utils/formatDate';
import { formatPhone, unmaskPhone } from '../utils/phoneMask';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';

export const Profile: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['centerProfile'],
    queryFn: centersApi.getProfile,
  });

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
  });

  // Sync profileForm once loaded
  React.useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => centersApi.updateProfile(data),
    onSuccess: () => {
      success('Markaz ma\'lumotlari yangilandi!');
      queryClient.invalidateQueries({ queryKey: ['centerProfile'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Yangilashda xatolik');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: any) => centersApi.changePassword(data),
    onSuccess: () => {
      success('Parol muvaffaqiyatli o\'zgartirildi!');
      setPasswordForm({ oldPassword: '', newPassword: '' });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Parolni o\'zgartirishda xatolik');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Markaz Profili</h2>

      {/* Top Banner Card */}
      <Card style={{ background: 'var(--primary-grad)', color: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
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
            M
          </div>
          <div>
            <h3 style={{ fontSize: '22px', fontWeight: 800 }}>{profile?.name}</h3>
            <p style={{ fontSize: '13px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {profile?.email}
            </p>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
        {/* Asosiy Malumotlar Form */}
        <Card>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={18} color="var(--primary)" />
            Asosiy malumotlar
          </h3>

          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Markaz Nomi"
              required
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
            />

            <Input
              label="Email"
              type="email"
              required
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            />

            <Input
              label="Markaz Telefon Raqami"
              required
              value={formatPhone(profileForm.phone)}
              onChange={(e) => setProfileForm({ ...profileForm, phone: unmaskPhone(e.target.value) })}
            />

            <Input
              label="Ro'yxatdan O'tgan Sana (Faqat o'qish uchun)"
              disabled
              value={formatDate(profile?.registeredAt)}
              icon={<Calendar size={16} />}
            />

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
            <Input
              label="Eski parol"
              type="password"
              required
              placeholder="••••••••"
              value={passwordForm.oldPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
            />

            <Input
              label="Yangi parol"
              type="password"
              required
              placeholder="••••••••"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            />

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
