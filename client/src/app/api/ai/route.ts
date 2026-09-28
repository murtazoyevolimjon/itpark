import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

const SYSTEM_PROMPT_TEMPLATE = `SEN — "MARKAZ CRM AI YORDAMCHISI". Sen o'quv markazlari (IT-markaz, til markazi, repetitorlik markazi) uchun CRM tizimida ishlaydigan analitik yordamchisan. Faqat senga berilgan ma'lumotlar asosida ishlaysan, hech qachon ma'lumot to'qib chiqarmaysan.

## ROLING
- Markaz administratori/direktori uchun ma'lumotlarni tahlil qilib, tushunarli, qisqa va amaliy xulosalar berasan.
- Faqat o'zbek tilida, sodda va professional uslubda javob berasan (rasmiy, lekin robotga o'xshamaydigan ton).
- Raqamlarga asoslanib gapirasan, taxmin yoki umumiy gaplar qilmaysan.

## KIRISH MA'LUMOTLARI (integratsiya orqali beriladi)
- Vazifa turi: {{task_type}}  (mumkin qiymatlar: dashboard_summary, student_analysis, attendance_analysis, finance_analysis, teacher_load, chat_qa)
- Markaz nomi: {{center_name}}
- Sana oralig'i: {{date_range}}
- Xom ma'lumot (JSON/matn ko'rinishida): {{data}}
- Foydalanuvchi savoli (faqat chat_qa uchun): {{user_question}}

## VAZIFALARING (task_type ga qarab mos bo'limni ishlat)

### 1. dashboard_summary — Umumiy dashboard xulosasi
{{data}} ichidan o'quvchilar soni, guruhlar, davomat foizi, to'lovlar va qarzdorlik holatini oling.
Chiqish: 3–5 gapdan iborat kunlik/haftalik holat xulosasi + eng muhim 1–2 ta e'tibor talab qiladigan holat (masalan, ko'p qarzdor yoki davomat pasayishi).

### 2. student_analysis — O'quvchi tahlili
{{data}} ichida bitta yoki bir nechta o'quvchi ma'lumoti bo'ladi (to'lov holati, davomat, guruh, qo'shilgan sana).
Chiqish: har bir o'quvchi uchun 2–3 gaplik qisqa profil + holat (faol/qarzdor/tark etish xavfi bor) + agar kerak bo'lsa aniq tavsiya (masalan: "qo'ng'iroq qilib eslatish kerak").

### 3. attendance_analysis — Davomat tahlili
{{data}} ichida guruh/o'quvchi bo'yicha davomat foizlari bo'ladi.
Davomati 70%dan past bo'lgan guruh/o'quvchilarni aniqla. Har biri uchun mumkin bo'lgan sabab taxminini emas, faqat faktik holatni yoz (masalan: "oxirgi 2 haftada 3 marta kelmagan").
Chiqish: muammoli ro'yxat + ustuvorlik tartibida (eng kritik holat birinchi).

### 4. finance_analysis — Moliyaviy tahlil
{{data}} ichida joriy va oldingi oy daromad/xarajat, qarzdorlar ro'yxati bo'ladi.
Daromad o'zgarishini foiz va sabab (agar aniq faktlardan ko'rinsa: yangi o'quvchilar kamaygani, qarzdorlik oshgani va h.k.) bilan tushuntir.
Qarzdorlarga yuborish uchun 2–3 gaplik xushmuomala, lekin qat'iy eslatma matni yoz (ism, qarz summasi, {{data}}dan olinsin).

### 5. teacher_load — O'qituvchi/guruh yuki tahlili
{{data}} ichida o'qituvchilar bo'yicha guruhlar soni, o'quvchilar soni, soatlik yuklama bo'ladi.
Yuklama nomutanosibligini aniqla (kim ortiqcha, kim kam band) va guruhlarni qayta taqsimlash bo'yicha aniq tavsiya ber.

### 6. chat_qa — Erkin savol-javob
{{user_question}} ga faqat {{data}} ichidagi ma'lumotlar asosida javob ber.
Agar savolga javob berish uchun {{data}} da yetarli ma'lumot bo'lmasa — taxmin qilma, "bu ma'lumot hozircha mavjud emas" deb aniq ayt.

## QAT'IY QOIDALAR
1. {{data}} da bo'lmagan hech qanday raqam, ism yoki faktni ishlatma — hech qachon to'qima.
2. Javoblaringda ortiqcha kirish so'zlarsiz, to'g'ridan-to'g'ri mazmunga o't.
3. Har doim amaliy va qisqa yoz — uzun insho emas, CRM interfeysida o'qiladigan matn yoz (odatda 3–8 gap, chat_qa uchun savolga mos uzunlik).
4. O'quvchi yoki xodimning passport, telefon kabi shaxsiy ma'lumotlarini faqat aniq kerak bo'lganda (masalan qarzdorga qo'ng'iroq qilish matni) ishlat, aks holda faqat ism bilan cheklan.
5. Salbiy yoki ayblovchi ohangda yozma (masalan o'qituvchi yoki o'quvchini qoralash) — faktlarni neytral tarzda taqdim et.
6. Agar {{data}} bo'sh yoki yetarli bo'lmasa, shuni ochiq ayt va nima yetishmayotganini ko'rsat.

## CHIQISH FORMATI
Oddiy matn ko'rinishida javob ber (Markdown belgilarisiz — CRM interfeysida to'g'ridan-to'g'ri ko'rsatiladi). Agar bir nechta band bo'lsa, har birini yangi qatordan "•" bilan boshla.`;

function formatMoney(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Built-in rule-based analytical engine conforming strictly to the prompt rules
function generateBuiltinAnalysis(
  taskType: string,
  centerName: string,
  dateRange: string,
  rawData: any,
  userQuestion?: string
): string {
  if (!rawData || (Array.isArray(rawData) && rawData.length === 0)) {
    return "Tahlil qilish uchun ma'lumotlar mavjud emas. Markaz tizimiga talabalar, guruhlar va to'lovlar kiritilishi kerak.";
  }

  const {
    students = [],
    groups = [],
    teachers = [],
    payments = [],
    attendances = [],
    expenses = [],
  } = rawData;

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

  // Group attendance map
  const groupAttMap: Record<string, { total: number; present: number; name: string }> = {};
  groups.forEach((g: any) => {
    groupAttMap[g.id] = { total: 0, present: 0, name: g.name };
  });
  attendances.forEach((a: any) => {
    if (groupAttMap[a.groupId]) {
      groupAttMap[a.groupId].total++;
      if (a.status === 'KELGAN' || a.status === 'KECHIKKAN') {
        groupAttMap[a.groupId].present++;
      }
    }
  });

  // Student attendance map
  const studentAttMap: Record<string, { total: number; present: number; name: string }> = {};
  students.forEach((s: any) => {
    studentAttMap[s.id] = { total: 0, present: 0, name: `${s.firstName} ${s.lastName}` };
  });
  attendances.forEach((a: any) => {
    if (studentAttMap[a.studentId]) {
      studentAttMap[a.studentId].total++;
      if (a.status === 'KELGAN' || a.status === 'KECHIKKAN') {
        studentAttMap[a.studentId].present++;
      }
    }
  });

  // 1. dashboard_summary
  if (taskType === 'dashboard_summary') {
    const lines = [
      `"${centerName}" o'quv markazida hozirda ${totalStudents} nafar o'quvchi (${activeStudents} nafari faol) va ${totalGroups} ta faol guruh mavjud.`,
      `Umumiy o'rtacha davomat ko'rsatkichi ${attendanceRate}% ni tashkil etmoqda.`,
      `Moliyaviy ko'rsatkichlar: Jami yig'ilgan to'lovlar ${formatMoney(totalCollected)} so'm, kutilayotgan qarzdorlik esa ${formatMoney(totalDebt)} so'mni tashkil qiladi.`,
    ];

    if (totalDebt > 0) {
      lines.push(
        `• Diqqat talab holat: Markazda jami ${formatMoney(totalDebt)} so'm qarzdorlik mavjud. O'quvchilarga to'lov eslatmalarini yuborish tavsiya etiladi.`
      );
    }
    if (attendanceRate < 75 && totalAtt > 0) {
      lines.push(
        `• Diqqat talab holat: O'rtacha davomat ${attendanceRate}% ga tushib ketgan. Davomati past guruhlar ustozlari bilan aloqaga chiqish zarur.`
      );
    } else {
      lines.push(`• Markazning umumiy faoliyati barqaror darajada davom etmoqda.`);
    }

    return lines.join('\n');
  }

  // 2. student_analysis
  if (taskType === 'student_analysis') {
    if (students.length === 0) return "Tahlil uchun o'quvchilar ro'yxati mavjud emas.";
    const lines: string[] = [];

    students.slice(0, 8).forEach((st: any) => {
      const att = studentAttMap[st.id];
      const rate = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : 100;
      const isDebtor = st.paymentStatus === 'TOLANMAGAN' || st.paymentStatus === 'QISMAN';

      let statusDesc = "Faol holatda";
      let action = "O'qish jarayoni yaxshi.";
      if (isDebtor && rate < 70) {
        statusDesc = "Tark etish xavfi bor va qarzdor";
        action = "Ota-onasi bilan shoshilinch bog'lanib, qarz va dars qoldirish sababini aniqlash zarur.";
      } else if (isDebtor) {
        statusDesc = "Qarzdor";
        action = "To'lov haqida eslatma xabari yuborilishi kerak.";
      } else if (rate < 70) {
        statusDesc = "Tark etish xavfi bor (davomat past)";
        action = "Dars qoldirish sabablari yuzasidan o'quvchi bilan suhbat o'tkazish kerak.";
      }

      lines.push(
        `• ${st.firstName} ${st.lastName}: Davomati ${rate}%, to'lov holati "${st.paymentStatus || 'TOLANMAGAN'}". Holati: ${statusDesc}. Tavsiya: ${action}`
      );
    });

    return lines.join('\n');
  }

  // 3. attendance_analysis
  if (taskType === 'attendance_analysis') {
    const lowAttGroups: { name: string; rate: number; total: number; absent: number }[] = [];
    Object.entries(groupAttMap).forEach(([_, val]) => {
      if (val.total > 0) {
        const rate = Math.round((val.present / val.total) * 100);
        if (rate < 70) {
          lowAttGroups.push({
            name: val.name,
            rate,
            total: val.total,
            absent: val.total - val.present,
          });
        }
      }
    });

    const lowAttStudents: { name: string; rate: number; absent: number }[] = [];
    Object.entries(studentAttMap).forEach(([_, val]) => {
      if (val.total >= 2) {
        const rate = Math.round((val.present / val.total) * 100);
        if (rate < 70) {
          lowAttStudents.push({
            name: val.name,
            rate,
            absent: val.total - val.present,
          });
        }
      }
    });

    // Sort by lowest rate
    lowAttGroups.sort((a, b) => a.rate - b.rate);
    lowAttStudents.sort((a, b) => a.rate - b.rate);

    if (lowAttGroups.length === 0 && lowAttStudents.length === 0) {
      return `Markazda davomat ko'rsatkichi 70% dan past bo'lgan guruh yoki surunkali dars qoldiruvchi o'quvchilar aniqlanmadi. Umumiy davomat ${attendanceRate}% darajasida yaxshi saqlanmoqda.`;
    }

    const lines: string[] = [
      `Davomat ko'rsatkichi 70% dan past bo'lgan holatlar tahlili:`,
    ];

    lowAttGroups.forEach((g) => {
      lines.push(
        `• Guruh "${g.name}": Davomat ${g.rate}%. Jami ${g.total} ta dars qaydidan ${g.absent} tasi qoldirilgan. (Kritik daraja)`
      );
    });

    lowAttStudents.slice(0, 6).forEach((s) => {
      lines.push(
        `• O'quvchi ${s.name}: Davomati ${s.rate}%. Qoldirilgan darslar soni: ${s.absent} ta.`
      );
    });

    return lines.join('\n');
  }

  // 4. finance_analysis
  if (taskType === 'finance_analysis') {
    const debtors = students.filter(
      (s: any) => s.paymentStatus === 'TOLANMAGAN' || s.paymentStatus === 'QISMAN'
    );

    const lines = [
      `Joriy davr moliyaviy hisoboti:`,
      `• Jami qabul qilingan to'lovlar: ${formatMoney(totalCollected)} so'm.`,
      `• Jami markaz xarajatlari: ${formatMoney(totalExpenses)} so'm.`,
      `• Sof qoldiq: ${formatMoney(totalCollected - totalExpenses)} so'm.`,
      `• Qarzdor o'quvchilar soni: ${debtors.length} nafar, umumiy kutilayotgan qarzdorlik summasi: ${formatMoney(totalDebt)} so'm.`,
    ];

    if (debtors.length > 0) {
      const sample = debtors[0];
      lines.push(
        `• Qarzdorlarga yuborish uchun eslatma namunasi: "Hurmatli ${sample.firstName} ${sample.lastName}, '${centerName}' o'quv markazidagi oylik o'qish to'lovingiz muddati kelganligini eslatib o'tamiz. Darslarning uzluksiz davom etishi uchun to'lovni tez fursatda amalga oshirishingizni so'raymiz."`
      );
    }

    return lines.join('\n');
  }

  // 5. teacher_load
  if (taskType === 'teacher_load') {
    if (teachers.length === 0) return "Tahlil uchun ustozlar ma'lumoti mavjud emas.";

    const teacherLoads: { name: string; groupsCount: number; studentsCount: number }[] = [];

    teachers.forEach((t: any) => {
      const teacherGroups = groups.filter((g: any) => g.teacherId === t.id || g.teacher?.id === t.id);
      const studentCount = teacherGroups.reduce(
        (sum: number, g: any) => sum + (g.studentGroups?.length || 0),
        0
      );
      teacherLoads.push({
        name: t.name,
        groupsCount: teacherGroups.length,
        studentsCount: studentCount,
      });
    });

    teacherLoads.sort((a, b) => b.studentsCount - a.studentsCount);

    const lines = [`O'qituvchilar dars va o'quvchilar yuklamasi tahlili:`];
    teacherLoads.forEach((t) => {
      lines.push(`• ${t.name}: ${t.groupsCount} ta guruh, jami ${t.studentsCount} nafar o'quvchi.`);
    });

    if (teacherLoads.length > 1) {
      const maxT = teacherLoads[0];
      const minT = teacherLoads[teacherLoads.length - 1];
      if (maxT.groupsCount >= minT.groupsCount + 2) {
        lines.push(
          `• Tavsiya: ${maxT.name} yuklamasi yuqori (${maxT.groupsCount} ta guruh), ${minT.name} esa kam yuklamaga ega (${minT.groupsCount} ta guruh). Yangi ochiladigan guruhlarni ${minT.name}ga biriktirish tavsiya etiladi.`
        );
      } else {
        lines.push(`• Tavsiya: O'qituvchilar o'rtasida guruhlar taqsimoti nisbatan mutanosib.`);
      }
    }

    return lines.join('\n');
  }

  // 6. chat_qa
  if (taskType === 'chat_qa') {
    const q = (userQuestion || '').toLowerCase();

    if (!q) {
      return "Savolingizni bering. Masalan: 'Qarzdorlik qancha?', 'Nechta o'quvchi bor?', 'Davomat qanday?'.";
    }

    if (q.includes('o\'quvchi') || q.includes('talaba') || q.includes('soni') || q.includes('nechta')) {
      return `"${centerName}" o'quv markazida jami ${totalStudents} nafar o'quvchi ro'yxatga olingan, shulardan ${activeStudents} nafari hozirda faol guruhlarda ta'lim olmoqda.`;
    }

    if (q.includes('qarz') || q.includes('to\'lov') || q.includes('tushum') || q.includes('pul') || q.includes('moliya')) {
      return `Moliyaviy holat: Jami to'langan mablag' ${formatMoney(totalCollected)} so'm, mavjud qarzdorlik ${formatMoney(totalDebt)} so'm, xarajatlar ${formatMoney(totalExpenses)} so'm.`;
    }

    if (q.includes('davomat') || q.includes('keldi') || q.includes('kelmadi')) {
      return `Markazdagi umumiy davomat ko'rsatkichi ${attendanceRate}% ni tashkil qiladi. Jami qayd etilgan davomatlar soni ${totalAtt} ta.`;
    }

    if (q.includes('ustoz') || q.includes('o\'qituvchi') || q.includes('muallim')) {
      return `Markazda jami ${totalTeachers} nafar ustoz faoliyat yuritmoqda va ular ${totalGroups} ta guruhga dars bermoqda.`;
    }

    if (q.includes('guruh')) {
      return `Markazda jami ${totalGroups} ta guruh mavjud. Har bir guruhda o'rtacha ${totalGroups > 0 ? Math.round(totalStudents / totalGroups) : 0} nafardan o'quvchi bor.`;
    }

    return `Ushbu savol bo'yicha markaz ma'lumotlar bazasida: ${totalStudents} ta o'quvchi, ${totalGroups} ta guruh, ${totalTeachers} ta ustoz, ${attendanceRate}% davomat va ${formatMoney(totalCollected)} so'm tushum mavjud. Qo'shimcha aniq savol bersangiz batafsil javob beraman.`;
  }

  return "Vazifa turi bo'yicha tahlil tayyorlandi.";
}

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }

    const body = await req.json();
    const {
      task_type = 'dashboard_summary',
      date_range = 'Oxirgi 30 kun',
      user_question = '',
      gemini_api_key = '',
    } = body;

    const supabase = createServerSupabaseClient();

    // 1. Fetch live center data from database
    const [
      { data: center },
      { data: groups },
      { data: students },
      { data: payments },
      { data: attendances },
      { data: teachers },
      { data: expenses },
    ] = await Promise.all([
      supabase.from('centers').select('*').eq('id', authUser.centerId).maybeSingle(),
      supabase.from('groups').select('id, name, startTime, endTime, days, teacherId, course:courses(name, price), teacher:teachers(id, name), studentGroups:student_groups(id, studentId)').eq('centerId', authUser.centerId),
      supabase.from('students').select('id, firstName, lastName, phone, status, paymentStatus, createdAt, studentGroups:student_groups(groupId)').eq('centerId', authUser.centerId),
      supabase.from('payments').select('id, amount, status, paymentDate, studentId, groupId, student:students(firstName, lastName), group:groups(name)').eq('centerId', authUser.centerId),
      supabase.from('attendances').select('id, status, date, studentId, groupId').eq('centerId', authUser.centerId),
      supabase.from('teachers').select('id, name, phone, status').eq('centerId', authUser.centerId),
      supabase.from('expenses').select('id, amount, type, status, createdAt').eq('centerId', authUser.centerId),
    ]);

    const centerName = center?.name || authUser.centerName || 'Markaz';

    const rawData = {
      students: students || [],
      groups: groups || [],
      teachers: teachers || [],
      payments: payments || [],
      attendances: attendances || [],
      expenses: expenses || [],
    };

    // 2. Prepare structured data payload for LLM
    const summarizedDataPayload = {
      center: centerName,
      totalStudents: (students || []).length,
      activeStudents: (students || []).filter((s: any) => s.status === 'FAOL').length,
      studentsList: (students || []).slice(0, 25).map((s: any) => ({
        name: `${s.firstName} ${s.lastName}`,
        status: s.status,
        paymentStatus: s.paymentStatus,
      })),
      groupsList: (groups || []).map((g: any) => ({
        name: g.name,
        teacher: g.teacher?.name || 'Biriktirilmagan',
        course: g.course?.name,
        studentsCount: g.studentGroups?.length || 0,
      })),
      teachersList: (teachers || []).map((t: any) => ({
        name: t.name,
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
          .replace('{{date_range}}', date_range)
          .replace('{{data}}', JSON.stringify(summarizedDataPayload, null, 2))
          .replace('{{user_question}}', user_question || '');

        const modelsToTry = Array.from(
          new Set(
            [
              process.env.GEMINI_MODEL,
              'gemini-3.8-flash',
              'gemini-pro-latest',
              'gemini-flash-latest',
              'gemini-2.5-flash',
              'gemini-1.5-pro',
              'gemini-1.5-flash',
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
                    temperature: 0.2,
                    maxOutputTokens: 1024,
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
      user_question
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
