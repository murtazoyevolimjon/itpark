import React from 'react';
import type { Metadata } from 'next';
import { Providers } from './providers';
import '../styles/global.css';

export const metadata: Metadata = {
  title: 'IT-Park Academy CRM | Yagona boshqaruv tizimi',
  description: "IT Park o'quv markazlari uchun professional CRM tizimi",
  icons: {
    icon: '/crm-logo.png',
    apple: '/crm-logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
