'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  CalendarCheck,
  DollarSign,
  Clock,
  MapPin,
  GraduationCap,
  Save,
  CheckCircle2,
  XCircle,
  Clock3,
  UserPlus,
  Plus,
  Calendar as CalendarIcon,
  CheckCheck,
  Trash2,
  Edit2,
  AlertTriangle,
  CreditCard,
  UserCheck,
  CheckCircle,
  Sparkles,
  ArrowRightLeft,
  Lock,
  AlertCircle,
  BookOpen,
  Video,
  Download,
  ExternalLink,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getVideoBlob } from '../utils/videoStorage';
import { getTashkentDateString, checkAttendanceTimeEligibility } from '../utils/attendanceTime';
import { Card } from '../components/ui/Card/Card';
import { Button } from '../components/ui/Button/Button';
import { Badge } from '../components/ui/Badge/Badge';
import { Input } from '../components/ui/Input/Input';
import { Modal } from '../components/ui/Modal/Modal';
import { Select } from '../components/ui/Select/Select';
import { GroupCardSelect } from '../components/ui/GroupCardSelect/GroupCardSelect';
import { SubjectSelect } from '../components/ui/SubjectSelect/SubjectSelect';
import { Table, Column } from '../components/ui/Table/Table';
import { Toggle } from '../components/ui/Toggle/Toggle';
import { useToast } from '../components/ui/Toast/Toast';
import { groupsApi } from '../api/groups.api';
import { attendanceApi } from '../api/attendance.api';
import { studentsApi } from '../api/students.api';
import { paymentsApi } from '../api/payments.api';
import { dashboardApi } from '../api/dashboard.api';
import { homeworkApi } from '../api/homework.api';
import { formatDate } from '../utils/formatDate';
import { formatMoney } from '../utils/formatMoney';
import { formatPhone, unmaskPhone } from '../utils/phoneMask';
import { getStudentSubject } from '../lib/credentials';
import { askAddExistingStudent } from '../utils/existingStudent';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import { LessonTopicSelect } from '../components/ui/LessonTopicSelect/LessonTopicSelect';

const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
];

export const GroupDetail: React.FC = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [activeTab, setActiveTab] = useState<'attendanceTake' | 'students' | 'attendanceHistory' | 'homework' | 'videos' | 'payments'>('attendanceTake');
  const [selectedDate, setSelectedDate] = useState<string>(getTashkentDateString());
  const [historyDate, setHistoryDate] = useState<string>(getTashkentDateString());
  const [groupHomeworks, setGroupHomeworks] = useState<any[]>([]);
  const [groupSubmissions, setGroupSubmissions] = useState<any[]>([]);
  const [expandedHwSubmissions, setExpandedHwSubmissions] = useState<Record<string, boolean>>({});
  const [groupVideos, setGroupVideos] = useState<any[]>([]);
  const [groupLessons, setGroupLessons] = useState<any[]>([]);
  const [selectedPaymentMonth, setSelectedPaymentMonth] = useState<string>(currentMonthStr);
  const [attendanceTopic, setAttendanceTopic] = useState<string>('');

  // Attendance state for each student: { [studentId]: { status: 'KELGAN' | 'KELMAGAN' | 'KECHIKKAN', note: '' } }
  const [attendanceState, setAttendanceState] = useState<{
    [studentId: string]: { status: 'KELGAN' | 'KELMAGAN' | 'KECHIKKAN'; note: string };
  }>({});

  // Add student modal state
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [selectedProbaId, setSelectedProbaId] = useState<string>('');
  const [studentForm, setStudentForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    fatherPhone: '',
    motherPhone: '',
    subject: '',
    passportSeries: '',
    birthDate: '2005-01-01',
    gender: 'ERKAK' as 'ERKAK' | 'AYOL',
    isSchoolStudent: false,
    status: 'FAOL',
  });

  // Transfer student modal state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferStudentData, setTransferStudentData] = useState<{
    studentId: string;
    studentName: string;
    targetGroupId: string;
  } | null>(null);

  // Payments Modals in Group Detail
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payFormData, setPayFormData] = useState({
    studentId: '',
    studentName: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'NAQD',
  });

  const [isEditPayModalOpen, setIsEditPayModalOpen] = useState(false);
  const [editPayFormData, setEditPayFormData] = useState({
    id: '',
    studentName: '',
    amount: '',
    paymentDate: '',
    method: 'NAQD',
    status: 'TOLANGAN',
  });

  const [isDeletePayModalOpen, setIsDeletePayModalOpen] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<any>(null);

  // Queries
  const { data: group, isLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: () => groupsApi.getOne(id!),
    enabled: !!id,
  });

  // The group endpoint already returns every payment of the enrolled students,
  // so no separate (1000-row) payments request is needed.

  // Heavy center-wide stats are only needed by the "add student" dialog (trial students list).
  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: dashboardApi.getStats,
    enabled: isAddStudentModalOpen,
  });

  const probaStudents = useMemo(() => {
    return dashboardStats?.probaStudents || [];
  }, [dashboardStats?.probaStudents]);

  const { data: allGroupsData } = useQuery({
    queryKey: ['groupsSelect'],
    queryFn: () => groupsApi.getAll({ limit: 1000 }),
    enabled: isTransferModalOpen,
  });

  const availableTransferGroups = useMemo(() => {
    return (allGroupsData?.data || []).filter((g: any) => g.id !== id);
  }, [allGroupsData?.data, id]);

  // Month options generator (past 6 months, current month, next 2 months)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string; year: number; month: number }[] = [];
    const now = new Date();

    for (let i = -6; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const value = `${year}-${String(month + 1).padStart(2, '0')}`;
      let label = `${MONTH_NAMES[month]} ${year}`;
      if (i === 0) label += ' (Joriy oy)';
      else if (i === -1) label += " (O'tgan oy)";
      else if (i === 1) label += ' (Kelgusi oy)';

      options.push({ value, label, year, month });
    }
    return options;
  }, []);

  // Merge group payments from query and group object
  const allGroupPayments = useMemo(() => {
    const map = new Map();
    (group?.payments || []).forEach((p: any) => {
      if (p && p.id) map.set(p.id, p);
    });
    return Array.from(map.values());
  }, [group?.payments]);

  // Query attendance specifically for historyDate when on attendanceHistory tab
  const { data: historyAttendanceData } = useQuery({
    queryKey: ['groupAttendanceHistory', id, historyDate],
    queryFn: () => attendanceApi.getByGroup(id, historyDate),
    enabled: !!id && !!historyDate && activeTab === 'attendanceHistory',
  });

  // Available recorded attendance dates for this group (extracted from group.attendances)
  const availableHistoryDates = useMemo(() => {
    if (!group?.attendances || !Array.isArray(group.attendances)) return [];
    const dates = new Set<string>();
    group.attendances.forEach((a: any) => {
      if (a.date) {
        const d = a.date.split('T')[0];
        if (d) dates.add(d);
      }
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [group?.attendances]);

  // Attendances for the selected historyDate
  const dayHistoryAttendances = useMemo(() => {
    if (Array.isArray(historyAttendanceData) && historyAttendanceData.length > 0) {
      return historyAttendanceData;
    }
    if (!group?.attendances || !Array.isArray(group.attendances)) return [];
    const clean = historyDate.split('T')[0];
    return group.attendances.filter((a: any) => {
      const aDate = a.date ? a.date.split('T')[0] : '';
      return aDate === clean;
    });
  }, [historyAttendanceData, group?.attendances, historyDate]);

  // Stats for the historyDate
  const historyDayStats = useMemo(() => {
    let kelgan = 0;
    let kelmagan = 0;
    let kechikkan = 0;

    dayHistoryAttendances.forEach((a: any) => {
      if (a.status === 'KELGAN') kelgan++;
      else if (a.status === 'KELMAGAN') kelmagan++;
      else if (a.status === 'KECHIKKAN') kechikkan++;
    });

    const total = dayHistoryAttendances.length;
    const rate = total > 0 ? Math.round(((kelgan + kechikkan) / total) * 100) : 0;
    return { kelgan, kelmagan, kechikkan, total, rate };
  }, [dayHistoryAttendances]);

  // Lesson topic for historyDate
  const historyDayTopic = useMemo(() => {
    const withNote = dayHistoryAttendances.find((a: any) => a.note && !a.note.toLowerCase().includes('sabab:'));
    if (withNote?.note) return withNote.note;
    const clean = historyDate.split('T')[0];
    const lessonMatch = groupLessons.find((l: any) => l.date === clean || l.date?.startsWith(clean));
    if (lessonMatch) return lessonMatch.title;
    return null;
  }, [dayHistoryAttendances, groupLessons, historyDate]);

  // Load teacher homeworks, submissions, videos, and lessons for this group
  useEffect(() => {
    if (!id) return;

    // Load homeworks and student submissions from server API
    const loadHomeworksAndSubmissions = async () => {
      try {
        const [hwRes, subRes] = await Promise.all([
          homeworkApi.getAll({ groupId: id }),
          homeworkApi.getSubmissions({ groupId: id }),
        ]);

        if (hwRes?.data && Array.isArray(hwRes.data) && hwRes.data.length > 0) {
          setGroupHomeworks(hwRes.data);
        } else {
          // Fallback to local
          const savedHw = localStorage.getItem('all_teacher_homeworks');
          if (savedHw) {
            const parsed = JSON.parse(savedHw);
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter(
                (hw: any) => hw.groupId === id || (group?.name && hw.groupName === group.name)
              );
              setGroupHomeworks(filtered);
            }
          }
        }

        if (subRes?.data && Array.isArray(subRes.data)) {
          setGroupSubmissions(subRes.data);
        } else {
          // Fallback to local
          const savedSubs = localStorage.getItem('student_hw_submissions');
          if (savedSubs) {
            const parsed = JSON.parse(savedSubs);
            if (parsed && typeof parsed === 'object') {
              setGroupSubmissions(Object.values(parsed));
            }
          }
        }
      } catch (err) {
        console.warn('Error loading homeworks/submissions:', err);
      }
    };

    loadHomeworksAndSubmissions();

    // Load videos
    const loadVideos = async () => {
      try {
        const savedVideos = localStorage.getItem('all_teacher_videos');
        if (savedVideos) {
          const parsed = JSON.parse(savedVideos);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter(
              (v: any) => v.groupId === id || (group?.name && v.groupName === group.name)
            );
            const resolved = await Promise.all(
              filtered.map(async (v: any) => {
                if (v.videoType === 'file') {
                  try {
                    const blob = await getVideoBlob(v.id);
                    if (blob) {
                      return { ...v, blobUrl: URL.createObjectURL(blob) };
                    }
                  } catch (_) {}
                }
                return v;
              })
            );
            setGroupVideos(resolved);
          }
        }
      } catch (_) {}
    };
    loadVideos();

    // Load lessons
    try {
      const savedLessons = localStorage.getItem(`group_lessons_${id}`);
      if (savedLessons) {
        const parsed = JSON.parse(savedLessons);
        if (Array.isArray(parsed)) {
          setGroupLessons(parsed);
        }
      }
    } catch (_) {}
  }, [id, group?.name, activeTab]);

  // Compute student payment rows for the selected month
  const studentPaymentRows = useMemo(() => {
    if (!group?.studentGroups) return [];

    const [year, month] = selectedPaymentMonth.split('-').map(Number);
    const coursePrice = group.course?.price || 0;

    return group.studentGroups
      .map((sg: any) => {
        const student = sg.student;
        if (!student) return null;

        const studentPaymentsInMonth = allGroupPayments.filter((p: any) => {
          if (!p.paymentDate || p.status === 'TOLANMAGAN') return false;
          const pDate = new Date(p.paymentDate);
          const isMonthMatch = pDate.getFullYear() === year && pDate.getMonth() + 1 === month;
          const isStudentMatch = p.studentId === student.id;
          return isMonthMatch && isStudentMatch;
        });

        const allStudentEverPayments = allGroupPayments
          .filter((p: any) => {
            if (!p.paymentDate || p.status === 'TOLANMAGAN') return false;
            return p.studentId === student.id;
          })
          .sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

        const mostRecentPayment = allStudentEverPayments[0] || null;

        const paidAmount = studentPaymentsInMonth.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        const lastPayment = studentPaymentsInMonth[0] || null;

        let status: 'TOLANGAN' | 'QISMAN' | 'TOLANMAGAN' = 'TOLANMAGAN';
        if (coursePrice > 0) {
          if (paidAmount >= coursePrice) {
            status = 'TOLANGAN';
          } else if (paidAmount > 0) {
            status = 'QISMAN';
          } else {
            status = 'TOLANMAGAN';
          }
        } else if (paidAmount > 0) {
          status = 'TOLANGAN';
        }

        const remainingDebt = Math.max(0, coursePrice - paidAmount);

        return {
          studentId: student.id,
          student,
          coursePrice,
          paidAmount,
          remainingDebt,
          status,
          lastPayment,
          paymentDate: lastPayment?.paymentDate,
          method: lastPayment?.method,
          mostRecentPayment,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [group?.studentGroups, group?.course?.price, allGroupPayments, selectedPaymentMonth]);

  // Payment statistics for current group & month
  const paymentStats = useMemo(() => {
    const total = studentPaymentRows.length;
    const paidCount = studentPaymentRows.filter((r) => r.status === 'TOLANGAN').length;
    const partialCount = studentPaymentRows.filter((r) => r.status === 'QISMAN').length;
    const unpaidCount = studentPaymentRows.filter((r) => r.status === 'TOLANMAGAN').length;
    const totalCollected = studentPaymentRows.reduce((sum, r) => sum + r.paidAmount, 0);
    const totalExpected = studentPaymentRows.reduce((sum, r) => sum + r.coursePrice, 0);

    return {
      total,
      paidCount,
      partialCount,
      unpaidCount,
      totalCollected,
      totalExpected,
    };
  }, [studentPaymentRows]);

  // Initialize or update attendanceState when group or selectedDate loads
  useEffect(() => {
    if (group?.studentGroups) {
      const initial: { [studentId: string]: { status: 'KELGAN' | 'KELMAGAN' | 'KECHIKKAN'; note: string } } = {};
      
      const cleanDate = selectedDate.split('T')[0];
      const dateAttendances = (group.attendances || []).filter(
        (a: any) => a.date && a.date.startsWith(cleanDate)
      );

      group.studentGroups.forEach((sg: any) => {
        const studentId = sg.student?.id || sg.studentId;
        if (studentId) {
          const existingAtt = dateAttendances.find((a: any) => a.studentId === studentId);
          initial[studentId] = {
            status: (existingAtt?.status as any) || 'KELGAN',
            note: existingAtt?.note || '',
          };
        }
      });
      setAttendanceState(initial);
    }
  }, [group, selectedDate]);

  // Tanlangan sana uchun allaqachon saqlangan davomat xaritasi: studentId -> status
  const savedAttendancesMap = useMemo(() => {
    const map: Record<string, 'KELGAN' | 'KELMAGAN' | 'KECHIKKAN'> = {};
    if (!group?.attendances) return map;
    const cleanDate = selectedDate.split('T')[0];
    const dateAttendances = group.attendances.filter(
      (a: any) => a.date && a.date.startsWith(cleanDate)
    );
    dateAttendances.forEach((a: any) => {
      if (a.studentId && a.status) {
        map[a.studentId] = a.status;
      }
    });
    return map;
  }, [group?.attendances, selectedDate]);

  const hasAnySavedAttendance = Object.keys(savedAttendancesMap).length > 0;

  // Saqlash uchun o'zgarishlar borligini tekshirish:
  // - Agar davomat olinmagan bo'lsa: saqlash mumkin
  // - Agar davomat olingan bo'lsa: faqat KELMAGAN talaba KECHIKKAN ga o'zgartirilgan bo'lsa yoki yangi talaba bo'lsa saqlash mumkin
  const hasPendingAttendanceUpdates = useMemo(() => {
    if (!hasAnySavedAttendance) return true;
    if (!group?.studentGroups) return false;
    return group.studentGroups.some((sg: any) => {
      const stId = sg.student?.id || sg.studentId;
      if (!stId) return false;
      const saved = savedAttendancesMap[stId];
      const current = attendanceState[stId]?.status;
      if (!saved) return true; // hali olinmagan talaba
      if (saved === 'KELMAGAN' && current === 'KECHIKKAN') return true; // kechikkan qilib o'zgartirilgan
      return false;
    });
  }, [hasAnySavedAttendance, group?.studentGroups, savedAttendancesMap, attendanceState]);

  const timeEligibility = useMemo(() => {
    return checkAttendanceTimeEligibility(selectedDate, group);
  }, [selectedDate, group]);

  // Save attendance mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: (payload: { groupId: string; date: string; records: any[] }) =>
      attendanceApi.bulkSave(payload),
    onSuccess: () => {
      success('Davomat muvaffaqiyatli saqlandi!');
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['attendanceStats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardAttendance'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Davomatni saqlashda xatolik yuz berdi');
    },
  });

  // Add brand new student mutation
  const addStudentMutation = useMutation({
    mutationFn: (payload: any) => studentsApi.create(payload),
    onSuccess: () => {
      success('Yangi talaba guruhga muvaffaqiyatli qo\'shildi!');
      setIsAddStudentModalOpen(false);
      setSelectedProbaId('');
      setStudentForm({
        firstName: '',
        lastName: '',
        phone: '',
        fatherPhone: '',
        motherPhone: '',
        subject: '',
        passportSeries: '',
        birthDate: '2005-01-01',
        gender: 'ERKAK',
        isSchoolStudent: false,
        status: 'FAOL',
      });
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['studentsSelect'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['studentsSelect'] });
    },
    onError: (err: any) => {
      // The same person already exists: offer to put that student into this group instead
      const existingId = askAddExistingStudent(err, id);
      if (existingId) {
        addExistingStudentMutation.mutate(existingId);
        return;
      }
      error(err.response?.data?.message || 'Talaba qo\'shishda xatolik yuz berdi');
    },
  });

  // Attach existing proba student to group mutation
  const addExistingStudentMutation = useMutation({
    mutationFn: (studentId: string) => groupsApi.addStudent(id, studentId),
    onSuccess: () => {
      success('Talaba guruhga muvaffaqiyatli biriktirildi va proba ro\'yxatidan chiqarildi!');
      setIsAddStudentModalOpen(false);
      setSelectedProbaId('');
      setStudentForm({
        firstName: '',
        lastName: '',
        phone: '',
        fatherPhone: '',
        motherPhone: '',
        subject: '',
        passportSeries: '',
        birthDate: '2005-01-01',
        gender: 'ERKAK',
        isSchoolStudent: false,
        status: 'FAOL',
      });
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['studentsSelect'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['studentsSelect'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Guruhga biriktirishda xatolik yuz berdi');
    },
  });

  // Remove student from group mutation
  const removeStudentMutation = useMutation({
    mutationFn: (studentId: string) => groupsApi.removeStudent(id, studentId),
    onSuccess: () => {
      success('Talaba guruhdan muvaffaqiyatli chiqarildi');
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['studentsSelect'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Guruhdan chiqarishda xatolik yuz berdi');
    },
  });

  // Transfer student mutation
  const transferStudentMutation = useMutation({
    mutationFn: ({ studentId, targetGroupId }: { studentId: string; targetGroupId: string }) =>
      groupsApi.transferStudent(id, targetGroupId, studentId),
    onSuccess: (res: any) => {
      success(res?.message || "Talaba muvaffaqiyatli yangi guruhga o'tkazildi!");
      setIsTransferModalOpen(false);
      setTransferStudentData(null);
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['studentsSelect'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['studentProfile'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "Talabani boshqa guruhga o'tkazishda xatolik yuz berdi");
    },
  });

  // Groups load lazily when the transfer dialog opens: preselect the first one once they arrive.
  useEffect(() => {
    if (isTransferModalOpen && availableTransferGroups.length > 0) {
      setTransferStudentData((prev) =>
        prev && !prev.targetGroupId ? { ...prev, targetGroupId: availableTransferGroups[0].id } : prev
      );
    }
  }, [isTransferModalOpen, availableTransferGroups]);

  const handleOpenTransferModal = (student: any) => {
    const studentId = student?.id;
    const studentName = `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || 'Talaba';
    const firstGroup = availableTransferGroups[0]?.id || '';
    setTransferStudentData({
      studentId,
      studentName,
      targetGroupId: firstGroup,
    });
    setIsTransferModalOpen(true);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferStudentData?.targetGroupId) {
      error("Iltimos, o'tkaziladigan yangi guruhni tanlang");
      return;
    }
    transferStudentMutation.mutate({
      studentId: transferStudentData.studentId,
      targetGroupId: transferStudentData.targetGroupId,
    });
  };

  // Create Payment Mutation
  const createPaymentMutation = useMutation({
    mutationFn: (payload: any) => paymentsApi.create(payload),
    onSuccess: () => {
      success("To'lov muvaffaqiyatli qabul qilindi!");
      setIsPayModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['studentsSelect'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "To'lovni saqlashda xatolik yuz berdi");
    },
  });

  // Update Payment Mutation
  const updatePaymentMutation = useMutation({
    mutationFn: ({ pId, data }: { pId: string; data: any }) => paymentsApi.update(pId, data),
    onSuccess: () => {
      success("To'lov muvaffaqiyatli tahrirlandi!");
      setIsEditPayModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['studentsSelect'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "To'lovni tahrirlashda xatolik yuz berdi");
    },
  });

  // Delete Payment Mutation
  const deletePaymentMutation = useMutation({
    mutationFn: (pId: string) => paymentsApi.delete(pId),
    onSuccess: () => {
      success("To'lov muvaffaqiyatli o'chirildi!");
      setIsDeletePayModalOpen(false);
      setDeletingPayment(null);
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['studentsSelect'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || "To'lovni o'chirishda xatolik yuz berdi");
    },
  });

  const handleSaveAttendance = () => {
    if (!group?.studentGroups || group.studentGroups.length === 0) {
      error('Guruhda talabalar mavjud emas');
      return;
    }

    if (hasAnySavedAttendance && !hasPendingAttendanceUpdates) {
      error("Ushbu sana uchun davomat allaqachon saqlangan va o'zgarishlar mavjud emas!");
      return;
    }

    if (!hasAnySavedAttendance && !timeEligibility.canTakeAttendance) {
      error(timeEligibility.message);
      return;
    }

    // Kechikib kelgan o'quvchi uchun izoh (sabab) yozilganligini tekshirish
    for (const [studentId, data] of Object.entries(attendanceState)) {
      const savedStatus = savedAttendancesMap[studentId];
      if (savedStatus === 'KELMAGAN' && data.status === 'KECHIKKAN' && (!data.note || !data.note.trim())) {
        const studentObj = group.studentGroups.find(
          (sg: any) => (sg.student?.id || sg.studentId) === studentId
        )?.student;
        error(
          `${studentObj ? `${studentObj.firstName} ${studentObj.lastName}` : "O'quvchi"} uchun kechikish sababini yozish majburiy!`
        );
        return;
      }
    }

    const records = Object.entries(attendanceState).map(([studentId, data]) => ({
      studentId,
      status: data.status,
      note: data.note || attendanceTopic.trim() || undefined,
    }));

    saveAttendanceMutation.mutate({
      groupId: id,
      date: selectedDate,
      records,
    });
  };

  const handleMarkAll = (status: 'KELGAN' | 'KELMAGAN' | 'KECHIKKAN') => {
    if (!group?.studentGroups || hasAnySavedAttendance || !timeEligibility.canTakeAttendance) return;
    const updated = { ...attendanceState };
    group.studentGroups.forEach((sg: any) => {
      const studentId = sg.student?.id || sg.studentId;
      if (studentId) {
        updated[studentId] = {
          status,
          note: updated[studentId]?.note || '',
        };
      }
    });
    setAttendanceState(updated);
  };

  const handleStudentStatusChange = (studentId: string, status: 'KELGAN' | 'KELMAGAN' | 'KECHIKKAN') => {
    if (!hasAnySavedAttendance && !timeEligibility.canTakeAttendance) {
      error(timeEligibility.message);
      return;
    }

    const savedStatus = savedAttendancesMap[studentId];

    if (savedStatus) {
      // 1. Agar avval KELGAN yoki KECHIKKAN bo'lsa - qayta o'zgartirib bo'lmaydi
      if (savedStatus === 'KELGAN' || savedStatus === 'KECHIKKAN') {
        error("Davomat olingan! Bu talabaning holatini qayta o'zgartirib bo'lmaydi.");
        return;
      }

      // 2. Agar avval KELMAGAN bo'lsa - faqat KECHIKKAN deb o'zgartirish mumkin
      if (savedStatus === 'KELMAGAN') {
        if (status === 'KELGAN') {
          error('Kelmagan talabani faqat "Kechikkan" deb o\'zgartirish mumkin!');
          return;
        }
      }
    }

    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleStudentNoteChange = (studentId: string, note: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note,
      },
    }));
  };

  // Handle Select Proba Student
  const handleSelectProbaStudent = (probaId: string) => {
    setSelectedProbaId(probaId);
    if (!probaId) {
      setStudentForm({
        firstName: '',
        lastName: '',
        phone: '',
        fatherPhone: '',
        motherPhone: '',
        subject: '',
        passportSeries: '',
        birthDate: '2005-01-01',
        gender: 'ERKAK',
        isSchoolStudent: false,
        status: 'FAOL',
      });
      return;
    }

    const st = probaStudents.find((p: any) => p.id === probaId);
    if (st) {
      setStudentForm({
        firstName: st.firstName || '',
        lastName: st.lastName || '',
        phone: st.phone ? formatPhone(st.phone) : '',
        fatherPhone: st.fatherPhone ? formatPhone(st.fatherPhone) : '',
        motherPhone: st.motherPhone ? formatPhone(st.motherPhone) : '',
        subject: getStudentSubject(st),
        passportSeries: getStudentSubject(st),
        birthDate: st.birthDate ? st.birthDate.split('T')[0] : '2005-01-01',
        gender: st.gender || 'ERKAK',
        isSchoolStudent: !!st.isSchoolStudent,
        status: 'FAOL',
      });
    }
  };

  // Handle Add Student to Group Submit
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.firstName || !studentForm.lastName || !studentForm.phone) {
      error('Barcha majburiy maydonlarni to\'ldiring');
      return;
    }

    const cleanFather = unmaskPhone(studentForm.fatherPhone);
    const cleanMother = unmaskPhone(studentForm.motherPhone);
    if (!cleanFather && !cleanMother) {
      error("Otasi yoki onasining telefon raqamini kiritish majburiy (kamida bittasi)!");
      return;
    }

    if (selectedProbaId) {
      // Update student details if modified, then attach to group
      try {
        await studentsApi.update(selectedProbaId, {
          firstName: studentForm.firstName,
          lastName: studentForm.lastName,
          phone: unmaskPhone(studentForm.phone),
          fatherPhone: studentForm.fatherPhone ? unmaskPhone(studentForm.fatherPhone) : null,
          motherPhone: studentForm.motherPhone ? unmaskPhone(studentForm.motherPhone) : null,
          subject: studentForm.subject || group?.course?.name || null,
          passportSeries: studentForm.subject || group?.course?.name || null,
          birthDate: studentForm.birthDate ? new Date(studentForm.birthDate).toISOString() : undefined,
          gender: studentForm.gender,
          isSchoolStudent: studentForm.isSchoolStudent,
        });
      } catch (_) {}

      addExistingStudentMutation.mutate(selectedProbaId);
    } else {
      addStudentMutation.mutate({
        ...studentForm,
        phone: unmaskPhone(studentForm.phone),
        fatherPhone: studentForm.fatherPhone ? unmaskPhone(studentForm.fatherPhone) : null,
        motherPhone: studentForm.motherPhone ? unmaskPhone(studentForm.motherPhone) : null,
        birthDate: studentForm.birthDate ? new Date(studentForm.birthDate).toISOString() : new Date().toISOString(),
        groupId: id,
      });
    }
  };

  // Open Accept Payment Modal for specific student
  const handleOpenPayModal = (student: any, remainingDebt?: number) => {
    const coursePrice = group?.course?.price || 0;
    const defaultAmount = remainingDebt && remainingDebt > 0 ? remainingDebt : coursePrice;

    const [year, month] = selectedPaymentMonth.split('-').map(Number);
    const now = new Date();
    let paymentDate = '';

    if (now.getFullYear() === year && now.getMonth() + 1 === month) {
      paymentDate = now.toISOString().split('T')[0];
    } else {
      paymentDate = `${year}-${String(month).padStart(2, '0')}-05`;
    }

    setPayFormData({
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      amount: defaultAmount ? String(defaultAmount) : '',
      paymentDate,
      method: 'NAQD',
    });
    setIsPayModalOpen(true);
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payFormData.amount || Number(payFormData.amount) <= 0) {
      error("To'lov summasini to'g'ri kiriting");
      return;
    }

    createPaymentMutation.mutate({
      studentId: payFormData.studentId,
      groupId: id,
      courseId: group?.courseId || null,
      amount: Number(payFormData.amount),
      paymentDate: payFormData.paymentDate,
      method: payFormData.method,
      status: 'TOLANGAN',
    });
  };

  // Open Edit Payment Modal
  const handleOpenEditPayment = (payment: any, studentName: string) => {
    if (!payment) return;
    setEditPayFormData({
      id: payment.id,
      studentName,
      amount: String(payment.amount),
      paymentDate: payment.paymentDate ? payment.paymentDate.split('T')[0] : '',
      method: payment.method || 'NAQD',
      status: payment.status || 'TOLANGAN',
    });
    setIsEditPayModalOpen(true);
  };

  const handleEditPaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPayFormData.amount || Number(editPayFormData.amount) <= 0) {
      error("To'lov summasini to'g'ri kiriting");
      return;
    }

    updatePaymentMutation.mutate({
      pId: editPayFormData.id,
      data: {
        groupId: id,
        courseId: group?.courseId || null,
        amount: Number(editPayFormData.amount),
        paymentDate: editPayFormData.paymentDate,
        method: editPayFormData.method,
        status: editPayFormData.status,
      },
    });
  };

  // Open Delete Payment Modal
  const handleOpenDeletePayment = (payment: any, studentName: string) => {
    if (!payment) return;
    setDeletingPayment({
      ...payment,
      studentName,
    });
    setIsDeletePayModalOpen(true);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Skeleton height="140px" />
        <Skeleton height="350px" />
      </div>
    );
  }

  if (!group) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h3>Guruh topilmadi</h3>
        <Button variant="outline" onClick={() => router.push('/groups')} style={{ marginTop: '16px' }}>
          Guruhlar ro'yxatiga qaytish
        </Button>
      </div>
    );
  }

  // Count attendance stats for the selected date
  const studentsList = group.studentGroups || [];
  const totalStudents = studentsList.length;
  const presentCount = Object.values(attendanceState).filter((a) => a.status === 'KELGAN').length;
  const absentCount = Object.values(attendanceState).filter((a) => a.status === 'KELMAGAN').length;
  const lateCount = Object.values(attendanceState).filter((a) => a.status === 'KECHIKKAN').length;

  const studentColumns: Column<any>[] = [
    {
      key: 'name',
      header: 'TALABA',
      render: (row) => (
        <span
          style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
          onClick={() => router.push(`/students/${row.student?.id}`)}
        >
          {row.student?.firstName} {row.student?.lastName}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'TELEFON',
      render: (row) => formatPhone(row.student?.phone),
    },
    {
      key: 'gender',
      header: 'JINSI',
      render: (row) => (row.student?.gender === 'AYOL' ? 'Ayol' : 'Erkak'),
    },
    {
      key: 'joinedAt',
      header: 'QO\'SHILGAN SANA',
      render: (row) => formatDate(row.joinedAt || row.createdAt),
    },
    {
      key: 'action',
      header: 'ACTION',
      render: (row) => {
        const studentId = row.student?.id || row.studentId;
        const studentName = `${row.student?.firstName || ''} ${row.student?.lastName || ''}`.trim() || 'Ushbu talaba';
        return (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              size="sm"
              variant="outline"
              title="Boshqa guruhga o'tkazish"
              style={{
                borderColor: 'rgba(59, 130, 246, 0.4)',
                color: '#60a5fa',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenTransferModal(row.student || { id: studentId, firstName: row.student?.firstName, lastName: row.student?.lastName });
              }}
            >
              <ArrowRightLeft size={14} />
            </Button>
            <Button
              size="sm"
              variant="danger"
              title="Guruhdan chiqarish"
              isLoading={removeStudentMutation.isPending}
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`${studentName}ni ushbu guruhdan chiqarishni tasdiqlaysizmi?`)) {
                  removeStudentMutation.mutate(studentId);
                }
              }}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        );
      },
    },
  ];

  const historyColumns: Column<any>[] = [
    {
      key: 'student',
      header: 'TALABA',
      render: (row) => `${row.student?.firstName || ''} ${row.student?.lastName || ''}`,
    },
    {
      key: 'date',
      header: 'SANA',
      render: (row) => formatDate(row.date),
    },
    {
      key: 'status',
      header: 'STATUS',
      render: (row) => (
        <Badge
          variant={
            row.status === 'KELGAN'
              ? 'success'
              : row.status === 'KELMAGAN'
              ? 'danger'
              : 'warning'
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'note',
      header: 'IZOH',
      render: (row) => row.note || '-',
    },
  ];

  // Group Students Payment Status Table Columns
  const paymentStatusColumns: Column<any>[] = [
    {
      key: 'student',
      header: 'TALABA',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--primary-grad)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '12px',
              flexShrink: 0,
            }}
          >
            {row.student?.firstName?.[0]}
            {row.student?.lastName?.[0]}
          </div>
          <div>
            <div
              style={{ fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}
              onClick={() => router.push(`/students/${row.student?.id}`)}
            >
              {row.student?.firstName} {row.student?.lastName}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {formatPhone(row.student?.phone)}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'coursePrice',
      header: 'KURS NARXI',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
          {formatMoney(row.coursePrice)}
        </span>
      ),
    },
    {
      key: 'paidAmount',
      header: "TO'LANGAN SUMMA",
      render: (row) => (
        <span
          style={{
            fontWeight: 700,
            color: row.paidAmount > 0 ? '#10b981' : 'var(--text-muted)',
          }}
        >
          {formatMoney(row.paidAmount)}
        </span>
      ),
    },
    {
      key: 'paymentDate',
      header: "TO'LOV SANASI & USULI",
      render: (row) => {
        if (row.paymentDate) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                {formatDate(row.paymentDate)}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {row.method || 'NAQD'}
              </span>
            </div>
          );
        }
        if (row.mostRecentPayment) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Oldingi to'lov: {formatDate(row.mostRecentPayment.paymentDate)}
              </span>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                {formatMoney(row.mostRecentPayment.amount)} ({row.mostRecentPayment.method || 'NAQD'})
              </span>
            </div>
          );
        }
        return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>-</span>;
      },
    },
    {
      key: 'status',
      header: 'HOLATI',
      render: (row) => (
        <Badge
          variant={
            row.status === 'TOLANGAN'
              ? 'success'
              : row.status === 'QISMAN'
              ? 'warning'
              : 'danger'
          }
        >
          {row.status === 'TOLANGAN'
            ? "TO'LANGAN"
            : row.status === 'QISMAN'
            ? `QISMAN (Qarz: ${formatMoney(row.remainingDebt)})`
            : "TO'LANMAGAN"}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'AMALLAR',
      render: (row) => {
        const studentName = `${row.student?.firstName || ''} ${row.student?.lastName || ''}`;

        if (row.status === 'TOLANGAN' && row.lastPayment) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Button
                size="sm"
                variant="outline"
                icon={<Edit2 size={13} />}
                onClick={() => handleOpenEditPayment(row.lastPayment, studentName)}
                title="To'lovni tahrirlash"
              >
                Tahrirlash
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={<Trash2 size={13} />}
                onClick={() => handleOpenDeletePayment(row.lastPayment, studentName)}
                title="To'lovni o'chirish"
              >
                O'chirish
              </Button>
            </div>
          );
        }

        return (
          <Button
            size="sm"
            variant="primary"
            icon={<Plus size={14} />}
            onClick={() => handleOpenPayModal(row.student, row.remainingDebt)}
          >
            To'lov qabul qilish
          </Button>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="outline" size="sm" onClick={() => router.push('/groups')}>
            <ArrowLeft size={16} /> Orqaga
          </Button>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              {group.name}
              <Badge variant={group.status === 'FAOL' ? 'success' : 'secondary'}>
                {group.status}
              </Badge>
            </h2>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="primary"
            icon={<UserPlus size={16} />}
            onClick={() => {
              setSelectedProbaId('');
              setIsAddStudentModalOpen(true);
            }}
          >
            Talaba Qo'shish
          </Button>
        </div>
      </div>

      {/* Info Cards Grid */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Kurs</div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>{group.course?.name || '-'}</div>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}>
              {formatMoney(group.course?.price)}/oy
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Ustoz</div>
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <GraduationCap size={16} color="var(--primary)" />
              {group.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : '-'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {formatPhone(group.teacher?.phone)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Dars vaqti & Xona</div>
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} color="var(--primary)" />
              {group.startTime} - {group.endTime}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} /> {group.room?.name} ({group.room?.number}-xona)
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Dars kunlari</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {group.days?.map((d: string) => (
                <Badge key={d} variant="secondary">
                  {d}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Ustoz faoliyati</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span
                onClick={() => setActiveTab('homework')}
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Uyga vazifalarni ko'rish"
              >
                <BookOpen size={12} /> {groupHomeworks.length} ta vazifa
              </span>
              <span
                onClick={() => setActiveTab('videos')}
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Video darslarni ko'rish"
              >
                <Video size={12} /> {groupVideos.length} ta video
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Tabs Container */}
      <Card>
        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <Button
            variant={activeTab === 'attendanceTake' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('attendanceTake')}
          >
            <CalendarCheck size={16} /> Davomat Olish ({totalStudents})
          </Button>
          <Button
            variant={activeTab === 'students' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('students')}
          >
            <Users size={16} /> Talabalar Ro'yxati ({totalStudents})
          </Button>
          <Button
            variant={activeTab === 'attendanceHistory' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('attendanceHistory')}
          >
            <CalendarIcon size={16} /> Davomat Tarixi {availableHistoryDates.length > 0 ? `(${availableHistoryDates.length})` : ''}
          </Button>
          <Button
            variant={activeTab === 'homework' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('homework')}
          >
            <BookOpen size={16} /> Uyga Vazifalar {groupHomeworks.length > 0 ? `(${groupHomeworks.length})` : ''}
          </Button>
          <Button
            variant={activeTab === 'videos' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('videos')}
          >
            <Video size={16} /> Video Darslar {groupVideos.length > 0 ? `(${groupVideos.length})` : ''}
          </Button>
          <Button
            variant={activeTab === 'payments' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('payments')}
          >
            <DollarSign size={16} /> To'lovlar Holati
          </Button>
        </div>

        {/* TAB 1: DAVOMAT OLISH (TAKE ATTENDANCE) */}
        {activeTab === 'attendanceTake' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Controls bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: 'var(--card-subtle)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Dars sanasi:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--card)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                />
              </div>

              {/* Status counter chips */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '16px', backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                  Jami: <strong>{totalStudents}</strong>
                </span>
                <span style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '16px', backgroundColor: 'rgba(22, 163, 74, 0.15)', color: '#16a34a', border: '1px solid rgba(22, 163, 74, 0.3)' }}>
                  Kelgan: <strong>{presentCount}</strong>
                </span>
                <span style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '16px', backgroundColor: 'rgba(220, 38, 38, 0.15)', color: '#dc2626', border: '1px solid rgba(220, 38, 38, 0.3)' }}>
                  Kelmagan: <strong>{absentCount}</strong>
                </span>
                <span style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '16px', backgroundColor: 'rgba(202, 138, 4, 0.15)', color: '#ca8a04', border: '1px solid rgba(202, 138, 4, 0.3)' }}>
                  Kechikkan: <strong>{lateCount}</strong>
                </span>
                {!hasAnySavedAttendance && timeEligibility.canTakeAttendance && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<CheckCheck size={14} />}
                    onClick={() => handleMarkAll('KELGAN')}
                  >
                    Hammasini KELGAN qilish
                  </Button>
                )}
              </div>
            </div>

            {/* Informative Banner */}
            {hasAnySavedAttendance ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  fontSize: '13px',
                  color: 'var(--text)',
                  marginBottom: '10px',
                }}
              >
                <Lock size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Ushbu sana uchun davomat saqlangan (Qulflangan).</strong> Qoidaga ko'ra uni qayta o'zgartirib bo'lmaydi. Faqat kelmagan talaba darsga yetib kelsa, uni <strong>"Kechikkan"</strong> deb sababini yozib belgilashingiz mumkin.
                </div>
              </div>
            ) : !timeEligibility.canTakeAttendance ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: timeEligibility.status === 'TIME_EXPIRED' || timeEligibility.status === 'PAST_DATE'
                    ? 'rgba(239, 68, 68, 0.08)'
                    : 'rgba(245, 158, 11, 0.08)',
                  border: timeEligibility.status === 'TIME_EXPIRED' || timeEligibility.status === 'PAST_DATE'
                    ? '1px solid rgba(239, 68, 68, 0.25)'
                    : '1px solid rgba(245, 158, 11, 0.25)',
                  fontSize: '13px',
                  color: 'var(--text)',
                  marginBottom: '10px',
                }}
              >
                <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ color: '#ef4444' }}>
                    {timeEligibility.status === 'TIME_EXPIRED'
                      ? 'Davomat olish vaqti tugagan! '
                      : timeEligibility.status === 'PAST_DATE'
                      ? "O'tgan sana uchun yangi davomat saqlash taqiqlangan! "
                      : timeEligibility.status === 'FUTURE_DATE'
                      ? 'Kelgusi sana uchun davomat olinmaydi! '
                      : 'Dars hali boshlanmagan! '}
                  </strong>
                  {timeEligibility.message}
                </div>
              </div>
            ) : null}

            {/* Lesson Topic Select (Ustiga bossa mavzular chiqadi) */}
            <div style={{ marginBottom: '16px', maxWidth: '640px' }}>
              <LessonTopicSelect
                groupId={id}
                value={attendanceTopic}
                onChange={setAttendanceTopic}
                disabled={hasAnySavedAttendance}
                label="Dars mavzusi (Ustiga bossangiz kiritilgan mavzular kelib chiqadi):"
              />
            </div>

            {/* Students Attendance List */}
            {totalStudents === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <Users size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <h4>Guruhda talabalar mavjud emas</h4>
                <p style={{ fontSize: '13px', marginTop: '4px', marginBottom: '16px' }}>
                  Davomat olish uchun avval guruhga talaba qo'shing.
                </p>
                <Button icon={<UserPlus size={16} />} onClick={() => setIsAddStudentModalOpen(true)}>
                  Talaba qo'shish
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {studentsList.map((sg: any) => {
                  const student = sg.student;
                  if (!student) return null;
                  const currentStatus = attendanceState[student.id]?.status || 'KELGAN';
                  const currentNote = attendanceState[student.id]?.note || '';
                  const savedStatus = savedAttendancesMap[student.id];

                  // 1. Agar avval KELGAN yoki KECHIKKAN deb saqlangan bo'lsa - qulflangan
                  const isLocked = savedStatus === 'KELGAN' || savedStatus === 'KECHIKKAN';
                  // 2. Agar avval KELMAGAN deb saqlangan bo'lsa - faqat KECHIKKAN deb o'zgartirish mumkin
                  const isKelmaganSaved = savedStatus === 'KELMAGAN';

                  return (
                    <div
                      key={student.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--card-subtle)',
                        border: '1px solid var(--border)',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      {/* Student info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '200px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--primary-grad)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '13px',
                          }}
                        >
                          {student.firstName[0]}
                          {student.lastName[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px' }}>
                            {student.firstName} {student.lastName}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {formatPhone(student.phone)}
                          </div>
                          {isLocked && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <Lock size={11} /> Saqlangan ({savedStatus === 'KELGAN' ? 'Kelgan' : 'Kechikkan'})
                            </div>
                          )}
                          {isKelmaganSaved && (
                            <div style={{ fontSize: '11px', color: currentStatus === 'KECHIKKAN' ? '#ca8a04' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontWeight: 500 }}>
                              {currentStatus === 'KECHIKKAN'
                                ? '✓ "Kechikkan" deb belgilandi'
                                : '⚠️ Kelmagan (kelsa "Kechikkan" deb o\'zgartiring)'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status toggle buttons */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          disabled={isLocked || isKelmaganSaved}
                          onClick={() => handleStudentStatusChange(student.id, 'KELGAN')}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: isLocked || isKelmaganSaved ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            opacity: (isLocked && savedStatus !== 'KELGAN') || isKelmaganSaved ? 0.35 : 1,
                            backgroundColor: currentStatus === 'KELGAN' ? '#16a34a' : 'transparent',
                            color: currentStatus === 'KELGAN' ? '#ffffff' : 'var(--text-muted)',
                            border: currentStatus === 'KELGAN' ? '1px solid #16a34a' : '1px solid var(--border)',
                            boxShadow: currentStatus === 'KELGAN' && !isLocked ? '0 2px 8px rgba(22, 163, 74, 0.3)' : 'none',
                          }}
                        >
                          <CheckCircle2 size={14} />
                          KELGAN
                          {isLocked && savedStatus === 'KELGAN' && <Lock size={12} style={{ marginLeft: 2, opacity: 0.85 }} />}
                        </button>

                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleStudentStatusChange(student.id, 'KELMAGAN')}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            opacity: isLocked ? 0.35 : 1,
                            backgroundColor: currentStatus === 'KELMAGAN' ? '#dc2626' : 'transparent',
                            color: currentStatus === 'KELMAGAN' ? '#ffffff' : 'var(--text-muted)',
                            border: currentStatus === 'KELMAGAN' ? '1px solid #dc2626' : '1px solid var(--border)',
                            boxShadow: currentStatus === 'KELMAGAN' && !isLocked ? '0 2px 8px rgba(220, 38, 38, 0.3)' : 'none',
                          }}
                        >
                          <XCircle size={14} />
                          KELMAGAN
                        </button>

                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleStudentStatusChange(student.id, 'KECHIKKAN')}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            opacity: isLocked && savedStatus !== 'KECHIKKAN' ? 0.35 : 1,
                            backgroundColor: currentStatus === 'KECHIKKAN'
                              ? '#ca8a04'
                              : isKelmaganSaved
                              ? 'rgba(202, 138, 4, 0.08)'
                              : 'transparent',
                            color: currentStatus === 'KECHIKKAN' ? '#ffffff' : (isKelmaganSaved ? '#ca8a04' : 'var(--text-muted)'),
                            border: currentStatus === 'KECHIKKAN'
                              ? '1px solid #ca8a04'
                              : isKelmaganSaved
                              ? '1px dashed #ca8a04'
                              : '1px solid var(--border)',
                            boxShadow: currentStatus === 'KECHIKKAN' && !isLocked ? '0 2px 8px rgba(202, 138, 4, 0.3)' : 'none',
                          }}
                        >
                          <Clock3 size={14} />
                          KECHIKKAN
                          {isLocked && savedStatus === 'KECHIKKAN' && <Lock size={12} style={{ marginLeft: 2, opacity: 0.85 }} />}
                        </button>
                      </div>

                      {/* Optional Note input */}
                      <input
                        type="text"
                        placeholder="Izoh / sabab (ixtiyoriy)..."
                        value={currentNote}
                        onChange={(e) => handleStudentNoteChange(student.id, e.target.value)}
                        disabled={isLocked}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          backgroundColor: isLocked ? 'transparent' : 'var(--input-bg)',
                          color: 'var(--text)',
                          fontSize: '12px',
                          minWidth: '160px',
                          maxWidth: '220px',
                          opacity: isLocked ? 0.6 : 1,
                          cursor: isLocked ? 'not-allowed' : 'text',
                        }}
                      />
                    </div>
                  );
                })}

                {/* Save Attendance Action Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <Button
                    size="lg"
                    icon={hasAnySavedAttendance && !hasPendingAttendanceUpdates ? <Lock size={18} /> : <Save size={18} />}
                    isLoading={saveAttendanceMutation.isPending}
                    onClick={handleSaveAttendance}
                    disabled={
                      (hasAnySavedAttendance && !hasPendingAttendanceUpdates) ||
                      (!hasAnySavedAttendance && !timeEligibility.canTakeAttendance)
                    }
                    variant={hasAnySavedAttendance && hasPendingAttendanceUpdates ? 'primary' : (hasAnySavedAttendance ? 'outline' : 'primary')}
                    style={{ minWidth: '240px' }}
                  >
                    {hasAnySavedAttendance
                      ? (hasPendingAttendanceUpdates ? 'KECHIKKANLARNI SAQLASH' : 'DAVOMAT SAQLANGAN (QULFLANGAN)')
                      : !timeEligibility.canTakeAttendance
                      ? (timeEligibility.status === 'TIME_EXPIRED'
                          ? `VAQT TUGAGAN (${timeEligibility.deadlineTime || ''} GACHA)`
                          : timeEligibility.status === 'PAST_DATE'
                          ? "O'TGAN SANA"
                          : timeEligibility.status === 'TOO_EARLY'
                          ? `DARS BOSHLANMAGAN (${timeEligibility.startTime || ''})`
                          : "DAVOMAT OLIB BO'LMAYDI")
                      : 'DAVOMATNI SAQLASH'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TALABALAR RO'YXATI (STUDENTS LIST) */}
        {activeTab === 'students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Guruh a'zolari: {totalStudents} ta talaba
              </span>
              <Button size="sm" icon={<Plus size={16} />} onClick={() => {
                setSelectedProbaId('');
                setIsAddStudentModalOpen(true);
              }}>
                Guruhga Talaba Qo'shish
              </Button>
            </div>
            <Table columns={studentColumns} data={studentsList} />
          </div>
        )}

        {/* TAB 3: DAVOMAT TARIXI (ATTENDANCE HISTORY BY YEAR / MONTH / DAY) */}
        {activeTab === 'attendanceHistory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Filter & Date Selection Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: 'var(--card-subtle)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarIcon size={18} color="var(--primary)" />
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>
                    Davomat sanasi (Yil, oy, kun):
                  </span>
                </div>

                {/* Quick Day Switchers */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <Button
                    size="sm"
                    variant="outline"
                    title="Oldingi kun"
                    onClick={() => {
                      const d = new Date(historyDate);
                      d.setDate(d.getDate() - 1);
                      setHistoryDate(d.toISOString().split('T')[0]);
                    }}
                  >
                    <ChevronLeft size={15} /> Oldingi kun
                  </Button>

                  <input
                    type="date"
                    value={historyDate}
                    onChange={(e) => setHistoryDate(e.target.value)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--primary)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--text)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  />

                  <Button
                    size="sm"
                    variant="outline"
                    title="Keyingi kun"
                    onClick={() => {
                      const d = new Date(historyDate);
                      d.setDate(d.getDate() + 1);
                      setHistoryDate(d.toISOString().split('T')[0]);
                    }}
                  >
                    Keyingi kun <ChevronRight size={15} />
                  </Button>

                  <Button
                    size="sm"
                    variant={historyDate === getTashkentDateString() ? 'primary' : 'outline'}
                    onClick={() => setHistoryDate(getTashkentDateString())}
                  >
                    Bugun
                  </Button>
                </div>
              </div>

              {/* Status Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge variant={dayHistoryAttendances.length > 0 ? 'success' : 'secondary'}>
                  {dayHistoryAttendances.length > 0
                    ? `${formatDate(historyDate)}: Davomat saqlangan (${dayHistoryAttendances.length} nafar)`
                    : `${formatDate(historyDate)}: Davomat olinmagan`}
                </Badge>
              </div>
            </div>

            {/* Recorded Dates Chips */}
            {availableHistoryDates.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Mavjud davomat sanalari ({availableHistoryDates.length} ta dars):
                </span>
                {availableHistoryDates.map((dateStr) => {
                  const isSelected = historyDate === dateStr;
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setHistoryDate(dateStr)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                        background: isSelected ? 'var(--primary)' : 'var(--card-subtle)',
                        color: isSelected ? '#ffffff' : 'var(--text)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <CalendarCheck size={12} /> {formatDate(dateStr)}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Day Attendance Content */}
            {dayHistoryAttendances.length > 0 ? (
              <>
                {/* Daily Counters */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Jami qatnashganlar
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>
                      {historyDayStats.total} nafar
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, marginBottom: '4px' }}>
                      ✓ Kelganlar
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981' }}>
                      {historyDayStats.kelgan} nafar
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600, marginBottom: '4px' }}>
                      ✕ Kelmaganlar
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#ef4444' }}>
                      {historyDayStats.kelmagan} nafar
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600, marginBottom: '4px' }}>
                      🕒 Kechikkanlar
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b' }}>
                      {historyDayStats.kechikkan} nafar
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600, marginBottom: '4px' }}>
                      Davomat ko'rsatkichi
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#3b82f6' }}>
                      {historyDayStats.rate}%
                    </div>
                  </div>
                </div>

                {/* Day Lesson Topic */}
                {historyDayTopic && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                    }}
                  >
                    <BookOpen size={18} color="#3b82f6" />
                    <div style={{ fontSize: '13px', color: 'var(--text)' }}>
                      <strong>O'tilgan dars mavzusi:</strong> {historyDayTopic}
                    </div>
                  </div>
                )}

                {/* Students Table for the Selected Date */}
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--card-subtle)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '12px 14px', width: '40px' }}>#</th>
                        <th style={{ padding: '12px 14px' }}>TALABA</th>
                        <th style={{ padding: '12px 14px' }}>TELEFON</th>
                        <th style={{ padding: '12px 14px' }}>HOLATI</th>
                        <th style={{ padding: '12px 14px' }}>IZOH / SABAB</th>
                        <th style={{ padding: '12px 14px' }}>QAYD ETILGAN VAQT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayHistoryAttendances.map((att: any, idx: number) => {
                        const enrolledStudent = group.studentGroups?.find(
                          (sg: any) => (sg.student?.id || sg.studentId) === att.studentId
                        )?.student;
                        const studentName = att.student
                          ? `${att.student.firstName} ${att.student.lastName}`
                          : enrolledStudent
                          ? `${enrolledStudent.firstName} ${enrolledStudent.lastName}`
                          : 'Noma\'lum talaba';

                        const studentPhone = att.student?.phone ||
                          group.studentGroups?.find((sg: any) => (sg.student?.id || sg.studentId) === att.studentId)?.student?.phone;

                        return (
                          <tr
                            key={att.id || idx}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--card-subtle)',
                            }}
                          >
                            <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text)' }}>
                              {studentName}
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                              {formatPhone(studentPhone)}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <Badge
                                variant={
                                  att.status === 'KELGAN'
                                    ? 'success'
                                    : att.status === 'KELMAGAN'
                                    ? 'danger'
                                    : 'warning'
                                }
                              >
                                {att.status === 'KELGAN' ? '✓ Kelgan' : att.status === 'KELMAGAN' ? '✕ Kelmagan' : '🕒 Kechikkan'}
                              </Badge>
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontStyle: att.note ? 'normal' : 'italic' }}>
                              {att.note || '-'}
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                              {att.createdAt ? new Date(att.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  borderRadius: '12px',
                  background: 'var(--card-subtle)',
                  border: '1px dashed var(--border)',
                }}
              >
                <AlertCircle size={36} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.6 }} />
                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text)' }}>
                  {formatDate(historyDate)} sanasi uchun davomat topilmadi
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px 0', maxWidth: '460px', marginInline: 'auto' }}>
                  O'qituvchi ushbu sanada davomat olmagan yoki dars mashg'uloti bo'lmagan. Yuqoridagi dars kunlari tugmalarini bosib o'tgan darslar davomatini ko'rishingiz mumkin.
                </p>
                {availableHistoryDates.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setHistoryDate(availableHistoryDates[0])}
                  >
                    Eng so'nggi davomatni ko'rish ({formatDate(availableHistoryDates[0])})
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: O'QITUVCHI UYGA VAZIFALARI (TEACHER HOMEWORKS MONITORING) */}
        {activeTab === 'homework' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--card-subtle)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(59, 130, 246, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                  }}
                >
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                    O'qituvchi bergan uyga vazifalar ({groupHomeworks.length} ta)
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    {group.teacher ? `Ustoz: ${group.teacher.firstName} ${group.teacher.lastName}` : "O'qituvchi"} tomonidan ushbu guruh o'quvchilariga yuklangan topshiriqlar va fayllar
                  </p>
                </div>
              </div>
            </div>

            {/* Homework items list */}
            {groupHomeworks.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  borderRadius: '12px',
                  background: 'var(--card-subtle)',
                  border: '1px dashed var(--border)',
                }}
              >
                <BookOpen size={36} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.6 }} />
                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text)' }}>
                  Hali uyga vazifa berilmagan
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                  O'qituvchi bu guruh uchun hali yangi uyga vazifa biriktirmagan.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {groupHomeworks.map((hw: any, idx: number) => (
                  <div
                    key={hw.id || idx}
                    style={{
                      padding: '18px',
                      borderRadius: '12px',
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: '#3b82f6',
                          }}
                        >
                          Topshiriq #{idx + 1}
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          {hw.createdAt || '-'}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '15.5px', fontWeight: 700, color: 'var(--text)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                        {hw.title}
                      </h4>

                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                        {hw.desc}
                      </p>

                      {hw.deadline && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                          }}
                        >
                          <Clock size={13} /> Muddati: {hw.deadline}
                        </div>
                      )}
                    </div>

                    {/* Attached file if any */}
                    {hw.file && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: 'var(--card-subtle)',
                          border: '1px solid var(--border)',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <FileText size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              {hw.file.name}
                            </div>
                            {hw.file.size && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {(hw.file.size / 1024).toFixed(1)} KB
                              </div>
                            )}
                          </div>
                        </div>

                        {hw.file.dataUrl && (
                          <a
                            href={hw.file.dataUrl}
                            download={hw.file.name}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: 'var(--primary)',
                              color: '#ffffff',
                              textDecoration: 'none',
                              flexShrink: 0,
                            }}
                          >
                            <Download size={13} /> Yuklab olish
                          </a>
                        )}
                      </div>
                    )}

                    {/* Submissions breakdown for this homework (Admin visibility) */}
                    {(() => {
                      const hwSubs = (groupSubmissions || []).filter((s: any) => s.hwId === hw.id);
                      const enrolledList = (group?.studentGroups || []).map((sg: any) => sg.student).filter(Boolean);
                      const subMap = new Map();
                      hwSubs.forEach((s: any) => subMap.set(s.studentId, s));
                      const submittedCount = enrolledList.filter((st: any) => subMap.has(st.id)).length;
                      const notSubmittedCount = Math.max(0, enrolledList.length - submittedCount);
                      const isExpanded = !!expandedHwSubmissions[hw.id];

                      return (
                        <div
                          style={{
                            marginTop: '12px',
                            padding: '12px',
                            borderRadius: '10px',
                            background: 'var(--card-subtle)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <Badge variant="success">
                                <CheckCircle2 size={12} style={{ marginRight: '4px' }} />
                                {submittedCount} ta topshirdi
                              </Badge>
                              <Badge variant={notSubmittedCount > 0 ? 'danger' : 'secondary'}>
                                <AlertCircle size={12} style={{ marginRight: '4px' }} />
                                {notSubmittedCount} ta topshirmadi
                              </Badge>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setExpandedHwSubmissions((prev) => ({
                                  ...prev,
                                  [hw.id]: !prev[hw.id],
                                }))
                              }
                            >
                              <Users size={13} />
                              {isExpanded ? "Ro'yxatni yashirish" : "O'quvchilar natijalari"}
                            </Button>
                          </div>

                          {/* Expanded Full Students Homework Status Table */}
                          {isExpanded && (
                            <div style={{ marginTop: '8px', overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '8px 6px' }}>#</th>
                                    <th style={{ padding: '8px 10px' }}>Talaba (F.I.Sh)</th>
                                    <th style={{ padding: '8px 10px' }}>Telefon</th>
                                    <th style={{ padding: '8px 10px' }}>Vazifa holati</th>
                                    <th style={{ padding: '8px 10px' }}>Yechim / Havola</th>
                                    <th style={{ padding: '8px 10px' }}>Baho & Ustoz fikri</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {enrolledList.length === 0 ? (
                                    <tr>
                                      <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Guruhda talabalar mavjud emas.
                                      </td>
                                    </tr>
                                  ) : (
                                    enrolledList.map((st: any, sIdx: number) => {
                                      const sub = subMap.get(st.id);
                                      return (
                                        <tr
                                          key={st.id || sIdx}
                                          style={{
                                            borderBottom: '1px solid var(--border)',
                                            backgroundColor: sub ? 'rgba(16, 185, 129, 0.03)' : 'rgba(239, 68, 68, 0.03)',
                                          }}
                                        >
                                          <td style={{ padding: '8px 6px', color: 'var(--text-muted)' }}>{sIdx + 1}</td>
                                          <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text)' }}>
                                            {st.firstName} {st.lastName}
                                          </td>
                                          <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                                            {formatPhone(st.phone) || st.phone || '—'}
                                          </td>
                                          <td style={{ padding: '8px 10px' }}>
                                            {sub ? (
                                              <div>
                                                <Badge variant="success">✓ Bajargan</Badge>
                                                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                  {sub.submittedAt}
                                                </div>
                                              </div>
                                            ) : (
                                              <Badge variant="danger">✕ Topshirmagan</Badge>
                                            )}
                                          </td>
                                          <td style={{ padding: '8px 10px' }}>
                                            {sub?.submissionLink ? (
                                              <a
                                                href={sub.submissionLink.startsWith('http') ? sub.submissionLink : `https://${sub.submissionLink}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '4px',
                                                  fontSize: '11.5px',
                                                  color: 'var(--primary)',
                                                  fontWeight: 600,
                                                  textDecoration: 'none',
                                                }}
                                              >
                                                <ExternalLink size={12} /> Yechimni ko'rish
                                              </a>
                                            ) : (
                                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                                            )}
                                            {sub?.comment && (
                                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
                                                &quot;{sub.comment}&quot;
                                              </div>
                                            )}
                                          </td>
                                          <td style={{ padding: '8px 10px' }}>
                                            {sub ? (
                                              sub.status === 'BAHOLANDI' && sub.grade !== undefined ? (
                                                <div>
                                                  <span style={{ fontWeight: 700, color: '#10b981' }}>{sub.grade} ball</span>
                                                  {sub.teacherFeedback && (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                      {sub.teacherFeedback}
                                                    </div>
                                                  )}
                                                </div>
                                              ) : (
                                                <span style={{ fontSize: '11.5px', color: '#f59e0b', fontWeight: 600 }}>
                                                  ⏱ Tekshirilmoqda
                                                </span>
                                              )
                                            ) : (
                                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: O'QITUVCHI VIDEO DARSLARI (TEACHER VIDEOS MONITORING) */}
        {activeTab === 'videos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--card-subtle)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10b981',
                  }}
                >
                  <Video size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                    O'qituvchi yuklagan video darslar ({groupVideos.length} ta)
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    {group.teacher ? `Ustoz: ${group.teacher.firstName} ${group.teacher.lastName}` : "O'qituvchi"} tomonidan ushbu guruh uchun joylangan video darslar va yozuvlar
                  </p>
                </div>
              </div>
            </div>

            {/* Videos list */}
            {groupVideos.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  borderRadius: '12px',
                  background: 'var(--card-subtle)',
                  border: '1px dashed var(--border)',
                }}
              >
                <Video size={36} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.6 }} />
                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text)' }}>
                  Hali video dars yuklanmagan
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                  O'qituvchi bu guruh uchun hali video darslik yoki havola joylamagan.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
                {groupVideos.map((v: any, idx: number) => (
                  <div
                    key={v.id || idx}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    {/* Video Player or Link Preview */}
                    {v.videoType === 'file' && v.blobUrl ? (
                      <video
                        controls
                        src={v.blobUrl}
                        style={{
                          width: '100%',
                          borderRadius: '8px',
                          maxHeight: '220px',
                          backgroundColor: '#000000',
                        }}
                      />
                    ) : v.videoUrl ? (
                      <div
                        style={{
                          position: 'relative',
                          paddingTop: '56.25%',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: '#090d16',
                        }}
                      >
                        {v.videoUrl.includes('youtube.com') || v.videoUrl.includes('youtu.be') ? (
                          <iframe
                            src={
                              v.videoUrl.includes('watch?v=')
                                ? v.videoUrl.replace('watch?v=', 'embed/')
                                : v.videoUrl.replace('youtu.be/', 'youtube.com/embed/')
                            }
                            title={v.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              border: 'none',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                            }}
                          >
                            <Video size={36} color="var(--primary)" />
                            <a
                              href={v.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 14px',
                                borderRadius: '6px',
                                background: 'var(--primary)',
                                color: '#ffffff',
                                fontSize: '12.5px',
                                fontWeight: 600,
                                textDecoration: 'none',
                              }}
                            >
                              <ExternalLink size={14} /> Videoni ko'rish
                            </a>
                          </div>
                        )}
                      </div>
                    ) : null}

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: v.videoType === 'file' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            color: v.videoType === 'file' ? '#10b981' : '#3b82f6',
                          }}
                        >
                          {v.videoType === 'file' ? 'Fayl yuklangan' : 'Havola'}
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          {v.createdAt || '-'}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                        {v.title}
                      </h4>

                      {v.desc && (
                        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                          {v.desc}
                        </p>
                      )}

                      {v.fileName && (
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '8px' }}>
                          Fayl: {v.fileName} {v.fileSize ? `(${(v.fileSize / (1024 * 1024)).toFixed(1)} MB)` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: GURUH TALABALARI TO'LOVLAR HOLATI (GROUP PAYMENTS & DEBT OVERVIEW) */}
        {activeTab === 'payments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Controls & Month Filter */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: 'var(--card-subtle)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                  To'lov oyi / Davri:
                </span>
                <select
                  value={selectedPaymentMonth}
                  onChange={(e) => setSelectedPaymentMonth(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--primary)',
                    backgroundColor: 'var(--card)',
                    color: 'var(--text)',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status counter badges */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    fontWeight: 600,
                  }}
                >
                  Jami talabalar: <strong>{paymentStats.total}</strong>
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(22, 163, 74, 0.15)',
                    color: '#16a34a',
                    border: '1px solid rgba(22, 163, 74, 0.3)',
                    fontWeight: 700,
                  }}
                >
                  ✓ To'laganlar: <strong>{paymentStats.paidCount}</strong>
                </span>
                {paymentStats.partialCount > 0 && (
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '6px 12px',
                      borderRadius: '16px',
                      backgroundColor: 'rgba(202, 138, 4, 0.15)',
                      color: '#ca8a04',
                      border: '1px solid rgba(202, 138, 4, 0.3)',
                      fontWeight: 700,
                    }}
                  >
                    ⏳ Qisman: <strong>{paymentStats.partialCount}</strong>
                  </span>
                )}
                <span
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(220, 38, 38, 0.15)',
                    color: '#dc2626',
                    border: '1px solid rgba(220, 38, 38, 0.3)',
                    fontWeight: 700,
                  }}
                >
                  ⚠️ Qarzdorlar: <strong>{paymentStats.unpaidCount}</strong>
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: 'var(--primary)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    fontWeight: 700,
                  }}
                >
                  💰 Yig'ilgan: <strong>{formatMoney(paymentStats.totalCollected)}</strong> / {formatMoney(paymentStats.totalExpected)}
                </span>
              </div>
            </div>

            {/* Students Payment Status Table */}
            {totalStudents === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <Users size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <h4>Guruhda talabalar mavjud emas</h4>
                <p style={{ fontSize: '13px', marginTop: '4px', marginBottom: '16px' }}>
                  To'lovlarni ko'rish uchun avval guruhga talaba qo'shing.
                </p>
                <Button icon={<UserPlus size={16} />} onClick={() => {
                  setSelectedProbaId('');
                  setIsAddStudentModalOpen(true);
                }}>
                  Talaba qo'shish
                </Button>
              </div>
            ) : (
              <Table columns={paymentStatusColumns} data={studentPaymentRows} />
            )}
          </div>
        )}
      </Card>

      {/* ================= MODAL: GURUHGA TALABA QO'SHISH (WITH PROBA SELECTION) ================= */}
      <Modal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        title="Guruhga Talaba Qo'shish"
        maxWidth="540px"
      >
        <form onSubmit={handleAddStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Proba Selector Section */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--card-subtle)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px', color: 'var(--primary)' }}>
              <Sparkles size={15} /> Proba (Sinov) darsidagi talabalardan tanlash:
            </div>
            <Select
              options={[
                { label: "-- Yangi talaba kiritish (Qo'lda to'ldirish) --", value: '' },
                ...probaStudents.map((st: any) => ({
                  label: `📌 ${st.studentName} (${formatPhone(st.phone)})`,
                  value: st.id,
                })),
              ]}
              value={selectedProbaId}
              onChange={(e) => handleSelectProbaStudent(e.target.value)}
            />
            {selectedProbaId && (
              <div style={{ fontSize: '11.5px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                ✓ Proba talabasi tanlandi. Guruhga qo'shilgach, proba ro'yxatidan avtomatik chiqariladi.
              </div>
            )}
          </div>

          {/* Form Fields (Matching Image 3) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Input
              label="Ism"
              required
              placeholder="Ali"
              value={studentForm.firstName}
              onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
            />
            <Input
              label="Familiya"
              required
              placeholder="Valiyev"
              value={studentForm.lastName}
              onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
            />
          </div>

          <Input
            label="Tug'ilgan kun"
            type="date"
            required
            value={studentForm.birthDate}
            onChange={(e) => setStudentForm({ ...studentForm, birthDate: e.target.value })}
          />

          <Input
            label="Telefon raqam"
            required
            placeholder="+998 90 123 45 67"
            value={formatPhone(studentForm.phone)}
            onChange={(e) => setStudentForm({ ...studentForm, phone: unmaskPhone(e.target.value) })}
          />

          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Input
                label="Otasining telefoni *"
                placeholder="+998 90 123 45 67"
                value={formatPhone(studentForm.fatherPhone)}
                onChange={(e) => setStudentForm({ ...studentForm, fatherPhone: unmaskPhone(e.target.value) })}
              />
              <Input
                label="Onasining telefoni *"
                placeholder="+998 90 123 45 67"
                value={formatPhone(studentForm.motherPhone)}
                onChange={(e) => setStudentForm({ ...studentForm, motherPhone: unmaskPhone(e.target.value) })}
              />
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#f59e0b', fontWeight: 500 }}>
              * Otasi yoki onasining telefon raqamidan kamida bittasi qat'iy kiritilishi shart
            </p>
          </div>

          {/* Fan tanlash */}
          <SubjectSelect
            label="Qaysi fanga keladi? (Fan)"
            required
            value={studentForm.subject || group?.course?.name || ''}
            onChange={(subj) => setStudentForm({ ...studentForm, subject: subj })}
          />

          <Select
            label="Jinsi"
            required
            options={[
              { label: 'Erkak', value: 'ERKAK' },
              { label: 'Ayol', value: 'AYOL' },
            ]}
            value={studentForm.gender}
            onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as any })}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
            <Toggle
              checked={studentForm.isSchoolStudent}
              onChange={(checked) => setStudentForm({ ...studentForm, isSchoolStudent: checked })}
              label="Maktab o'quvchisi"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAddStudentModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              type="submit"
              isLoading={addStudentMutation.isPending || addExistingStudentMutation.isPending}
              style={{ minWidth: '130px' }}
            >
              {selectedProbaId ? "Guruhga Qo'shish" : "SAQLASH"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 1. Quick Accept Payment Modal for Specific Student */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="To'lov Qabul Qilish"
        maxWidth="500px"
      >
        <form onSubmit={handlePaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--card-subtle)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Talaba</div>
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '14px' }}>
                {payFormData.studentName}
              </div>
            </div>
            <Badge variant="secondary">{group?.name}</Badge>
          </div>

          <Input
            label="Summa (so'mda)"
            type="number"
            required
            value={payFormData.amount}
            onChange={(e) => setPayFormData({ ...payFormData, amount: e.target.value })}
          />

          <Select
            label="To'lov turi"
            options={[
              { label: 'Naqd pul', value: 'NAQD' },
              { label: 'Plastik karta (Click/Payme)', value: 'KARTA' },
              { label: "Bank o'tkazmasi", value: 'OTKAZMA' },
            ]}
            value={payFormData.method}
            onChange={(e) => setPayFormData({ ...payFormData, method: e.target.value })}
          />

          <Input
            label="To'lov sanasi"
            type="date"
            required
            value={payFormData.paymentDate}
            onChange={(e) => setPayFormData({ ...payFormData, paymentDate: e.target.value })}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsPayModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" isLoading={createPaymentMutation.isPending}>
              To'lovni Saqlash
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Edit Payment Modal */}
      <Modal
        isOpen={isEditPayModalOpen}
        onClose={() => setIsEditPayModalOpen(false)}
        title="To'lovni Tahrirlash"
        maxWidth="500px"
      >
        <form onSubmit={handleEditPaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--card-subtle)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Talaba</div>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '14px' }}>
              {editPayFormData.studentName}
            </div>
          </div>

          <Input
            label="Summa (so'mda)"
            type="number"
            required
            value={editPayFormData.amount}
            onChange={(e) => setEditPayFormData({ ...editPayFormData, amount: e.target.value })}
          />

          <Select
            label="To'lov turi"
            options={[
              { label: 'Naqd pul', value: 'NAQD' },
              { label: 'Plastik karta (Click/Payme)', value: 'KARTA' },
              { label: "Bank o'tkazmasi", value: 'OTKAZMA' },
            ]}
            value={editPayFormData.method}
            onChange={(e) => setEditPayFormData({ ...editPayFormData, method: e.target.value })}
          />

          <Input
            label="To'lov sanasi"
            type="date"
            required
            value={editPayFormData.paymentDate}
            onChange={(e) => setEditPayFormData({ ...editPayFormData, paymentDate: e.target.value })}
          />

          <Select
            label="Holati"
            options={[
              { label: "TO'LANGAN", value: 'TOLANGAN' },
              { label: 'QISMAN', value: 'QISMAN' },
              { label: "TO'LANMAGAN (Bekor qilingan)", value: 'TOLANMAGAN' },
            ]}
            value={editPayFormData.status}
            onChange={(e) => setEditPayFormData({ ...editPayFormData, status: e.target.value })}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsEditPayModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" isLoading={updatePaymentMutation.isPending}>
              O'zgarishlarni Saqlash
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Delete Payment Modal */}
      <Modal
        isOpen={isDeletePayModalOpen}
        onClose={() => setIsDeletePayModalOpen(false)}
        title="To'lovni O'chirish"
        maxWidth="440px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Trash2 size={20} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                Haqiqatan ham ushbu to'lovni o'chirmoqchimisiz?
              </p>
              {deletingPayment && (
                <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Talaba: <strong>{deletingPayment.studentName}</strong>
                  <br />
                  Summa: <strong style={{ color: '#10b981' }}>{formatMoney(deletingPayment.amount)}</strong>
                  <br />
                  Sana: {formatDate(deletingPayment.paymentDate)}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsDeletePayModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={deletePaymentMutation.isPending}
              onClick={() => deletingPayment && deletePaymentMutation.mutate(deletingPayment.id)}
            >
              Ha, o'chirilsin
            </Button>
          </div>
        </div>
      </Modal>

      {/* 4. Transfer Student to Another Group Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTransferStudentData(null);
        }}
        title="Talabani Boshqa Guruhga O'tkazish"
        maxWidth="520px"
      >
        <form onSubmit={handleTransferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Student & Current Group Card */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--card-subtle)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'var(--primary-grad)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '15px',
                  flexShrink: 0,
                }}
              >
                {transferStudentData?.studentName ? transferStudentData.studentName[0] : 'T'}
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Tanlangan talaba
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                  {transferStudentData?.studentName}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                paddingTop: '10px',
                borderTop: '1px solid var(--border)',
                fontSize: '13px',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Hozirgi guruhi:</span>
              <Badge variant="secondary">{group.name}</Badge>
              {group.course?.name && (
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  ({group.course.name})
                </span>
              )}
            </div>
          </div>

          {/* Target Group Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
              Qaysi yangi guruhga o'tkazilsin? <span style={{ color: '#ef4444' }}>*</span>
            </label>

            {availableTransferGroups.length === 0 ? (
              <div
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  color: '#eab308',
                  fontSize: '13px',
                }}
              >
                Markazda boshqa faol guruh topilmadi. Avval yangi guruh oching.
              </div>
            ) : (
              <GroupCardSelect
                groups={availableTransferGroups}
                value={transferStudentData?.targetGroupId || ''}
                onChange={(targetGroupId) =>
                  setTransferStudentData((prev) =>
                    prev ? { ...prev, targetGroupId } : null
                  )
                }
                placeholder="-- Yangi guruhni tanlang --"
                searchPlaceholder="Guruh nomi, fan yoki o'qituvchi bo'yicha qidirish..."
              />
            )}
          </div>

          {/* Informational Alert Box */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12.5px',
              color: '#93c5fd',
              lineHeight: 1.4,
            }}
          >
            <ArrowRightLeft size={18} style={{ flexShrink: 0, color: '#3b82f6' }} />
            <span>
              Talaba <strong>"{group.name}"</strong> guruhidan chiqariladi va tanlangan yangi guruhga avtomatik qo'shiladi.
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsTransferModalOpen(false);
                setTransferStudentData(null);
              }}
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<ArrowRightLeft size={15} />}
              isLoading={transferStudentMutation.isPending}
              disabled={!transferStudentData?.targetGroupId || availableTransferGroups.length === 0}
            >
              Guruhga O'tkazish
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
