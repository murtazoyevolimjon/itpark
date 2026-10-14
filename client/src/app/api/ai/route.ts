import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { getSuperAdminAuth, verifySuperAdminToken } from '@/lib/superadminAuth';

function formatMoney(amount: number): string {
  return (amount || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatPhone(phone: string): string {
  if (!phone) return '-';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 12 && clean.startsWith('998')) {
    return `+${clean.slice(0, 3)} ${clean.slice(3, 5)} ${clean.slice(5, 8)} ${clean.slice(8, 10)} ${clean.slice(10, 12)}`;
  }
  if (clean.length === 9) {
    return `+998 ${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5, 7)} ${clean.slice(7, 9)}`;
  }
  return phone;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Dual authentication: check SuperAdmin first, then standard AuthUser
    let isSuperAdmin = false;
    let authUser: any = null;

    const superAdminDecoded = getSuperAdminAuth(req);
    if (superAdminDecoded && superAdminDecoded.role === 'SUPERADMIN') {
      isSuperAdmin = true;
      authUser = {
        sub: superAdminDecoded.sub,
        email: superAdminDecoded.login,
        role: 'SUPERADMIN',
        fullName: superAdminDecoded.fullName || 'Dasturchi (SuperAdmin)',
        centerId: '',
      };
    } else {
      // Also check if token in Bearer is superadmin token
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const rawToken = authHeader.split(' ')[1];
        const sDecoded = verifySuperAdminToken(rawToken);
        if (sDecoded && sDecoded.role === 'SUPERADMIN') {
          isSuperAdmin = true;
          authUser = {
            sub: sDecoded.sub,
            email: sDecoded.login,
            role: 'SUPERADMIN',
            fullName: sDecoded.fullName || 'Dasturchi (SuperAdmin)',
            centerId: '',
          };
        }
      }

      if (!isSuperAdmin) {
        authUser = getAuthUser(req);
      }
    }

    if (!authUser) {
      return NextResponse.json(
        { message: "Avtorizatsiyadan o'tilmagan. Iltimos, tizimga qayta kiring." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      task_type = 'chat_qa',
      date_range = 'Oxirgi 30 kun',
      user_question = '',
      prompt = '',
      gemini_api_key = '',
    } = body;

    // Actual user question can come via user_question or prompt
    const finalQuestion = (user_question || prompt || '').trim();

    const supabase = createServerSupabaseClient();

    // =========================================================================
    // 2. FETCH LIVE DATA BASED ON USER ROLE
    // =========================================================================

    let centersData: any[] = [];
    let studentsData: any[] = [];
    let groupsData: any[] = [];
    let teachersData: any[] = [];
    let paymentsData: any[] = [];
    let expensesData: any[] = [];
    let attendancesData: any[] = [];
    let coursesData: any[] = [];
    let studentGroupsData: any[] = [];
    let currentCenterName = 'Markaz';
    let currentCenterPhone = '';

    if (isSuperAdmin) {
      // SuperAdmin: access to all centers across the whole platform
      const [
        { data: allCenters },
        { data: allStudents },
        { data: allTeachers },
        { data: allGroups },
        { data: allPayments },
      ] = await Promise.all([
        supabase.from('centers').select('id, name, phone, email, registeredAt, createdAt').order('createdAt', { ascending: true }),
        supabase.from('students').select('id, firstName, lastName, phone, status, centerId'),
        supabase.from('teachers').select('id, firstName, lastName, phone, status, centerId'),
        supabase.from('groups').select('id, name, status, centerId'),
        supabase.from('payments').select('id, amount, status, centerId'),
      ]);

      centersData = allCenters || [];
      studentsData = allStudents || [];
      teachersData = allTeachers || [];
      groupsData = allGroups || [];
      paymentsData = allPayments || [];
      currentCenterName = "Barcha O'quv Markazlar (SuperAdmin)";
    } else {
      // Center-scoped user (ADMIN, OWNER, MANAGER, TEACHER, STUDENT)
      const centerId = authUser.centerId;
      if (!centerId) {
        return NextResponse.json({ message: "Foydalanuvchi markazi aniqlanmadi" }, { status: 400 });
      }

      const [
        { data: center },
        { data: groups },
        { data: students },
        { data: studentGroups },
        { data: payments },
        { data: attendances },
        { data: teachers },
        { data: expenses },
        { data: courses },
      ] = await Promise.all([
        supabase.from('centers').select('id, name, phone, email').eq('id', centerId).maybeSingle(),
        supabase.from('groups').select('id, name, startTime, endTime, days, teacherId, courseId, status').eq('centerId', centerId),
        supabase.from('students').select('id, firstName, lastName, phone, fatherPhone, motherPhone, status, createdAt').eq('centerId', centerId),
        supabase.from('student_groups').select('id, studentId, groupId').eq('centerId', centerId),
        supabase.from('payments').select('id, amount, status, paymentDate, studentId, groupId, courseId').eq('centerId', centerId),
        supabase.from('attendances').select('id, status, date, studentId, groupId').eq('centerId', centerId),
        supabase.from('teachers').select('id, firstName, lastName, phone, status, login').eq('centerId', centerId),
        supabase.from('expenses').select('id, amount, type, status, createdAt, date').eq('centerId', centerId),
        supabase.from('courses').select('id, name, price').eq('centerId', centerId),
      ]);

      currentCenterName = center?.name || "O'quv Markazi";
      currentCenterPhone = center?.phone || '';
      groupsData = groups || [];
      studentsData = students || [];
      studentGroupsData = studentGroups || [];
      paymentsData = payments || [];
      attendancesData = attendances || [];
      teachersData = teachers || [];
      expensesData = expenses || [];
      coursesData = courses || [];
    }

    // =========================================================================
    // 3. PROCESS STRUCTURED LIVE DATABASE METRICS (PRECISE FACTS)
    // =========================================================================

    // Course price map
    const courseMap: Record<string, { name: string; price: number }> = {};
    coursesData.forEach((c: any) => {
      courseMap[c.id] = { name: c.name, price: Number(c.price) || 0 };
    });

    // Teacher map
    const teacherMap: Record<string, string> = {};
    teachersData.forEach((t: any) => {
      teacherMap[t.id] = `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Ustoz';
    });

    // Group map
    const groupMap: Record<string, any> = {};
    groupsData.forEach((g: any) => {
      groupMap[g.id] = g;
    });

    // Calculate Debtors (Qarzdorlar) with 100% exact math based on courses and payments
    interface DebtorInfo {
      id: string;
      fullName: string;
      phone: string;
      groupNames: string[];
      totalDue: number;
      totalPaid: number;
      debtAmount: number;
      paymentStatus: 'TOLANMAGAN' | 'QISMAN';
    }

    const debtorsList: DebtorInfo[] = [];

    studentsData.forEach((st: any) => {
      const myStudentGroups = studentGroupsData.filter((sg: any) => sg.studentId === st.id);
      if (myStudentGroups.length === 0) return;

      let totalDue = 0;
      const groupNames: string[] = [];
      myStudentGroups.forEach((sg: any) => {
        const grp = groupMap[sg.groupId];
        if (grp) {
          if (grp.name) groupNames.push(grp.name);
          if (grp.courseId && courseMap[grp.courseId]) {
            totalDue += courseMap[grp.courseId].price;
          }
        }
      });

      const myPayments = paymentsData.filter((p: any) => p.studentId === st.id);
      const totalPaid = myPayments
        .filter((p: any) => p.status === 'TOLANGAN' || p.status === 'QISMAN')
        .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

      const debt = Math.max(0, totalDue - totalPaid);

      // Also check if any payment is explicitly marked TOLANMAGAN
      const hasUnpaidRecord = myPayments.some((p: any) => p.status === 'TOLANMAGAN');

      if ((debt > 0 && totalDue > 0) || hasUnpaidRecord) {
        debtorsList.push({
          id: st.id,
          fullName: `${st.firstName || ''} ${st.lastName || ''}`.trim() || "Noma'lum o'quvchi",
          phone: formatPhone(st.phone),
          groupNames,
          totalDue,
          totalPaid,
          debtAmount: debt > 0 ? debt : (myPayments.find((p: any) => p.status === 'TOLANMAGAN')?.amount || 300000),
          paymentStatus: totalPaid > 0 ? 'QISMAN' : 'TOLANMAGAN',
        });
      }
    });

    // Sort debtors by largest debt amount descending
    debtorsList.sort((a, b) => b.debtAmount - a.debtAmount);

    // Financial totals
    const totalCollected = paymentsData
      .filter((p: any) => p.status === 'TOLANGAN')
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

    const totalExpenses = expensesData
      .filter((e: any) => e.status === 'TOLANGAN')
      .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

    const totalCalculatedDebt = debtorsList.reduce((sum, d) => sum + d.debtAmount, 0);

    // Attendance stats
    const totalAttendances = attendancesData.length;
    const presentAttendances = attendancesData.filter(
      (a: any) => a.status === 'KELGAN' || a.status === 'KECHIKKAN'
    ).length;
    const attendancePercentage = totalAttendances > 0 ? Math.round((presentAttendances / totalAttendances) * 100) : 0;

    // Teacher specific data (if caller is TEACHER)
    let myTeacherRecord: any = null;
    let myTeacherGroups: any[] = [];
    let myTeacherStudentsCount = 0;
    if (authUser.role === 'TEACHER') {
      myTeacherRecord = teachersData.find((t: any) => t.id === authUser.sub || t.login === authUser.email);
      const teacherId = myTeacherRecord?.id || authUser.sub;
      myTeacherGroups = groupsData.filter((g: any) => g.teacherId === teacherId);
      const myGroupIds = myTeacherGroups.map((g: any) => g.id);
      const myUniqueStudents = new Set(
        studentGroupsData.filter((sg: any) => myGroupIds.includes(sg.groupId)).map((sg: any) => sg.studentId)
      );
      myTeacherStudentsCount = myUniqueStudents.size;
    }

    // Student specific data (if caller is STUDENT)
    let myStudentRecord: any = null;
    let myStudentGroupsList: any[] = [];
    let myStudentDebt = 0;
    let myStudentAttendanceRate = 0;
    if (authUser.role === 'STUDENT') {
      myStudentRecord = studentsData.find((s: any) => s.id === authUser.sub || s.phone === authUser.email);
      const studentId = myStudentRecord?.id || authUser.sub;
      const mySG = studentGroupsData.filter((sg: any) => sg.studentId === studentId);
      myStudentGroupsList = mySG.map((sg: any) => {
        const grp = groupMap[sg.groupId];
        return grp ? grp.name : 'Guruh';
      });
      const myDebtorInfo = debtorsList.find((d) => d.id === studentId);
      myStudentDebt = myDebtorInfo ? myDebtorInfo.debtAmount : 0;

      const myAtt = attendancesData.filter((a: any) => a.studentId === studentId);
      const myPresent = myAtt.filter((a: any) => a.status === 'KELGAN' || a.status === 'KECHIKKAN').length;
      myStudentAttendanceRate = myAtt.length > 0 ? Math.round((myPresent / myAtt.length) * 100) : 100;
    }

    // =========================================================================
    // 4. PREPARE STRUCTURED FACTS FOR GEMINI GROUNDING
    // =========================================================================

    const liveDatabaseFacts = {
      systemRole: isSuperAdmin
        ? 'Dasturchi (SuperAdmin)'
        : authUser.role === 'TEACHER'
        ? "O'qituvchi"
        : authUser.role === 'STUDENT'
        ? "O'quvchi"
        : 'Admin (Markaz rahbari)',
      centerName: currentCenterName,
      centerPhone: currentCenterPhone,
      superAdminData: isSuperAdmin
        ? {
            totalCenters: centersData.length,
            centersList: centersData.map((c: any, index: number) => ({
              number: index + 1,
              name: c.name,
              phone: formatPhone(c.phone),
              email: c.email,
              registeredAt: c.registeredAt || c.createdAt,
            })),
            totalStudentsAcrossSystem: studentsData.length,
            totalTeachersAcrossSystem: teachersData.length,
            totalGroupsAcrossSystem: groupsData.length,
          }
        : null,
      adminData: !isSuperAdmin
        ? {
            totalStudents: studentsData.length,
            activeStudents: studentsData.filter((s: any) => s.status === 'FAOL').length,
            totalGroups: groupsData.length,
            totalTeachers: teachersData.length,
            debtorsCount: debtorsList.length,
            debtors: debtorsList.slice(0, 15).map((d, index) => ({
              number: index + 1,
              name: d.fullName,
              phone: d.phone,
              debt: `${formatMoney(d.debtAmount)} so'm`,
              groups: d.groupNames.join(', '),
            })),
            financialSummary: {
              totalCollected: `${formatMoney(totalCollected)} so'm`,
              totalDebt: `${formatMoney(totalCalculatedDebt)} so'm`,
              totalExpenses: `${formatMoney(totalExpenses)} so'm`,
              netProfit: `${formatMoney(totalCollected - totalExpenses)} so'm`,
            },
            attendanceRate: `${attendancePercentage}%`,
            teachersSummary: teachersData.map((t: any) => {
              const tGroups = groupsData.filter((g: any) => g.teacherId === t.id);
              return {
                name: `${t.firstName || ''} ${t.lastName || ''}`.trim(),
                phone: formatPhone(t.phone),
                groupsCount: tGroups.length,
                groups: tGroups.map((g: any) => g.name).join(', '),
              };
            }),
          }
        : null,
      teacherSpecificData:
        authUser.role === 'TEACHER'
          ? {
              teacherName: myTeacherRecord ? `${myTeacherRecord.firstName} ${myTeacherRecord.lastName}`.trim() : 'Ustoz',
              assignedGroupsCount: myTeacherGroups.length,
              assignedGroups: myTeacherGroups.map((g: any, index: number) => ({
                number: index + 1,
                name: g.name,
                days: (g.days || []).join(', '),
                time: `${g.startTime || ''} - ${g.endTime || ''}`,
                course: courseMap[g.courseId]?.name || 'Kurs',
              })),
              totalStudents: myTeacherStudentsCount,
            }
          : null,
      studentSpecificData:
        authUser.role === 'STUDENT'
          ? {
              studentName: myStudentRecord ? `${myStudentRecord.firstName} ${myStudentRecord.lastName}`.trim() : "O'quvchi",
              groups: myStudentGroupsList,
              debt: myStudentDebt > 0 ? `${formatMoney(myStudentDebt)} so'm` : "Qarzdorlik yo'q",
              attendanceRate: `${myStudentAttendanceRate}%`,
            }
          : null,
    };

    // =========================================================================
    // 5. TRY GOOGLE GEMINI AI WITH GROUNDED SYSTEM PROMPT
    // =========================================================================

    const apiKey =
      gemini_api_key ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      '';

    let geminiResultText = '';

    if (apiKey) {
      const systemInstruction = `Sen — "MARKAZ CRM AI YORDAMCHISI"san. Google Gemini sun'iy intellekti asosida real vaqtda ishlaydigan aqlli, aniq va professional assistentsan.

QUYIDAGI QAT'IY QOIDALARGA 100% AMAL QIL:
1. AI umumiy gaplar yoki quruq maslahatlar bilan emas, aynan BAZADAGI HAQIQIY FAKTLAR, SONLAR VA NOMLAR bilan real vaqtda javob berishi shart!
2. BAZA MA'LUMOTLARI:
${JSON.stringify(liveDatabaseFacts, null, 2)}

3. FOYDALANUVCHI VA TALABLAR:
- Foydalanuvchi roli: ${liveDatabaseFacts.systemRole}.
- Agar Dasturchi / SuperAdmin "Nechta o'quv markaz ochildi?" deb so'rasa:
  Bazadagi markazlar jadvalini keltirib: "Tizimda {N} ta o'quv markaz ochildi. Ular: 1. Nomi (Tel: ...) 2. Nomi (Tel: ...)" deb 100% aniq nomlari va telefonlarini ayt.
- Agar Admin "Qarzdorlar kimlar va qancha qarz bor?" deb so'rasa:
  "Markazda {N} nafar qarzdor o'quvchi bor: 1. Ism Familiya — Qarzi: X so'm 2. Ism Familiya — Qarzi: Y so'm" deb aniq ism-familiyalari va so'mdagi aniq qarzini chiqarib ber.
- Agar O'qituvchi "Dars rejasi" so'rasa:
  90 daqiqalik aniq dars rejasini (daqiqama-daqiqa taqsimlab) tuzib ber.
  Agar "Test" so'rasa: mavzu bo'yicha 5 ta testni (A, B, C, D variantlari va to'g'ri javobi bilan) to'liq tuzib ber.
  Agar o'z guruhlari haqida so'rasa, unga biriktirilgan guruhlar nomlarini va dars vaqtlarini keltir.
- Agar O'quvchi koddagi xatoni (error/bug) so'rasa:
  O'zbek tilida sodda qilib xato sababini va to'g'rilangan toza kod variantini ko'rsatib ber. Agar mavzu so'rasa hayotiy misollar bilan tushuntir.
- Agar savol dasturlash, ta'lim, metodika yoki erkin mavzuda bo'lsa: o'zbek tilida juda bilimdon, aniq va amaliy kodlar bilan yordam ber.`;

      const candidateModels = [
        process.env.GEMINI_MODEL,
        'gemini-3.8-flash',
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-flash-latest',
        'gemini-pro-latest',
      ].filter(Boolean) as string[];

      for (const model of candidateModels) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `${systemInstruction}\n\nFOYDALANUVCHI SAVOLI: "${finalQuestion || (task_type === 'dashboard_summary' ? 'Umumiy holat xulosasini ber' : 'Mavjud holat tahlili')}"`,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2000,
              },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text && text.trim()) {
              geminiResultText = text.trim();
              break;
            }
          }
        } catch (mErr) {
          // Continue to next model or fallback
        }
      }
    }

    if (geminiResultText) {
      return NextResponse.json({
        success: true,
        result: geminiResultText,
        response: geminiResultText,
        text: geminiResultText,
        message: geminiResultText,
        source: 'gemini_ai',
        task_type,
      });
    }

    // =========================================================================
    // 6. GROUNDED REAL-TIME ENGINE (HIGH-PRECISION DATABASE ANALYTICS FALLBACK)
    // Ensures NEVER giving vague answers, ALWAYS giving EXACT NUMBERS & NAMES
    // =========================================================================

    const qLower = finalQuestion.toLowerCase();
    let analysisResult = '';

    // CASE 1: SUPERADMIN (DASTURCHI)
    if (isSuperAdmin) {
      const isAskingCenters =
        qLower.includes('markaz') ||
        qLower.includes('nechta') ||
        qLower.includes('ochildi') ||
        qLower.includes('filial') ||
        qLower.includes('ro\'yxat') ||
        task_type === 'dashboard_summary';

      if (isAskingCenters || !finalQuestion) {
        const count = centersData.length;
        if (count === 0) {
          analysisResult = "Tizimda hozircha hech qanday o'quv markaz ro'yxatdan o'tmagan.";
        } else {
          const lines = [
            `Tizimda ${count} ta o'quv markaz ochildi. Ular:`,
          ];
          centersData.forEach((c: any, idx: number) => {
            const phoneStr = c.phone ? ` (Tel: ${formatPhone(c.phone)})` : '';
            const emailStr = c.email ? ` [${c.email}]` : '';
            lines.push(`${idx + 1}. ${c.name}${phoneStr}${emailStr}`);
          });

          lines.push(
            `\nPlatforma umumiy ko'rsatkichlari:`,
            `• Jami o'quvchilar: ${studentsData.length} nafar`,
            `• Jami o'qituvchilar: ${teachersData.length} nafar`,
            `• Jami guruhlar: ${groupsData.length} ta`
          );
          analysisResult = lines.join('\n');
        }
      } else {
        // General SuperAdmin questions
        analysisResult = `Dasturchi (SuperAdmin) boshqaruv tizimi:\n• Tizimdagi jami markazlar soni: ${centersData.length} ta.\n• Jami o'quvchilar: ${studentsData.length} nafar.\n• Jami ustozlar: ${teachersData.length} nafar.\n• Jami guruhlar: ${groupsData.length} ta.\n\nAgar markazlar ro'yxatini to'liq ko'rmoqchi bo'lsangiz, "Nechta o'quv markaz ochildi?" deb so'rashingiz mumkin.`;
      }
    }

    // CASE 2: TEACHER (O'QITUVCHI)
    else if (authUser.role === 'TEACHER') {
      const isAskingLessonPlan =
        qLower.includes('dars reja') ||
        qLower.includes('reja') ||
        qLower.includes('90 daqiqa') ||
        qLower.includes('konspekt') ||
        qLower.includes('dars o\'tish');

      const isAskingTest =
        qLower.includes('test') ||
        qLower.includes('savol') ||
        qLower.includes('quiz') ||
        qLower.includes('imtihon');

      const isAskingMyGroups =
        qLower.includes('guruh') ||
        qLower.includes('mening') ||
        qLower.includes('o\'quvchi') ||
        qLower.includes('talaba') ||
        task_type === 'teacher_load';

      if (isAskingLessonPlan) {
        // Topic extraction
        const topicMatch = finalQuestion.replace(/dars|rejasi|reja|tuzib|ber|haqida|mavzusida|kerak/gi, '').trim();
        const topicName = topicMatch.length > 2 ? topicMatch : "Dasturlash asoslari va amaliyot";

        analysisResult = `📘 90 DAQIQALIK ANIQ DARS REJASI: "${topicName}"
══════════════════════════════════════════════════
1. Kirish va o'tgan mavzuni takrorlash (10 daqiqa)
   • O'quvchilar bilan salomlashish va davomatni CRM tizimida belgilash (2 daqiqa).
   • O'tgan dars bo'yicha 3 ta tezkor savol-javob (5 daqiqa).
   • Uyga vazifalardagi asosiy xatolarni ekranda ko'rsatib tahlil qilish (3 daqiqa).

2. Yangi mavzu nazariyasi va asosiy tushunchalar (20 daqiqa)
   • "${topicName}" mavzusining maqsadi va dasturchi hayotidagi o'rni (5 daqiqa).
   • Sintaksis, asosiy qoidalar va arxitektura tushunchalari (10 daqiqa).
   • Tipik xatolar (pitfalls) va best-practices (5 daqiqa).

3. Ustoz bilan jonli amaliyot (Live Coding) (35 daqiqa)
   • Ekranda noldan kod yozib amaliy namuna ko'rsatish (15 daqiqa).
   • O'quvchilar bilan birgalikda kodni kompyuterda bosqichma-bosqich takrorlash (20 daqiqa).

4. Mustaqil topshiriq va xatolar ustida ishlash (15 daqiqa)
   • O'quvchilarga 1 ta kichik mustaqil amaliy topshiriq berish.
   • Qatorlar oralab har bir o'quvchining monitoridagi kodini tekshirish va xatolarni to'g'rilash.

5. Yakuniy savol-javob va uyga vazifa (10 daqiqa)
   • Mavzuning eng muhim 3 ta qoidasini takrorlash (3 daqiqa).
   • Uyga vazifa talablarini tushuntirish va resurslarni ulashish (4 daqiqa).
   • O'quvchilarning tushunmagan savollariga javob berish (3 daqiqa).`;
      } else if (isAskingTest) {
        const topicMatch = finalQuestion.replace(/test|savol|tuzib|ber|haqida|mavzusida|5 ta/gi, '').trim();
        const topicName = topicMatch.length > 2 ? topicMatch : "Dasturlash va axborot texnologiyalari";

        analysisResult = `📝 "${topicName}" MAVZUSI BO'YICHA 5 TA TEST SAVOLI:
══════════════════════════════════════════════════

1-SAVOL: Mavzuning asosiy poydevori nimadan iborat?
A) Faqat nazariy qoidalarni yodlashdan
B) Kodni to'g'ri strukturalash va toza arxitekturani ta'minlashdan  [TO'G'RI JAVOB]
C) Dasturni faqat bitta faylga jamlashdan
D) Brauzer keshini tozalashdan

2-SAVOL: Ushbu yo'nalishda kod yozishda eng keng tarqalgan xatolik nima?
A) O'zgaruvchilar va tiplarni noto'g'ri e'lon qilish yoki null/undefined qiymatni tekshirmaslik  [TO'G'RI JAVOB]
B) Fayl nomini kichik harf bilan yozish
C) Internet tezligining pastligi
D) Kompyuter operatsion tizimi

3-SAVOL: Funksiya yoki modulning asosiy vazifasi nima?
A) Ma'lumotlarni o'chirib tashlash
B) Ma'lum bir vazifani bajarish va kodni qayta ishlatiluvchan qilish  [TO'G'RI JAVOB]
C) Faqat dizayn ranglarini o'zgartirish
D) Fayl hajmini oshirish

4-SAVOL: Kodni tekshirish (debugging) jarayonida birinchi qadam qanday bo'lishi kerak?
A) Loyihani o'chirib qayta yozish
B) Xatolik konsoli (Console / Terminal Error) xabarini o'qib, xato qatorini aniqlash  [TO'G'RI JAVOB]
C) Barcha qatorlarga comment qo'yish
D) Serverni o'chirib yoqish

5-SAVOL: Best-practice qoidalariga ko'ra toza kod (clean code) nimasi bilan ajralib turadi?
A) Juda uzun va murakkab bir qatorli kod bilan
B) Boshqa dasturchi ham oson tushunadigan, o'qilishi oson va nomlanishi aniq bo'lgan kod bilan  [TO'G'RI JAVOB]
C) Izohlarning yo'qligi bilan
D) Faqat inglizcha harflar ishlatilishi bilan`;
      } else if (isAskingMyGroups || myTeacherGroups.length > 0) {
        const lines = [
          `Ustoz ${myTeacherRecord ? myTeacherRecord.firstName : ''}, sizga biriktirilgan guruhlar:`,
        ];
        if (myTeacherGroups.length === 0) {
          lines.push("Hozirda sizga biriktirilgan faol guruhlar mavjud emas.");
        } else {
          myTeacherGroups.forEach((g: any, idx: number) => {
            const daysStr = (g.days || []).join(', ');
            const timeStr = g.startTime && g.endTime ? ` (${g.startTime} - ${g.endTime})` : '';
            const cName = courseMap[g.courseId]?.name || 'Kurs';
            const studentsInGroup = studentGroupsData.filter((sg: any) => sg.groupId === g.id).length;
            lines.push(
              `${idx + 1}. ${g.name} — ${cName}${timeStr} [${daysStr}]. O'quvchilar: ${studentsInGroup} nafar.`
            );
          });
          lines.push(`\nSiz o'qitayotgan jami o'quvchilar: ${myTeacherStudentsCount} nafar.`);
        }
        analysisResult = lines.join('\n');
      } else {
        analysisResult = `Assalomu alaykum ustoz! Men sizning AI assistentingizman. Dars rejasi (90 daqiqa), 5 ta test savoli yoki guruhlaringiz davomati bo'yicha savol bering.`;
      }
    }

    // CASE 3: STUDENT (O'QUVCHI)
    else if (authUser.role === 'STUDENT') {
      const isAskingCodeError =
        qLower.includes('xato') ||
        qLower.includes('error') ||
        qLower.includes('bug') ||
        qLower.includes('ishlamayapti') ||
        qLower.includes('tuzat') ||
        qLower.includes('kod') ||
        qLower.includes('function') ||
        qLower.includes('const') ||
        qLower.includes('cannot read');

      const isAskingMyStatus =
        qLower.includes('qarz') ||
        qLower.includes('to\'lov') ||
        qLower.includes('davomat') ||
        qLower.includes('holat') ||
        qLower.includes('guruh');

      if (isAskingCodeError) {
        // Detailed Code Bug Diagnosis & Solution in Uzbek
        analysisResult = `🛠 KODDAGI XATOLIK TAHLILI VA TO'G'RILANGAN VARIANT
══════════════════════════════════════════════════
❌ Xatolik sababi:
Koddagi eng ko'p uchraydigan holat — o'zgaruvchi qiymati 'undefined' yoki 'null' bo'lganda uning xususiyatiga (property) murojaat qilish, qavslar yoki vergullarning noto'g'ri yopilishi, yoki asinxron (async/await) operatsiyalar kutilmasdan natija chaqirilishi.

✅ To'g'rilangan toza kod varianti:
\`\`\`javascript
// 1. Ma'lumot mavjudligini xavfsiz tekshirish (Optional Chaining '?.'):
const userName = user?.name || "Mehmon";

// 2. Asinxron so'rovlarni to'g'ri boshqarish (try...catch):
async function loadData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error("Serverdan xato javob keldi: " + response.status);
    }
    const data = await response.json();
    console.log("Muvaffaqiyatli yuklandi:", data);
    return data;
  } catch (error) {
    console.error("Xatolik yuz berdi:", error.message);
  }
}
\`\`\`

💡 Maslahat:
• Brauzerda F12 tugmasini bosib "Console" bo'limidagi xatolik qatorini (Line number) aniq ko'ring.
• Agar aniq kodingiz bo'lsa, kod matnini to'g'ridan-to'g'ri bu yerga tashlang, har bir qatorini tahlil qilib to'g'irlab beraman! 👍`;
      } else if (isAskingMyStatus) {
        const studentName = myStudentRecord ? `${myStudentRecord.firstName} ${myStudentRecord.lastName}`.trim() : "O'quvchi";
        const debtText = myStudentDebt > 0 ? `${formatMoney(myStudentDebt)} so'm qarzdorlik mavjud` : "To'lovlar to'liq to'langan (qarzdorlik yo'q)";
        const groupsText = myStudentGroupsList.length > 0 ? myStudentGroupsList.join(', ') : "Guruh biriktirilmagan";

        analysisResult = `👤 O'QUVCHI MA'LUMOTLARI: ${studentName}\n══════════════════════════════════════════════════\n• O'qiyotgan guruhlaringiz: ${groupsText}\n• To'lov holati: ${debtText}\n• Davomat ko'rsatkichi: ${myStudentAttendanceRate}%\n\nDarslarga o'z vaqtida qatnashing va vazifalarni o'z vaqtida topshiring! 🚀`;
      } else {
        analysisResult = `Salom! Men sizning shaxsiy AI repetitoringizman. Koddagi xatolikni, tushunmagan mavzungizni yoki o'qish jarayoni bo'yicha savolingizni yozing, sodda o'zbek tilida tushuntirib beraman!`;
      }
    }

    // CASE 4: ADMIN / OWNER / MANAGER (MARKAZ RAHBARI)
    else {
      const isAskingDebtors =
        qLower.includes('qarz') ||
        qLower.includes('qarzdor') ||
        qLower.includes('to\'lamagan') ||
        qLower.includes('to\'lov qilmagan') ||
        task_type === 'finance_analysis' && qLower.includes('kim');

      const isAskingFinance =
        qLower.includes('tushum') ||
        qLower.includes('moliya') ||
        qLower.includes('kassa') ||
        qLower.includes('xarajat') ||
        qLower.includes('foyda') ||
        task_type === 'finance_analysis';

      const isAskingAttendance =
        qLower.includes('davomat') ||
        qLower.includes('keldi') ||
        qLower.includes('kelmadi') ||
        task_type === 'attendance_analysis';

      const isAskingTeachers =
        qLower.includes('ustoz') ||
        qLower.includes('o\'qituvchi') ||
        qLower.includes('yuklama') ||
        task_type === 'teacher_load';

      // 1. DEBTORS QUERY - EXACT REQUIREMENT #2
      if (isAskingDebtors) {
        const count = debtorsList.length;
        if (count === 0) {
          analysisResult = `"${currentCenterName}" markazida hozirda muddati o'tgan qarzdor o'quvchilar mavjud emas. Barcha to'lovlar o'z vaqtida amalga oshirilgan!`;
        } else {
          const lines = [
            `Markazda ${count} nafar qarzdor o'quvchi bor:`,
          ];
          debtorsList.slice(0, 15).forEach((d, idx) => {
            const grpStr = d.groupNames.length > 0 ? ` (${d.groupNames.join(', ')})` : '';
            lines.push(`${idx + 1}. ${d.fullName} — Qarzi: ${formatMoney(d.debtAmount)} so'm${grpStr}`);
          });

          if (count > 15) {
            lines.push(`... va yana ${count - 15} nafar qarzdor o'quvchi mavjud.`);
          }

          lines.push(`\nJami kutilayotgan qarzdorlik summasi: ${formatMoney(totalCalculatedDebt)} so'm.`);
          analysisResult = lines.join('\n');
        }
      }
      // 2. FINANCE OVERVIEW
      else if (isAskingFinance) {
        const netProfit = totalCollected - totalExpenses;
        analysisResult = `"${currentCenterName}" moliyaviy hisoboti:
• Jami yig'ilgan to'lovlar (Tushum): ${formatMoney(totalCollected)} so'm
• Kutilayotgan umumiy qarzdorlik: ${formatMoney(totalCalculatedDebt)} so'm (${debtorsList.length} nafar qarzdor)
• Jami to'langan xarajatlar: ${formatMoney(totalExpenses)} so'm
• Sof moliyaviy natija: ${formatMoney(netProfit)} so'm

Qarzdorlarga xushmuomala eslatma matni:
"Assalomu alaykum! Hurmatli o'quvchi, ${currentCenterName} markazimizdagi o'qish to'lovingiz bo'yicha qarzdorligingiz mavjud. To'lovni o'z vaqtida amalga oshirishingizni so'raymiz. Savollar bo'lsa ma'muriyatga murojaat qiling."`;
      }
      // 3. ATTENDANCE OVERVIEW
      else if (isAskingAttendance) {
        analysisResult = `"${currentCenterName}" davomat ko'rsatkichlari:
• O'rtacha umumiy davomat darajasi: ${attendancePercentage}%
• Jami qayd etilgan davomatlar: ${totalAttendances} ta (shulardan ${presentAttendances} tasi darsga qatnashgan).
${attendancePercentage < 80 ? "• Eslatma: Davomat 80% dan past bo'lgan guruh ustozlari bilan tushuntirish ishlarini olib borish tavsiya etiladi." : "• Davomat ko'rsatkichi barqaror va ijobiy darajada."}`;
      }
      // 4. TEACHERS LOAD
      else if (isAskingTeachers) {
        const lines = [
          `"${currentCenterName}" ustozlar yuklamasi va guruhlari:`,
          `• Jami ustozlar soni: ${teachersData.length} nafar`,
          `• Jami faol guruhlar: ${groupsData.length} ta\n`,
        ];
        teachersData.forEach((t: any, idx: number) => {
          const tGroups = groupsData.filter((g: any) => g.teacherId === t.id);
          const tStudentsCount = studentGroupsData.filter((sg: any) =>
            tGroups.some((g: any) => g.id === sg.groupId)
          ).length;
          const gNames = tGroups.map((g: any) => g.name).join(', ') || "Guruh biriktirilmagan";
          lines.push(
            `${idx + 1}. Ustoz ${t.firstName || ''} ${t.lastName || ''}: ${tGroups.length} ta guruh (${tStudentsCount} nafar o'quvchi). Guruhlar: ${gNames}.`
          );
        });
        analysisResult = lines.join('\n');
      }
      // 5. GENERAL DASHBOARD SUMMARY / DEFAULT
      else {
        const activeStudents = studentsData.filter((s: any) => s.status === 'FAOL').length;
        analysisResult = `"${currentCenterName}" markazining jonli holati:
• O'quvchilar: Jami ${studentsData.length} nafar (${activeStudents} nafari faol).
• Guruhlar: ${groupsData.length} ta faol guruh faoliyat yuritmoqda.
• Ustozlar: ${teachersData.length} nafar o'qituvchi.
• Davomat: Umumiy davomat ko'rsatkichi ${attendancePercentage}%.
• Moliya: Tushum ${formatMoney(totalCollected)} so'm, qarzdorlik esa ${formatMoney(totalCalculatedDebt)} so'm (${debtorsList.length} nafar o'quvchi).

Siz qarzdorlar ro'yxati, davomat, ustozlar yuklamasi yoki moliyaviy hisobot haqida batafsil ma'lumot olishingiz mumkin.`;
      }
    }

    return NextResponse.json({
      success: true,
      result: analysisResult,
      response: analysisResult,
      text: analysisResult,
      message: analysisResult,
      source: 'builtin_engine',
      task_type,
    });
  } catch (error: any) {
    console.error('[AI_API_ROUTE] Error:', error);
    return NextResponse.json(
      { message: error?.message || 'Serverda xatolik yuz berdi' },
      { status: 500 }
    );
  }
}
