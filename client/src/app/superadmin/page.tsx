'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { SuperAdminDashboard } from '@/views/SuperAdminDashboard';

export default function SuperAdminPage() {
  const { isAuthenticated, isLoading } = useSuperAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/superadmin/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#090d16',
          color: '#94a3b8',
          fontFamily: 'sans-serif',
          fontSize: '15px',
        }}
      >
        Dasturchi tizimi yuklanmoqda...
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <SuperAdminDashboard />;
}
