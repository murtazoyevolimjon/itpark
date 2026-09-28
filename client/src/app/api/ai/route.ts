import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

const SYSTEM_PROMPT_TEMPLATE = `SEN — "MARKAZ CRM AI YORDAMCHISI". Sen o'quv markazlari (IT-markaz, til markazi, repetitorlik markazi) uchun CRM tizimida ishlaydigan aqlli, professional analitik yordamchisan.

## ROLING
- Markaz administratori, direktori yoki o'qituvchisi uchun xolis, aniq, tushunarli va foydali maslahatchisan.
- Faqat o'zbek tilida, do'stona, hurmatli va professional uslubda javob berasan.
- O'quv markaziga oid statistik savollarda faqat berilgan ma'lumotlarga tayangan holda gapirasan.

## KIRISH MA'LUMOTLARI
- Vazifa turi: {{task_type}}  (dashboard_summary, student_analysis, attendance_analysis, finance_analysis, teacher_load, chat_qa)
- Markaz nomi: {{center_name}}
- Foydalanuvchi roli: {{user_role}}
- Sana oralig'i: {{date_range}}
- Xom ma'lumot (JSON ko'rinishida): {{data}}
- Foydalanuvchi savoli: {{user_question}}

## VAZIFALARING (task_type ga qarab mos bo'limni ishlat)

### 1. dashboard_summary — Umumiy xulosa
Markazdagi jami o'quvchilar soni, faol guruhlar, davomat ko'rsatkichi, to'lovlar va qarzdorlik holatini umumlashtir.
Agar foydalanuvchi o'qituvchi bo'lsa, avvalo uning o'ziga biriktirilgan guruhlari va o'quvchilari holatini ham alohida ko'rsat.
Chiqish: 3–5 gapdan iborat kunlik/oylik holat xulosasi + eng muhim 1–2 ta amaliy tavsiya.

### 2. student_analysis — O'quvchilar tahlili
{{data}} ichidagi o'quvchilar ro'yxati (davomat, guruh, holati).
Chiqish: o'quvchilar profili, faolligi, qarzdorlik yoki to'xtatish xavfi bor o'quvchilar bo'yicha aniq xulosa va tavsiya.

### 3. attendance_analysis — Davomat tahlili
Guruhlar va o'quvchilar davomati tahlili (70% dan past ko'rsatkichli guruhlar va sabablar).
Chiqish: muammoli holatlar va ularni yaxshilash bo'yicha amaliy maslahatlar.

### 4. finance_analysis — Moliyaviy tahlil
Tushumlar, qarzdorlik va xarajatlar holati.
Chiqish: moliyaviy muvozanat xulosasi + qarzdorlarga yuborish uchun xushmuomala, lekin jiddiy SMS/xabar matni namunasi.

### 5. teacher_load — Ustozlar va guruhlar yuklamasi
O'qituvchilar bo'yicha guruhlar va talabalar taqsimoti.
Chiqish: yuklama balansi va guruhlarni to'g'ri taqsimlash bo'yicha tavsiya.

### 6. chat_qa — Erkin savol-javob (XOHLAGAN MAVZUDA)
Foydalanuvchi savoli: "{{user_question}}"
QOIDALAR:
A) Agar savol markaz, guruhlar, o'quvchilar, to'lovlar, qarzdorlik yoki davomat haqida bo'lsa:
   Faqat {{data}} dagi aniq raqamlar va faktlar asosida to'g'ri hisob-kitob bilan javob ber.
B) Agar savol umumiy mavzuda bo'lsa (masalan: dasturlash, Python, JavaScript, ta'lim, dars o'tish metodikasi, dars rejasi tuzish, motivatsiya, biznes, IT tushunchalari, erkin suhbat, maslahat yoki har qanday savol):
   Juda bilimdon, tushunarli, samimiy va keng qamrovli tarzda to'liq o'zbek tilida erkin javob ber! Hech qachon "bu ma'lumot mavjud emas" deb cheklanib qolma.

## CHIQISH FORMATI
Oddiy matn ko'rinishida javob ber (CRM interfeysida chiroyli ko'rsatilishi uchun keraksiz murakkab Markdown belgilarisiz). Muhim fikrlarni yangi qatordan "•" bilan ajrat.`;

function formatMoney(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Built-in rule-based analytical engine (fallback)
function generateBuiltinAnalysis(
  taskType: string,
  centerName: string,
  dateRange: string,
  rawData: any,
  userQuestion?: string,
  callerRole?: string,
  teacherInfo?: { name: string; groupsCount: number; studentsCount: number }
): string {
  const {
    students = [],
    groups = [],
    teachers = [],
    payments = [],
    attendances = [],
    expenses = [],
    studentGroups = [],
  } = rawData || {};

  const totalStudents = students.length;
  const activeStudents = students.filter((s: any) => s.status === 'FAOL').length;
  const totalGroups = groups.length;
  const totalTeachers = teachers.length;

  const totalAtt = attendances.length;
  const presentAtt = attendances.filter((a: any) => a.status === 'KELGAN' || a.status === 'KECHIKKAN').length;
  const attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;

  const totalCollected = payments
    .filter((p: any) => p.status === 'TOLANGAN')
    .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
  const totalDebt = payments
    .filter((p: any) => p.status === 'TOLANMAGAN' || p.status === 'QISMAN')
    .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
  const totalExpenses = expenses
    .filter((e: any) => e.status === 'TOLANGAN')
    .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

  // Group student count map
  const groupStudentCounts: Record<string, number> = {};
  studentGroups.forEach((sg: any) => {
    groupStudentCounts[sg.groupId] = (groupStudentCounts[sg.groupId] || 0) + 1;
  });

  // 1. dashboard_summary
  if (taskType === 'dashboard_summary') {
    const lines: string[] = [];

    if (callerRole === 'TEACHER' && teacherInfo) {
      lines.push(
        `Ustoz ${teacherInfo.name}, sizga biriktirilgan ${teacherInfo.groupsCount} ta guruh va jami ${teacherInfo.studentsCount} nafar o'quvchi mavjud.`
      );
      lines.push(
        `"${centerName}" markazida esa umumiy ${totalStudents} nafar o'quvchi (${activeStudents} nafari faol) va ${totalGroups} ta faol guruh faoliyat yuritmoqda.`
      );
    } else {
      lines.push(
        `"${centerName}" o'quv markazida hozirda jami ${totalStudents} nafar o'quvchi (${activeStudents} nafari faol) va ${totalGroups} ta faol guruh mavjud.`
      );
    }

    lines.push(`Umumiy o'rtacha davomat ko'rsatkichi: ${attendanceRate}%.`);
    lines.push(
      `Moliyaviy ko'rsatkichlar: Jami yig'ilgan to'lovlar ${formatMoney(totalCollected)} so'm, kutilayotgan qarzdorlik esa ${formatMoney(totalDebt)} so'mni tashkil qiladi.`
    );

    if (totalDebt > 0) {
      lines.push(`• Eslatma: Markazda ${formatMoney(totalDebt)} so'm qarzdorlik mavjud. O'quvchilarga to'lov eslatmalarini yuborish tavsiya etiladi.`);
    }
    lines.push(`• Markazning umumiy faoliyati barqaror darajada davom etmoqda.`);

    return lines.join('\n');
  }

  // 2. student_analysis
  if (taskType === 'student_analysis') {
    if (students.length === 0) return `"${centerName}" markazida hozircha o'quvchilar ro'yxati shakllanmagan.`;
    const lines: string[] = [
      `"${centerName}" o'quvchilari tahlili:`,
      `• Jami o'quvchilar soni: ${totalStudents} nafar (shulardan ${activeStudents} nafari faol ta'lim olmoqda).`,
    ];

    const inactiveCount = totalStudents - activeStudents;
    if (inactiveCount > 0) {
      lines.push(`• Faol bo'lmagan yoki to'xtatilgan o'quvchilar: ${inactiveCount} nafar.`);
    }

    students.slice(0, 5).forEach((st: any) => {
      lines.push(`• ${st.firstName} ${st.lastName}: Holati: ${st.status}, Tel: ${st.phone || "kiritilmagan"}.`);
    });

    return lines.join('\n');
  }

  // 3. attendance_analysis
  if (taskType === 'attendance_analysis') {
    const lines = [
      `"${centerName}" davomat tahlili:`,
      `• Umumiy davomat darajasi: ${attendanceRate}%.`,
      `• Jami qayd etilgan davomatlar soni: ${totalAtt} ta (shundan ${presentAtt} tasi qatnashgan).`,
    ];

    if (attendanceRate < 75 && totalAtt > 0) {
      lines.push(`• Diqqat talab: Davomat 75% dan past bo'lgan guruh ustozlari bilan bog'lanib, sabablarni o'rganish zarur.`);
    } else {
      lines.push(`• Davomat ko'rsatkichi ijobiy darajada saqlanmoqda.`);
    }

    return lines.join('\n');
  }

  // 4. finance_analysis
  if (taskType === 'finance_analysis') {
    const lines = [
      `"${centerName}" moliyaviy tahlili:`,
      `• Jami yig'ilgan to'lovlar: ${formatMoney(totalCollected)} so'm.`,
      `• Mavjud qarzdorlik: ${formatMoney(totalDebt)} so'm.`,
      `• Xarajatlar: ${formatMoney(totalExpenses)} so'm.`,
    ];

    if (totalDebt > 0) {
      lines.push(
        `\nQarzdorlarga yuborish uchun tavsiya etiladigan xabar matni:\n"Assalomu alaykum, hurmatli o'quvchi! Sizning ${centerName} o'quv markazimiz oldidagi o'qish to'lovingiz bo'yicha qarzdorligingiz mavjud. Iltimos, to'lovni o'z vaqtida amalga oshirishingizni so'raymiz. Savollar bo'lsa ma'muriyatga murojaat qiling."`
      );
    }

    return lines.join('\n');
  }

  // 5. teacher_load
  if (taskType === 'teacher_load') {
    const lines = [
      `"${centerName}" ustozlar yuklamasi:`,
      `• Markazda jami ${totalTeachers} nafar ustoz faoliyat yuritmoqda.`,
      `• Jami faol guruhlar soni: ${totalGroups} ta.`,
    ];

    teachers.forEach((t: any) => {
      const tGroups = groups.filter((g: any) => g.teacherId === t.id);
      const tStudentsCount = tGroups.reduce((sum: number, g: any) => sum + (groupStudentCounts[g.id] || 0), 0);
      lines.push(`• Ustoz ${t.firstName} ${t.lastName}: ${tGroups.length} ta guruh, ~${tStudentsCount} nafar o'quvchi.`);
    });

    return lines.join('\n');
  }

  // 6. chat_qa (Open Q&A on any topic)
  if (taskType === 'chat_qa') {
    const q = (userQuestion || '').trim();
    const qLower = q.toLowerCase();

    if (!q) {
      return "Savolingizni bering. Xoh markazingiz ma'lumotlari, xoh dasturlash yoki boshqa erkin mavzuda javob berishga tayyorman!";
    }

    // Greetings
    if (qLower.match(/^(salom|assalom|qalesiz|qandaysiz|qalaysan|privet|hello|hi)/i)) {
      return `Assalomu alaykum! Men "${centerName}" markazining AI yordamchisiman. Sizga qanday yordam bera olaman? Xoh markaz statistikasi, xoh dasturlash yoki boshqa mavzuda savol bering.`;
    }

    // Center-specific questions
    if (qLower.includes('o\'quvchi') || qLower.includes('talaba') || qLower.includes('nechta')) {
      return `"${centerName}" markazida jami ${totalStudents} nafar o'quvchi ro'yxatga olingan (${activeStudents} nafari faol o'qimoqda). Guruhlar soni esa ${totalGroups} ta.`;
    }

    if (qLower.includes('qarz') || qLower.includes('to\'lov') || qLower.includes('moliya') || qLower.includes('pul') || qLower.includes('kassa')) {
      return `Moliyaviy ko'rsatkichlar: Jami yig'ilgan to'lovlar ${formatMoney(totalCollected)} so'm, mavjud qarzdorlik ${formatMoney(totalDebt)} so'm, xarajatlar ${formatMoney(totalExpenses)} so'm.`;
    }

    if (qLower.includes('davomat') || qLower.includes('keldi') || qLower.includes('kelmadi')) {
      return `Markazdagi umumiy davomat darajasi ${attendanceRate}% ni tashkil etmoqda. Qayd etilgan jami davomatlar soni ${totalAtt} ta.`;
    }

    if (qLower.includes('ustoz') || qLower.includes('o\'qituvchi') || qLower.includes('muallim')) {
      return `Markazda jami ${totalTeachers} nafar ustoz bor va ular ${totalGroups} ta guruhga dars bermoqda.`;
    }

    if (qLower.includes('guruh')) {
      return `Hozirda markazda ${totalGroups} ta faol guruh faoliyat olib bormoqda.`;
    }

    // Fallback general guidance for open topics
    return `Savolingiz qabul qilindi! Ushbu savol bo'yicha to'liqroq va erkin tavsiya olish uchun Google Gemini API kalitidan foydalanishingiz mumkin yoki markazingiz boshqaruvi bo'yicha aniq ma'lumotlar so'rashingiz mumkin (o'quvchilar, guruhlar, moliya, davomat va ustozlar yuklamasi). Sizga qanday yordam bera olaman?`;
  }

  return "Tahlil xulosasi tayyorlandi.";
}

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser || !authUser.centerId) {
      return NextResponse.json({ message: "Avtorizatsiyadan o'tilmagan yoki markaz aniqlanmadi" }, { status: 401 });
    }

    const body = await req.json();
    const {
      task_type = 'dashboard_summary',
      date_range = 'Oxirgi 30 kun',
      user_question = '',
      gemini_api_key = '',
    } = body;

    const supabase = createServerSupabaseClient();

    // 1. Strict multi-tenant data fetching (ONLY for authUser.centerId!)
    // Using exact schema column names from supabase/schema.sql
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
      supabase.from('centers').select('id, name').eq('id', authUser.centerId).maybeSingle(),
      supabase.from('groups').select('id, name, startTime, endTime, days, teacherId, courseId, status').eq('centerId', authUser.centerId),
      supabase.from('students').select('id, firstName, lastName, phone, status, createdAt').eq('centerId', authUser.centerId),
      supabase.from('student_groups').select('id, studentId, groupId').eq('centerId', authUser.centerId),
      supabase.from('payments').select('id, amount, status, paymentDate, studentId, groupId').eq('centerId', authUser.centerId),
      supabase.from('attendances').select('id, status, date, studentId, groupId').eq('centerId', authUser.centerId),
      supabase.from('teachers').select('id, firstName, lastName, phone, status').eq('centerId', authUser.centerId),
      supabase.from('expenses').select('id, amount, type, status, createdAt').eq('centerId', authUser.centerId),
      supabase.from('courses').select('id, name, price').eq('centerId', authUser.centerId),
    ]);

    const centerName = center?.name || 'O\'quv Markazi';

    // Map teacher names
    const teacherMap: Record<string, string> = {};
    (teachers || []).forEach((t: any) => {
      teacherMap[t.id] = `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Ustoz';
    });

    // Map course names
    const courseMap: Record<string, string> = {};
    (courses || []).forEach((c: any) => {
      courseMap[c.id] = c.name;
    });

    // Count students per group
    const groupStudentCountMap: Record<string, number> = {};
    (studentGroups || []).forEach((sg: any) => {
      groupStudentCountMap[sg.groupId] = (groupStudentCountMap[sg.groupId] || 0) + 1;
    });

    // Caller teacher details if logged in as TEACHER
    let teacherInfo: { name: string; groupsCount: number; studentsCount: number } | undefined;
    if (authUser.role === 'TEACHER') {
      const myTeacher = (teachers || []).find((t: any) => t.id === authUser.sub);
      const myGroups = (groups || []).filter((g: any) => g.teacherId === authUser.sub);
      const myGroupIds = myGroups.map((g: any) => g.id);
      const myUniqueStudents = new Set(
        (studentGroups || []).filter((sg: any) => myGroupIds.includes(sg.groupId)).map((sg: any) => sg.studentId)
      );
      teacherInfo = {
        name: myTeacher ? `${myTeacher.firstName} ${myTeacher.lastName}`.trim() : 'Ustoz',
        groupsCount: myGroups.length,
        studentsCount: myUniqueStudents.size,
      };
    }

    const rawData = {
      students: students || [],
      groups: groups || [],
      teachers: teachers || [],
      payments: payments || [],
      attendances: attendances || [],
      expenses: expenses || [],
      studentGroups: studentGroups || [],
    };

    // 2. Structured payload for Gemini AI
    const summarizedDataPayload = {
      center: centerName,
      userRole: authUser.role,
      teacherSpecific: teacherInfo || null,
      totalStudents: (students || []).length,
      activeStudents: (students || []).filter((s: any) => s.status === 'FAOL').length,
      totalGroups: (groups || []).length,
      groupsList: (groups || []).map((g: any) => ({
        name: g.name,
        teacher: teacherMap[g.teacherId] || 'Biriktirilmagan',
        course: courseMap[g.courseId] || 'Kurs',
        studentsCount: groupStudentCountMap[g.id] || 0,
      })),
      teachersList: (teachers || []).map((t: any) => ({
        name: `${t.firstName || ''} ${t.lastName || ''}`.trim(),
        phone: t.phone,
      })),
      financials: {
        totalCollected: (payments || [])
          .filter((p: any) => p.status === 'TOLANGAN')
          .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
        totalDebt: (payments || [])
          .filter((p: any) => p.status === 'TOLANMAGAN' || p.status === 'QISMAN')
          .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
        totalExpenses: (expenses || [])
          .filter((e: any) => e.status === 'TOLANGAN')
          .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0),
      },
      attendanceCount: {
        total: (attendances || []).length,
        present: (attendances || []).filter((a: any) => a.status === 'KELGAN' || a.status === 'KECHIKKAN').length,
      },
    };

    // 3. Check for external Gemini API Key
    const apiKey =
      gemini_api_key ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      '';

    if (apiKey) {
      try {
        const prompt = SYSTEM_PROMPT_TEMPLATE
          .replace('{{task_type}}', task_type)
          .replace('{{center_name}}', centerName)
          .replace('{{user_role}}', authUser.role || 'ADMIN')
          .replace('{{date_range}}', date_range)
          .replace('{{data}}', JSON.stringify(summarizedDataPayload, null, 2))
          .replace('{{user_question}}', user_question || '');

        const modelsToTry = Array.from(
          new Set(
            [
              process.env.GEMINI_MODEL,
              'gemini-2.5-flash',
              'gemini-2.5-pro',
              'gemini-1.5-pro',
              'gemini-1.5-flash',
              'gemini-3.8-flash',
              'gemini-flash-latest',
              'gemini-pro-latest',
            ].filter(Boolean) as string[]
          )
        );

        let generatedText = '';
        let lastErrorMsg = '';

        for (const model of modelsToTry) {
          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 1500,
                  },
                }),
              }
            );

            if (response.ok) {
              const result = await response.json();
              const candidate = result.candidates?.[0]?.content?.parts?.[0]?.text;
              if (candidate && candidate.trim()) {
                generatedText = candidate.trim();
                break;
              }
            } else {
              const errBody = await response.json().catch(() => ({}));
              lastErrorMsg = errBody?.error?.message || `HTTP ${response.status}`;
            }
          } catch (mErr: any) {
            lastErrorMsg = mErr?.message || String(mErr);
          }
        }

        if (generatedText) {
          return NextResponse.json({
            success: true,
            result: generatedText,
            source: 'gemini_ai',
            task_type,
          });
        }

        if (lastErrorMsg) {
          console.warn('Gemini API call attempts failed:', lastErrorMsg);
        }
      } catch (geminiError) {
        console.error('Gemini API call failed, falling back to built-in analytics:', geminiError);
      }
    }

    // 4. Built-in high-precision analytics fallback
    const result = generateBuiltinAnalysis(
      task_type,
      centerName,
      date_range,
      rawData,
      user_question,
      authUser.role,
      teacherInfo
    );

    return NextResponse.json({
      success: true,
      result,
      source: 'builtin_engine',
      task_type,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
