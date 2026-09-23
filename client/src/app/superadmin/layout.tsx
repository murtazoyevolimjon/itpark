import React from 'react';
import type { Metadata } from 'next';
import { SuperAdminProvider } from '@/hooks/useSuperAdmin';

export const metadata: Metadata = {
  title: 'Dasturchi Boshqaruv Paneli | Super Admin Core',
  description: "Barcha o'quv markazlarni boshqarish tizimi",
};

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SuperAdminProvider>{children}</SuperAdminProvider>;
}
