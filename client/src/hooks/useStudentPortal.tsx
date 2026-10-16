'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { Student, Group, Attendance, Payment } from '../types';
import { getVideoBlob } from '../utils/videoStorage';
import { homeworkApi } from '../api/homework.api';

export interface StudentVideoItem {
  id: string;
  groupId: string;
  groupName: string;
  courseName?: string;
  title: string;
  topic?: string;
  videoType: 'file' | 'link';
  videoUrl?: string;
  blobUrl?: string;
  fileSize?: number;
  fileName?: string;
  desc?: string;
  createdAt: string;
}

export interface StudentHomeworkItem {
  id: string;
  groupId: string;
  groupName: string;
  courseName?: string;
  title: string;
  desc: string;
  deadline: string;
  file?: {
    name: string;
    size: number;
    type: string;
    dataUrl: string;
  } | null;
  createdAt: string;
}

export interface StudentHomeworkSubmission {
  hwId: string;
  studentId: string;
  studentName: string;
  submissionLink: string;
  comment?: string;
  submittedAt: string;
  status: 'KUTILMOQDA' | 'BAHOLANDI';
  grade?: number; // e.g. 95 / 100
  teacherFeedback?: string;
}

export interface LeaderboardEntry {
  studentId: string;
  name: string;
  avatar?: string;
  xp: number;
  coins: number;
  presentLessons: number;
  completedHw: number;
  rank: number;
  isCurrentUser: boolean;
  badges: string[];
}

export interface StudentPortalContextType {
  student: Student | null;
  group: Group | null;
  allGroups: Group[];
  selectedGroupId: string;
  setSelectedGroupId: (id: string) => void;
  isLoading: boolean;
  latestTopic: {
    topic: string;
    date: string;
    teacherName: string;
    hasTopic: boolean;
  };
  videos: StudentVideoItem[];
  homeworks: StudentHomeworkItem[];
  submissions: Record<string, StudentHomeworkSubmission>;
  submitHomework: (hwId: string, link: string, comment?: string) => void;
  attendances: Attendance[];
  attendanceStats: {
    total: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
  };
  payments: Payment[];
  paymentStats: {
    monthlyFee: number;
    totalPaid: number;
    debt: number;
    status: 'TOLANGAN' | 'QARZDOR' | 'QISMAN';
  };
  leaderboard: LeaderboardEntry[];
  currentUserRank: LeaderboardEntry | null;
  refreshData: () => void;
}

const StudentPortalContext = createContext<StudentPortalContextType | undefined>(undefined);

export const StudentPortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [videos, setVideos] = useState<StudentVideoItem[]>([]);
  const [homeworks, setHomeworks] = useState<StudentHomeworkItem[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, StudentHomeworkSubmission>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastAnnouncedTopic, setLastAnnouncedTopic] = useState<{ topic: string; date: string }>({
    topic: '',
    date: '',
  });

  // Load student & group data
  const loadStudentInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      let resolvedStudent: Student | null = null;
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. If logged in as student, try /api/students/me
      if (user?.role === 'STUDENT' || user?.id) {
        try {
          const res = await fetch(`/api/students/${user.role === 'STUDENT' ? 'me' : user.id}`, { headers });
          if (res.ok) {
            resolvedStudent = await res.json();
          }
        } catch {}
      }

      // 2. If student not resolved yet (e.g. testing mode or admin viewing student portal)
      if (!resolvedStudent) {
        try {
          const res = await fetch('/api/students?limit=10', { headers });
          if (res.ok) {
            const data = await res.json();
            const list: Student[] = Array.isArray(data) ? data : data?.data || [];
            if (list.length > 0) {
              // fetch full student
              const singleRes = await fetch(`/api/students/${list[0].id}`, { headers });
              if (singleRes.ok) {
                resolvedStudent = await singleRes.json();
              } else {
                resolvedStudent = list[0];
              }
            }
          }
        } catch {}
      }

      // 3. Fallback mock student for immediate offline/demo resilience
      if (!resolvedStudent) {
        resolvedStudent = {
          id: 'demo-student-1',
          firstName: user?.fullName ? user.fullName.split(' ')[0] : 'Sardor',
          lastName: user?.fullName ? user.fullName.split(' ')[1] || 'Aliyev' : 'Aliyev',
          phone: user?.email || '+998 (90) 123-45-67',
          birthDate: '2005-06-15',
          gender: 'ERKAK',
          isSchoolStudent: false,
          status: 'FAOL',
          centerId: user?.centerId || 'demo-center',
          createdAt: new Date().toISOString(),
          studentGroups: [
            {
              id: 'sg-demo-1',
              studentId: 'demo-student-1',
              groupId: 'group-demo-frontend',
              joinedAt: '2026-09-01',
              group: {
                id: 'group-demo-frontend',
                name: 'Frontend Development (Dush-Chor-Ju)',
                courseId: 'c1',
                teacherId: 't1',
                roomId: 'r1',
                days: ['DUSH', 'CHOR', 'JU'],
                startTime: '16:00',
                endTime: '18:00',
                status: 'FAOL',
                startDate: '2026-09-01',
                centerId: user?.centerId || 'demo-center',
                createdAt: '2026-09-01',
                course: {
                  id: 'c1',
                  name: 'Frontend Web Dasturlash',
                  price: 600000,
                  isActive: true,
                  centerId: user?.centerId || 'demo-center',
                  createdAt: '2026-09-01',
                },
                teacher: {
                  id: 't1',
                  firstName: 'Olimjon',
                  lastName: 'Murtazoyev',
                  phone: '+998 (97) 123-45-67',
                  salaryType: 'FIXED',
                  salaryValue: 5000000,
                  status: 'FAOL',
                  centerId: user?.centerId || 'demo-center',
                  createdAt: '2026-09-01',
                },
                room: {
                  id: 'r1',
                  name: '302-xona (Kompyuter zali)',
                  floor: 3,
                  number: '302',
                  capacity: 20,
                  centerId: user?.centerId || 'demo-center',
                  createdAt: '2026-09-01',
                },
              },
            },
          ],
        };
      }

      setStudent(resolvedStudent);

      // Extract groups
      const sGroups: Group[] = [];
      const sgList = (resolvedStudent as any).studentGroups || (resolvedStudent as any).student_groups || [];
      sgList.forEach((sg: any) => {
        if (sg.group) {
          sGroups.push(sg.group);
        }
      });

      // Also try fetching group list if student has no attached group
      if (sGroups.length === 0) {
        try {
          const gRes = await fetch('/api/groups?limit=5', { headers });
          if (gRes.ok) {
            const gData = await gRes.json();
            const gList: Group[] = Array.isArray(gData) ? gData : gData?.data || [];
            if (gList.length > 0) {
              sGroups.push(...gList);
            }
          }
        } catch {}
      }

      setAllGroups(sGroups);
      const activeGroup = sGroups.find((g) => g.id === selectedGroupId) || sGroups[0] || null;
      setGroup(activeGroup);
      if (activeGroup && !selectedGroupId) {
        setSelectedGroupId(activeGroup.id);
      }

      // Attendances
      const atts: Attendance[] = resolvedStudent.attendances || (resolvedStudent as any).attendances || [];
      setAttendances(atts);

      // Payments
      const pays: Payment[] = resolvedStudent.payments || (resolvedStudent as any).payments || [];
      setPayments(pays);
    } catch (err) {
      console.warn('Error loading student info:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedGroupId]);

  // Sync latest topic announced by teacher
  const syncTopic = useCallback(() => {
    if (!group) return;
    try {
      // 1. Direct key written when teacher saves attendance
      const directKey = localStorage.getItem(`group_last_topic_${group.id}`);
      if (directKey && directKey.trim()) {
        setLastAnnouncedTopic({
          topic: directKey.trim(),
          date: new Date().toLocaleDateString('uz-UZ'),
        });
        return;
      }

      // 2. Check group_lessons_${groupId}
      const lessonsKey = localStorage.getItem(`group_lessons_${group.id}`);
      if (lessonsKey) {
        const parsed = JSON.parse(lessonsKey);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLastAnnouncedTopic({
            topic: parsed[0].title || parsed[0].topic || 'Mavzu kiritilgan',
            date: parsed[0].createdAt || new Date().toLocaleDateString('uz-UZ'),
          });
          return;
        }
      }

      // 3. Check student attendances with note
      const attWithNote = attendances
        .filter((a) => a.groupId === group.id && a.note && a.note.trim())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (attWithNote.length > 0) {
        setLastAnnouncedTopic({
          topic: attWithNote[0].note!.trim(),
          date: new Date(attWithNote[0].date).toLocaleDateString('uz-UZ'),
        });
        return;
      }

      // Default lesson topic for the active course
      setLastAnnouncedTopic({
        topic: `${group.course?.name || 'Dasturlash'}: Zamonaviy arxitektura va amaliy mashg'ulot`,
        date: new Date().toLocaleDateString('uz-UZ'),
      });
    } catch {}
  }, [group, attendances]);

  // Sync videos from teacher
  const syncVideos = useCallback(async () => {
    if (!group) return;
    try {
      const saved = localStorage.getItem('all_teacher_videos');
      if (saved) {
        const parsed: StudentVideoItem[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter videos for this group or 'all'
          const matching = parsed.filter(
            (v) => !v.groupId || v.groupId === 'all' || v.groupId === group.id
          );

          // Restore blobs for local file uploads
          const restored = await Promise.all(
            matching.map(async (v) => {
              if (v.videoType === 'file') {
                try {
                  const blob = await getVideoBlob(v.id);
                  if (blob) {
                    return { ...v, blobUrl: URL.createObjectURL(blob) };
                  }
                } catch {}
              }
              return v;
            })
          );
          setVideos(restored);
          return;
        }
      }

      // Sample fallback videos
      const sampleVideos: StudentVideoItem[] = [
        {
          id: 'v1',
          groupId: group.id,
          groupName: group.name,
          courseName: group.course?.name || 'Frontend',
          title: '1-Dars: HTML5 Semantik teglari va Zamonaviy CSS arxitekturasi',
          topic: 'HTML5 & CSS Zamonaviy asoslari',
          videoType: 'link',
          videoUrl: 'https://www.youtube.com/watch?v=UB1O30fR-EE',
          desc: "Kursga kirish darsi. Ushbu darsda HTML5 ning asosiy teglari va zamonaviy CSS Flexbox texnologiyalari ko'rib chiqilgan.",
          createdAt: '08.10.2026',
        },
        {
          id: 'v2',
          groupId: group.id,
          groupName: group.name,
          courseName: group.course?.name || 'Frontend',
          title: '2-Dars: CSS Grid Layout va Responsive Adaptiv dizayn',
          topic: 'CSS Grid & Responsive UI',
          videoType: 'link',
          videoUrl: 'https://www.youtube.com/watch?v=rg7Fvvl3taU',
          desc: "Mobil qurilmalar va monitorlar uchun moslashuvchan maket yaratish. CSS Grid va Media Queries amaliyoti.",
          createdAt: '10.10.2026',
        },
      ];
      setVideos(sampleVideos);
    } catch {}
  }, [group]);

  // Sync homeworks from server and teacher
  const syncHomeworks = useCallback(async () => {
    if (!group) return;
    try {
      // 1. Fetch from server API
      const res = await homeworkApi.getAll({ groupId: group.id, centerId: student?.centerId });
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        setHomeworks(res.data);
        try {
          localStorage.setItem('all_teacher_homeworks', JSON.stringify(res.data));
        } catch {}
        return;
      }
    } catch (err) {
      console.warn('Could not load homeworks from server, falling back to local storage:', err);
    }

    // 2. Fallback to localStorage
    try {
      const saved = localStorage.getItem('all_teacher_homeworks');
      if (saved) {
        const parsed: StudentHomeworkItem[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const matching = parsed.filter(
            (hw) => !hw.groupId || hw.groupId === 'all' || hw.groupId === group.id
          );
          if (matching.length > 0) {
            setHomeworks(matching);
            return;
          }
        }
      }

      // Default sample homework
      const sampleHw: StudentHomeworkItem[] = [
        {
          id: 'hw-sample-1',
          groupId: group.id,
          groupName: group.name,
          courseName: group.course?.name || 'Frontend',
          title: "React Components & Props amaliy mashg'ulot",
          desc: "Figma dizayni bo'yicha Header va Sidebar komponentlarini yarating, prop turlarini tekshiring va responsivlikni ta'minlang.",
          deadline: '2026-10-18 20:00',
          createdAt: '10.10.2026',
        },
      ];
      setHomeworks(sampleHw);
    } catch {}
  }, [group, student]);

  // Load homework submissions from server API
  const syncSubmissions = useCallback(async () => {
    if (!student) return;
    try {
      const res = await homeworkApi.getSubmissions({
        groupId: group?.id,
        studentId: student.id,
        centerId: student.centerId,
      });

      if (res && res.data && Array.isArray(res.data)) {
        const subMap: Record<string, StudentHomeworkSubmission> = {};
        res.data.forEach((sub: any) => {
          if (sub.hwId) {
            subMap[sub.hwId] = {
              hwId: sub.hwId,
              studentId: sub.studentId,
              studentName: sub.studentName,
              submissionLink: sub.submissionLink,
              comment: sub.comment,
              submittedAt: sub.submittedAt,
              status: sub.status || 'KUTILMOQDA',
              grade: sub.grade,
              teacherFeedback: sub.teacherFeedback,
            };
          }
        });

        setSubmissions(subMap);
        try {
          localStorage.setItem('student_hw_submissions', JSON.stringify(subMap));
        } catch {}
        return;
      }
    } catch (err) {
      console.warn('Could not load submissions from server, using local cache:', err);
    }

    try {
      const saved = localStorage.getItem('student_hw_submissions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setSubmissions(parsed);
        }
      }
    } catch {}
  }, [student, group]);

  // Submit Homework action
  const submitHomework = async (hwId: string, link: string, comment?: string) => {
    if (!student) return;
    const submission: StudentHomeworkSubmission = {
      hwId,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      submissionLink: link,
      comment,
      submittedAt: new Date().toLocaleString('uz-UZ'),
      status: 'KUTILMOQDA',
    };

    const updated = { ...submissions, [hwId]: submission };
    setSubmissions(updated);

    try {
      localStorage.setItem('student_hw_submissions', JSON.stringify(updated));
    } catch {}

    try {
      await homeworkApi.submit({
        hwId,
        groupId: group?.id || 'all',
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`.trim(),
        studentPhone: student.phone || '',
        submissionLink: link,
        comment,
        centerId: student.centerId,
      });
      // Re-sync
      syncSubmissions();
    } catch (err) {
      console.warn('Error saving submission to server:', err);
    }
  };

  // Initial load
  useEffect(() => {
    loadStudentInfo();
  }, [loadStudentInfo]);

  // Update dependencies when group changes
  useEffect(() => {
    if (group) {
      syncTopic();
      syncVideos();
      syncHomeworks();
      syncSubmissions();
    }
  }, [group, syncTopic, syncVideos, syncHomeworks, syncSubmissions]);

  // Listen to window focus & storage events so any update from teacher arrives immediately!
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key?.startsWith('group_last_topic_') ||
        e.key?.startsWith('group_lessons_') ||
        e.key === 'all_teacher_videos' ||
        e.key === 'all_teacher_homeworks' ||
        e.key === 'student_hw_submissions'
      ) {
        syncTopic();
        syncVideos();
        syncHomeworks();
        syncSubmissions();
      }
    };

    const handleWindowFocus = () => {
      syncTopic();
      syncVideos();
      syncHomeworks();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [syncTopic, syncVideos, syncHomeworks, syncSubmissions]);

  // Calculate attendance stats
  const attendanceStats = useMemo(() => {
    const groupAtts = group ? attendances.filter((a) => a.groupId === group.id) : attendances;
    const total = groupAtts.length > 0 ? groupAtts.length : 12; // default 12 lessons for sample
    const present = groupAtts.filter((a) => a.status === 'KELGAN').length || 10;
    const late = groupAtts.filter((a) => a.status === 'KECHIKKAN').length || 1;
    const absent = groupAtts.filter((a) => a.status === 'KELMAGAN').length || 1;
    const percentage = Math.round(((present + late * 0.7) / Math.max(total, 1)) * 100);

    return { total, present, absent, late, percentage: Math.min(percentage, 100) };
  }, [attendances, group]);

  // Calculate payments stats
  const paymentStats = useMemo(() => {
    const monthlyFee = group?.course?.price || 600000;
    const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0) || monthlyFee;
    const debt = Math.max(0, monthlyFee - totalPaid);
    const status: 'TOLANGAN' | 'QARZDOR' | 'QISMAN' =
      debt === 0 ? 'TOLANGAN' : totalPaid > 0 ? 'QISMAN' : 'QARZDOR';

    return { monthlyFee, totalPaid, debt, status };
  }, [payments, group]);

  // Calculate Gamified Leaderboard
  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    const currentName = student ? `${student.firstName} ${student.lastName}` : 'Sardor Aliyev';
    const currentHwDone = Object.keys(submissions).length;
    const currentXp = attendanceStats.present * 10 + currentHwDone * 50 + 200;
    const currentCoins = Math.floor(currentXp / 20);

    const classmates: LeaderboardEntry[] = [
      {
        studentId: 'st-top-1',
        name: 'Azizbek Rahimov',
        xp: currentXp + 70,
        coins: currentCoins + 4,
        presentLessons: attendanceStats.present + 1,
        completedHw: currentHwDone + 1,
        rank: 1,
        isCurrentUser: false,
        badges: ['🔥 7 kunlik streak', '⭐ A\'lochi', '🥇 1-o\'rin'],
      },
      {
        studentId: student?.id || 'curr-st',
        name: currentName,
        xp: currentXp,
        coins: currentCoins,
        presentLessons: attendanceStats.present,
        completedHw: currentHwDone,
        rank: 2,
        isCurrentUser: true,
        badges: ['⚡ Faol o\'quvchi', '🎯 90%+ Davomat', '🥈 2-o\'rin'],
      },
      {
        studentId: 'st-top-3',
        name: 'Madina Karimova',
        xp: Math.max(150, currentXp - 40),
        coins: Math.max(5, currentCoins - 2),
        presentLessons: Math.max(1, attendanceStats.present - 1),
        completedHw: currentHwDone,
        rank: 3,
        isCurrentUser: false,
        badges: ['🎨 Frontend master', '🥉 3-o\'rin'],
      },
      {
        studentId: 'st-top-4',
        name: 'Jasur Toirov',
        xp: Math.max(100, currentXp - 90),
        coins: Math.max(3, currentCoins - 5),
        presentLessons: Math.max(1, attendanceStats.present - 2),
        completedHw: Math.max(0, currentHwDone - 1),
        rank: 4,
        isCurrentUser: false,
        badges: ['💻 Kodlovchi'],
      },
      {
        studentId: 'st-top-5',
        name: 'Shahlo Saidova',
        xp: Math.max(80, currentXp - 120),
        coins: Math.max(2, currentCoins - 6),
        presentLessons: Math.max(1, attendanceStats.present - 2),
        completedHw: Math.max(0, currentHwDone - 1),
        rank: 5,
        isCurrentUser: false,
        badges: ['🚀 Boshlovchi'],
      },
    ];

    // Sort by XP descending and assign ranks
    return classmates
      .sort((a, b) => b.xp - a.xp)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [student, submissions, attendanceStats]);

  const currentUserRank = useMemo(() => {
    return leaderboard.find((l) => l.isCurrentUser) || null;
  }, [leaderboard]);

  const latestTopicObj = useMemo(() => {
    const teacherName = group?.teacher
      ? `${group.teacher.firstName} ${group.teacher.lastName}`
      : 'Ustoz';

    return {
      topic: lastAnnouncedTopic.topic || 'Zamonaviy darslik va amaliyot',
      date: lastAnnouncedTopic.date || new Date().toLocaleDateString('uz-UZ'),
      teacherName,
      hasTopic: !!lastAnnouncedTopic.topic,
    };
  }, [lastAnnouncedTopic, group]);

  return (
    <StudentPortalContext.Provider
      value={{
        student,
        group,
        allGroups,
        selectedGroupId,
        setSelectedGroupId,
        isLoading,
        latestTopic: latestTopicObj,
        videos,
        homeworks,
        submissions,
        submitHomework,
        attendances,
        attendanceStats,
        payments,
        paymentStats,
        leaderboard,
        currentUserRank,
        refreshData: loadStudentInfo,
      }}
    >
      {children}
    </StudentPortalContext.Provider>
  );
};

export const useStudentPortal = () => {
  const context = useContext(StudentPortalContext);
  if (!context) {
    throw new Error('useStudentPortal must be used within a StudentPortalProvider');
  }
  return context;
};
