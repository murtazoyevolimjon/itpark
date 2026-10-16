'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Sparkles,
  Bot,
  Send,
  Copy,
  Check,
  RefreshCw,
  LayoutDashboard,
  Users,
  CalendarCheck,
  DollarSign,
  GraduationCap,
  MessageSquare,
  Key,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Sliders,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card } from '../components/ui/Card/Card';
import { Button } from '../components/ui/Button/Button';
import { Input } from '../components/ui/Input/Input';
import { Badge } from '../components/ui/Badge/Badge';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import { useToast } from '../components/ui/Toast/Toast';
import { useAuth } from '../hooks/useAuth';
import { aiApi, AITaskType } from '../api/ai.api';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const AIAssistant: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'analytics' | 'chat' | 'settings'>('analytics');
  const [selectedTask, setSelectedTask] = useState<AITaskType>('dashboard_summary');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [analysisSource, setAnalysisSource] = useState<string>('');
  const [copiedText, setCopiedText] = useState(false);

  // Determine user role and title
  const [role, setRole] = useState<'ADMIN' | 'TEACHER' | 'STUDENT' | 'SUPERADMIN'>('ADMIN');
  const [roleTitle, setRoleTitle] = useState<string>('Markaz');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sa = localStorage.getItem('superadmin_user');
      if (sa) {
        try {
          const parsed = JSON.parse(sa);
          if (parsed && parsed.role === 'SUPERADMIN') {
            setRole('SUPERADMIN');
            setRoleTitle('CRM Platformasi (Dasturchi)');
            return;
          }
        } catch {}
      }
    }

    if (user) {
      const r = (user.role || 'ADMIN').toUpperCase();
      if (r === 'TEACHER') {
        setRole('TEACHER');
        setRoleTitle(user.fullName || 'Ustoz');
      } else if (r === 'STUDENT') {
        setRole('STUDENT');
        setRoleTitle(user.fullName || "O'quvchi");
      } else if (r === 'SUPERADMIN') {
        setRole('SUPERADMIN');
        setRoleTitle('Bosh Dasturchi');
      } else {
        setRole('ADMIN');
        setRoleTitle(user.centerName || 'Markaz');
      }
    }
  }, [user]);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: `Assalomu alaykum! Men "Markaz CRM AI Yordamchisi"man. Markazingizdagi o'quvchilar, guruhlar, davomat, to'lovlar va ustozlar yuklamasi bo'yicha har qanday savolingizga faqat haqiqiy ma'lumotlar asosida javob beraman.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, []);

  // Settings: Gemini API Key in localStorage
  const [apiKey, setApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('gemini_api_key') || '';
      setApiKey(savedKey);
      setIsKeySaved(!!savedKey);
    }
  }, []);

  const handleSaveApiKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      setIsKeySaved(!!apiKey.trim());
      success(apiKey.trim() ? "Gemini API kaliti saqlandi!" : "API kalit o'chirildi.");
    }
  };

  // Run Analytics Task
  const analyzeMutation = useMutation({
    mutationFn: (taskType: AITaskType) =>
      aiApi.analyze({
        task_type: taskType,
        date_range: 'Oxirgi 30 kun',
      }),
    onSuccess: (data) => {
      const resText = typeof data?.result === 'string' ? data.result : String(data?.result || 'Tahlil muvaffaqiyatli yakunlandi.');
      setAnalysisResult(resText);
      setAnalysisSource(data?.source === 'gemini_ai' ? 'Google Gemini AI' : 'Markaz AI Tahlil Dvigateli');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || err.message || 'Tahlil qilishda xatolik yuz berdi');
    },
  });

  // Automatically run dashboard summary on mount
  useEffect(() => {
    if (!analysisResult && !analyzeMutation.isPending) {
      analyzeMutation.mutate('dashboard_summary');
    }
  }, []);

  const handleSelectTask = (task: AITaskType) => {
    setSelectedTask(task);
    analyzeMutation.mutate(task);
  };

  // Send Chat Message
  const chatMutation = useMutation({
    mutationFn: (question: string) =>
      aiApi.analyze({
        task_type: 'chat_qa',
        user_question: question,
      }),
    onSuccess: (data) => {
      const resText = typeof data?.result === 'string' ? data.result : String(data?.result || 'Javob tayyorlandi.');
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'ai',
          text: resText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    },
    onError: (err: any) => {
      error(err.response?.data?.message || err.message || 'Savolga javob olishda xatolik yuz berdi');
    },
  });

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = chatInput.trim();
    if (!query || chatMutation.isPending) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    chatMutation.mutate(query);
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatMutation.isPending]);

  const handleCopy = (text: string) => {
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedText(true);
      success("Xulosa nusxalandi!");
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const tasksList: { type: AITaskType; title: string; desc: string; icon: any; color: string }[] = useMemo(() => {
    if (role === 'SUPERADMIN') {
      return [
        {
          type: 'dashboard_summary',
          title: 'Platforma Dashboardi',
          desc: "Barcha markazlar, talabalar va tizim yuklamasi xulosasi",
          icon: LayoutDashboard,
          color: '#3b82f6',
        },
        {
          type: 'student_analysis',
          title: "O'quvchilar Tahlili",
          desc: "Tizim bo'yicha talabalar faolligi va umumiy soni",
          icon: Users,
          color: '#10b981',
        },
        {
          type: 'attendance_analysis',
          title: 'Platforma Davomati',
          desc: "O'rtacha akademik davomat darajasi statistikasi",
          icon: CalendarCheck,
          color: '#f59e0b',
        },
        {
          type: 'finance_analysis',
          title: 'Global Moliya',
          desc: "Barcha markazlar tushumi va to'lovlar balansi",
          icon: DollarSign,
          color: '#8b5cf6',
        },
        {
          type: 'teacher_load',
          title: 'Ustozlar & Markazlar',
          desc: "O'qituvchilar soni va guruhlar taqsimoti",
          icon: GraduationCap,
          color: '#ec4899',
        },
      ];
    }

    if (role === 'TEACHER') {
      return [
        {
          type: 'dashboard_summary',
          title: 'Mening Guruhlarim',
          desc: "Biriktirilgan guruhlarim va o'quvchilarim umumiy holati",
          icon: LayoutDashboard,
          color: '#3b82f6',
        },
        {
          type: 'student_analysis',
          title: "O'quvchilarim Faolligi",
          desc: "Talabalarim faolligi va qarzdorlik holati",
          icon: Users,
          color: '#10b981',
        },
        {
          type: 'attendance_analysis',
          title: 'Guruhlarim Davomati',
          desc: "Darslarga qatnashish va kechikishlar tahlili",
          icon: CalendarCheck,
          color: '#f59e0b',
        },
        {
          type: 'teacher_load',
          title: 'Dars Yuklamam',
          desc: "Haftalik dars soatlarim va guruhlar balansi",
          icon: GraduationCap,
          color: '#ec4899',
        },
        {
          type: 'finance_analysis',
          title: 'Metodika & Rejalar',
          desc: "Dars metodikasi, reja va amaliy mashqlar tavsiyasi",
          icon: DollarSign,
          color: '#8b5cf6',
        },
      ];
    }

    return [
      {
        type: 'dashboard_summary',
        title: 'Umumiy Dashboard',
        desc: "O'quvchilar, guruhlar, davomat va to'lovlar holati xulosasi",
        icon: LayoutDashboard,
        color: '#3b82f6',
      },
      {
        type: 'student_analysis',
        title: "O'quvchilar Tahlili",
        desc: "O'quvchilar holati, qarzdorlar va tark etish xavfidagilar",
        icon: Users,
        color: '#10b981',
      },
      {
        type: 'attendance_analysis',
        title: 'Davomat Tahlili',
        desc: "Davomati 70% dan past guruhlar va surunkali qoldiruvchilar",
        icon: CalendarCheck,
        color: '#f59e0b',
      },
      {
        type: 'finance_analysis',
        title: 'Moliyaviy Tahlil',
        desc: "Tushum, xarajat, qarzdorlik va eslatma xabari matni",
        icon: DollarSign,
        color: '#8b5cf6',
      },
      {
        type: 'teacher_load',
        title: 'Ustozlar Yuklamasi',
        desc: "O'qituvchilar guruhlari balansi va qayta taqsimlash tavsiyasi",
        icon: GraduationCap,
        color: '#ec4899',
      },
    ];
  }, [role]);

  const quickQuestions = useMemo(() => {
    if (role === 'SUPERADMIN') {
      return [
        "Platformadagi umumiy holat qanday?",
        "Jami nechta faol o'quvchi va guruh bor?",
        "Qaysi markazlar eng faol ishlamoqda?",
        "Platforma oylik aylanmasi qancha?",
        "Tizim yuklamasi va xavfsizlik holati qanday?",
      ];
    }
    if (role === 'TEACHER') {
      return [
        "Mening guruhlarimdagi holat qanday?",
        "Davomati past o'quvchilar kimlar?",
        "Keyingi dars uchun amaliy mashq tavsiya qil",
        "Dars metodikasini qanday yaxshilash mumkin?",
        "O'quvchilar reytingini oshirish sirlari nima?",
      ];
    }
    return [
      "Bugungi umumiy holat qanday?",
      "Qaysi o'quvchilar to'lov qilmagan?",
      "Davomat bo'yicha kimlarda muammo bor?",
      "Qaysi o'qituvchining yuki eng ko'p?",
      "Oylik tushumimiz va xarajatimiz qancha?",
    ];
  }, [role]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* HERO BANNER */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
          borderRadius: '20px',
          padding: '24px 28px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 30px -8px rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(99, 102, 241, 0.4)',
              flexShrink: 0,
            }}
          >
            <Bot size={28} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Markaz CRM AI Yordamchisi
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: 'rgba(99, 102, 241, 0.25)',
                  border: '1px solid rgba(99, 102, 241, 0.5)',
                  color: '#a5b4fc',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Sparkles size={11} /> AI Analitika
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', margin: '4px 0 0 0' }}>
              {roleTitle} ma'lumotlari asosida sun'iy intellekt xulosalari va tezkor tahlil
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'analytics' ? '#3b82f6' : 'transparent',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Sparkles size={14} /> Tezkor Tahlil
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'chat' ? '#3b82f6' : 'transparent',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <MessageSquare size={14} /> Erkin Savol-Javob
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'settings' ? '#3b82f6' : 'transparent',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Sliders size={14} /> Sozlamalar
          </button>
        </div>
      </div>

      {/* TAB 1: QUICK ANALYTICS */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Task buttons grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {tasksList.map((t) => {
              const Icon = t.icon;
              const isSelected = selectedTask === t.type;

              return (
                <div
                  key={t.type}
                  onClick={() => handleSelectTask(t.type)}
                  style={{
                    padding: '16px',
                    borderRadius: '14px',
                    background: isSelected ? 'var(--surface-hover)' : 'var(--card)',
                    border: isSelected ? `2px solid ${t.color}` : '1px solid var(--border)',
                    boxShadow: isSelected ? `0 4px 14px ${t.color}25` : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: `${t.color}15`,
                        color: t.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    {isSelected && (
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: t.color, color: '#ffffff' }}>
                        FAOL
                      </span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
                      {t.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Analysis Result Card */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#3b82f6" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                  {tasksList.find((t) => t.type === selectedTask)?.title} natijasi
                </h3>
                {analysisSource && (
                  <Badge variant="primary">
                    {analysisSource}
                  </Badge>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  size="sm"
                  variant="outline"
                  icon={copiedText ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  onClick={() => handleCopy(analysisResult)}
                  disabled={!analysisResult || analyzeMutation.isPending}
                >
                  {copiedText ? 'Nusxalandi' : 'Nusxa olish'}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<RefreshCw size={14} />}
                  isLoading={analyzeMutation.isPending}
                  onClick={() => analyzeMutation.mutate(selectedTask)}
                >
                  Qayta tahlil qilish
                </Button>
              </div>
            </div>

            {analyzeMutation.isPending ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0' }}>
                <Skeleton height="24px" width="70%" />
                <Skeleton height="20px" width="90%" />
                <Skeleton height="20px" width="85%" />
                <Skeleton height="20px" width="60%" />
              </div>
            ) : analysisResult ? (
              <div
                style={{
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '20px',
                  fontSize: '14px',
                  lineHeight: '1.7',
                  color: 'var(--text)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                }}
              >
                {typeof analysisResult === 'string' ? analysisResult : JSON.stringify(analysisResult, null, 2)}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                Tahlil natijasini olish uchun yuqoridagi bo'limlardan birini tanlang.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: INTERACTIVE AI CHAT */}
      {activeTab === 'chat' && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', height: '620px' }}>
            {/* Chat Messages Area */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '100%',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {m.sender === 'ai' ? (
                      <span style={{ fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Bot size={13} /> AI Yordamchi
                      </span>
                    ) : (
                      <span style={{ fontWeight: 600 }}>Siz</span>
                    )}
                    <span>• {m.timestamp}</span>
                  </div>

                  <div
                    style={{
                      maxWidth: '92%',
                      padding: '14px 18px',
                      borderRadius: m.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: m.sender === 'user' ? 'var(--primary)' : 'var(--background)',
                      color: m.sender === 'user' ? '#ffffff' : 'var(--text)',
                      border: m.sender === 'user' ? 'none' : '1px solid var(--border)',
                      fontSize: '13.5px',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      fontFamily:
                        m.sender === 'ai' && typeof m.text === 'string' && (m.text.includes('|') || m.text.includes('---'))
                          ? 'Consolas, "Roboto Mono", "Courier New", monospace'
                          : 'inherit',
                      overflowX: 'auto',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    {typeof m.text === 'string' ? m.text : JSON.stringify(m.text, null, 2)}
                  </div>
                </div>
              ))}

              {chatMutation.isPending && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Bot size={13} color="#3b82f6" /> AI o'ylamoqda...
                  </div>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '16px 16px 16px 4px',
                      background: 'var(--background)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <Skeleton height="18px" width="160px" />
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Prompts Suggestions */}
            <div style={{ padding: '10px 16px', background: 'var(--card-subtle)', display: 'flex', gap: '8px', overflowX: 'auto', flexShrink: 0 }}>
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setChatInput(q);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  💬 {q}
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={handleSendChat}
              style={{
                padding: '16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Markaz ma'lumotlari bo'yicha savolingizni yozing..."
                disabled={chatMutation.isPending}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--input-bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <Button
                type="submit"
                icon={<Send size={16} />}
                isLoading={chatMutation.isPending}
                disabled={!chatInput.trim()}
              >
                Yuborish
              </Button>
            </form>
          </div>
        </Card>
      )}

      {/* TAB 3: SETTINGS */}
      {activeTab === 'settings' && (
        <Card>
          <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                AI Sozlamalari va Kalitlar
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                AI yordamchisi markazingiz ma'lumotlarini tahlil qilish uchun Google Gemini modelidan foydalanishi mumkin
              </p>
            </div>

            <div
              style={{
                padding: '14px 18px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <ShieldCheck size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>
                <strong style={{ color: '#10b981', display: 'block', marginBottom: '2px' }}>
                  Xavfsizlik va Ma'lumotlarning Maxfiyligi
                </strong>
                AI Yordamchisi faqat sizning markazingiz ma'lumotlari asosida tahlil olib boradi. Hech qanday ma'lumot to'qib chiqarilmaydi yoki uchinchi tomonlarga tarqatilmaydi. Agar maxsus API kalit kiritilmasa, markazning ichki tahliliy dvigateli avtomatik ishlaydi.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input
                label="Google Gemini API Key (ixtiyoriy)"
                type={showApiKey ? 'text' : 'password'}
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                helperText="Google AI Studio (aistudio.google.com) orqali olingan bepul API kalit. Kiritilmasa ham tizim ichki algoritmlar orqali tahlil qilaveradi."
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      borderRadius: '4px',
                      transition: 'color 0.15s',
                    }}
                    title={showApiKey ? "Kalitni yashirish" : "Kalitni ko'rsatish"}
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Button onClick={handleSaveApiKey} icon={<Key size={16} />}>
                  Kalitni saqlash
                </Button>
                {isKeySaved && (
                  <Badge variant="success">
                    ✓ Faol saqlangan
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
