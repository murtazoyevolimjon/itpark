'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sparkles,
  Bot,
  X,
  Send,
  Maximize2,
  Minimize2,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  Zap,
  Users,
  CalendarCheck,
  CreditCard,
  Briefcase,
  ShieldCheck,
  Code2,
  BookOpen,
  Building,
} from 'lucide-react';
import { aiApi, AITaskType } from '@/api/ai.api';
import { useAuth } from '@/hooks/useAuth';
import styles from './FloatingAIWidget.module.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: 'gemini_ai' | 'builtin_engine';
  time: string;
}

export const FloatingAIWidget: React.FC = () => {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // If we are already on the full AI assistant page, don't show the floating widget
  if (pathname.startsWith('/ai-assistant')) {
    return null;
  }

  // Detect role
  const isSuperAdminRoute = pathname.startsWith('/superadmin');
  const isTeacherRoute = pathname === '/teacher' || pathname.startsWith('/teacher/') || user?.role === 'TEACHER';
  const isStudentRoute = pathname === '/student' || pathname.startsWith('/student/') || user?.role === 'STUDENT';

  // Determine current page context & smart role-tailored chips
  const getPageContext = () => {
    // 1. SuperAdmin (Dasturchi)
    if (isSuperAdminRoute) {
      return {
        label: 'Dasturchi (SuperAdmin)',
        task: 'dashboard_summary' as AITaskType,
        icon: <Building size={14} />,
        chips: [
          { text: "🏢 Nechta o'quv markaz ochildi?", question: "Nechta o'quv markaz ochildi?" },
          { text: "📞 Markazlar aloqa ma'lumotlari", question: "Barcha ochilgan o'quv markazlar nomlari va telefon raqamlarini chiqarib ber" },
          { text: "📊 Platforma umumiy statistikasi", question: "Platforma bo'yicha jami markazlar, talabalar va o'qituvchilar soni qancha?" },
        ],
      };
    }

    // 2. Teacher (O'qituvchi)
    if (isTeacherRoute) {
      return {
        label: "O'qituvchi Kabineti",
        task: 'teacher_load' as AITaskType,
        icon: <BookOpen size={14} />,
        chips: [
          { text: "📘 90 daqiqalik dars rejasi", question: "Mavzu bo'yicha 90 daqiqalik dars rejasi tuzib ber" },
          { text: "📝 5 ta test savoli tuzish", question: "Dasturlash mavzusi bo'yicha 5 ta test savoli va to'g'ri javoblarini tuzib ber" },
          { text: "👥 Mening guruhlarim", question: "Menga biriktirilgan guruhlar va ulardagi o'quvchilar soni qancha?" },
        ],
      };
    }

    // 3. Student (O'quvchi)
    if (isStudentRoute) {
      return {
        label: "O'quvchi Portali",
        task: 'chat_qa' as AITaskType,
        icon: <Code2 size={14} />,
        chips: [
          { text: "💻 Koddagi xatoni to'g'rilash", question: "Koddagi xatoni (error/bug) tekshirib, to'g'rilangan kod variantini ko'rsatib ber" },
          { text: "📖 Mavzuni sodda tushuntir", question: "Mavzuni hayotiy misollar bilan sodda qilib tushuntirib ber" },
          { text: "💳 Mening to'lovim va davomatim", question: "Mening to'lov holatim va davomat foizim qanday?" },
        ],
      };
    }

    // 4. Admin / Center Pages
    if (pathname.startsWith('/students')) {
      return {
        label: "O'quvchilar",
        task: 'student_analysis' as AITaskType,
        icon: <Users size={14} />,
        chips: [
          { text: "💰 Qarzdorlar kimlar va qancha qarz bor?", question: "Qarzdorlar kimlar va qancha qarz bor?" },
          { text: "⚠️ Tark etish xavfidagilar", task: 'student_analysis' as AITaskType },
          { text: "🎓 Faol talabalar", question: "Faol o'quvchilar soni va holati qanday?" },
        ],
      };
    }
    if (pathname.startsWith('/attendance')) {
      return {
        label: 'Davomat',
        task: 'attendance_analysis' as AITaskType,
        icon: <CalendarCheck size={14} />,
        chips: [
          { text: "📊 70% dan past guruhlar", task: 'attendance_analysis' as AITaskType },
          { text: "⚡ Bugungi davomat holati", question: "Bugungi darslarda davomat qanday bo'ldi?" },
        ],
      };
    }
    if (pathname.startsWith('/payments') || pathname.startsWith('/finance') || pathname.startsWith('/expenses')) {
      return {
        label: 'Moliya',
        task: 'finance_analysis' as AITaskType,
        icon: <CreditCard size={14} />,
        chips: [
          { text: "💰 Qarzdorlar kimlar va qancha qarz bor?", question: "Qarzdorlar kimlar va qancha qarz bor?" },
          { text: "📊 Moliya va tushumlar", task: 'finance_analysis' as AITaskType },
          { text: "📩 Qarzdorlarga eslatma matni", question: "Qarzdorlarga yuborish uchun xushmuomala lekin qat'iy eslatma matni yoz" },
        ],
      };
    }
    if (pathname.startsWith('/groups')) {
      return {
        label: 'Guruhlar',
        task: 'teacher_load' as AITaskType,
        icon: <Briefcase size={14} />,
        chips: [
          { text: "👥 O'qituvchilar yuklamasi", task: 'teacher_load' as AITaskType },
          { text: "🏫 Guruhlar statistikasi", question: "Qaysi guruhlarda o'quvchilar ko'p yoki kam?" },
        ],
      };
    }
    if (pathname.startsWith('/teachers')) {
      return {
        label: "O'qituvchilar",
        task: 'teacher_load' as AITaskType,
        icon: <Users size={14} />,
        chips: [
          { text: "👥 O'qituvchilar yuki", task: 'teacher_load' as AITaskType },
          { text: "⚖️ Dars soatlari taqsimoti", question: "O'qituvchilar dars soatlari qanday taqsimlangan?" },
        ],
      };
    }

    // Default / Dashboard
    return {
      label: 'Bosh sahifa',
      task: 'dashboard_summary' as AITaskType,
      icon: <Zap size={14} />,
      chips: [
        { text: "💰 Qarzdorlar kimlar va qancha qarz bor?", question: "Qarzdorlar kimlar va qancha qarz bor?" },
        { text: "⚡ Markaz umumiy xulosasi", task: 'dashboard_summary' as AITaskType },
        { text: "📋 Davomat xulosasi", task: 'attendance_analysis' as AITaskType },
      ],
    };
  };

  const context = getPageContext();

  // Initialize greeting message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      let welcomeText = `Assalomu alaykum! Men Markaz CRM AI yordamchisiman.\nSiz hozir "${context.label}" bo'limidasiz. Qanday ma'lumot tahlilini xohlaysiz? Quyidagi tayyor tugmalardan foydalanishingiz yoki savol yozishingiz mumkin.`;

      if (isSuperAdminRoute) {
        welcomeText = `Assalomu alaykum, Hurmatli Dasturchi! Barcha o'quv markazlar, filiallar va platforma ko'rsatkichlari bo'yicha real vaqtda bazadan aniq ma'lumot berishga tayyorman.`;
      } else if (isTeacherRoute) {
        welcomeText = `Assalomu alaykum ustoz! Dars rejasi (90 daqiqa), 5 ta test savoli yoki guruhlaringiz davomati bo'yicha savol berishingiz mumkin.`;
      } else if (isStudentRoute) {
        welcomeText = `Salom! Men sizning shaxsiy AI repetitoringizman. Koddagi xatolik (bug), tushunmagan mavzuingiz yoki to'lov/davomat holatingiz bo'yicha savol bering!`;
      }

      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: welcomeText,
          source: 'builtin_engine',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen, context.label, isSuperAdminRoute, isTeacherRoute, isStudentRoute]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (customQuestion?: string, specificTask?: AITaskType) => {
    const questionToSend = customQuestion || inputQuestion.trim();
    const taskToSend = specificTask || (questionToSend ? 'chat_qa' : context.task);

    if (!questionToSend && !specificTask) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: questionToSend || (specificTask === 'dashboard_summary' ? 'Umumiy xulosa' : context.label + ' tahlili'),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsLoading(true);

    try {
      const res = await aiApi.analyze({
        task_type: taskToSend,
        user_question: questionToSend,
        prompt: questionToSend,
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.result || res.response || res.text || res.message || "Ma'lumot topilmadi.",
        source: res.source,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Xatolik yuz berdi: ${err?.response?.data?.message || err?.message || 'Tizim bilan aloqa uzildi'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setMessages([]);
  };

  // Scroll lock when AI drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('scroll-locked');
    } else {
      document.body.classList.remove('scroll-locked');
    }
    return () => {
      document.body.classList.remove('scroll-locked');
    };
  }, [isOpen]);

  return (
    <>
      {/* Compact circular floating trigger button */}
      {!isOpen && (
        <button
          className={`${styles.floatingTrigger} ${isStudentRoute ? styles.studentFloatingTrigger : ''}`}
          onClick={() => setIsOpen(true)}
          title="AI Yordamchi"
          aria-label="AI Yordamchi"
        >
          <div className={styles.triggerIconWrap}>
            <Sparkles size={20} />
            <span className={styles.pulseDot} />
          </div>
          <span className={styles.triggerTooltip}>AI Yordamchi</span>
        </button>
      )}

      {/* Backdrop overlay for focus */}
      {isOpen && (
        <div
          className={styles.panelOverlay}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer Panel */}
      {isOpen && (
        <div className={`${styles.drawer} ${isExpanded ? styles.drawerExpanded : ''}`}>
          {/* Header */}
          <div className={styles.drawerHeader}>
            <div className={styles.headerLeft}>
              <div className={styles.headerIconBox}>
                <Bot size={18} />
              </div>
              <div>
                <h3 className={styles.headerTitle}>
                  AI Yordamchi
                  <Sparkles size={12} color="#facc15" />
                </h3>
                <p className={styles.headerSubtitle}>
                  {context.icon} {context.label} <span style={{ opacity: 0.5 }}>•</span> <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#86efac' }}><ShieldCheck size={11} /> Jonli Baza Faktlari</span>
                </p>
              </div>
            </div>

            <div className={styles.headerActions}>
              {/* Expand / Minimize toggle inside the widget */}
              <button
                className={styles.headerBtn}
                title={isExpanded ? 'Kichraytirish' : 'Maydonni kattalashtirish'}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>

              {/* Dedicated full page link (only for Admin) */}
              {!isSuperAdminRoute && !isTeacherRoute && !isStudentRoute && (
                <button
                  className={styles.headerBtn}
                  title="To'liq ekranda ochish"
                  onClick={() => router.push('/ai-assistant')}
                >
                  <ExternalLink size={14} />
                </button>
              )}

              {/* Reset chat */}
              <button
                className={styles.headerBtn}
                title="Suhbatni tozalash"
                onClick={handleClear}
              >
                <RotateCcw size={14} />
              </button>

              {/* Close Drawer */}
              <button
                className={styles.closeBtn}
                title="Yopish"
                onClick={() => setIsOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Quick Context Chips */}
          <div className={styles.chipsContainer}>
            {context.chips.map((chip: any, index) => (
              <button
                key={index}
                className={styles.chipBtn}
                onClick={() => handleSend(chip.question, chip.task)}
                disabled={isLoading}
              >
                {chip.text}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className={styles.messagesList}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.messageItem} ${
                  msg.role === 'user' ? styles.userMessage : styles.assistantMessage
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className={styles.botAvatar}>
                    <Bot size={14} />
                  </div>
                )}
                <div className={styles.messageBubble}>
                  <div className={styles.messageContent}>
                    {msg.content}
                  </div>
                  <div className={styles.messageMeta}>
                    <span className={styles.messageTime}>{msg.time}</span>
                    {msg.role === 'assistant' && (
                      <>
                        <span className={styles.sourceBadge}>
                          {msg.source === 'gemini_ai' ? '✨ Gemini AI' : '⚡ Baza Analitikasi'}
                        </span>
                        <button
                          className={styles.copyBtn}
                          onClick={() => handleCopy(msg.content, msg.id)}
                          title="Nusxa olish"
                        >
                          {copiedId === msg.id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className={`${styles.messageItem} ${styles.assistantMessage}`}>
                <div className={styles.botAvatar}>
                  <Bot size={14} />
                </div>
                <div className={styles.messageBubble}>
                  <div className={styles.typingIndicator}>
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className={styles.typingText}>Bazadagi haqiqiy ma'lumotlar tahlil qilinmoqda...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            className={styles.inputArea}
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              className={styles.chatInput}
              placeholder="Savolingizni yozing (masalan: Qarzdorlar kimlar?)..."
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={!inputQuestion.trim() || isLoading}
              title="Yuborish"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
