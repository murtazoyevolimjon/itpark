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
} from 'lucide-react';
import { aiApi, AITaskType } from '@/api/ai.api';
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

  // Determine current page context
  const getPageContext = () => {
    if (pathname.startsWith('/students')) {
      return {
        label: "O'quvchilar",
        task: 'student_analysis' as AITaskType,
        icon: <Users size={14} />,
        chips: [
          { text: "⚠️ Tark etish xavfidagilar", task: 'student_analysis' as AITaskType },
          { text: "💰 Qarzdor o'quvchilar", question: "Qarzdor o'quvchilar kimlar va ularga qancha qarz bor?" },
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
          { text: "💰 Moliya va qarzdorlik", task: 'finance_analysis' as AITaskType },
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
    return {
      label: 'Bosh sahifa',
      task: 'dashboard_summary' as AITaskType,
      icon: <Zap size={14} />,
      chips: [
        { text: "⚡ Markaz umumiy xulosasi", task: 'dashboard_summary' as AITaskType },
        { text: "💰 Moliya holati", task: 'finance_analysis' as AITaskType },
        { text: "📋 Davomat xulosasi", task: 'attendance_analysis' as AITaskType },
      ],
    };
  };

  const context = getPageContext();

  // Initialize greeting message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Assalomu alaykum! Men Markaz CRM AI yordamchisiman.\nSiz hozir "${context.label}" bo'limidasiz. Qanday ma'lumot tahlilini xohlaysiz? Quyidagi tayyor tugmalardan foydalanishingiz yoki savol yozishingiz mumkin.`,
          source: 'builtin_engine',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen, context.label]);

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
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.result || "Ma'lumot topilmadi.",
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

  return (
    <>
      {/* Compact circular floating trigger button */}
      {!isOpen && (
        <button
          className={styles.floatingTrigger}
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
                  {context.icon} {context.label}
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

              {/* Dedicated full page link */}
              <button
                className={styles.headerBtn}
                title="Alohida sahifada ochish"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/ai-assistant');
                }}
              >
                <ExternalLink size={14} />
              </button>

              <button
                className={styles.headerBtn}
                title="Tozalash"
                onClick={handleClear}
              >
                <RotateCcw size={14} />
              </button>

              <button
                className={styles.headerBtn}
                title="Yopish"
                onClick={() => setIsOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Contextual Smart Chips */}
          <div className={styles.contextChipsBar}>
            {context.chips.map((chip, idx) => (
              <button
                key={idx}
                className={`${styles.contextChip} ${idx === 0 ? styles.chipFeatured : ''}`}
                onClick={() => handleSend(chip.question, chip.task)}
                disabled={isLoading}
              >
                <Sparkles size={11} />
                {chip.text}
              </button>
            ))}
          </div>

          {/* Messages List */}
          <div className={styles.messagesList}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.messageBubble} ${
                  msg.role === 'user' ? styles.userBubble : styles.aiBubble
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className={styles.aiHeaderMeta}>
                    <span
                      className={`${styles.aiBadge} ${
                        msg.source === 'gemini_ai'
                          ? styles.badgeGemini
                          : styles.badgeBuiltin
                      }`}
                    >
                      <Sparkles size={10} />
                      {msg.source === 'gemini_ai' ? 'Gemini AI' : 'Markaz Analitikasi'}
                    </span>
                    <button
                      className={styles.copyBtn}
                      onClick={() => handleCopy(msg.content, msg.id)}
                      title="Nusxa olish"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={11} color="#10b981" /> Nusxalandi
                        </>
                      ) : (
                        <>
                          <Copy size={11} /> Nusxa
                        </>
                      )}
                    </button>
                  </div>
                )}
                <div className={styles.aiTextContent}>{msg.content}</div>
              </div>
            ))}

            {isLoading && (
              <div className={styles.loadingBubble}>
                <Bot size={15} />
                <span>Markaz ma'lumotlari tahlil qilinmoqda...</span>
                <div className={styles.dotWave}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div className={styles.drawerFooter}>
            <form
              className={styles.inputForm}
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <input
                ref={inputRef}
                type="text"
                className={styles.textInput}
                placeholder="AI dan biror narsa so'rang..."
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={isLoading || !inputQuestion.trim()}
                title="Yuborish"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
