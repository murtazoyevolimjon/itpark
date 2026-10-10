import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import '../styles/global.css';

const siteUrl = 'https://itpark-pi.vercel.app';

export const viewport: Viewport = {
  themeColor: '#070d19',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Markaz CRM — O'quv Markazlari Uchun Aqlli Boshqaruv Tizimi va AI Davomat",
    template: "%s | Markaz CRM Platform",
  },
  description:
    "O'quv markazlar, til maktablari (IELTS, CEFR), IT akademiyalar va repetitorlik markazlari uchun professional CRM tizimi. Sun'iy intellekt (AI) yordamchi, 1-klikda davomat, guruhlar jadvali, to'lovlar, kassa va qarzdorlik nazorati.",
  applicationName: 'Markaz CRM Platform',
  authors: [
    {
      name: 'Olimjon Murtazoyev',
      url: 'https://t.me/Olimjon_Otabekovich',
    },
  ],
  generator: 'Next.js',
  keywords: [
    "o'quv markaz crm",
    "oquv markaz crm tizimi",
    "crm dasturi o'quv markaz uchun",
    "it park crm",
    "markaz crm",
    "crm tizimi uzbekistan",
    "o'quv markazi avtomatlashtirish",
    "kunlik davomat dasturi",
    "o'quvchilar davomati",
    "til markazi crm",
    "ielts markaz dasturi",
    "repetitor crm",
    "moliya va kassa dasturi",
    "sun'iy intellekt crm",
    "ai yordamchi ta'lim",
    "crm система для учебных центров",
    "автоматизация учебного центра узбекистан",
    "учет студентов и посещаемости",
    "crm для языковых школ",
    "learning center crm",
    "education crm uzbekistan",
    "Olimjon Murtazoyev",
  ],
  referrer: 'origin-when-cross-origin',
  creator: 'Olimjon Murtazoyev',
  publisher: 'Markaz CRM Platform',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "Markaz CRM — O'quv Markazlari Uchun Aqlli Boshqaruv Tizimi",
    description:
      "Barcha turdagi o'quv markazlar, til maktablari va IT akademiyalar uchun yagona aqlli CRM: Sun'iy Intellekt (AI), 1-klikda davomat, kassa va talabalar boshqaruvi.",
    url: siteUrl,
    siteName: 'Markaz CRM Platform',
    images: [
      {
        url: '/crm-logo.png',
        width: 800,
        height: 800,
        alt: 'Markaz CRM Logo',
      },
    ],
    locale: 'uz_UZ',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Markaz CRM — O'quv Markazlari Uchun Aqlli Boshqaruv Tizimi",
    description:
      "O'quv markazlar, til maktablari va IT akademiyalar uchun yagona aqlli CRM va AI davomat tizimi.",
    images: ['/crm-logo.png'],
    creator: '@Olimjon_Otabekovich',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/crm-logo.png',
    shortcut: '/crm-logo.png',
    apple: '/crm-logo.png',
  },
  category: 'technology',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Markaz CRM Platform',
  operatingSystem: 'All (Web, Android, iOS, Windows, macOS)',
  applicationCategory: 'BusinessApplication, EducationalApplication',
  description:
    "O'quv markazlar, til maktablari, IT akademiyalar va repetitorlik markazlari uchun professional CRM tizimi va Sun'iy Intellekt (AI) yordamchi.",
  url: siteUrl,
  image: `${siteUrl}/crm-logo.png`,
  author: {
    '@type': 'Person',
    name: 'Olimjon Murtazoyev',
    url: 'https://t.me/Olimjon_Otabekovich',
    telephone: '+998885790309',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'UZS',
  },
  featureList: [
    "Sun'iy Intellekt (AI) Yordamchi",
    "1-klikda Kunlik Tezkor Davomat",
    "Guruhlar va Dars Jadvali Boshqaruvi",
    "Avtomatlashtirilgan Kassa va Qarzdorlik Tizimi",
    "O'qituvchilar va Ma'muriyat Shaxsiy Kabinetlari",
    "Barcha qurilmalarda 24/7 bulutli ishlash",
  ],
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: "Markaz CRM qaysi turdagi o'quv markazlariga mos keladi?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Tizim barcha ta'lim yo'nalishlariga moslashtirilgan: xorijiy til markazlari (IELTS, CEFR, Ingliz, Rus, Koreys), IT va dasturlash akademiyalari, abituriyent tayyorlov markazlari, maktab fanlari, bolalar to'garaklari va repetitorlar uchun 100% qulay.",
      },
    },
    {
      '@type': 'Question',
      name: 'Kunlik davomat olish qanday amalga oshiriladi?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "O'qituvchi o'z kabinetida bir klik bilan Bor, Yo'q, Kech qoldi yoki Sababli deb belgilaydi. Dars davomati foizi va oylik jurnallar real vaqtda avtomatik hisoblanadi.",
      },
    },
    {
      '@type': 'Question',
      name: "Sun'iy Intellekt (AI) qanday amaliy yordam beradi?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "O'rnatilgan AI yordamchi markazning umumiy holatini tahlil qiladi, muntazam dars qoldirayotgan yoki o'qishni to'xtatish xavfi bor o'quvchilarni erta aniqlaydi va qarzdorlik muvozanati bo'yicha amaliy maslahatlar beradi.",
      },
    },
    {
      '@type': 'Question',
      name: 'Tizimdan telefon va planshetda foydalanish mumkinmi?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Albatta! Platforma to'liq bulutli bo'lib, har qanday smartfon, planshet va kompyuter brauzerida 24/7 qulay ishlaydi.",
      },
    },
    {
      '@type': 'Question',
      name: "O'quv markazimizga tizimni qanday ulaymiz va sinab ko'ramiz?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Dasturchi bilan telefon (+998 88 579 03 09) yoki Telegram (@Olimjon_Otabekovich) orqali bog'lanishingiz mumkin. Tizim qisqa vaqtda sozlab beriladi.",
      },
    },
  ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
