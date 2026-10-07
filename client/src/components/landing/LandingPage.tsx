'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogIn,
  Search,
  ArrowRight,
  Shield,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Lock,
  User,
  Eye,
  EyeOff,
  X,
  Send,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast/Toast';
import { useLanguage } from '../../hooks/useLanguage';
import styles from './LandingPage.module.css';

interface LandingPageProps {
  initialLoginOpen?: boolean;
}

interface StepItem {
  id: string;
  stepNum: string;
  tag: string;
  title: string;
  desc: string;
  note: string;
}

interface TabGuide {
  id: string;
  title: string;
  bannerTitle: string;
  bannerSub: string;
  steps: StepItem[];
}

export const LandingPage: React.FC<LandingPageProps> = ({ initialLoginOpen = false }) => {
  const router = useRouter();
  const { loginWithCredentials, isAuthenticated, user } = useAuth();
  const { success, error, info } = useToast();
  const { t } = useLanguage();

  // State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(initialLoginOpen);
  const [activeTab, setActiveTab] = useState('teacher');
  const [searchQuery, setSearchQuery] = useState('');

  // Login form state
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Tab Guides Data
  const tabGuides: TabGuide[] = [
    {
      id: 'teacher',
      title: "Sinf Rahbari (Mentor) Qo'llanmasi",
      bannerTitle: "Sinf Rahbari (O'qituvchi / Mentor) Uchun To'liq Yo'riqnoma",
      bannerSub: "Darsga biriktirilgan talabalar, kunlik interaktiv davomat, platformalar va eksport bo'yicha qadamma-qadam yo'riqnoma",
      steps: [
        {
          id: 't-1',
          stepNum: 'QADAM 01',
          tag: 'Mentor Kabineti',
          title: "Kabinetga kirish va 4 xonali PIN-kod o'rnatish",
          desc: "Administrator tomonidan berilgan login va parol orqali tizimga kiring. Xavfsizlik uchun parolingizni yangilang va tezkor kirish uchun shaxsiy 4 xonali PIN-kod o'rnating.",
          note: "Login va parolni begonalarga bermang. Har bir kirish xavfsiz audit tizimida qayd etiladi.",
        },
        {
          id: 't-2',
          stepNum: 'QADAM 02',
          tag: 'Talabalar Bazasi',
          title: "O'quvchi qo'shish va 24 bandli dosye yuritish",
          desc: "Guruh ro'yxatidan yangi o'quvchini qo'shing yoki talabaning shaxsiy anketasini (F.I.SH, telefon, yo'nalish, to'lov holati, o'zlashtirish ko'rsatkichlari) shakllantiring.",
          note: "Barcha talabalar ma'lumotlari bulutli bazada xavfsiz saqlanadi va real vaqtda sinxronlashadi.",
        },
        {
          id: 't-3',
          stepNum: 'QADAM 03',
          tag: 'Davomat Nazorati',
          title: "Kunlik davomat olish va Mas'ul Mentor qoidasi",
          desc: "Har bir dars boshida talabalar ro'yxatida Bor / Yo'q / Kech qoldi / Sababli holatlarini bir bosishda belgilang. Tizim dars davomati foizini avtomatik hisoblaydi.",
          note: "Davomat saqlangach, o'quvchining umumiy davomat reytingi va oylik ko'rsatkichlari yangilanadi.",
        },
        {
          id: 't-4',
          stepNum: 'QADAM 04',
          tag: 'SMS Xabarnomalar',
          title: '"Sababli" deb belgilash va Ota-onaga SMS yuborish',
          desc: "Darsga kelmagan talaba sababli bo'lsa izoh qoldiring. Agar sababsiz dars qoldirsa, tizim ota-onasining telefon raqamiga avtomatik SMS xabarnoma yuboradi.",
          note: "SMS xabarnomalar orqali ota-onalar farzandining darsga kelmaganini darhol bilib oladilar.",
        },
        {
          id: 't-5',
          stepNum: 'QADAM 05',
          tag: 'Zaxira Tizimi',
          title: 'Navbatchi kela olmay qolganda Avto-Zaxira tizimi',
          desc: "Agar biriktirilgan mentor darsga kela olmay qolsa, ma'muriyat zaxira o'qituvchini biriktiradi yoki dars vaqtini boshqa bo'sh xonaga o'tkazadi.",
          note: "Xonalar bandligi va dars jadvali to'qnashuvi tizim tomonidan avtomatik tekshirib boriladi.",
        },
        {
          id: 't-6',
          stepNum: 'QADAM 06',
          tag: 'Hisobot & Eksport',
          title: 'Oylik jurnallar va Word / Excel / PDF eksport',
          desc: "Guruhlar bo'yicha kunlik davomat varaqalarini, oylik to'lovlar holatini va yakuniy imtihon natijalarini 1 bosishda Word, Excel yoki PDF formatida yuklab oling.",
          note: "Chop etish uchun tayyor standart jadvallar, hujjat yozishga sarflanadigan vaqtni 90% ga tejaydi.",
        },
      ],
    },
    {
      id: 'admin',
      title: "Markaz Admini Qo'llanmasi",
      bannerTitle: "Markaz Administratori va Menejerlar Uchun Qo'llanma",
      bannerSub: "Yangi kurslar ochish, guruhlar shakllantirish, mentorlar taqsimoti va talabalar monitoringi",
      steps: [
        {
          id: 'a-1',
          stepNum: 'QADAM 01',
          tag: 'Kurslar & Guruhlar',
          title: 'Yangi IT kurslar va guruhlarni tizimda yaratish',
          desc: 'Frontend, Backend, Python, Foundation, Grafik Dizayn kurslarini yarating, narxlarini belgilang va yangi guruhlar oching.',
          note: 'Har bir guruh uchun dars kunlari (toq/juft) va dars vaqtlari avtomatlashtirilgan tarzda kiritiladi.',
        },
        {
          id: 'a-2',
          stepNum: 'QADAM 02',
          tag: 'Talabalar Qabuli',
          title: 'Talabalarni qabul qilish va guruhlarga taqsimlash',
          desc: "Markazga murojaat qilgan yangi o'quvchilarni ro'yxatga oling, bilim darajasiga ko'ra mos guruhlarga biriktiring va shartnomalar tuzing.",
          note: "Talabaning to'lov shartlari va belgilangan chegirmalari biriktirish chog'ida ko'rsatiladi.",
        },
        {
          id: 'a-3',
          stepNum: 'QADAM 03',
          tag: 'Mentorlar Taqsimoti',
          title: "O'qituvchilarni guruhlarga biriktirish",
          desc: "Har bir o'quv guruhiga tajribali mentorni biriktiring. Mentor faqat o'ziga tegishli guruhlarni ko'rish va boshqarish huquqiga ega bo'ladi.",
          note: "O'qituvchilar reytingi va dars o'tish dinamikasi doimiy ravishda hisoblab boriladi.",
        },
        {
          id: 'a-4',
          stepNum: 'QADAM 04',
          tag: 'Xonalar Boshqaruvi',
          title: 'Dars xonalari sig\u2019imi va bandlik jadvali',
          desc: 'Oquv markazidagi barcha xonalarni jihozlar soni va sigimi boyicha shakllantiring. Guruhlar dars jadvali toqnashuvi avtomatik oldi olinadi.',
          note: 'Bir vaqtda bitta xonaga ikki xil dars belgilanishiga tizim yol qoymaydi.',
        },
        {
          id: 'a-5',
          stepNum: 'QADAM 05',
          tag: 'Xodimlar & Rollar',
          title: 'Xodimlar hisobi va tizim huquqlarini sozlash',
          desc: 'Administrator, Menejer, Oqituvchi va Kassir rollari boyicha tizimga yangi xodimlarni biriktiring va kirish parollarini bering.',
          note: 'Har bir xodim faqat o‘z vakolatidagi sahifalar va malumotlar bilan ishlay oladi.',
        },
        {
          id: 'a-6',
          stepNum: 'QADAM 06',
          tag: 'Umumiy Tahlil',
          title: 'Filial umumiy statistikasi va oylik xulosa',
          desc: 'Faol talabalar soni, oqishni bitirganlar, yangi kelganlar va oylik daromad boyicha korgazmali grafiklar tahlilini oling.',
          note: 'Diagrammalar real vaqt rejimida yangilanadi va oylik hisobot uchun qulay.',
        },
      ],
    },
    {
      id: 'finance',
      title: 'Moliya, Kassa va To\u2019lovlar',
      bannerTitle: 'Moliya Bolimi va Kassa Boshqaruvi Yoriqnomasi',
      bannerSub: 'Tolovlarni qabul qilish, elektron kvitansiyalar, qarzdorlik nazorati va markaz sof foydasi',
      steps: [
        {
          id: 'f-1',
          stepNum: 'QADAM 01',
          tag: 'Tolov Qabuli',
          title: 'Naqd, karta va otkazma orqali tolovlarni qabul qilish',
          desc: 'Talabaning oylik tolovini bir bosishda qabul qiling. Tizim tolov usulini (naqd, Payme, Click, Uzum, Bank) qayd etadi.',
          note: 'Qabul qilingan summa shu zahotiyoq markaz umumiy kassa balansiga qoshiladi.',
        },
        {
          id: 'f-2',
          stepNum: 'QADAM 02',
          tag: 'Kvitansiya',
          title: 'Avtomatlashtirilgan elektron kvitansiya berish',
          desc: 'Tolov amalga oshirilishi bilan unikal raqamli elektron chek shakllanadi va uni chop etish yoki PDF da yuklab olish mumkin.',
          note: 'Kvitansiyada talaba ismi, kursi, guruhi, summasi va tolov sanasi aniq aks etadi.',
        },
        {
          id: 'f-3',
          stepNum: 'QADAM 03',
          tag: 'Qarzdorlik',
          title: 'Qarzdor talabalar monitoringi va SMS eslatmalar',
          desc: 'Oylik tolov muddati kelgan yoki otib ketgan talabalar royxatini korib, ularga avtomatik eslatma SMS yuboring.',
          note: 'Qarzdorlik nazorati tufayli markaz tolov tushumi 30-40% ga yaxshilanadi.',
        },
        {
          id: 'f-4',
          stepNum: 'QADAM 04',
          tag: 'Xarajatlar',
          title: 'Markaz kundalik xarajatlarini (Chiqim) yuritish',
          desc: 'Ijara haqi, kommunal tolovlar, internet, oylik ish haqi va kantselyariya xarajatlarini toifalar boyicha kassa daftariga kiriting.',
          note: 'Barcha chiqimlar cheklari va izohlari tizimda saqlanadi.',
        },
        {
          id: 'f-5',
          stepNum: 'QADAM 05',
          tag: 'Oylik Maosh',
          title: 'Oqituvchilar maoshi va foiz hisob-kitobi',
          desc: 'Har bir mentorning oqitgan oquvchilari soni yoki kelishilgan foiz stavkasi asosida avtomatik ish haqini hisoblang.',
          note: 'Murakkab qolda hisob-kitoblar talab etilmaydi, xatoliklar istisno qilinadi.',
        },
        {
          id: 'f-6',
          stepNum: 'QADAM 06',
          tag: 'Balans & Excel',
          title: 'Kassa qoldigi, sof foyda va Excel eksport',
          desc: 'Oylik umumiy tushum, jami chiqim va sof foyda hisobotini bir zumda Excel formatida yuklab oling.',
          note: 'Buxgalteriya va rahbar uchun tayyor rasmiy moliyaviy hisobot taqdim etiladi.',
        },
      ],
    },
    {
      id: 'dossier',
      title: '24 Bandli Dosye va Eksport',
      bannerTitle: '24 Bandli Rasmiy Talaba Dosyesi Boyicha Qollanma',
      bannerSub: 'Talabaning barcha shaxsiy, oqish, tolov va davomat malumotlarini toliq shakllantirish',
      steps: [
        {
          id: 'd-1',
          stepNum: 'QADAM 01',
          tag: 'Shaxsiy Profil',
          title: 'Talabaning shaxsiy malumotlari (F.I.SH, telefon, manzil)',
          desc: 'Talabaning toliq ismi, tugilgan sanasi, fotosurati, telefon raqami va yashash manzili kiritiladi.',
          note: 'Malumotlar bir marta kiritiladi va butun oqish davomida avtomatik ishlatiladi.',
        },
        {
          id: 'd-2',
          stepNum: 'QADAM 02',
          tag: 'Oqish Yonalishi',
          title: 'Tanlangan IT yonalishi, guruh va dars jadvali',
          desc: 'Talaba oqiyotgan guruh, mentor, dars kunlari va ajratilgan xona malumotlari biriktiriladi.',
          note: 'Talabani boshqa guruhga yoki yangi bosqichga kochirish 1 bosishda amalga oshadi.',
        },
        {
          id: 'd-3',
          stepNum: 'QADAM 03',
          tag: 'Ota-ona Bilan Aloqa',
          title: 'Ota-onalar telefoni va SMS bildirishnoma sozlamasi',
          desc: 'Ota-onaning telefon raqamlari, qoshimcha vakil va shartnoma raqami dosyoga kiritiladi.',
          note: 'SMS xabarnomalar avtomatik tarzda korsatilgan telefon raqamiga yuboriladi.',
        },
        {
          id: 'd-4',
          stepNum: 'QADAM 04',
          tag: 'Tolov Tarixi',
          title: 'Tolov balansi, chegirmalar va kvitansiyalar arxivi',
          desc: 'Har bir oy boyicha toланган summalar, berilgan grant yoki chegirmalar tarixi saqlanadi.',
          note: 'Qachon, qanday usulda va qancha tolov qilingani har doim ochiq korinadi.',
        },
        {
          id: 'd-5',
          stepNum: 'QADAM 05',
          tag: 'Davomat Tarixi',
          title: 'Kunlik davomat statistikasi va qoldirilgan darslar',
          desc: 'Talaba qatnashgan darslar, sababli va sababsiz qoldirilgan darslar soni foizda korsatiladi.',
          note: 'Davomat foizi 80% dan past bolganda tizim ogohlantiruvchi belgi korsatadi.',
        },
        {
          id: 'd-6',
          stepNum: 'QADAM 06',
          tag: 'Bitiruv & Sertifikat',
          title: 'Yakuniy portfolio, sertifikat raqami va PDF dosye',
          desc: 'Kurs oxirida talabaning bajargan loyihalari, sertifikat raqami qayd etiladi va toliq dosye PDF da chop etiladi.',
          note: 'IT Park andozasidagi rasmiy sertifikat va bitiruvchi hujjati tayyorlanadi.',
        },
      ],
    },
  ];

  // Current tab or search filter
  const currentTabObj = tabGuides.find((t) => t.id === activeTab) || tabGuides[0];

  const displayedSteps = useMemo(() => {
    if (!searchQuery.trim()) {
      return currentTabObj.steps;
    }
    const q = searchQuery.toLowerCase();
    // Search across all tabs
    const allSteps = tabGuides.flatMap((tg) => tg.steps);
    return allSteps.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q) ||
        s.tag.toLowerCase().includes(q) ||
        s.note.toLowerCase().includes(q)
    );
  }, [searchQuery, currentTabObj, tabGuides]);

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput || !passwordInput) {
      error(t('loginSub') || 'Login va parolni kiriting');
      return;
    }

    setIsLoading(true);
    try {
      const loggedUser = await loginWithCredentials(loginInput, passwordInput);
      success(t('loginTitle') || 'Tizimga muvaffaqiyatli kirdingiz!');
      setIsLoginModalOpen(false);
      if (loggedUser?.role === 'TEACHER') {
        router.push('/teacher');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      if (!err.response) {
        error("Serverga ulanib bo'lmadi. Backend ishga tushganini tekshiring.");
      } else if (err.response.status === 401) {
        error("Login yoki parol noto'g'ri");
      } else {
        error(err.response.data?.message || 'Kirishda xatolik yuz berdi');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.container}>
      {/* ------------------- STICKY TOP NAVBAR ------------------- */}
      <header className={styles.navbar}>
        <div className={styles.navBrand} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img
            src="/crm-logo.png"
            alt="IT Park CRM Logo"
            className={styles.brandLogo}
          />
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>IT PARK</span>
            <span className={styles.brandSubtitle}>CRM PLATFORM</span>
          </div>
        </div>

        <nav>
          <ul className={styles.navLinks}>
            <li>
              <a href="#imkoniyatlar" className={styles.navLink} onClick={(e) => { e.preventDefault(); scrollToSection('imkoniyatlar'); }}>
                Imkoniyatlar
              </a>
            </li>
            <li>
              <a href="#qollanmalar" className={styles.navLink} onClick={(e) => { e.preventDefault(); scrollToSection('qollanmalar'); }}>
                Qo'llanmalar
              </a>
            </li>
            <li>
              <a href="#dosye" className={styles.navLink} onClick={(e) => { e.preventDefault(); scrollToSection('dosye'); }}>
                24 bandli dosye
              </a>
            </li>
            <li>
              <a href="#modullar" className={styles.navLink} onClick={(e) => { e.preventDefault(); scrollToSection('modullar'); }}>
                Guruh va kurslar
              </a>
            </li>
            <li>
              <a href="#aloqa" className={styles.navLink} onClick={(e) => { e.preventDefault(); scrollToSection('aloqa'); }}>
                Muallif va aloqa
              </a>
            </li>
          </ul>
        </nav>

        <div className={styles.navActions}>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => info("Parolni tiklash uchun tizim administratori yoki Telegram (@OlimjonOtabekovich) orqali murojaat qiling.")}
          >
            Parolni tiklash
          </button>

          {isAuthenticated ? (
            <button
              type="button"
              className={styles.loginCtaBtn}
              onClick={() => router.push(user?.role === 'TEACHER' ? '/teacher' : '/dashboard')}
            >
              <span>Kabinetga o'tish</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className={styles.loginCtaBtn}
              onClick={() => setIsLoginModalOpen(true)}
            >
              <span>Tizimga kirish</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </header>

      {/* ------------------- HERO SECTION ------------------- */}
      <section className={styles.heroSection}>
        <div className={styles.heroGrid}>
          {/* Left Column */}
          <div className={styles.heroLeft}>
            {/* Top Pill Badge with working code replaced by Telegram @OlimjonOtabekovich */}
            <div className={styles.heroBadge}>
              <img src="/crm-logo.png" alt="CRM" className={styles.badgeLogo} />
              <span className={styles.badgeText}>IT Park Ta'lim Markazi</span>
              <span className={styles.badgeDivider}>•</span>
              <span className={styles.badgeVersion}>v2.0</span>
              <span className={styles.badgeDivider}>•</span>
              <a
                href="https://t.me/OlimjonOtabekovich"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.badgeTelegram}
                title="Telegram dasturchi bilan bog'lanish"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"
                    fill="#38bdf8"
                  />
                </svg>
                <span>@OlimjonOtabekovich</span>
              </a>
            </div>

            {/* Main Headline */}
            <h1 className={styles.heroTitle}>
              O'quv markaz ma'lumotlari, kunlik davomat va{' '}
              <span className={styles.heroTitleHighlight}>o'quvchilar dosyesi</span> yagona tizimda
            </h1>

            {/* Description */}
            <p className={styles.heroDesc}>
              IT Park CRM — o'quv markazlar, IT kurslar va filiallar faoliyatini to'liq raqamlashtirish tizimi.
              Talabalar qabuli, guruhlar, kunlik davomat, oylik to'lovlar va hisobotlar bulutli bazada xavfsiz saqlanadi
              hamda telefon, planshet va kompyuterda birdek qulay ishlaydi.
            </p>

            {/* CTA Buttons */}
            <div className={styles.heroBtnGroup}>
              {isAuthenticated ? (
                <button
                  type="button"
                  className={styles.primaryHeroBtn}
                  onClick={() => router.push(user?.role === 'TEACHER' ? '/teacher' : '/dashboard')}
                >
                  <span>Boshqaruv paneliga o'tish</span>
                  <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.primaryHeroBtn}
                  onClick={() => setIsLoginModalOpen(true)}
                >
                  <span>Tizimga kirish (Login)</span>
                  <ArrowRight size={18} />
                </button>
              )}

              <button
                type="button"
                className={styles.secondaryHeroBtn}
                onClick={() => scrollToSection('qollanmalar')}
              >
                <span>Qo'llanmani o'qish</span>
              </button>

              <button
                type="button"
                className={styles.forgotHeroBtn}
                onClick={() => info("Parolni tiklash uchun @OlimjonOtabekovich profiliga yozing.")}
              >
                Parolni unutdingizmi?
              </button>
            </div>

            {/* 4 Quick Stats */}
            <div className={styles.heroStatsRow}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>24 band</span>
                <span className={styles.statLabel}>Doimiy talaba dosyesi</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>3 format</span>
                <span className={styles.statLabel}>Word, Excel va PDF</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>3 himoya</span>
                <span className={styles.statLabel}>Parol, PIN va Sessiya</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>24/7</span>
                <span className={styles.statLabel}>Uzluksiz faol bulut</span>
              </div>
            </div>
          </div>

          {/* Right Column: Guide Navigator Card */}
          <div className={styles.heroRight}>
            <div className={styles.guideNavigatorCard}>
              <div className={styles.cardTopHeader}>
                <span className={styles.tezBadge}>TEZ</span>
                <div>
                  <h3 className={styles.cardHeading}>Kimga Qanday Qo'llanma Kerak?</h3>
                  <p className={styles.cardSubtitle}>Kerakli bo'lim ustiga bosing yoki tanlang</p>
                </div>
              </div>

              <div className={styles.guideRoleList}>
                <div
                  className={styles.guideRoleItem}
                  onClick={() => {
                    setActiveTab('teacher');
                    scrollToSection('qollanmalar');
                  }}
                >
                  <div className={styles.guideRoleItemTop}>
                    <span className={styles.guideRoleTitle}>01. Sinf rahbari (O'qituvchi / Mentor)</span>
                    <span className={styles.guideRoleAction}>
                      Qo'llanmani ko'rish <ArrowRight size={14} />
                    </span>
                  </div>
                  <p className={styles.guideRoleDesc}>
                    O'quvchilar ro'yxati, 24 bandli anketa, interaktiv kunlik davomat olish, dars jadvali va baholar jurnali.
                  </p>
                </div>

                <div
                  className={styles.guideRoleItem}
                  onClick={() => {
                    setActiveTab('admin');
                    scrollToSection('qollanmalar');
                  }}
                >
                  <div className={styles.guideRoleItemTop}>
                    <span className={styles.guideRoleTitle}>02. Markaz Administratsiyasi (Menejer)</span>
                    <span className={styles.guideRoleAction}>
                      Qo'llanmani ko'rish <ArrowRight size={14} />
                    </span>
                  </div>
                  <p className={styles.guideRoleDesc}>
                    Talabalar qabuli, yangi IT guruhlar ochish, xonalar bandligi, mentorlar taqsimoti va oylik hisobotlar.
                  </p>
                </div>

                <div
                  className={styles.guideRoleItem}
                  onClick={() => {
                    setActiveTab('finance');
                    scrollToSection('qollanmalar');
                  }}
                >
                  <div className={styles.guideRoleItemTop}>
                    <span className={styles.guideRoleTitle}>03. Moliya, Kassa va To'lovlar</span>
                    <span className={styles.guideRoleAction}>
                      Qo'llanmani ko'rish <ArrowRight size={14} />
                    </span>
                  </div>
                  <p className={styles.guideRoleDesc}>
                    Oylik to'lovlar qabuli, avtomatik cheklar, qarzdorlar ro'yxati, markaz xarajatlari va sof foyda.
                  </p>
                </div>
              </div>

              <div className={styles.guideCardFooter}>
                <span className={styles.guideCardStatus}>Faol: 24/7 uzluksiz • 100% online</span>
                <button
                  type="button"
                  className={styles.guideCardActionBtn}
                  onClick={() => scrollToSection('qollanmalar')}
                >
                  <span>O'tishga o'tish</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------- SECTION 2: GUIDES (QO'LLANMALAR) ------------------- */}
      <section id="qollanmalar" className={styles.sectionWrapper}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBreadcrumb}>Bosh sahifa / Yo'riqnoma modullari</span>
          <div className={styles.sectionTitleRow}>
            <div>
              <h2 className={styles.sectionTitle}>IT Park CRM Tizimidan Foydalanish Qo'llanmalari</h2>
              <p className={styles.sectionSubtitle}>
                Kerakli 4 ta bo'limdan birortasini tanlang yoki qidiruv maydoniga kalit so'z yozing (Masalan: davomat, PIN, SMS, PDF, to'lov).
              </p>
            </div>

            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Qo'llanmadan qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>
        </div>

        {/* Role Tabs */}
        <div className={styles.tabsRow}>
          {tabGuides.map((tg) => (
            <button
              key={tg.id}
              type="button"
              className={`${styles.tabBtn} ${activeTab === tg.id && !searchQuery ? styles.tabBtnActive : ''}`}
              onClick={() => {
                setActiveTab(tg.id);
                setSearchQuery('');
              }}
            >
              <span className={styles.tabDot} />
              <span>{tg.title}</span>
            </button>
          ))}
        </div>

        {/* Featured Guide Box */}
        <div className={styles.featuredGuideContainer}>
          <div className={styles.guideBannerTop}>
            <div className={styles.guideBannerLeft}>
              <h3 className={styles.guideBannerTitle}>
                {searchQuery ? `"${searchQuery}" bo'yicha topilgan yo'riqnomalar` : currentTabObj.bannerTitle}
              </h3>
              <p className={styles.guideBannerSub}>
                {searchQuery ? `${displayedSteps.length} ta yo'riqnoma qadami topildi` : currentTabObj.bannerSub}
              </p>
            </div>
            <button
              type="button"
              className={styles.guideBannerBtn}
              onClick={() => setIsLoginModalOpen(true)}
            >
              <span>Tizimga kirish</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* 6 Step Cards Grid */}
          <div className={styles.stepsGrid}>
            {displayedSteps.map((step) => (
              <div key={step.id} className={styles.stepCard}>
                <div className={styles.stepCardHeader}>
                  <span className={styles.stepBadge}>{step.stepNum}</span>
                  <span className={styles.stepRoleTag}>{step.tag}</span>
                </div>

                <h4 className={styles.stepTitle}>{step.title}</h4>
                <p className={styles.stepDesc}>{step.desc}</p>

                <div className={styles.stepNoteBox}>
                  <p className={styles.stepNoteText}>
                    <span className={styles.stepNoteHighlight}>Muhim eslatma: </span>
                    {step.note}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------- SECTION 3: FEATURES (IMKONIYATLAR) ------------------- */}
      <section id="imkoniyatlar" className={styles.sectionWrapper}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBreadcrumb}>Platforma modullari</span>
          <h2 className={styles.sectionTitle}>IT Park CRM Asosiy Imkoniyatlari va Afzalliklari</h2>
          <p className={styles.sectionSubtitle}>
            Markaz ma'muriyati va o'qituvchilarning kundalik ishini soddalashtiruvchi 4 ta asosiy texnologik modul
          </p>
        </div>

        <div className={styles.featuresGrid}>
          {/* Card 01 */}
          <div className={styles.featureCard}>
            <span className={styles.featureMeta}>Asosiy modul • Avto-anketa (CRM) va monitoring</span>
            <h3 className={styles.featureTitle}>01. 24 bandli Rasmiy O'quvchi Dosyesi va Anketasi</h3>
            <p className={styles.featureDesc}>
              Har bir o'quvchi uchun 24 ta rasmiy banddan iborat shaxsiy anketa yuritiladi: F.I.SH, tug'ilgan sanasi, telefon raqami, ota-onasi, tanlangan IT kursi, guruhi, dars jadvali, to'lov holati va davomat ko'rsatkichlari. Ma'lumot kiritish paytida sahifa yangilanib ketmaydi hamda ma'lumotlar yo'qolmaydi.
            </p>
            <div className={styles.featureTags}>
              <span className={styles.featureTag}>Elektron anketa</span>
              <span className={styles.featureTag}>24 bandli dosye</span>
              <span className={styles.featureTag}>Ota-ona pasporti va tel</span>
              <span className={styles.featureTag}>To'lov monitoringi</span>
            </div>
          </div>

          {/* Card 02 */}
          <div className={styles.featureCard}>
            <span className={styles.featureMeta}>Eksport moduli • Arxiv va hisobotlar</span>
            <h3 className={styles.featureTitle}>02. Word, Excel va PDF Hujjatlar Generatsiyasi</h3>
            <p className={styles.featureDesc}>
              Dars o'quvchilari ro'yxati, kunlik davomat varaqlari, to'lov kvitansiyalari, shartnomalar va oylik yakuniy hisobotlar 1 bosishda Word (.docx), Excel (.xlsx) yoki PDF formatida shakllantiriladi va yuklab olinadi.
            </p>
            <div className={styles.featureTags}>
              <span className={styles.featureTag}>Rasmiy hujjat formati</span>
              <span className={styles.featureTag}>1-klikda eksport</span>
              <span className={styles.featureTag}>Avto-jadval shakllanishi</span>
            </div>
          </div>

          {/* Card 03 */}
          <div className={styles.featureCard}>
            <span className={styles.featureMeta}>Moliya moduli • Kassa va to'lovlar balansi</span>
            <h3 className={styles.featureTitle}>03. Avtomatlashtirilgan Kassa, To'lovlar va Qarzdorlik Tizimi</h3>
            <p className={styles.featureDesc}>
              O'quv markazining barcha to'lovlarini qulay boshqarish: naqd va karta orqali qabul, chegirmalar hisobi, qarzdor talabalar ro'yxati, o'qituvchilar oylik ish haqi va markazning sof foyda hisoboti to'liq avtomatlashtirilgan.
            </p>
            <div className={styles.featureTags}>
              <span className={styles.featureTag}>Kassa nazorati</span>
              <span className={styles.featureTag}>Qarzdorlar monitoringi</span>
              <span className={styles.featureTag}>Elektron cheklar</span>
            </div>
          </div>

          {/* Card 04 */}
          <div className={styles.featureCard}>
            <span className={styles.featureMeta}>Nazorat va Davomat • QR-kod va SMS bildirishnoma</span>
            <h3 className={styles.featureTitle}>04. Kunlik Davomat, Avto-Zaxira va Ota-onalarga SMS</h3>
            <p className={styles.featureDesc}>
              Dars boshida tezkor davomat olish, darsga kelmagan talabalar ota-onalariga avtomatik SMS yuborish, sun'iy intellekt (AI) orqali o'quvchilar o'zlashtirishini tahlil qilish va dars o'tish sifatini baholash imkoniyati.
            </p>
            <div className={styles.featureTags}>
              <span className={styles.featureTag}>Tezkor davomat</span>
              <span className={styles.featureTag}>SMS bildirishnoma</span>
              <span className={styles.featureTag}>AI yordamchi</span>
              <span className={styles.featureTag}>Mobil optimallashtirish</span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------- SECTION 4: 24-BANDLI DOSYE ------------------- */}
      <section id="dosye" className={styles.sectionWrapper}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBreadcrumb}>Ma'lumotlar standarti</span>
          <h2 className={styles.sectionTitle}>O'quvchining 24 Bandli Rasmiy Dosyesiga Nimalar Kiradi?</h2>
          <p className={styles.sectionSubtitle}>
            IT Park CRM tizimida har bir o'quvchi bo'yicha quyidagi 4 ta asosiy blokdagi 24 ta ma'lumot to'liq shakllantiriladi:
          </p>
        </div>

        <div className={styles.dossierGrid}>
          {/* Column 1 */}
          <div className={styles.dossierCol}>
            <div className={styles.dossierColHeader}>
              <span className={styles.dossierColRange}>01-06 (1-6-bandlar)</span>
              <h4 className={styles.dossierColTitle}>Shaxsiy Ma'lumotlar</h4>
            </div>
            <ul className={styles.dossierList}>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>01.</span> Familiyasi, ismi, sharifi</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>02.</span> Tug'ilgan sanasi (kun, oy, yil)</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>03.</span> Jinsi va fuqaroligi</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>04.</span> Shaxsiy telefon raqami</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>05.</span> Doimiy yashash manzili</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>06.</span> Elektron pochta (e-mail)</li>
            </ul>
          </div>

          {/* Column 2 */}
          <div className={styles.dossierCol}>
            <div className={styles.dossierColHeader}>
              <span className={styles.dossierColRange}>07-12 (7-12-bandlar)</span>
              <h4 className={styles.dossierColTitle}>Kurs va Ta'lim Yo'nalishi</h4>
            </div>
            <ul className={styles.dossierList}>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>07.</span> Tanlangan IT kursi / yo'nalishi</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>08.</span> Biriktirilgan o'quv guruhi</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>09.</span> Dars kunlari va dars vaqti</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>10.</span> Ajratilgan dars xonasi (Room)</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>11.</span> Dars beruvchi mentor / o'qituvchi</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>12.</span> Kurs boshlanish va tugash sanasi</li>
            </ul>
          </div>

          {/* Column 3 */}
          <div className={styles.dossierCol}>
            <div className={styles.dossierColHeader}>
              <span className={styles.dossierColRange}>13-18 (13-18-bandlar)</span>
              <h4 className={styles.dossierColTitle}>Ota-ona va Aloqa</h4>
            </div>
            <ul className={styles.dossierList}>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>13.</span> Ota-onaning F.I.SH</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>14.</span> Ota-onaning telefon raqami</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>15.</span> Qo'shimcha aloqa vakili</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>16.</span> SMS xabarnomalar statusi</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>17.</span> Maxsus eslatmalar va status</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>18.</span> Shartnoma raqami va sanasi</li>
            </ul>
          </div>

          {/* Column 4 */}
          <div className={styles.dossierCol}>
            <div className={styles.dossierColHeader}>
              <span className={styles.dossierColRange}>19-24 (19-24-bandlar)</span>
              <h4 className={styles.dossierColTitle}>Moliya, Davomat va Natijalar</h4>
            </div>
            <ul className={styles.dossierList}>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>19.</span> Kurs oylik to'lov summasi</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>20.</span> Berilgan chegirma yoki grant</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>21.</span> To'lov balansi va qarzdorlik</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>22.</span> Kunlik davomat davriy foizi (%)</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>23.</span> Yakuniy loyihalar va portfolio</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>24.</span> Bitiruvchi sertifikati raqami</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------- FOOTER ------------------- */}
      <footer id="aloqa" className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLeft}>
            <img src="/crm-logo.png" alt="CRM Logo" className={styles.footerLogo} />
            <div>
              <div className={styles.footerBrandTitle}>IT PARK CRM PLATFORM</div>
              <div className={styles.footerBrandDesc}>
                O'quv markazlari va IT akademiyalar uchun yagona professional boshqaruv tizimi
              </div>
            </div>
          </div>

          <div className={styles.footerRight}>
            <a
              href="https://t.me/OlimjonOtabekovich"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.telegramFooterBtn}
              title="Dasturchi bilan Telegram orqali bog'lanish"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"
                  fill="#38bdf8"
                />
              </svg>
              <span>@OlimjonOtabekovich</span>
            </a>

            <button
              type="button"
              className={styles.loginCtaBtn}
              onClick={() => setIsLoginModalOpen(true)}
            >
              <span>Tizimga kirish</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div className={styles.footerCopy}>
          <span>© 2026 IT Park CRM. Barcha huquqlar himoyalangan.</span>
          <span>Dasturchi: @OlimjonOtabekovich</span>
        </div>
      </footer>

      {/* ------------------- INTERACTIVE LOGIN MODAL ------------------- */}
      {isLoginModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsLoginModalOpen(false);
          }}
        >
          <div className={styles.modalContent}>
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={() => setIsLoginModalOpen(false)}
              aria-label="Yopish"
            >
              <X size={18} />
            </button>

            <div className={styles.modalHeader}>
              <img src="/crm-logo.png" alt="CRM Logo" className={styles.modalLogo} />
              <h3 className={styles.modalTitle}>Tizimga kirish</h3>
              <p className={styles.modalSubtitle}>IT Park CRM shaxsiy kabinetingizga kiring</p>
            </div>

            <form onSubmit={handleLoginSubmit} className={styles.modalForm} autoComplete="off">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>
                  Login
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    required
                    placeholder="Loginni kiriting"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>
                  Parol
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Parolni kiriting"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 42px 12px 42px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={styles.modalSubmitBtn}
              >
                {isLoading ? (
                  <span>Tekshirilmoqda...</span>
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>Kirish</span>
                  </>
                )}
              </button>

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                <a
                  href="https://t.me/OlimjonOtabekovich"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.badgeTelegram}
                  style={{ fontSize: '13px', padding: '6px 16px' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"
                      fill="#38bdf8"
                    />
                  </svg>
                  <span>@OlimjonOtabekovich</span>
                </a>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
