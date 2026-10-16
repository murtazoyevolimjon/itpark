'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStudentPortal } from '../../hooks/useStudentPortal';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Code2,
  HelpCircle,
  Flame,
} from 'lucide-react';
import styles from './StudentAITutor.module.css';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const StudentAITutor: React.FC = () => {
  const { student, group, latestTopic } = useStudentPortal();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const studentFirstName = student?.firstName || "O'quvchi";

  // Initial welcome message from AI
  useEffect(() => {
    try {
      const saved = localStorage.getItem('student_ai_chat');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {}

    const initial: ChatMessage = {
      id: 'init-1',
      sender: 'ai',
      text: `Salom, ${studentFirstName}! Men sizning IT Park shaxsiy AI repetitoringizman 🤖. \n\nSiz hozirda "${group?.course?.name || 'Frontend Web Dasturlash'}" yo'nalishida o'qiyapsiz. Ustozingiz o'tgan oxirgi mavzu: **"${latestTopic.topic}"**.\n\nDars bo'yicha tushunmagan savollaringiz bo'lsa, kod yozishda qiynalayotgan bo'lsangiz yoki uyga vazifani bajarishda yordam kerak bo'lsa, bemalol so'rang!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([initial]);
  }, [studentFirstName, group, latestTopic]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleCopy = (id: string, text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch {}
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (confirm("AI Repetitor bilan suhbat tarixini tozalashni xohlaysizmi?")) {
      const initial: ChatMessage = {
        id: 'init-1',
        sender: 'ai',
        text: `Salom, ${studentFirstName}! Suhbat tozalandi. Qanday savolingiz bor?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([initial]);
      try {
        localStorage.removeItem('student_ai_chat');
      } catch {}
    }
  };

  const handleSendMessage = async (userQuestion?: string) => {
    const textToSend = userQuestion || inputText;
    if (!textToSend.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);

    try {
      // Try asking backend API
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      let aiReplyText = '';

      try {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            task_type: 'student_tutor',
            role: 'STUDENT',
            context: 'STUDENT_TUTOR',
            student_name: studentFirstName,
            course_name: group?.course?.name || 'Frontend Web Dasturlash',
            topic: latestTopic.topic || 'Dasturlash asoslari',
            user_question: textToSend.trim(),
            prompt: `Sen IT Park o'quv markazining tajribali AI Repetitorisan. O'quvchi ismi: ${studentFirstName}. Kurs: ${group?.course?.name || 'Frontend'}. O'tilgan dars mavzusi: ${latestTopic.topic}. O'quvchi savoli: ${textToSend.trim()}. O'zbek tilida sodda, aniq, amaliy kod namunalari bilan javob ber.`,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const rawText = data.result || data.text || data.response || data.message || '';
          // Security / context guard: never show admin/center overview to student
          const isLeakedAdminReport =
            rawText.includes('BUGUNGI HOLATI') ||
            rawText.includes('REJALASHTIRILGAN DARSLAR') ||
            rawText.includes('SOF FOYDA') ||
            rawText.includes('QARZDOR O\'QUVCHILAR');
          if (!isLeakedAdminReport) {
            aiReplyText = rawText;
          }
        }
      } catch {}

      // Fallback smart response generator if AI API offline or filtered
      if (!aiReplyText) {
        const lower = textToSend.toLowerCase();
        if (lower.includes('vazifa') || lower.includes('uyga') || lower.includes('tartib')) {
          aiReplyText = `Uyga vazifani a'lo darajada bajarish bo'yicha 5 ta oltin qadam:\n\n1. 📖 **Topshiriq shartini o'qish:** Ustoz bergan vazifa shartlarini va oxirgi o'tilgan "${latestTopic.topic}" mavzusi materiallarini diqqat bilan ko'rib chiqing.\n2. 🧩 **Bosqichlarga bo'lish:** Murakkab loyihani kichik qismlarga bo'ling (masalan: 1-qadamda HTML suyak, 2-qadamda CSS dizayn, 3-qadamda JS/React mantiq).\n3. 💻 **Kodni mustaqil yozish:** Har bir funksiya yoki komponentni o'zingiz yozing. Nusxa ko'chirmaslik kodni yaxshi eslab qolishga yordam beradi.\n4. 🔍 **Xatolarni tekshirish:** Brauzerda F12 tugmasini bosib, "Console"da qizil xatoliklar yo'qligini tekshiring.\n5. 🚀 **Platformaga topshirish:** Yozgan kodingizni GitHub-ga yuklang va havolasini "Uyga vazifalar" sahifasiga joylang. Bu sizga +50 XP va 5 IT-Coins taqdim etadi!`;
        } else if (lower.includes('mavzu') || lower.includes('tushuntir')) {
          aiReplyText = `**"${latestTopic.topic}"** mavzusi bo'yicha qisqa va sodda qo'llanma:\n\n• **Asosiy mazmuni:** Bu mavzu ${group?.course?.name || 'Dasturlash'} yo'nalishida mantiqiy fikrlash va toza kod yozish asosidir.\n• **Amaliyotda qo'llash:** Har bir qadam ketma-ketlikda, aniq tartib bilan bajarilishi shart.\n• **Ustoz maslahati:** Video darslar bo'limida ustozingiz yuklagan videoni ko'rib, kodni qayta yozib chiqing!`;
        } else if (lower.includes('xato') || lower.includes('error') || lower.includes('ishlamayapti')) {
          aiReplyText = `Koddagi xatolikni bartaraf etish bosqichlari:\n\n1. Brauzerda **F12** tugmasini bosib **Console** dagi qizil xatolik matnini o'qing.\n2. O'zgaruvchilar va komponent nomlarining to'g'ri yozilganini (harf kattaligi sezgir) tekshiring.\n3. Qavslar, import yo'llari va nuqta-vergullarni tekshiring.\n\nKodingiz qismini shu yerga yuborsangiz, qaysi qatorda xato borligini birgalikda tuzatamiz! 👍`;
        } else if (lower.includes('react') && lower.includes('javascript')) {
          aiReplyText = `JavaScript va React o'rtasidagi asosiy farqlar:\n\n• **JavaScript:** Bu veb-sahifalarga jon bag'ishlaydigan asosiy dasturlash tili (Vanilla JS).\n• **React:** Bu JavaScript tilida yozilgan, foydalanuvchi interfeysini (UI) tez va qulay yaratish uchun mo'ljallangan zamonaviy kutubxona.\n• **Asosiy ustunligi:** Reactda sahifa komponentlarga bo'linadi (Header, Card, Button) va virtual DOM orqali butun sahifani qayta yuklamasdan faqat o'zgargan qismini yangilaydi.`;
        } else {
          aiReplyText = `Salom, ${studentFirstName}! "${latestTopic.topic}" mavzusi yoki "${group?.course?.name || 'Dasturlash'}" kursi bo'yicha qanday savolingiz bo'lsa, bemalol yozing. Sizga darslarni chuqur o'rganishda yordam berishdan xursandman! 🚀`;
        }
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);
      try {
        localStorage.setItem('student_ai_chat', JSON.stringify(finalMessages));
      } catch {}
    } catch {
      // ignore
    } finally {
      setIsTyping(false);
    }
  };

  const quickChips = [
    { label: 'Bugungi mavzuni sodda tushuntir', prompt: `Ustoz o'tgan "${latestTopic.topic}" mavzusini sodda tushuntirib ber.` },
    { label: 'Kodimdagi xatolikni top', prompt: 'Kodimdagi xatolikni qanday topish va tuzatish mumkin?' },
    { label: 'Uyga vazifaga yordam', prompt: 'Uyga vazifani qanday tartibda bajarishni maslahat berasan?' },
    { label: 'JavaScript vs React farqi', prompt: 'Oddiy JavaScript va React kutubxonasi o\'rtasidagi asosiy farqlar nima?' },
  ];

  return (
    <div className={styles.container}>
      {/* 1. Header Banner */}
      <section className={styles.headerSection}>
        <div className={styles.headerLeft}>
          <div className={styles.pageBadge}>
            <Sparkles size={13} />
            <span>24/7 AI Dasturlash Assistent</span>
          </div>
          <h1 className={styles.title}>IT Park AI Repetitor</h1>
          <p className={styles.subtitle}>
            Darslar, mavzular va kodlar bo'yicha istalgan savolingizni so'rang. AI yordamchi darsingiz kontekstini biladi.
          </p>
        </div>

        <button onClick={handleClearHistory} className={styles.btnClearChat}>
          <RotateCcw size={14} />
          <span>Tarixni tozalash</span>
        </button>
      </section>

      {/* 2. Context Highlight Card */}
      <div className={styles.contextCard}>
        <div className={styles.contextItem}>
          <span className={styles.contextLabel}>Kurs:</span>
          <strong>{group?.course?.name || 'Frontend'}</strong>
        </div>
        <div className={styles.contextDivider} />
        <div className={styles.contextItem}>
          <span className={styles.contextLabel}>Oxirgi mavzu:</span>
          <strong>{latestTopic.topic}</strong>
        </div>
        <div className={styles.contextDivider} />
        <div className={styles.contextItem}>
          <span className={styles.contextLabel}>O'quvchi:</span>
          <strong>{studentFirstName}</strong>
        </div>
      </div>

      {/* 3. Quick Chips Bar */}
      <div className={styles.chipsBar}>
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            className={styles.chipBtn}
            onClick={() => handleSendMessage(chip.prompt)}
          >
            <Sparkles size={12} className={styles.chipIcon} />
            <span>{chip.label}</span>
          </button>
        ))}
      </div>

      {/* 4. Chat Messages Window */}
      <div className={styles.chatWindow}>
        <div className={styles.messagesList}>
          {messages.map((msg) => {
            const isAi = msg.sender === 'ai';
            return (
              <div
                key={msg.id}
                className={isAi ? styles.messageRowAi : styles.messageRowUser}
              >
                <div className={isAi ? styles.avatarAi : styles.avatarUser}>
                  {isAi ? <Bot size={18} /> : <User size={18} />}
                </div>

                <div className={isAi ? styles.bubbleAi : styles.bubbleUser}>
                  <div className={styles.bubbleHeader}>
                    <span className={styles.senderName}>
                      {isAi ? 'IT Park AI Repetitor' : studentFirstName}
                    </span>
                    <span className={styles.timestampText}>{msg.timestamp}</span>
                  </div>

                  <div className={styles.messageContent}>
                    {msg.text.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>

                  {isAi && (
                    <div className={styles.bubbleFooter}>
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className={styles.copyBtn}
                        title="Nusxa olish"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check size={12} />
                            <span>Nusxalandi</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Nusxa olish</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className={styles.messageRowAi}>
              <div className={styles.avatarAi}>
                <Bot size={18} />
              </div>
              <div className={styles.typingBubble}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className={styles.inputArea}
        >
          <input
            type="text"
            placeholder="AI Repetitordan savol so'rang (masalan: React useEffect qanday ishlaydi?)..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className={styles.chatInput}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className={styles.sendBtn}
            title="Yuborish"
          >
            <Send size={16} />
            <span className={styles.sendText}>Yuborish</span>
          </button>
        </form>
      </div>
    </div>
  );
};
