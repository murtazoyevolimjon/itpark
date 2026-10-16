import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { getSuperAdminAuth } from '@/lib/superadminAuth';

const SYSTEM_PROMPT_TEMPLATE = `SEN — "MARKAZ CRM AI YORDAMCHISI". Sen o'quv markazlari (IT-markaz, til markazi, repetitorlik markazi) uchun CRM tizimida ishlaydigan aqlli, professional analitik yordamchisan.

## ROLING
- Markaz administratori, direktori, bosh dasturchisi, o'qituvchisi yoki o'quvchisi uchun xolis, aniq, tushunarli va foydali maslahatchisan.
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
Agar foydalanuvchi DASTURCHI (SUPERADMIN) bo'lsa, butun CRM platformasi bo'yicha markazlar soni, jami talabalar va tizim barqarorligini umumlashtir.
Agar foydalanuvchi o'qituvchi bo'lsa, avvalo uning o'ziga biriktirilgan guruhlari va o'quvchilari holatini ham alohida ko'rsat.
Chiqish: 3–5 gapdan iborat kunlik/oylik holat xulosasi + eng muhim 1–2 ta amaliy tavsiya.

### 2. student_analysis — O'quvchilar tahlili
{{data}} ichidagi o'quvchilar ro'yxati (davomat, guruh, holati).
Chiqish: o'quvchilar profili, faolligi, qarzdorlik yoki to'xtatish xavfi bor o'quvchilar bo'yicha aniq xulosa va tavsiya.

### 3. attendance_analysis — Davomat tahlili
Dars qoldirgan (kelmagan) o'quvchilar ro'yxati va umumiy davomat darajasi.
Chiqish: Dars qoldirgan o'quvchilarni jadval ko'rinishida (№ | O'quvchi F.I.Sh | Guruhi | Ustozi | Qoldirgan | Oxirgi dars | Ota-onasining telefoni) ko'rsat va ota-onalar bilan bog'lanish bo'yicha amaliy tavsiya ber.

### 4. finance_analysis — Moliyaviy tahlil
Tushumlar, qarzdorlik va xarajatlar holati.
Chiqish: Qarzdor o'quvchilar ro'yxati (jadval) + moliyaviy muvozanat xulosasi + qarzdorlarga yuborish uchun xushmuomala, lekin jiddiy SMS/xabar matni namunasi.

### 5. teacher_load — Ustozlar va guruhlar yuklamasi
O'qituvchilar bo'yicha guruhlar va talabalar taqsimoti.
Chiqish: yuklama balansi va guruhlarni to'g'ri taqsimlash bo'yicha tavsiya.

### 6. chat_qa — Erkin savol-javob (XOHLAGAN MAVZUDA)
Foydalanuvchi savoli: "{{user_question}}"
QOIDALAR:
A) Agar savol davomat yoki dars qoldirgan o'quvchilar haqida bo'lsa (masalan "Davomat bo'yicha kimlarda muammo bor?"):
   Dars qoldirgan o'quvchilarni aniq jadval ko'rinishida (№ | O'quvchi F.I.Sh | Guruhi | Ustozi | Dars sanasi / Holat | Ota-onasining telefoni) chiqarib ber.
B) Agar savol bugungi umumiy holat haqida bo'lsa (masalan "Bugungi umumiy holat qanday?"):
   Markazning bugungi rejalashtirilgan darslari (guruhi, vaqti, ustozi, xonasi), bugun darsga qatnashgan va qoldirgan o'quvchilar soni, umumiy statistika va moliyaviy holatni to'liq bayon et.
C) Agar foydalanuvchi o'quvchi (STUDENT) bo'lsa va dars mavzusi, dasturlash yoki vazifa bo'yicha savol bersa:
   O'quvchiga yoqimli, samimiy AI Repetitor sifatida oddiy va amaliy kodlar orqali tushuntir.
D) Agar foydalanuvchi dasturchi bo'lsa:
   Texnik, arxitektura va platforma boshqaruvi bo'yicha professional maslahat ber.
E) Boshqa har qanday savolga:
   Faqat shu markaz ma'lumotlari asosida juda bilimdon, samimiy va keng qamrovli tarzda to'liq o'zbek tilida javob ber.

## CHIQISH FORMATI
Oddiy matn ko'rinishida javob ber (CRM interfeysida chiroyli ko'rsatilishi uchun keraksiz murakkab Markdown belgilarisiz). Muhim fikrlarni yangi qatordan "•" bilan ajrat.`;

function formatMoney(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function getParentPhoneDisplay(st: any): string {
  if (!st) return 'Kiritilmagan';
  const parts: string[] = [];
  if (st.fatherPhone) parts.push(`Otasi: ${st.fatherPhone}`);
  if (st.motherPhone) parts.push(`Onasi: ${st.motherPhone}`);
  if (parts.length > 0) return parts.join(', ');
  if (st.phone) return `Talaba: ${st.phone}`;
  return 'Kiritilmagan';
}

function generateAttendanceIssuesAnalysis(
  centerName: string,
  attendances: any[],
  studentsMap: Map<string, any>,
  groupsMap: Map<string, any>,
  teachersMap: Map<string, string>,
  todayTashkentIso: string,
  totalAtt: number,
  attendanceRate: number
): string {
  const absentRecords = attendances.filter((a: any) => a.status === 'KELMAGAN');
  const todayAbsent = absentRecords.filter((a: any) => a.date && a.date.startsWith(todayTashkentIso));

  if (absentRecords.length === 0) {
    return `"${centerName}" o'quv markazida hozircha dars qoldirgan (kelmagan) o'quvchilar ro'yxatga olinmagan. Umumiy davomat 100% ijobiy ko'rsatkichda!`;
  }

  // Count absent frequency per student
  const studentAbsenceCount: Record<
    string,
    { count: number; student: any; lastDate: string; groupName: string; teacherName: string; note: string }
  > = {};

  absentRecords.forEach((att: any) => {
    const stId = att.studentId;
    const st = studentsMap.get(stId);
    const gr = groupsMap.get(att.groupId);
    const teacherName = gr?.teacherId ? teachersMap.get(gr.teacherId) || 'Ustoz' : 'Ustoz';
    const dateStr = att.date ? att.date.split('T')[0] : todayTashkentIso;

    if (!studentAbsenceCount[stId]) {
      studentAbsenceCount[stId] = {
        count: 0,
        student: st,
        lastDate: dateStr,
        groupName: gr?.name || 'Guruh',
        teacherName,
        note: att.note || '',
      };
    }
    studentAbsenceCount[stId].count += 1;
    if (dateStr >= studentAbsenceCount[stId].lastDate) {
      studentAbsenceCount[stId].lastDate = dateStr;
      if (att.note) studentAbsenceCount[stId].note = att.note;
    }
  });

  const sortedAbsentees = Object.values(studentAbsenceCount).sort((a, b) => b.count - a.count);

  const lines: string[] = [];
  lines.push(`📋 "${centerName}" — DAVOMAT BO'YICHA DARS QOLDIRGAN (KELMAGAN) O'QUVCHILAR RO'YXATI:`);
  lines.push('');
  lines.push(`№  | O'quvchi F.I.Sh               | Guruhi               | Ustozi           | Qoldirgan | Oxirgi dars | Ota-onasining telefoni`);
  lines.push(`---+-------------------------------+----------------------+------------------+-----------+-------------+--------------------------------`);

  sortedAbsentees.slice(0, 20).forEach((item, index) => {
    const st = item.student;
    const fullName = st ? `${st.firstName || ''} ${st.lastName || ''}`.trim() : 'Noma\'lum o\'quvchi';
    const parentPhone = getParentPhoneDisplay(st);

    const padNum = String(index + 1).padEnd(2, ' ');
    const padName = (fullName.length > 29 ? fullName.slice(0, 26) + '...' : fullName).padEnd(29, ' ');
    const padGroup = (item.groupName.length > 20 ? item.groupName.slice(0, 17) + '...' : item.groupName).padEnd(20, ' ');
    const padTeacher = (item.teacherName.length > 16 ? item.teacherName.slice(0, 13) + '...' : item.teacherName).padEnd(16, ' ');
    const padCount = `${item.count} marta`.padEnd(9, ' ');
    const padDate = item.lastDate.padEnd(11, ' ');

    lines.push(`${padNum} | ${padName} | ${padGroup} | ${padTeacher} | ${padCount} | ${padDate} | ${parentPhone}`);
  });

  lines.push(`---+-------------------------------+----------------------+------------------+-----------+-------------+--------------------------------`);
  lines.push('');
  lines.push(`• Dars qoldirgan o'quvchilar soni: ${sortedAbsentees.length} nafar.`);
  lines.push(`• Jami qoldirilgan darslar soni: ${absentRecords.length} ta.`);
  if (todayAbsent.length > 0) {
    lines.push(`• Bugun (${todayTashkentIso}) darsga kelmaganlar: ${todayAbsent.length} nafar.`);
  }
  lines.push(`• Markaz bo'yicha umumiy davomat darajasi: ${attendanceRate}%.`);
  lines.push(`• Tavsiya: Dars qoldirgan o'quvchilarning ota-onalari bilan zudlik bilan bog'lanib, qatnashmaslik sabablarini surishtirish va nazoratga olish zarur.`);

  return lines.join('\n');
}

function generateTodayStatusAnalysis(
  centerName: string,
  todayGroups: any[],
  todayAttendances: any[],
  totalStudents: number,
  activeStudents: number,
  totalGroups: number,
  totalTeachers: number,
  attendanceRate: number,
  totalCollected: number,
  totalDebt: number,
  todayTashkentIso: string,
  todayDayNameUz: string,
  teachersMap: Map<string, string>,
  roomsMap: Map<string, string>,
  groupStudentCounts: Record<string, number>,
  studentsMap: Map<string, any>
): string {
  const lines: string[] = [];

  lines.push(`🏛️ "${centerName}" O'QUV MARKAZINING BUGUNGI HOLATI (${todayTashkentIso}, ${todayDayNameUz}):`);
  lines.push('');

  // 1. Bugungi darslar
  lines.push(`1. 📅 BUGUNGI REJALASHTIRILGAN DARSLAR VA GURUHLAR (${todayGroups.length} ta):`);
  if (todayGroups.length === 0) {
    lines.push(`   • Bugun haftaning ushbu kunida (${todayDayNameUz}) jadval bo'yicha guruhlar mavjud emas yoki dam olish kuni.`);
  } else {
    todayGroups.forEach((g: any, i: number) => {
      const tName = g.teacherId ? teachersMap.get(g.teacherId) || 'Ustoz' : 'Biriktirilmagan';
      const rName = g.roomId ? roomsMap.get(g.roomId) || 'Xona' : 'Xona';
      const count = groupStudentCounts[g.id] || 0;
      const timeStr = g.startTime
        ? `${g.startTime.slice(0, 5)} - ${g.endTime ? g.endTime.slice(0, 5) : '--:--'}`
        : 'Vaqt ko\'rsatilmagan';
      lines.push(`   ${i + 1}) "${g.name}"`);
      lines.push(`      ⏰ Vaqti: ${timeStr} | 👨‍🏫 Ustozi: ${tName} | 🚪 Xona: ${rName} | 👥 O'quvchilar: ${count} nafar`);
    });
  }
  lines.push('');

  // 2. Bugungi davomat
  const todayPresent = todayAttendances.filter((a: any) => a.status === 'KELGAN' || a.status === 'KECHIKKAN');
  const todayAbsent = todayAttendances.filter((a: any) => a.status === 'KELMAGAN');
  const todayLate = todayAttendances.filter((a: any) => a.status === 'KECHIKKAN');

  lines.push(`2. 📊 BUGUNGI DAVOMAT NATIJALARI:`);
  if (todayAttendances.length === 0) {
    lines.push(`   • Bugungi darslar bo'yicha davomat dars jadvali oralig'ida ustozlar tomonidan olinadi.`);
    lines.push(`   • Markaz bo'yicha umumiy akademik davomat ko'rsatkichi: ${attendanceRate}%.`);
  } else {
    lines.push(`   • Bugun darsga qatnashgan o'quvchilar: ${todayPresent.length} nafar`);
    lines.push(`   • Bugun dars qoldirganlar (kelmaganlar): ${todayAbsent.length} nafar`);
    if (todayLate.length > 0) {
      lines.push(`   • Kechikib kelganlar: ${todayLate.length} nafar`);
    }
    if (todayAbsent.length > 0) {
      lines.push(`   • Bugun kelmagan o'quvchilar:`);
      todayAbsent.slice(0, 8).forEach((att: any) => {
        const st = studentsMap.get(att.studentId);
        const stName = st ? `${st.firstName} ${st.lastName}` : 'O\'quvchi';
        const parentPhone = getParentPhoneDisplay(st);
        lines.push(`     - ${stName} (${parentPhone})`);
      });
    }
  }
  lines.push('');

  // 3. Markaz umumiy yuklamasi
  lines.push(`3. 👥 O'QUVCHILAR VA USTOZLAR STATISTIKASI:`);
  lines.push(`   • Jami o'quvchilar soni: ${totalStudents} nafar (shundan ${activeStudents} nafari faol ta'lim olmoqda).`);
  lines.push(`   • Faol guruhlar soni: ${totalGroups} ta, faoliyat yuritayotgan ustozlar soni: ${totalTeachers} nafar.`);
  lines.push('');

  // 4. Moliya
  lines.push(`4. 💰 MOLIYAVIY KO'RSATKICHLAR:`);
  lines.push(`   • Yig'ilgan to'lovlar: ${formatMoney(totalCollected)} so'm.`);
  lines.push(`   • Kutilayotgan qarzdorlik: ${formatMoney(totalDebt)} so'm.`);
  lines.push('');

  // 5. Tavsiya
  lines.push(`💡 TEZKOR TAVSIYA:`);
  if (todayAbsent.length > 0) {
    lines.push(`   • Bugun darsga kelmagan ${todayAbsent.length} nafar o'quvchining ota-onalari bilan bog'lanib sababini aniqlash zarur.`);
  } else if (todayGroups.length > 0 && todayAttendances.length === 0) {
    lines.push(`   • Bugun darsi bor ustozlar dars mavzusini to'liq kiritib, davomatni o'z vaqtida saqlashlarini ta'minlang.`);
  } else {
    lines.push(`   • Markaz faoliyati va dars jarayonlari belgilangan reja asosida namunali davom etmoqda.`);
  }

  return lines.join('\n');
}

function generateDebtorsAnalysis(
  centerName: string,
  payments: any[],
  studentsMap: Map<string, any>,
  groupsMap: Map<string, any>,
  totalDebt: number
): string {
  const unpaidPayments = payments.filter((p: any) => p.status === 'TOLANMAGAN' || p.status === 'QISMAN');

  if (unpaidPayments.length === 0 && totalDebt === 0) {
    return `"${centerName}" markazida to'lov bo'yicha qarzdorlik mavjud emas. Barcha to'lovlar to'liq qoplangan!`;
  }

  const lines: string[] = [];
  lines.push(`💰 "${centerName}" — TO'LOV QILMAGAN (QARZDOR) O'QUVCHILAR RO'YXATI:`);
  lines.push('');
  lines.push(`№  | O'quvchi F.I.Sh               | Guruhi               | Qarzdorlik       | Ota-onasining telefoni`);
  lines.push(`---+-------------------------------+----------------------+------------------+--------------------------------`);

  unpaidPayments.slice(0, 20).forEach((p: any, index: number) => {
    const st = studentsMap.get(p.studentId);
    const gr = groupsMap.get(p.groupId);
    const fullName = st ? `${st.firstName || ''} ${st.lastName || ''}`.trim() : 'Noma\'lum o\'quvchi';
    const groupName = gr?.name || 'Guruh';
    const amount = formatMoney(Number(p.amount) || 0) + ' so\'m';
    const parentPhone = getParentPhoneDisplay(st);

    const padNum = String(index + 1).padEnd(2, ' ');
    const padName = (fullName.length > 29 ? fullName.slice(0, 26) + '...' : fullName).padEnd(29, ' ');
    const padGroup = (groupName.length > 20 ? groupName.slice(0, 17) + '...' : groupName).padEnd(20, ' ');
    const padAmt = amount.padEnd(16, ' ');

    lines.push(`${padNum} | ${padName} | ${padGroup} | ${padAmt} | ${parentPhone}`);
  });

  lines.push(`---+-------------------------------+----------------------+------------------+--------------------------------`);
  lines.push('');
  lines.push(`• Jami mavjud qarzdorlik: ${formatMoney(totalDebt)} so'm (${unpaidPayments.length} ta holat).`);
  lines.push(`• Tavsiya etiladigan SMS eslatma matni:`);
  lines.push(`  "Assalomu alaykum, hurmatli ota-ona! Sizning ${centerName} o'quv markazimiz oldidagi o'qish to'lovingiz bo'yicha qarzdorligingiz mavjud. Farzandingiz darslardan to'xtab qolmasligi uchun to'lovni o'z vaqtida amalga oshirishingizni so'raymiz."`);

  return lines.join('\n');
}

function generateTeacherWorkloadAnalysis(
  centerName: string,
  teachers: any[],
  groups: any[],
  groupStudentCounts: Record<string, number>
): string {
  const lines: string[] = [];
  lines.push(`👨‍🏫 "${centerName}" — O'QITUVCHILAR YUKLAMASI VA GURUHLAR TAQSIMOTI:`);
  lines.push('');
  lines.push(`№  | Ustoz F.I.Sh                  | Guruhlar soni | O'quvchilar soni | Telefoni`);
  lines.push(`---+-------------------------------+---------------+------------------+-----------------`);

  const teacherStats = teachers
    .map((t: any) => {
      const tGroups = groups.filter((g: any) => g.teacherId === t.id);
      const tStudents = tGroups.reduce((sum: number, g: any) => sum + (groupStudentCounts[g.id] || 0), 0);
      return {
        teacher: t,
        name: `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Ustoz',
        groupsCount: tGroups.length,
        studentsCount: tStudents,
        phone: t.phone || 'Kiritilmagan',
        groupNames: tGroups.map((g: any) => g.name).join(', '),
      };
    })
    .sort((a, b) => b.studentsCount - a.studentsCount);

  teacherStats.forEach((ts, index) => {
    const padNum = String(index + 1).padEnd(2, ' ');
    const padName = (ts.name.length > 29 ? ts.name.slice(0, 26) + '...' : ts.name).padEnd(29, ' ');
    const padGr = `${ts.groupsCount} ta guruh`.padEnd(13, ' ');
    const padSt = `${ts.studentsCount} nafar`.padEnd(16, ' ');
    lines.push(`${padNum} | ${padName} | ${padGr} | ${padSt} | ${ts.phone}`);
  });

  lines.push(`---+-------------------------------+---------------+------------------+-----------------`);
  lines.push('');
  if (teacherStats.length > 0) {
    const topTeacher = teacherStats[0];
    lines.push(`• Eng ko'p o'quvchi biriktirilgan ustoz: ${topTeacher.name} (${topTeacher.groupsCount} ta guruh, ${topTeacher.studentsCount} nafar o'quvchi).`);
  }
  lines.push(`• Tavsiya: Guruhlarni ustozlar o'rtasida teng taqsimlash ta'lim sifatini oshiradi.`);

  return lines.join('\n');
}

// Built-in rule-based analytical engine (fallback)
function generateBuiltinAnalysis(
  taskType: string,
  centerName: string,
  dateRange: string,
  rawData: any,
  userQuestion?: string,
  callerRole?: string,
  teacherInfo?: { name: string; groupsCount: number; studentsCount: number },
  extraStats?: { centersCount?: number }
): string {
  const {
    students = [],
    groups = [],
    teachers = [],
    payments = [],
    attendances = [],
    expenses = [],
    studentGroups = [],
    courses = [],
    rooms = [],
    centers = [],
  } = rawData || {};

  const totalCenters = extraStats?.centersCount || centers.length || 1;
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

  // Lookup maps
  const studentsMap = new Map<string, any>();
  students.forEach((s: any) => studentsMap.set(s.id, s));

  const teachersMap = new Map<string, string>();
  teachers.forEach((t: any) => teachersMap.set(t.id, `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Ustoz'));

  const roomsMap = new Map<string, string>();
  rooms.forEach((r: any) => roomsMap.set(r.id, r.name || 'Xona'));

  const coursesMap = new Map<string, string>();
  courses.forEach((c: any) => coursesMap.set(c.id, c.name || 'Kurs'));

  const groupsMap = new Map<string, any>();
  groups.forEach((g: any) => groupsMap.set(g.id, g));

  // Tashkent Time & Day of Week calculation
  const now = new Date();
  const todayTashkentIso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(now);
  const nowTashkentDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  const dayCodeMap = ['YAK', 'DUSH', 'SESH', 'CHOR', 'PAY', 'JU', 'SHAN'];
  const todayDayCode = dayCodeMap[nowTashkentDate.getDay()];
  const dayNamesUz: Record<string, string> = {
    DUSH: 'Dushanba',
    SESH: 'Seshanba',
    CHOR: 'Chorshanba',
    PAY: 'Payshanba',
    JU: 'Juma',
    SHAN: 'Shanba',
    YAK: 'Yakshanba',
  };
  const todayDayNameUz = dayNamesUz[todayDayCode] || 'Bugun';

  // Today scheduled groups and attendances
  const todayGroups = groups.filter((g: any) => Array.isArray(g.days) && g.days.includes(todayDayCode));
  const todayAttendances = attendances.filter((a: any) => a.date && a.date.startsWith(todayTashkentIso));

  // 1. dashboard_summary
  if (taskType === 'dashboard_summary') {
    if (callerRole === 'SUPERADMIN') {
      const lines: string[] = [];
      lines.push(
        `Hurmatli Bosh Dasturchi! "Markaz CRM" platformasida hozirda jami ${totalCenters} ta markaz ro'yxatga olingan.`
      );
      lines.push(
        `Platforma bo'yicha jami o'quvchilar: ${totalStudents} nafar (${activeStudents} nafari faol ta'lim olmoqda).`
      );
      lines.push(
        `Jami o'qituvchilar soni: ${totalTeachers} nafar, faol guruhlar esa ${totalGroups} tani tashkil etadi.`
      );
      lines.push(
        `Umumiy moliyaviy aylanma: Yig'ilgan to'lovlar ${formatMoney(totalCollected)} so'm, kutilayotgan qarzdorlik ${formatMoney(totalDebt)} so'm.`
      );
      lines.push(`• Tizim barqaror va barcha markaz ma'lumotlar bazalari normal yuklama bilan ishlamoqda.`);
      lines.push(`• Tavsiya: Markazlar faolligini oshirish uchun yangi o'quv markazlarini jalb qilish va o'qituvchilar reytingini kengaytirish mumkin.`);
      return lines.join('\n');
    }

    if (callerRole === 'TEACHER' && teacherInfo) {
      const lines: string[] = [];
      lines.push(
        `Ustoz ${teacherInfo.name}, sizga biriktirilgan ${teacherInfo.groupsCount} ta guruh va jami ${teacherInfo.studentsCount} nafar o'quvchi mavjud.`
      );
      lines.push(
        `"${centerName}" markazida esa umumiy ${totalStudents} nafar o'quvchi (${activeStudents} nafari faol) va ${totalGroups} ta faol guruh faoliyat yuritmoqda.`
      );
      lines.push(`Bugun dars jadvalingiz bo'yicha guruhlaringiz davomatini dars vaqtida o'z vaqtida saqlashni unutmang.`);
      lines.push(`• Tavsiya: Har bir dars mavzusi va uyga vazifalarni tizimga o'z vaqtida yuklab boring, bu o'quvchilar reytingini oshiradi.`);
      return lines.join('\n');
    }

    return generateTodayStatusAnalysis(
      centerName,
      todayGroups,
      todayAttendances,
      totalStudents,
      activeStudents,
      totalGroups,
      totalTeachers,
      attendanceRate,
      totalCollected,
      totalDebt,
      todayTashkentIso,
      todayDayNameUz,
      teachersMap,
      roomsMap,
      groupStudentCounts,
      studentsMap
    );
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

    students.slice(0, 8).forEach((st: any) => {
      const parentPhone = getParentPhoneDisplay(st);
      lines.push(`• ${st.firstName} ${st.lastName}: Holati: ${st.status}, ${parentPhone}`);
    });

    return lines.join('\n');
  }

  // 3. attendance_analysis
  if (taskType === 'attendance_analysis') {
    return generateAttendanceIssuesAnalysis(
      centerName,
      attendances,
      studentsMap,
      groupsMap,
      teachersMap,
      todayTashkentIso,
      totalAtt,
      attendanceRate
    );
  }

  // 4. finance_analysis
  if (taskType === 'finance_analysis') {
    return generateDebtorsAnalysis(centerName, payments, studentsMap, groupsMap, totalDebt);
  }

  // 5. teacher_load
  if (taskType === 'teacher_load') {
    return generateTeacherWorkloadAnalysis(centerName, teachers, groups, groupStudentCounts);
  }

  // 6. chat_qa (Open Q&A on any topic)
  if (taskType === 'chat_qa') {
    const q = (userQuestion || '').trim();
    const qLower = q.toLowerCase();

    if (!q) {
      return `"${centerName}" AI yordamchisiman. Markazingiz bugungi holati, davomat, qarzdorlar, ustozlar yoki guruhlar bo'yicha savolingizni bering!`;
    }

    // 1. Attendance issues / absent students (Question 4 requested specifically)
    if (
      qLower.includes('davomat') ||
      qLower.includes('kelmagan') ||
      qLower.includes('kelmadi') ||
      qLower.includes('qoldirgan') ||
      qLower.includes('dars qoldirgan') ||
      qLower.includes('muammo bor') ||
      qLower.includes('muammosi') ||
      qLower.includes('qatnashmagan')
    ) {
      return generateAttendanceIssuesAnalysis(
        centerName,
        attendances,
        studentsMap,
        groupsMap,
        teachersMap,
        todayTashkentIso,
        totalAtt,
        attendanceRate
      );
    }

    // 2. Today's general status (Question 3 requested specifically)
    if (
      qLower.includes('bugun') ||
      qLower.includes('umumiy holat') ||
      qLower.includes('markaz holati') ||
      qLower.includes('holat qanday') ||
      qLower.includes('nima gap') ||
      qLower.includes('kunlik') ||
      qLower.includes('boshqaruv')
    ) {
      return generateTodayStatusAnalysis(
        centerName,
        todayGroups,
        todayAttendances,
        totalStudents,
        activeStudents,
        totalGroups,
        totalTeachers,
        attendanceRate,
        totalCollected,
        totalDebt,
        todayTashkentIso,
        todayDayNameUz,
        teachersMap,
        roomsMap,
        groupStudentCounts,
        studentsMap
      );
    }

    // 3. Debts / unpaid students
    if (
      qLower.includes('to\'lov') ||
      qLower.includes('tolov') ||
      qLower.includes('qarz') ||
      qLower.includes('qarzdor') ||
      qLower.includes('pul') ||
      qLower.includes('kassa')
    ) {
      return generateDebtorsAnalysis(centerName, payments, studentsMap, groupsMap, totalDebt);
    }

    // 4. Teachers' load
    if (
      qLower.includes('ustoz') ||
      qLower.includes('o\'qituvchi') ||
      qLower.includes('muallim') ||
      qLower.includes('yuk') ||
      qLower.includes('eng ko\'p') ||
      qLower.includes('dars soati')
    ) {
      return generateTeacherWorkloadAnalysis(centerName, teachers, groups, groupStudentCounts);
    }

    // 5. Groups info
    if (qLower.includes('guruh')) {
      const gLines: string[] = [
        `🏫 "${centerName}" markazida jami ${totalGroups} ta faol guruh mavjud:`,
        '',
      ];
      groups.forEach((g: any, i: number) => {
        const tName = g.teacherId ? teachersMap.get(g.teacherId) || 'Ustoz' : 'Biriktirilmagan';
        const rName = g.roomId ? roomsMap.get(g.roomId) || 'Xona' : 'Xona';
        const count = groupStudentCounts[g.id] || 0;
        const timeStr = g.startTime
          ? `${g.startTime.slice(0, 5)} - ${g.endTime ? g.endTime.slice(0, 5) : '--:--'}`
          : '--:--';
        gLines.push(`${i + 1}. "${g.name}"`);
        gLines.push(`   ⏰ Vaqti: ${timeStr} | 👨‍🏫 Ustoz: ${tName} | 🚪 Xona: ${rName} | 👥 O'quvchilar: ${count} ta`);
      });
      return gLines.join('\n');
    }

    // 6. Students info
    if (qLower.includes('o\'quvchi') || qLower.includes('talaba') || qLower.includes('nechta')) {
      return `"${centerName}" markazida jami ${totalStudents} nafar o'quvchi ro'yxatga olingan (${activeStudents} nafari faol ta'lim olmoqda). Guruhlar soni esa ${totalGroups} tani tashkil etadi.`;
    }

    // 7. Student coding / tutor questions
    if (
      callerRole === 'STUDENT' ||
      qLower.includes('mavzu') ||
      qLower.includes('tushuntir') ||
      qLower.includes('kod') ||
      qLower.includes('xato')
    ) {
      if (qLower.includes('xato') || qLower.includes('error')) {
        return `Koddagi xatolikni bartaraf etish bosqichlari:\n1. Brauzerda F12 tugmasini bosib Console dagi qizil xatolik matnini o'qing.\n2. O'zgaruvchilar va komponent nomlarining to'g'ri yozilganini (harf kattaligi sezgir) tekshiring.\n3. Qavslar va import yo'llarini tekshiring.\n\nKodingiz qismini yuborsangiz, xatoni birgalikda tuzatamiz! 👍`;
      }
      return `Dasturlash bo'yicha tavsiya:\nHar qanday murakkab masalani kichik bo'laklarga ajrating. Nazariyani o'qib, uni amaliy kodda sinab ko'ring. Savolingiz bo'yicha aniq kod yozishingiz mumkin, tahlil qilib beraman!`;
    }

    // 8. Greetings
    if (qLower.match(/^(salom|assalom|qalesiz|qandaysiz|qalaysan|privet|hello|hi)/i)) {
      return `Assalomu alaykum! Men "${centerName}" o'quv markazining AI yordamchisiman. Sizga markazdagi darslar, bugungi davomat, qarzdorlik yoki ustozlar yuklamasi bo'yicha yordam berishga tayyorman.`;
    }

    // 9. Intelligent fallback for other center questions
    return generateTodayStatusAnalysis(
      centerName,
      todayGroups,
      todayAttendances,
      totalStudents,
      activeStudents,
      totalGroups,
      totalTeachers,
      attendanceRate,
      totalCollected,
      totalDebt,
      todayTashkentIso,
      todayDayNameUz,
      teachersMap,
      roomsMap,
      groupStudentCounts,
      studentsMap
    );
  }

  return "Tahlil xulosasi tayyorlandi.";
}

export async function POST(req: NextRequest) {
  try {
    const superAdmin = getSuperAdminAuth(req);
    const authUser = getAuthUser(req);

    if (!superAdmin && (!authUser || !authUser.centerId)) {
      return NextResponse.json({ message: "Avtorizatsiyadan o'tilmagan yoki markaz aniqlanmadi" }, { status: 401 });
    }

    const isSuperAdmin = !!superAdmin;
    const effectiveRole = isSuperAdmin ? 'SUPERADMIN' : (authUser?.role || 'ADMIN');
    const effectiveCenterId = authUser?.centerId;

    const body = await req.json().catch(() => ({}));
    const {
      task_type = 'dashboard_summary',
      date_range = 'Oxirgi 30 kun',
      user_question = '',
      prompt = '',
      gemini_api_key = '',
    } = body;

    const effectiveQuestion = user_question || prompt || '';

    const supabase = createServerSupabaseClient();

    let centerName = 'O\'quv Markazi';
    let students: any[] = [];
    let groups: any[] = [];
    let teachers: any[] = [];
    let payments: any[] = [];
    let attendances: any[] = [];
    let expenses: any[] = [];
    let courses: any[] = [];
    let rooms: any[] = [];
    let studentGroups: any[] = [];
    let centersCount = 1;

    if (isSuperAdmin) {
      centerName = 'Barcha Markazlar (CRM Platformasi)';
      const [
        { data: allCenters },
        { data: allGroups },
        { data: allStudents },
        { data: allTeachers },
        { data: allPayments },
        { data: allExpenses },
        { data: allCourses },
        { data: allRooms },
        { data: allAttendances },
        { data: allStudentGroups },
      ] = await Promise.all([
        supabase.from('centers').select('id, name, status, createdAt'),
        supabase.from('groups').select('id, name, startTime, endTime, days, teacherId, courseId, roomId, status, centerId'),
        supabase.from('students').select('id, firstName, lastName, phone, fatherPhone, motherPhone, status, centerId'),
        supabase.from('teachers').select('id, firstName, lastName, phone, status, centerId'),
        supabase.from('payments').select('id, amount, status, centerId'),
        supabase.from('expenses').select('id, amount, status, centerId'),
        supabase.from('courses').select('id, name, price, centerId'),
        supabase.from('rooms').select('id, name, centerId'),
        supabase.from('attendances').select('id, status, date, studentId, groupId, note, centerId').order('date', { ascending: false }),
        supabase.from('student_groups').select('id, studentId, groupId, centerId'),
      ]);

      centersCount = (allCenters || []).length;
      students = allStudents || [];
      groups = allGroups || [];
      teachers = allTeachers || [];
      payments = allPayments || [];
      expenses = allExpenses || [];
      courses = allCourses || [];
      rooms = allRooms || [];
      attendances = allAttendances || [];
      studentGroups = allStudentGroups || [];
    } else {
      // 1. Strict multi-tenant data fetching (ONLY for authUser.centerId!)
      const [
        { data: center },
        { data: cGroups },
        { data: cStudents },
        { data: cStudentGroups },
        { data: cPayments },
        { data: cAttendances },
        { data: cTeachers },
        { data: cExpenses },
        { data: cCourses },
        { data: cRooms },
      ] = await Promise.all([
        supabase.from('centers').select('id, name').eq('id', effectiveCenterId).maybeSingle(),
        supabase.from('groups').select('id, name, startTime, endTime, days, teacherId, courseId, roomId, status').eq('centerId', effectiveCenterId),
        supabase.from('students').select('id, firstName, lastName, phone, fatherPhone, motherPhone, status, createdAt').eq('centerId', effectiveCenterId),
        supabase.from('student_groups').select('id, studentId, groupId').eq('centerId', effectiveCenterId),
        supabase.from('payments').select('id, amount, status, paymentDate, studentId, groupId').eq('centerId', effectiveCenterId),
        supabase.from('attendances').select('id, status, date, studentId, groupId, note').eq('centerId', effectiveCenterId).order('date', { ascending: false }),
        supabase.from('teachers').select('id, firstName, lastName, phone, status').eq('centerId', effectiveCenterId),
        supabase.from('expenses').select('id, amount, type, status, createdAt').eq('centerId', effectiveCenterId),
        supabase.from('courses').select('id, name, price').eq('centerId', effectiveCenterId),
        supabase.from('rooms').select('id, name').eq('centerId', effectiveCenterId),
      ]);

      centerName = center?.name || 'O\'quv Markazi';
      students = cStudents || [];
      groups = cGroups || [];
      teachers = cTeachers || [];
      payments = cPayments || [];
      attendances = cAttendances || [];
      expenses = cExpenses || [];
      courses = cCourses || [];
      rooms = cRooms || [];
      studentGroups = cStudentGroups || [];
    }

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
    if (effectiveRole === 'TEACHER' && authUser) {
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
      courses: courses || [],
      rooms: rooms || [],
    };

    // 2. Structured payload for Gemini AI
    const summarizedDataPayload = {
      center: centerName,
      userRole: effectiveRole,
      teacherSpecific: teacherInfo || null,
      totalCenters: centersCount,
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
          .replace('{{user_role}}', effectiveRole)
          .replace('{{date_range}}', date_range)
          .replace('{{data}}', JSON.stringify(summarizedDataPayload, null, 2))
          .replace('{{user_question}}', effectiveQuestion);

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
      effectiveQuestion,
      effectiveRole,
      teacherInfo,
      { centersCount }
    );

    return NextResponse.json({
      success: true,
      result: result || 'Tahlil yakunlandi.',
      source: 'builtin_engine',
      task_type,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Serverda xatolik yuz berdi' }, { status: 500 });
  }
}
