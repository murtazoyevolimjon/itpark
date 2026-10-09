'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogIn,
  Search,
  ArrowRight,
  Shield,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Lock,
  User,
  Eye,
  EyeOff,
  X,
  BookOpen,
  DollarSign,
  Brain,
  Phone,
  Instagram,
  HelpCircle,
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

  // Tab Guides Data - Real, practical workflows for modern learning centers
  const tabGuides: TabGuide[] = [
    {
      id: 'teacher',
      title: "O'qituvchi va Mentorlar",
      bannerTitle: "O'qituvchi va Mentorlar Uchun Qadamma-qadam Yo'riqnoma",
      bannerSub: "Darsga biriktirilgan o'quvchilar, kunlik interaktiv davomat, dars jadvali va oylik ko'rsatkichlar",
      steps: [
        {
          id: 't-1',
          stepNum: 'QADAM 01',
          tag: 'Shaxsiy Kabinet',
          title: 'Shaxsiy kabinetga kirish',
          desc: "Administrator tomonidan berilgan login va parol orqali tizimga kiring. Shaxsiy profilingizda faqat o'zingizga biriktirilgan guruhlar va darslar ko'rinadi.",
          note: "Har bir o'qituvchi faqat o'ziga tegishli darslar va talabalar ma'lumotlarini mustaqil boshqaradi.",
        },
        {
          id: 't-2',
          stepNum: 'QADAM 02',
          tag: "O'quvchilar Ro'yxati",
          title: "Guruhlar va o'quvchilar ro'yxati",
          desc: "Sizga biriktirilgan dars guruhlarini, har bir guruhdagi o'quvchilar tarkibini va ularning aloqa ma'lumotlarini qulay ko'ring.",
          note: "Yangi talabalar guruhga biriktirilishi bilan ro'yxatingizda avtomatik paydo bo'ladi.",
        },
        {
          id: 't-3',
          stepNum: 'QADAM 03',
          tag: 'Davomat Nazorati',
          title: 'Kunlik interaktiv davomat olish',
          desc: "Har bir dars boshida talabalar ro'yxatida Bor / Yo'q / Kech qoldi / Sababli holatlarini 1 ta klikda belgilang. Tizim davomat foizini avtomatik hisoblaydi.",
          note: "Davomat saqlangach, o'quvchining umumiy davomat reytingi va oylik ko'rsatkichlari real vaqtda yangilanadi.",
        },
        {
          id: 't-4',
          stepNum: 'QADAM 04',
          tag: 'Sababli Holatlar',
          title: 'Sababli qoldirish va maxsus izohlar',
          desc: "Darsga kelmagan talaba sababli bo'lsa, izoh qoldiring. Bu ma'lumot markaz ma'muriyati va umumiy hisobotlarda aniq aks etadi.",
          note: "O'quvchilarning dars qoldirish sabablari tizimda tartibli saqlanib, shaffoflik ta'minlanadi.",
        },
        {
          id: 't-5',
          stepNum: 'QADAM 05',
          tag: 'Dars Jadvali',
          title: 'Dars jadvali va xonalar nazorati',
          desc: "Dars kunlari (toq yoki juft), dars vaqtlari hamda ajratilgan dars xonasini o'z profilingizda doimo nazorat qilib boring.",
          note: "Xonalar bandligi va dars vaqtlari to'qnashuvi tizim tomonidan oldindan bartaraf etiladi.",
        },
        {
          id: 't-6',
          stepNum: 'QADAM 06',
          tag: 'Oylik Monitoring',
          title: 'Oylik davomat jurnali va xulosasi',
          desc: "Guruhlar bo'yicha kunlik davomat varaqalarini va oylik umumiy ko'rsatkichlarni bir zumda tahlil qiling.",
          note: "Qog'oz jurnallar yuritishga hojat qolmaydi, barcha hisobotlar avtomatik to'planadi.",
        },
      ],
    },
    {
      id: 'admin',
      title: 'Markaz Administratsiyasi',
      bannerTitle: 'Markaz Administratori va Menejerlar Uchun Qo\'llanma',
      bannerSub: 'Yangi kurslar ochish, talabalar qabuli, guruhlar shakllantirish va o\'qituvchilar taqsimoti',
      steps: [
        {
          id: 'a-1',
          stepNum: 'QADAM 01',
          tag: 'Kurslar & Yo\'nalishlar',
          title: 'Kurslar va ta\'lim yo\'nalishlarini yaratish',
          desc: 'Til kurslari (Ingliz tili, IELTS), IT yo\'nalishlari, maktab fanlari yoki bolalar to\'garaklarini yarating, narxlarini belgilang.',
          note: 'Har qanday ta\'lim yo\'nalishi uchun moslashuvchan kurslar va davomiylik kiritish mumkin.',
        },
        {
          id: 'a-2',
          stepNum: 'QADAM 02',
          tag: 'Talabalar Qabuli',
          title: 'Talabalarni qabul qilish va guruhlarga joylashtirish',
          desc: "Markazga murojaat qilgan yangi o'quvchilarni ro'yxatga oling, bilim darajasi va smenasiga qarab mos guruhlarga biriktiring.",
          note: 'Talabalar bazasi qulay qidiruv va filtrlash imkoniyati bilan doimo qo\'l ostingizda bo\'ladi.',
        },
        {
          id: 'a-3',
          stepNum: 'QADAM 03',
          tag: 'O\'qituvchilar',
          title: "O'qituvchilarni guruhlarga biriktirish",
          desc: "Har bir o'quv guruhiga mas'ul o'qituvchini biriktiring. O'qituvchi o'z shaxsiy profilida faqat o'z guruhlari bilan ishlaydi.",
          note: "O'qituvchilar yuklamasi va dars soatlari to'g'ri taqsimlanadi.",
        },
        {
          id: 'a-4',
          stepNum: 'QADAM 04',
          tag: 'Xonalar Boshqaruvi',
          title: "Dars xonalari sig'imi va bandlik jadvali",
          desc: "O'quv markazidagi barcha xonalarni sig'imi bo'yicha shakllantiring. Guruhlar dars jadvali to'qnashuvining avtomatik oldi olinadi.",
          note: "Bir vaqtda bitta xonaga ikki xil dars belgilanishiga tizim yo'l qo'ymaydi.",
        },
        {
          id: 'a-5',
          stepNum: 'QADAM 05',
          tag: 'Xodimlar & Rollar',
          title: 'Xodimlar hisobi va tizim huquqlari',
          desc: "Administrator, Menejer va O'qituvchi rollari bo'yicha yangi xodimlarni biriktiring va kirish huquqlarini belgilang.",
          note: 'Har bir xodim faqat o‘z vakolatidagi sahifalar va ma\'lumotlar bilan xavfsiz ishlay oladi.',
        },
        {
          id: 'a-6',
          stepNum: 'QADAM 06',
          tag: 'Umumiy Tahlil',
          title: 'Markaz umumiy tahlili va monitoring',
          desc: "Faol talabalar soni, yangi o'quvchilar, guruhlar dinamikasi va markazning o'sish ko'rsatkichlarini real vaqtda kuzating.",
          note: 'Diagramma va ko\'rsatkichlar boshqaruv qarorlarini tez va aniq qabul qilishga yordam beradi.',
        },
      ],
    },
    {
      id: 'finance',
      title: 'Moliya va To\'lovlar',
      bannerTitle: 'Moliya Bo\'limi va Kassa Boshqaruvi Yo\'riqnomasi',
      bannerSub: 'To\'lovlarni qabul qilish, qarzdorlik nazorati, xarajatlar va markazning sof foydasi',
      steps: [
        {
          id: 'f-1',
          stepNum: 'QADAM 01',
          tag: 'To\'lov Qabuli',
          title: 'Talabalar to\'lovlarini tezkor qabul qilish',
          desc: 'Talabaning oylik to\'lovini bir bosishda qabul qiling: naqd, bank kartasi yoki o\'tkazma orqali to\'lovlar qulay qayd etiladi.',
          note: 'Qabul qilingan summa shu zahotiyoq markaz umumiy kassa balansiga qo\'shiladi.',
        },
        {
          id: 'f-2',
          stepNum: 'QADAM 02',
          tag: 'To\'lovlar Tarixi',
          title: 'To\'lovlar tarixi va kassa tushumi',
          desc: 'Har bir talaba bo\'yicha to\'lovlar tarixi, to\'langan sanasi va summasi to\'liq saqlanadi, istalgan paytda ko\'rish mumkin.',
          note: 'Moliyaviy hisob-kitoblar aniq va shaffof yuritiladi.',
        },
        {
          id: 'f-3',
          stepNum: 'QADAM 03',
          tag: 'Qarzdorlik',
          title: 'Qarzdor talabalar monitoringi',
          desc: 'Oylik to\'lov muddati kelgan yoki o\'tib ketgan talabalar ro\'yxatini alohida ko\'rib, tezkor nazorat qiling.',
          note: 'Qarzdorlik nazorati tufayli markaz to\'lov tushumi sezilarli darajada yaxshilanadi.',
        },
        {
          id: 'f-4',
          stepNum: 'QADAM 04',
          tag: 'Xarajatlar',
          title: 'Markaz kundalik xarajatlarini (Chiqim) yuritish',
          desc: 'Ijara haqi, kommunal to\'lovlar, internet, oylik maoshlar va xo\'jalik xarajatlarini toifalar bo\'yicha kassa daftariga kiriting.',
          note: 'Barcha chiqimlar va ularning izohlari tizimda qat\'iy saqlanadi.',
        },
        {
          id: 'f-5',
          stepNum: 'QADAM 05',
          tag: 'Oylik Maosh',
          title: 'O\'qituvchilar ish haqi hisob-kitobi',
          desc: 'Har bir o\'qituvchining talabalari soni yoki kelishilgan foiz stavkasi asosida oylik hisob-kitobni osonlashtiring.',
          note: 'Murakkab qo\'lda hisob-kitoblar kamayadi, xatoliklar bartaraf etiladi.',
        },
        {
          id: 'f-6',
          stepNum: 'QADAM 06',
          tag: 'Balans & Foyda',
          title: 'Kassa qoldig\'i va sof foyda hisoboti',
          desc: 'Oylik umumiy tushum, jami chiqim va markazning sof foydasini real vaqt rejimida ko\'ring.',
          note: 'Rahbar va administrator uchun markazning haqiqiy moliyaviy holati ochiq ko\'rinadi.',
        },
      ],
    },
    {
      id: 'ai',
      title: "Sun'iy Intellekt (AI Yordamchi)",
      bannerTitle: "O'quv Markazi Boshqaruvi Uchun Sun'iy Intellekt (AI)",
      bannerSub: "Markaz ko'rsatkichlari, tushib qolish xavfi bor o'quvchilar, davomat va moliyaviy tahlilni AI bilan avtomatlashtiring",
      steps: [
        {
          id: 'ai-1',
          stepNum: 'QADAM 01',
          tag: 'AI Umumiy Xulosa',
          title: 'Markaz holati bo\'yicha kunlik/oylik AI xulosa',
          desc: 'Sun\'iy intellekt jami o\'quvchilar, faol guruhlar, to\'lovlar va davomat holatini umumlashtirib, bir necha jumlada aniq xulosa beradi.',
          note: 'Rahbariyat markazdagi vaziyatni uzun jadvallarni titmasdan, bir zumda tushunadi.',
        },
        {
          id: 'ai-2',
          stepNum: 'QADAM 02',
          tag: 'O\'quvchilar Tahlili',
          title: 'Xatarlarni erta aniqlash (Risk tahlili)',
          desc: "Dars qoldirayotgan, o'zlashtirishi pasaygan yoki o'qishni to'xtatish xavfi yuqori bo'lgan o'quvchilarni AI erta aniqlab beradi.",
          note: "O'quvchilar o'qishni tashlab ketishining oldini olish imkoniyati keskin oshadi.",
        },
        {
          id: 'ai-3',
          stepNum: 'QADAM 03',
          tag: 'Davomat Tahlili',
          title: 'Past davomatli guruhlar va sabablar tahlili',
          desc: "Davomati 70% dan past bo'lgan guruhlarni tahlil qilib, darsga qatnashishni yaxshilash bo'yicha amaliy uslubiy maslahatlar taqdim etadi.",
          note: "O'qituvchilar va guruhlar bo'yicha davomat dinamikasi chuqur o'rganiladi.",
        },
        {
          id: 'ai-4',
          stepNum: 'QADAM 04',
          tag: 'Moliya & Xabarnoma',
          title: 'Moliyaviy tahlil va qarzdorlar bilan ishlash',
          desc: "Kassa tushumlari va qarzdorlik muvozanati bo'yicha xulosalar chiqaradi hamda qarzdorlarga yuborish uchun xushmuomala xabarlarni tayyorlaydi.",
          note: "Moliyaviy intizom mustahkamlanadi va tushumlar o'sishi ta'minlanadi.",
        },
        {
          id: 'ai-5',
          stepNum: 'QADAM 05',
          tag: 'Ustozlar Yuklamasi',
          title: 'O\'qituvchilar yuklamasi balansi',
          desc: "O'qituvchilar o'rtasida guruhlar va o'quvchilar taqsimotini o'rganib, yuklama balansi bo'yicha tavsiyalar beradi.",
          note: "Ustozlar haddan ortiq charchab qolmasligi va ta'lim sifati tushmasligi ta'minlanadi.",
        },
        {
          id: 'ai-6',
          stepNum: 'QADAM 06',
          tag: '24/7 AI Maslahatchi',
          title: 'Har qanday mavzuda erkin savol-javob',
          desc: "Dars metodikasi, yangi kurslar ochish, marketing, reja tuzish va boshqaruv bo'yicha har qanday savolingizga o'zbek tilida erkin javob oling.",
          note: "O'rnatilgan AI yordamchi doim sizning yoningizda aqlli maslahatchi sifatida ishlaydi.",
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
            alt="CRM Logo"
            className={styles.brandLogo}
          />
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>MARKAZ CRM</span>
            <span className={styles.brandSubtitle}>BOSHQARUV TIZIMI</span>
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
                Yo'riqnomalar
              </a>
            </li>
            <li>
              <a href="#yonalishlar" className={styles.navLink} onClick={(e) => { e.preventDefault(); scrollToSection('yonalishlar'); }}>
                Ta'lim markazlari
              </a>
            </li>
            <li>
              <a href="#faq" className={styles.navLink} onClick={(e) => { e.preventDefault(); scrollToSection('faq'); }}>
                Savol-javoblar
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
            {/* Top Pill Badge */}
            <div className={styles.heroBadge}>
              <img src="/crm-logo.png" alt="CRM" className={styles.badgeLogo} />
              <span className={styles.badgeText}>O'quv Markazlari CRM Tizimi</span>
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
              Barcha o'quv markazlar, kunlik davomat va{' '}
              <span className={styles.heroTitleHighlight}>aqlli AI tizimi</span> yagona platformada
            </h1>

            {/* Description */}
            <p className={styles.heroDesc}>
              Til maktablari, IT akademiyalar, repetitorlik va o'quv markazlari uchun universal boshqaruv tizimi.
              O'quvchilar qabuli, guruhlar jadvali, bir klikda davomat, kassa va to'lovlar hamda o'rnatilgan Sun'iy Intellekt (AI) yordamchi bir joyda!
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
                <span className={styles.statValue}>AI Yordamchi</span>
                <span className={styles.statLabel}>Aqlli tahlil va maslahat</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>1-klikda</span>
                <span className={styles.statLabel}>Tezkor kunlik davomat</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>Kassa & Moliya</span>
                <span className={styles.statLabel}>To'lovlar va qarzdorlik</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>24/7 Bulut</span>
                <span className={styles.statLabel}>Istalgan qurilmada qulay</span>
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
                  <p className={styles.cardSubtitle}>Kerakli bo'lim ustiga bosing va yo'riqnomani ko'ring</p>
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
                    <span className={styles.guideRoleTitle}>01. O'qituvchi va Mentorlar</span>
                    <span className={styles.guideRoleAction}>
                      Qo'llanmani ko'rish <ArrowRight size={14} />
                    </span>
                  </div>
                  <p className={styles.guideRoleDesc}>
                    O'quvchilar ro'yxati, dars jadvali, bir klikda kunlik davomat olish va dars statistikasi.
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
                    Talabalar qabuli, yangi guruhlar ochish, xonalar bandligi, ustozlar taqsimoti va oylik hisobotlar.
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
                    Oylik to'lovlar qabuli, qarzdorlar ro'yxati, xarajatlar daftari va markazning sof foyda balansi.
                  </p>
                </div>

                <div
                  className={styles.guideRoleItem}
                  onClick={() => {
                    setActiveTab('ai');
                    scrollToSection('qollanmalar');
                  }}
                >
                  <div className={styles.guideRoleItemTop}>
                    <span className={styles.guideRoleTitle}>04. Sun'iy Intellekt (AI Yordamchi)</span>
                    <span className={styles.guideRoleAction}>
                      Qo'llanmani ko'rish <ArrowRight size={14} />
                    </span>
                  </div>
                  <p className={styles.guideRoleDesc}>
                    Markaz umumiy holati, davomati past guruhlar va o'qishni to'xtatish xavfi bor o'quvchilar tahlili.
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
                  <span>Qo'llanmalarga o'tish</span>
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
              <h2 className={styles.sectionTitle}>O'quv Markaz CRM Tizimidan Foydalanish Qo'llanmalari</h2>
              <p className={styles.sectionSubtitle}>
                Kerakli 4 ta bo'limdan birortasini tanlang yoki qidiruv maydoniga kalit so'z yozing (Masalan: davomat, AI, guruh, moliya, to'lov).
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
          <h2 className={styles.sectionTitle}>O'quv Markazlar Uchun Asosiy Imkoniyatlar va Modullar</h2>
          <p className={styles.sectionSubtitle}>
            Markaz ma'muriyati, o'qituvchilar va rahbarlarning kundalik ishini to'liq yengillashtiruvchi 4 ta asosiy texnologik modul
          </p>
        </div>

        <div className={styles.featuresGrid}>
          {/* Card 01 */}
          <div className={styles.featureCard}>
            <span className={styles.featureMeta}>Sun'iy Intellekt • Aqlli tahlil va maslahatchi</span>
            <h3 className={styles.featureTitle}>01. O'rnatilgan Sun'iy Intellekt (AI) Yordamchi</h3>
            <p className={styles.featureDesc}>
              Markaz ko'rsatkichlarini chuqur tahlil qiluvchi, o'quvchilar davomati va to'lovlar dinamikasini o'rganib, amaliy tavsiyalar beruvchi o'rnatilgan sun'iy intellekt. O'qituvchilar va direktor uchun 24/7 aqlli maslahatchi.
            </p>
            <div className={styles.featureTags}>
              <span className={styles.featureTag}>AI tahlil</span>
              <span className={styles.featureTag}>Aqlli maslahatchi</span>
              <span className={styles.featureTag}>Xatarlarni erta aniqlash</span>
              <span className={styles.featureTag}>To'liq o'zbek tilida</span>
            </div>
          </div>

          {/* Card 02 */}
          <div className={styles.featureCard}>
            <span className={styles.featureMeta}>Kunlik nazorat • 1-klikda davomat</span>
            <h3 className={styles.featureTitle}>02. Interaktiv Kunlik Davomat va Jurnallar</h3>
            <p className={styles.featureDesc}>
              Dars boshida tezkor davomat olish (Bor, Yo'q, Kech qoldi, Sababli). O'quvchilarning umumiy davomat reytingi va oylik ko'rsatkichlari avtomatik hisoblanadi. Qog'oz jurnallarga ehtiyoj qolmaydi.
            </p>
            <div className={styles.featureTags}>
              <span className={styles.featureTag}>Tezkor yo'qlama</span>
              <span className={styles.featureTag}>Davomat foizi</span>
              <span className={styles.featureTag}>Oylik jurnallar</span>
              <span className={styles.featureTag}>Mobil qulaylik</span>
            </div>
          </div>

          {/* Card 03 */}
          <div className={styles.featureCard}>
            <span className={styles.featureMeta}>Ta'lim boshqaruvi • Guruhlar va dars jadvali</span>
            <h3 className={styles.featureTitle}>03. Talabalar, Guruhlar va Dars Xonalari</h3>
            <p className={styles.featureDesc}>
              Yangi talabalarni qabul qilish, toq va juft kunlar bo'yicha guruhlar ochish, dars xonalari sig'imi va o'qituvchilar yuklamasini qulay boshqarish. Dars to'qnashuvlarining oldi avtomatik olinadi.
            </p>
            <div className={styles.featureTags}>
              <span className={styles.featureTag}>O'quvchilar bazasi</span>
              <span className={styles.featureTag}>Guruhlar jadvali</span>
              <span className={styles.featureTag}>Xonalar nazorati</span>
              <span className={styles.featureTag}>Ustozlar taqsimoti</span>
            </div>
          </div>

          {/* Card 04 */}
          <div className={styles.featureCard}>
            <span className={styles.featureMeta}>Moliya moduli • Kassa va balans</span>
            <h3 className={styles.featureTitle}>04. Avtomatlashtirilgan Kassa va Qarzdorlik Tizimi</h3>
            <p className={styles.featureDesc}>
              Markazning barcha to'lovlarini qulay boshqarish: naqd va karta orqali qabul, qarzdor talabalar ro'yxati, markaz xarajatlari va sof foyda balansi real vaqt rejimida shaffof ko'rinadi.
            </p>
            <div className={styles.featureTags}>
              <span className={styles.featureTag}>Kassa nazorati</span>
              <span className={styles.featureTag}>Qarzdorlar monitoringi</span>
              <span className={styles.featureTag}>Chiqimlar hisobi</span>
              <span className={styles.featureTag}>Sof foyda</span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------- SECTION 4: EDUCATIONAL DIRECTIONS (MOSLASHUVCHAN TIZIM) ------------------- */}
      <section id="yonalishlar" className={styles.sectionWrapper}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBreadcrumb}>Barcha o'quv markazlari uchun universal platforma</span>
          <h2 className={styles.sectionTitle}>Har Qanday Ta'lim Yo'nalishi Uchun Moslashuvchan Tizim</h2>
          <p className={styles.sectionSubtitle}>
            Bizning CRM tizimimiz barcha o'quv markazlari, til maktablari va to'garaklarning talablariga to'liq javob beradi:
          </p>
        </div>

        <div className={styles.dossierGrid}>
          {/* Column 1 */}
          <div className={styles.dossierCol}>
            <div className={styles.dossierColHeader}>
              <span className={styles.dossierColRange}>01. Chet tillari & IELTS</span>
              <h4 className={styles.dossierColTitle}>Til O'rgatish Markazlari</h4>
            </div>
            <ul className={styles.dossierList}>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>01.</span> Ingliz tili, CEFR, IELTS, Rus, Koreys, Arab tillari</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>02.</span> Guruhlar darajalari (Beginner dan Advanced gacha)</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>03.</span> Kunlik davomat va talabalar faolligi monitoringi</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>04.</span> Dars smenalari (ertalabki, kunduzgi va kechki)</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>05.</span> Har oylik test sinovlari va o'zlashtirish tahlili</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>06.</span> Oylik to'lovlar va qarzdorlikni qat'iy nazorat qilish</li>
            </ul>
          </div>

          {/* Column 2 */}
          <div className={styles.dossierCol}>
            <div className={styles.dossierColHeader}>
              <span className={styles.dossierColRange}>02. IT & Dasturlash</span>
              <h4 className={styles.dossierColTitle}>IT va Raqamli Texnologiyalar</h4>
            </div>
            <ul className={styles.dossierList}>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>07.</span> Frontend, Backend, Python, Foundation kurslari</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>08.</span> Grafik dizayn, 3D modellashtirish, SMM, Video montaj</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>09.</span> Mentorlar va yordamchi assistentlar dars yuklamasi</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>10.</span> Kompyuter xonalari sig'imi va xonalar bandligi</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>11.</span> Talabalar amaliy loyihalari va portfolio hisobi</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>12.</span> Kurs bitiruvchilari va sertifikat berish monitoringi</li>
            </ul>
          </div>

          {/* Column 3 */}
          <div className={styles.dossierCol}>
            <div className={styles.dossierColHeader}>
              <span className={styles.dossierColRange}>03. Fanlar & Repetitorlik</span>
              <h4 className={styles.dossierColTitle}>Maktab va OTM Tayyorlov</h4>
            </div>
            <ul className={styles.dossierList}>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>13.</span> Matematika, Fizika, Kimyo, Biologiya, Tarix fanlari</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>14.</span> Abituriyentlar va Prezident maktabiga tayyorlov</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>15.</span> Katta guruhlar uchun tezkor davomat olish</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>16.</span> Ota-onalar bilan muntazam aloqa va nazorat</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>17.</span> Sinov testlari (DTM / Mock) natijalari tahlili</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>18.</span> Oylik to'lovlar, chegirmalar va kassa intizomi</li>
            </ul>
          </div>

          {/* Column 4 */}
          <div className={styles.dossierCol}>
            <div className={styles.dossierColHeader}>
              <span className={styles.dossierColRange}>04. Ijod & Rivojlanish</span>
              <h4 className={styles.dossierColTitle}>Bolalar va Kasb To'garaklari</h4>
            </div>
            <ul className={styles.dossierList}>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>19.</span> Mental arifmetika, Shaxmat, Tez o'qish (Skorochteniye)</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>20.</span> Robototexnika, Lego-konstruktorlik va bolalar IT</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>21.</span> Yosh toifalariga ko'ra guruhlarni qulay shakllantirish</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>22.</span> Dars qoldirgan bolalarni o'z vaqtida aniqlash</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>23.</span> Chegirmalar, oilaviy paketlar va imtiyozlar hisobi</li>
              <li className={styles.dossierItem}><span className={styles.dossierNum}>24.</span> Markazning oylik sof daromadi va xarajatlari hisoboti</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------- SECTION 5: FAQ (SAVOL-JAVOBLAR & SEO) ------------------- */}
      <section id="faq" className={`${styles.sectionWrapper} ${styles.faqSection}`}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionBreadcrumb}>Ko'p beriladigan savollar</span>
          <h2 className={styles.sectionTitle}>Markaz CRM Haqida Eng Ko'p Beriladigan Savollar</h2>
          <p className={styles.sectionSubtitle}>
            O'quv markazlari egalari, administratorlar va o'qituvchilar tomonidan eng ko'p beriladigan savollarga aniq javoblar:
          </p>
        </div>

        <div className={styles.faqGrid}>
          <div className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>
              <HelpCircle size={20} className={styles.faqIcon} />
              <span>Markaz CRM qaysi turdagi o'quv markazlariga mos keladi?</span>
            </h3>
            <p className={styles.faqAnswer}>
              Tizim barcha ta'lim yo'nalishlariga moslashtirilgan: xorijiy til markazlari (IELTS, CEFR, Ingliz, Rus, Koreys), IT va dasturlash akademiyalari, abituriyent tayyorlov markazlari, maktab fanlari, bolalar to'garaklari va xususiy repetitorlik faoliyati uchun 100% qulay.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>
              <HelpCircle size={20} className={styles.faqIcon} />
              <span>Kunlik davomat olish qanday amalga oshiriladi?</span>
            </h3>
            <p className={styles.faqAnswer}>
              O'qituvchi yoki mentor o'z shaxsiy profiliga kirib, bir necha soniya ichida o'quvchilarni "Bor", "Yo'q", "Kech qoldi" yoki "Sababli" deb belgilaydi. Dars davomati foizi va oylik jurnallar real vaqt rejimida avtomatik hisoblanadi.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>
              <HelpCircle size={20} className={styles.faqIcon} />
              <span>Sun'iy Intellekt (AI) qanday amaliy yordam beradi?</span>
            </h3>
            <p className={styles.faqAnswer}>
              O'rnatilgan AI yordamchi markazning umumiy holatini tahlil qiladi, muntazam dars qoldirayotgan yoki o'qishni to'xtatish xavfi bor o'quvchilarni erta aniqlaydi, davomati past guruhlar bo'yicha maslahat beradi va qarzdorlarga xabar tayyorlashda yordam beradi.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>
              <HelpCircle size={20} className={styles.faqIcon} />
              <span>Tizimdan telefon va planshetda foydalanish mumkinmi?</span>
            </h3>
            <p className={styles.faqAnswer}>
              Albatta! Platforma to'liq bulutli texnologiyada qurilgan bo'lib, har qanday smartfon, planshet, noutbuk va kompyuter brauzerlarida 24/7 rejimda qulay va tezkor ishlaydi. Alohida og'ir dastur o'rnatish shart emas.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>
              <HelpCircle size={20} className={styles.faqIcon} />
              <span>Moliya va qarzdorlik qanday nazorat qilinadi?</span>
            </h3>
            <p className={styles.faqAnswer}>
              O'quvchilarning oylik kurs to'lovlari (naqd, karta yoki bank o'tkazmasi) bir zumda kassa balansiga qayd etiladi. To'lov muddati kelgan yoki o'tgan qarzdor talabalar ro'yxati alohida ko'rsatiladi va markazning sof foydasi shaffof hisoblanadi.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>
              <HelpCircle size={20} className={styles.faqIcon} />
              <span>O'quv markazimizga tizimni qanday ulaymiz va sinab ko'ramiz?</span>
            </h3>
            <p className={styles.faqAnswer}>
              Saytda keltirilgan Telegram (@OlimjonOtabekovich) yoki to'g'ridan-to'g'ri telefon (+998 88 579 03 09) orqali dasturchi bilan bog'lanishingiz mumkin. O'quv markazingiz uchun tizim qisqa vaqt ichida to'liq sozlab, ishga tushirib beriladi.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------- SECTION 6: CONTACT & AUTHOR (BOG'LANISH) ------------------- */}
      <section id="aloqa" className={styles.sectionWrapper}>
        <div className={styles.contactCard}>
          <div className={styles.contactHeader}>
            <span className={styles.sectionBreadcrumb}>Muallif va aloqa</span>
            <h2 className={styles.contactTitle}>Savollar yoki Hamkorlik Uchun Bog'lanish</h2>
            <p className={styles.contactSubtitle}>
              Tizimni o'quv markazingizga joriy qilish, individual funksiyalar qo'shish yoki savollar bo'yicha to'g'ridan-to'g'ri dasturchi bilan bog'laning:
            </p>
          </div>

          <div className={styles.contactRow}>
            {/* Phone Card */}
            <a href="tel:+998885790309" className={`${styles.contactItem} ${styles.phoneContactItem}`}>
              <div className={styles.contactIconWrap}>
                <Phone size={24} />
              </div>
              <div className={styles.contactInfo}>
                <span className={styles.contactLabel}>Telefon raqam</span>
                <span className={styles.contactValue}>+998 88 579 03 09</span>
              </div>
              <span className={styles.contactActionText}>
                Qo'ng'iroq qilish <ArrowRight size={14} />
              </span>
            </a>

            {/* Telegram Card */}
            <a
              href="https://t.me/OlimjonOtabekovich"
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.contactItem} ${styles.tgContactItem}`}
            >
              <div className={styles.contactIconWrap}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div className={styles.contactInfo}>
                <span className={styles.contactLabel}>Telegram profil</span>
                <span className={styles.contactValue}>@OlimjonOtabekovich</span>
              </div>
              <span className={styles.contactActionText}>
                Xabar yozish <ArrowRight size={14} />
              </span>
            </a>

            {/* Instagram Card */}
            <a
              href="https://instagram.com/murtazoyev0limjon"
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.contactItem} ${styles.instaContactItem}`}
            >
              <div className={styles.contactIconWrap}>
                <Instagram size={24} />
              </div>
              <div className={styles.contactInfo}>
                <span className={styles.contactLabel}>Instagram profil</span>
                <span className={styles.contactValue}>murtazoyev0limjon</span>
              </div>
              <span className={styles.contactActionText}>
                Kuzatish <ArrowRight size={14} />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ------------------- FOOTER ------------------- */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLeft}>
            <img src="/crm-logo.png" alt="CRM Logo" className={styles.footerLogo} />
            <div>
              <div className={styles.footerBrandTitle}>MARKAZ CRM PLATFORM</div>
              <div className={styles.footerBrandDesc}>
                Barcha turdagi o'quv markazlari, til maktablari va akademiyalar uchun yagona aqlli boshqaruv tizimi
              </div>
            </div>
          </div>

          <div className={styles.footerRight}>
            <a
              href="tel:+998885790309"
              className={styles.contactFooterPill}
              title="Telefon orqali bog'lanish"
            >
              <Phone size={15} />
              <span>+998 88 579 03 09</span>
            </a>

            <a
              href="https://t.me/OlimjonOtabekovich"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactFooterPill}
              title="Telegram orqali bog'lanish"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"
                  fill="#38bdf8"
                />
              </svg>
              <span>@OlimjonOtabekovich</span>
            </a>

            <a
              href="https://instagram.com/murtazoyev0limjon"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactFooterPill}
              title="Instagram profilni ko'rish"
            >
              <Instagram size={15} />
              <span>murtazoyev0limjon</span>
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
          <span>© 2026 CRM Platform. Barcha huquqlar himoyalangan.</span>
          <span>Dasturchi: Olimjon Murtazoyev (@OlimjonOtabekovich)</span>
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
              <p className={styles.modalSubtitle}>O'quv markaz shaxsiy kabinetingizga kiring</p>
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
