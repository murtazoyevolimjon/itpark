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
Markazning to'liq moliyaviy balansi, qarzdorliklar, xarajatlar va o'qituvchilar oyliklari hisoboti.
CHIQISH FORMATI (5 ta asosiy bo'limdan iborat bo'lishi shart):
1. 💵 ASOSIY MOLIYAVIY KO'RSATKICHLAR (Tushumlar, Jami xarajatlar, Sof foyda, Kutilayotgan qarzdorlik va o'qituvchilar oyliklari)
2. 📋 QARZDOR O'QUVCHILAR RO'YXATI (Jadval: № | O'quvchi F.I.Sh | Guruhi | Kurs narxi | To'langan | Qarzdorlik | Ota-onasining telefoni) + Qarzdorlarga SMS eslatma matni
3. 🏢 MARKAZ NIMAGA XARAJAT QILISHI (Xarajatlar tahlili: Ijara, Kommunal, Reklama, Jihozlar, Ustoz maoshi, Boshqa toifalar summasi va oxirgi chiqimlar jadvali)
4. 👨‍🏫 O'QITUVCHILARGA TO'LANGAN OYLIKLAR (Ustozlar maosh stavkalari, to'langan oyliklar jadvali va jami berilgan maoshlar)
5. 💡 TEZKOR MOLIYAVIY TAVSIYALAR VA BOSHQARUV XULOSASI.

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
  studentsMap: Map<string, any>,
  totalExpenses?: number,
  totalTeacherSalaries?: number,
  debtorsCount?: number
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
  lines.push(`   • Yig'ilgan to'lovlar (Tushum): ${formatMoney(totalCollected)} so'm.`);
  if (totalExpenses !== undefined) {
    lines.push(`   • Markaz jami xarajatlari: ${formatMoney(totalExpenses)} so'm.`);
    const balance = totalCollected - totalExpenses;
    lines.push(`   • Sof kassa balansi: ${formatMoney(balance)} so'm.`);
  }
  const debtorsStr = debtorsCount !== undefined ? ` (${debtorsCount} nafar talaba)` : '';
  lines.push(`   • Kutilayotgan qarzdorlik: ${formatMoney(totalDebt)} so'm${debtorsStr}.`);
  if (totalTeacherSalaries !== undefined && totalTeacherSalaries > 0) {
    lines.push(`   • O'qituvchilarga to'langan oyliklar: ${formatMoney(totalTeacherSalaries)} so'm.`);
  }
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

function generateFinanceAnalysis(
  centerName: string,
  students: any[],
  groups: any[],
  courses: any[],
  studentGroups: any[],
  payments: any[],
  expenses: any[],
  teachers: any[],
  options?: { onlyDebtors?: boolean; onlyExpenses?: boolean; onlySalaries?: boolean }
): string {
  const studentsMap = new Map<string, any>();
  students.forEach((s: any) => studentsMap.set(s.id, s));

  const groupsMap = new Map<string, any>();
  groups.forEach((g: any) => groupsMap.set(g.id, g));

  const coursesMap = new Map<string, any>();
  courses.forEach((c: any) => coursesMap.set(c.id, c));

  const teachersMap = new Map<string, any>();
  teachers.forEach((t: any) => teachersMap.set(t.id, t));

  // Map student groups
  const studentGroupsMap = new Map<string, any[]>();
  studentGroups.forEach((sg: any) => {
    const list = studentGroupsMap.get(sg.studentId) || [];
    list.push(sg);
    studentGroupsMap.set(sg.studentId, list);
  });

  // 1. Calculate Debtors
  interface DebtorItem {
    studentId: string;
    fullName: string;
    groupNames: string;
    coursePrice: number;
    totalPaid: number;
    debtAmount: number;
    parentPhone: string;
    paymentStatus: string;
  }

  const debtorsList: DebtorItem[] = [];
  const processedStudentIds = new Set<string>();

  students.forEach((st: any) => {
    const sgs = studentGroupsMap.get(st.id) || [];
    const activeGroups = sgs.map((sg: any) => groupsMap.get(sg.groupId)).filter(Boolean);

    const stPayments = payments.filter((p: any) => p.studentId === st.id);
    const totalPaid = stPayments
      .filter((p: any) => p.status === 'TOLANGAN' || p.status === 'QISMAN')
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

    let totalDue = 0;
    const gNames: string[] = [];
    activeGroups.forEach((g: any) => {
      gNames.push(g.name || 'Guruh');
      const course = coursesMap.get(g.courseId);
      if (course && Number(course.price)) {
        totalDue += Number(course.price);
      }
    });

    const debt = Math.max(0, totalDue - totalPaid);
    const hasPaidFull = stPayments.some((p: any) => p.status === 'TOLANGAN');
    const hasPartial = totalPaid > 0 && debt > 0;
    const paymentStatus =
      (totalPaid >= totalDue && totalDue > 0) || hasPaidFull
        ? 'TOLANGAN'
        : hasPartial
        ? 'QISMAN'
        : 'TOLANMAGAN';

    if (debt > 0 && totalDue > 0) {
      processedStudentIds.add(st.id);
      debtorsList.push({
        studentId: st.id,
        fullName: `${st.firstName || ''} ${st.lastName || ''}`.trim() || "Noma'lum o'quvchi",
        groupNames: gNames.join(', ') || 'Guruh',
        coursePrice: totalDue,
        totalPaid,
        debtAmount: debt,
        parentPhone: getParentPhoneDisplay(st),
        paymentStatus,
      });
    }
  });

  // Explicit unpaid payment records in payments table
  payments.forEach((p: any) => {
    if ((p.status === 'TOLANMAGAN' || p.status === 'QISMAN') && p.studentId && !processedStudentIds.has(p.studentId)) {
      const st = studentsMap.get(p.studentId);
      const gr = groupsMap.get(p.groupId);
      const debt = Number(p.amount) || 0;
      if (debt > 0) {
        processedStudentIds.add(p.studentId);
        debtorsList.push({
          studentId: p.studentId,
          fullName: st ? `${st.firstName || ''} ${st.lastName || ''}`.trim() : "Noma'lum o'quvchi",
          groupNames: gr?.name || 'Guruh',
          coursePrice: debt,
          totalPaid: 0,
          debtAmount: debt,
          parentPhone: getParentPhoneDisplay(st),
          paymentStatus: p.status,
        });
      }
    }
  });

  debtorsList.sort((a, b) => b.debtAmount - a.debtAmount);
  const totalDebt = debtorsList.reduce((sum, d) => sum + d.debtAmount, 0);

  const totalCollected = payments
    .filter((p: any) => p.status === 'TOLANGAN' || p.status === 'QISMAN')
    .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

  // 2. Expenses breakdown
  const paidExpenses = expenses.filter((e: any) => e.status !== 'BEKOR_QILINDI');
  const totalExpenses = paidExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

  const categoryTotals: Record<string, { total: number; count: number; title: string }> = {
    IJARA: { total: 0, count: 0, title: '🏢 Bino va xona ijarasi' },
    KOMMUNAL: { total: 0, count: 0, title: '💡 Kommunal (elektr, suv, isitish, internet)' },
    REKLAMA: { total: 0, count: 0, title: '📢 Reklama va marketing' },
    JIHOZLAR: { total: 0, count: 0, title: '🖥️ Jihozlar va texnikalar' },
    USTOZ_MAOSHI: { total: 0, count: 0, title: '👨‍🏫 O\'qituvchilar maoshi (oyliklar)' },
    BOSHQA: { total: 0, count: 0, title: '📦 Boshqa xo\'jalik xarajatlari' },
  };

  paidExpenses.forEach((e: any) => {
    const rawType = (e.type || 'BOSHQA').toUpperCase();
    const cat = categoryTotals[rawType] ? rawType : 'BOSHQA';
    categoryTotals[cat].total += Number(e.amount) || 0;
    categoryTotals[cat].count += 1;
  });

  // 3. Teacher Salaries
  const teacherSalaryExpenses = paidExpenses.filter((e: any) => {
    const t = (e.type || '').toUpperCase();
    const note = (e.note || '').toLowerCase();
    return t === 'USTOZ_MAOSHI' || note.includes('maosh') || note.includes('oylik');
  });

  const totalTeacherSalariesPaid = teacherSalaryExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

  // Map teacher groups and student counts
  const teacherGroupsCount: Record<string, number> = {};
  const teacherStudentsCount: Record<string, number> = {};
  groups.forEach((g: any) => {
    if (g.teacherId) {
      teacherGroupsCount[g.teacherId] = (teacherGroupsCount[g.teacherId] || 0) + 1;
      const count = studentGroups.filter((sg: any) => sg.groupId === g.id).length;
      teacherStudentsCount[g.teacherId] = (teacherStudentsCount[g.teacherId] || 0) + count;
    }
  });

  // ONLY DEBTORS SECTION
  if (options?.onlyDebtors) {
    const lines: string[] = [];
    lines.push(`💰 "${centerName}" — QARZDOR O'QUVCHILAR RO'YXATI:`);
    lines.push('');
    if (debtorsList.length === 0) {
      lines.push(`• Markazda to'lov bo'yicha qarzdorlik mavjud emas. Barcha to'lovlar to'liq to'langan!`);
    } else {
      lines.push(`№  | O'quvchi F.I.Sh               | Guruhi               | Kurs narxi   | To'langan    | Qarzdorlik   | Ota-onasining telefoni`);
      lines.push(`---+-------------------------------+----------------------+--------------+--------------+--------------+--------------------------------`);
      debtorsList.slice(0, 25).forEach((d, idx) => {
        const pNum = String(idx + 1).padEnd(2, ' ');
        const pName = (d.fullName.length > 29 ? d.fullName.slice(0, 26) + '...' : d.fullName).padEnd(29, ' ');
        const pGroup = (d.groupNames.length > 20 ? d.groupNames.slice(0, 17) + '...' : d.groupNames).padEnd(20, ' ');
        const pPrice = `${formatMoney(d.coursePrice)}`.padEnd(12, ' ');
        const pPaid = `${formatMoney(d.totalPaid)}`.padEnd(12, ' ');
        const pDebt = `${formatMoney(d.debtAmount)}`.padEnd(12, ' ');
        lines.push(`${pNum} | ${pName} | ${pGroup} | ${pPrice} | ${pPaid} | ${pDebt} | ${d.parentPhone}`);
      });
      lines.push(`---+-------------------------------+----------------------+--------------+--------------+--------------+--------------------------------`);
      lines.push('');
      lines.push(`• Jami qarzdor o'quvchilar soni: ${debtorsList.length} nafar.`);
      lines.push(`• Jami kutilayotgan qarzdorlik summasi: ${formatMoney(totalDebt)} so'm.`);
      lines.push(`• Qarzdorlarga yuborish uchun SMS eslatma matni:`);
      lines.push(`  "Hurmatli ota-ona! Farzandingizning ${centerName} o'quv markazidagi o'qish to'lovi bo'yicha qarzdorligi mavjud. Darslar to'xtab qolmasligi uchun to'lovni o'z vaqtida amalga oshirishingizni so'raymiz."`);
    }
    return lines.join('\n');
  }

  // ONLY EXPENSES SECTION
  if (options?.onlyExpenses) {
    const lines: string[] = [];
    lines.push(`🏢 "${centerName}" — XARAJATLAR VA CHIQIMLAR TAHLILI:`);
    lines.push('');
    lines.push(`• Jami amalga oshirilgan xarajatlar: ${formatMoney(totalExpenses)} so'm (${paidExpenses.length} ta chiqim).`);
    lines.push('');
    lines.push(`XARAJATLAR TOIFALARI BO'YICHA TAQSIMOT:`);
    Object.entries(categoryTotals).forEach(([_, cat]) => {
      lines.push(`• ${cat.title}: ${formatMoney(cat.total)} so'm (${cat.count} ta chiqim)`);
    });
    lines.push('');
    if (paidExpenses.length > 0) {
      lines.push(`SO'NGGI AMALGA OSHIRILGAN CHIQIMLAR:`);
      lines.push(`№  | Chiqim turi       | Egasi / Qabul qiluvchi        | Summa            | Sana       | Izoh`);
      lines.push(`---+-------------------+-------------------------------+------------------+------------+--------------------------------`);
      paidExpenses.slice(0, 15).forEach((e: any, idx: number) => {
        const pNum = String(idx + 1).padEnd(2, ' ');
        const rawT = (e.type || 'BOSHQA').toUpperCase();
        const pType = (rawT.length > 17 ? rawT.slice(0, 14) + '...' : rawT).padEnd(17, ' ');
        const owner = e.ownerName || '-';
        const pOwner = (owner.length > 29 ? owner.slice(0, 26) + '...' : owner).padEnd(29, ' ');
        const pAmt = `${formatMoney(Number(e.amount) || 0)} so'm`.padEnd(16, ' ');
        const dStr = (e.date ? e.date.split('T')[0] : (e.createdAt ? e.createdAt.split('T')[0] : '-')).padEnd(10, ' ');
        const note = e.note || '-';
        lines.push(`${pNum} | ${pType} | ${pOwner} | ${pAmt} | ${dStr} | ${note}`);
      });
      lines.push(`---+-------------------+-------------------------------+------------------+------------+--------------------------------`);
    }
    return lines.join('\n');
  }

  // ONLY SALARIES SECTION
  if (options?.onlySalaries) {
    const lines: string[] = [];
    lines.push(`👨‍🏫 "${centerName}" — O'QITUVCHILARGA TO'LANGAN OYLIKLAR (MAOSHLAR HISOBOTI):`);
    lines.push('');
    lines.push(`• Ustozlarga berilgan jami oyliklar summasi: ${formatMoney(totalTeacherSalariesPaid)} so'm (${teacherSalaryExpenses.length} ta to'lov).`);
    lines.push('');
    if (teacherSalaryExpenses.length > 0) {
      lines.push(`AMALGA OSHIRILGAN OYLIK TO'LOVLARI RO'YXATI:`);
      lines.push(`№  | Ustoz F.I.Sh                  | Berilgan oylik   | To'lov sanasi | Izoh / Status`);
      lines.push(`---+-------------------------------+------------------+---------------+--------------------------------`);
      teacherSalaryExpenses.slice(0, 15).forEach((e: any, idx: number) => {
        const pNum = String(idx + 1).padEnd(2, ' ');
        const owner = e.ownerName || 'Ustoz';
        const pOwner = (owner.length > 29 ? owner.slice(0, 26) + '...' : owner).padEnd(29, ' ');
        const pAmt = `${formatMoney(Number(e.amount) || 0)} so'm`.padEnd(16, ' ');
        const dStr = (e.date ? e.date.split('T')[0] : (e.createdAt ? e.createdAt.split('T')[0] : '-')).padEnd(13, ' ');
        const note = e.note || e.status || 'TOLANGAN';
        lines.push(`${pNum} | ${pOwner} | ${pAmt} | ${dStr} | ${note}`);
      });
      lines.push(`---+-------------------------------+------------------+---------------+--------------------------------`);
      lines.push('');
    } else {
      lines.push(`• Hozircha "Chiqimlar" bo'limida 'USTOZ MAOSHI' turi bo'yicha oylik to'lovlari kiritilmagan.`);
      lines.push(`• O'qituvchilarga oylik berilganda "Moliya -> Chiqimlar" bo'limiga 'USTOZ MAOSHI' sifatida kiritilsa, bu yerda avtomatik to'liq yozilib boriladi.`);
      lines.push('');
    }

    lines.push(`O'QITUVCHILARNING MAOSH SHARTLARI VA FAOLIYATI:`);
    teachers.forEach((t: any) => {
      const tName = `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Ustoz';
      const sType = t.salaryType === 'FIXED' ? 'Fikslangan oylik' : 'Guruh to\'lovlaridan foiz';
      const sVal = t.salaryType === 'FIXED' ? `${formatMoney(Number(t.salaryValue) || 0)} so'm` : `${t.salaryValue}% (Foiz)`;
      const grCount = teacherGroupsCount[t.id] || 0;
      const stCount = teacherStudentsCount[t.id] || 0;

      const mySalaryPaid = teacherSalaryExpenses
        .filter((e: any) => {
          const o = (e.ownerName || '').toLowerCase();
          return o.includes((t.firstName || '').toLowerCase()) || o.includes((t.lastName || '').toLowerCase());
        })
        .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

      lines.push(`• ${tName} (${sType}: ${sVal}) | Guruhlar: ${grCount} ta | O'quvchilar: ${stCount} nafar | Jami to'langan maosh: ${formatMoney(mySalaryPaid)} so'm`);
    });

    return lines.join('\n');
  }

  // FULL 5-SECTION MASTER FINANCIAL REPORT
  const lines: string[] = [];
  lines.push(`💰 "${centerName}" O'QUV MARKAZINING MOLIYAVIY TAHLILI VA BALANSI:`);
  lines.push('');

  // 1. Asosiy Moliyaviy Ko'rsatkichlar
  const netProfit = totalCollected - totalExpenses;
  lines.push(`1. 💵 ASOSIY MOLIYAVIY KO'RSATKICHLAR:`);
  lines.push(`   • Jami yig'ilgan to'lovlar (Kassa / Tushum): ${formatMoney(totalCollected)} so'm`);
  lines.push(`   • Markazning jami chiqimlari (Xarajatlar): ${formatMoney(totalExpenses)} so'm`);
  lines.push(`   • Sof moliyaviy muvozanat (Kassa balansi): ${formatMoney(netProfit)} so'm`);
  lines.push(`   • Talabalardan kutilayotgan qarzdorlik: ${formatMoney(totalDebt)} so'm (${debtorsList.length} nafar o'quvchi)`);
  lines.push(`   • Ustozlarga to'langan oyliklar miqdori: ${formatMoney(totalTeacherSalariesPaid)} so'm`);
  lines.push('');

  // 2. Qarzdor O'quvchilar Ro'yxati
  lines.push(`2. 📋 TO'LOV QILMAGAN (QARZDOR) O'QUVCHILAR RO'YXATI (${debtorsList.length} nafar):`);
  if (debtorsList.length === 0) {
    lines.push(`   • Markazda to'lov bo'yicha qarzdorlik mavjud emas. Barcha to'lovlar to'liq qoplangan!`);
  } else {
    lines.push(`№  | O'quvchi F.I.Sh               | Guruhi               | Kurs narxi   | To'langan    | Qarzdorlik   | Ota-onasining telefoni`);
    lines.push(`---+-------------------------------+----------------------+--------------+--------------+--------------+--------------------------------`);
    debtorsList.slice(0, 20).forEach((d, idx) => {
      const pNum = String(idx + 1).padEnd(2, ' ');
      const pName = (d.fullName.length > 29 ? d.fullName.slice(0, 26) + '...' : d.fullName).padEnd(29, ' ');
      const pGroup = (d.groupNames.length > 20 ? d.groupNames.slice(0, 17) + '...' : d.groupNames).padEnd(20, ' ');
      const pPrice = `${formatMoney(d.coursePrice)}`.padEnd(12, ' ');
      const pPaid = `${formatMoney(d.totalPaid)}`.padEnd(12, ' ');
      const pDebt = `${formatMoney(d.debtAmount)}`.padEnd(12, ' ');
      lines.push(`${pNum} | ${pName} | ${pGroup} | ${pPrice} | ${pPaid} | ${pDebt} | ${d.parentPhone}`);
    });
    lines.push(`---+-------------------------------+----------------------+--------------+--------------+--------------+--------------------------------`);
    lines.push(`   • Jami kutilayotgan qarzdorlik: ${formatMoney(totalDebt)} so'm (${debtorsList.length} ta holat).`);
    lines.push(`   • Qarzdorlarga tavsiya etiladigan SMS matni:`);
    lines.push(`     "Hurmatli ota-ona! Sizning ${centerName} o'quv markazimiz oldidagi o'qish to'lovi bo'yicha qarzdorligingiz mavjud. Farzandingiz darslardan to'xtab qolmasligi uchun to'lovni amalga oshirishingizni so'raymiz."`);
  }
  lines.push('');

  // 3. Markaz Nimaga Xarajat Qilishi
  lines.push(`3. 🏢 MARKAZ NIMAGA XARAJAT QILISHI (XARAJATLAR VA CHIQIMLAR TAHLILI):`);
  lines.push(`   • Jami xarajatlar: ${formatMoney(totalExpenses)} so'm (${paidExpenses.length} ta chiqim)`);
  lines.push(`   Kategoriyalar bo'yicha taqsimot:`);
  Object.entries(categoryTotals).forEach(([_, cat]) => {
    lines.push(`   • ${cat.title}: ${formatMoney(cat.total)} so'm (${cat.count} ta chiqim)`);
  });
  if (paidExpenses.length > 0) {
    lines.push('');
    lines.push(`   So'nggi xarajatlar ro'yxati:`);
    lines.push(`№  | Chiqim turi       | Egasi / Qabul qiluvchi        | Summa            | Sana       | Izoh`);
    lines.push(`---+-------------------+-------------------------------+------------------+------------+--------------------------------`);
    paidExpenses.slice(0, 10).forEach((e: any, idx: number) => {
      const pNum = String(idx + 1).padEnd(2, ' ');
      const rawT = (e.type || 'BOSHQA').toUpperCase();
      const pType = (rawT.length > 17 ? rawT.slice(0, 14) + '...' : rawT).padEnd(17, ' ');
      const owner = e.ownerName || '-';
      const pOwner = (owner.length > 29 ? owner.slice(0, 26) + '...' : owner).padEnd(29, ' ');
      const pAmt = `${formatMoney(Number(e.amount) || 0)} so'm`.padEnd(16, ' ');
      const dStr = (e.date ? e.date.split('T')[0] : (e.createdAt ? e.createdAt.split('T')[0] : '-')).padEnd(10, ' ');
      const note = e.note || '-';
      lines.push(`${pNum} | ${pType} | ${pOwner} | ${pAmt} | ${dStr} | ${note}`);
    });
    lines.push(`---+-------------------+-------------------------------+------------------+------------+--------------------------------`);
  }
  lines.push('');

  // 4. O'qituvchilarga To'langan Oyliklar
  lines.push(`4. 👨‍🏫 O'QITUVCHILARGA TO'LANGAN OYLIKLAR (MAOSHLAR HISOBOTI):`);
  lines.push(`   • Ustozlarga berilgan jami oyliklar summasi: ${formatMoney(totalTeacherSalariesPaid)} so'm`);
  if (teacherSalaryExpenses.length > 0) {
    lines.push(`   Amalga oshirilgan oylik to'lovlari:`);
    lines.push(`№  | Ustoz F.I.Sh                  | Berilgan oylik   | To'lov sanasi | Izoh / Status`);
    lines.push(`---+-------------------------------+------------------+---------------+--------------------------------`);
    teacherSalaryExpenses.slice(0, 10).forEach((e: any, idx: number) => {
      const pNum = String(idx + 1).padEnd(2, ' ');
      const owner = e.ownerName || 'Ustoz';
      const pOwner = (owner.length > 29 ? owner.slice(0, 26) + '...' : owner).padEnd(29, ' ');
      const pAmt = `${formatMoney(Number(e.amount) || 0)} so'm`.padEnd(16, ' ');
      const dStr = (e.date ? e.date.split('T')[0] : (e.createdAt ? e.createdAt.split('T')[0] : '-')).padEnd(13, ' ');
      const note = e.note || e.status || 'TOLANGAN';
      lines.push(`${pNum} | ${pOwner} | ${pAmt} | ${dStr} | ${note}`);
    });
    lines.push(`---+-------------------------------+------------------+---------------+--------------------------------`);
  } else {
    lines.push(`   • Hozircha "Chiqimlar" bo'limida ustozlarga to'langan oylik to'lovlari kiritilmagan.`);
    lines.push(`   • O'qituvchilarga oylik berilganda "Moliya -> Chiqimlar" bo'limiga 'USTOZ MAOSHI' turi bo'yicha kiritiladi va bu yerda o'qituvchilar kesimida avtomatik hisoboti yuritilib boriladi.`);
  }
  lines.push('');
  lines.push(`   Ustozlarning maosh shartlari:`);
  teachers.forEach((t: any) => {
    const tName = `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Ustoz';
    const sType = t.salaryType === 'FIXED' ? 'Fikslangan' : 'Foiz';
    const sVal = t.salaryType === 'FIXED' ? `${formatMoney(Number(t.salaryValue) || 0)} so'm` : `${t.salaryValue}%`;
    const grCount = teacherGroupsCount[t.id] || 0;
    const stCount = teacherStudentsCount[t.id] || 0;
    const mySalaryPaid = teacherSalaryExpenses
      .filter((e: any) => {
        const o = (e.ownerName || '').toLowerCase();
        return o.includes((t.firstName || '').toLowerCase()) || o.includes((t.lastName || '').toLowerCase());
      })
      .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
    lines.push(`   • ${tName} (${sType}: ${sVal}) | Guruhlar: ${grCount} ta (${stCount} o'quvchi) | To'langan: ${formatMoney(mySalaryPaid)} so'm`);
  });
  lines.push('');

  // 5. Tavsiyalar
  lines.push(`5. 💡 TEZKOR MOLIYAVIY TAVSIYALAR:`);
  if (debtorsList.length > 0) {
    lines.push(`   • Qarzdor ${debtorsList.length} nafar o'quvchining ota-onalariga eslatma yuborib, ${formatMoney(totalDebt)} so'm kutilayotgan tushumni kassaga jalb qilish.`);
  }
  lines.push(`   • Markaz sof moliyaviy muvozanati ijobiy (+${formatMoney(netProfit)} so'm). Xarajatlar nazorati muntazam olib borilsin.`);
  lines.push(`   • O'qituvchilarga oylik berilganda "Moliya -> Chiqimlar" bo'limida o'z vaqtida qayd etib borilsin.`);

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

// ==========================================
// 1. DEDICATED STUDENT AI TUTOR ENGINE
// ==========================================
function generateStudentTutorAnswer(
  question: string,
  studentName?: string,
  courseName?: string,
  topic?: string,
  centerName?: string
): string {
  const sName = studentName || "O'quvchi";
  const cName = courseName || "Dasturlash";
  const top = topic || "Dasturlash asoslari";
  const q = (question || '').trim();
  const qLower = q.toLowerCase();

  // 1. Uyga vazifa / Topshiriqlar bo'yicha maslahat
  if (
    qLower.includes('vazifa') ||
    qLower.includes('uyga') ||
    qLower.includes('tartib') ||
    qLower.includes('bajarish') ||
    qLower.includes('topshiriq') ||
    qLower.includes('maslahat berasan') ||
    qLower.includes('rejasi') ||
    qLower.includes('yordam')
  ) {
    return [
      `Assalomu alaykum, ${sName}! Uyga vazifani a'lo bahoga va eng samarali tartibda bajarish bo'yicha 5 ta oltin qoidam:`,
      '',
      `1. 📖 **Topshiriq shartlarini diqqat bilan tahlil qiling:**`,
      `   Ustozingiz bergan topshiriq talablarini va oxirgi o'tilgan "${top}" mavzusi materiallarini to'liq ko'rib chiqing. Koddan nima kutilayotganini aniq belgilab oling.`,
      '',
      `2. 🧩 **Masalani kichik bo'laklarga ajrating (Dekompozitsiya):**`,
      `   Katta masalani birdaniga yozishga shoshilmang. Avval algoritmni qoralama qog'ozda yoki kod ichida izoh (// comment) sifatida qadamlarga bo'ling:`,
      `   • 1-qadam: Boshlang'ich ma'lumotlar va o'zgaruvchilarni aniqlash`,
      `   • 2-qadam: Asosiy mantiq (funksiyalar, shartlar, hisob-kitoblar)`,
      `   • 3-qadam: Natijani foydalanuvchiga chiqarish (UI/Console)`,
      '',
      `3. 💻 **Kodni mustaqil va tushunib yozing:**`,
      `   Kodni ko'chirib bosishdan ko'ra, har bir qatorni o'zingiz qo'lda yozing. O'zgaruvchilarga mantiqiy va tushunarli nomlar bering. Har bir qismni yozgach darhol sinab ko'ring.`,
      '',
      `4. 🔍 **Xatolarni tekshiring (Debug):**`,
      `   Dastur to'g'ri ishlayotganini turli xil qiymatlar bilan tekshiring. Brauzerda F12 tugmasini bosib, "Console" bo'limida qizil xatoliklar yo'qligiga ishonch hosil qiling.`,
      '',
      `5. 🚀 **Platformaga yuklash va topshirish:**`,
      `   Yozgan kodingizni GitHub repositoriyingizga yuklang (push qiling). Shaxsiy kabinetingizdagi "Uyga vazifalar" bo'limida havola (link)ni topshiring. Bu sizga reytingingiz uchun +50 XP va 5 IT-Coins keltiradi!`,
      '',
      `💡 Agar biron qatorda qiynalsangiz, kodingiz qismini yuboring, birgalikda tahlil qilamiz! Omad, ${sName}! 👍`,
    ].join('\n');
  }

  // 2. Mavzu tushuntirish
  if (
    qLower.includes('mavzu') ||
    qLower.includes('tushuntir') ||
    qLower.includes('chiziqli algoritm') ||
    qLower.includes('algoritm') ||
    qLower.includes('nima u') ||
    qLower.includes('tushunmadim')
  ) {
    if (qLower.includes('chiziqli') || top.toLowerCase().includes('chiziqli')) {
      return [
        `**"Chiziqli algoritmlar"** — bu har bir amal qat'iy ketma-ketlikda, yuqoridan pastga qarab, hech qanday shartsiz yoki takrorlanishsiz (siklsiz) bir martadan bajariladigan algoritmdir.`,
        '',
        `☕ Hayotiy misol: Choy damlash jarayoni:`,
        `1. Chovgumga suv quyiladi`,
        `2. Gazga qo'yiladi va qaynatiladi`,
        `3. Choynakka quruq choy solinadi`,
        `4. Qaynagan suv quyiladi va 5 daqiqa damlanadi`,
        '',
        `💻 Dasturlashda sodda namuna:`,
        `\`\`\`javascript`,
        `// Ikki sonning yig'indisini hisoblash (chiziqli ketma-ketlik):`,
        `let a = 15;`,
        `let b = 25;`,
        `let yigindi = a + b;`,
        `console.log("Natija:", yigindi); // Natija: 40`,
        `\`\`\``,
        '',
        `Bu yerda dastur qatorlari 1-qatordan 4-qatorgacha navbatma-navbat bajariladi. Qandaydir qo'shimcha savolingiz bormi?`,
      ].join('\n');
    }

    return [
      `Siz o'rganayotgan **"${top}"** mavzusi (${cName} kursi) dasturlashning asosiy tayanch tushunchalaridan biridir.`,
      '',
      `Asosiy qoidalar:`,
      `• Nazariyani darhol amaliyotga aylantiring: har bir tushuncha bo'yicha kamida 2-3 ta sodda kod yozib ko'ring.`,
      `• Platformaning "Video darslar" bo'limida ustoz yuklagan dars videosini ko'rib, ustoz bilan birga kodni yozing.`,
      `• Dars kodlarini o'zgartirib, natijasi qanday o'zgarishini kuzating.`,
      '',
      `Ushbu mavzuning qaysi qismida ikkilanyapsiz? Masalan, sintaksisdami yoki amaliy qo'llashdami? Yozing, batafsil tushuntiraman!`,
    ].join('\n');
  }

  // 3. Kod xatolari (debugging)
  if (
    qLower.includes('xato') ||
    qLower.includes('error') ||
    qLower.includes('ishlamayapti') ||
    qLower.includes('kodim') ||
    qLower.includes('bug') ||
    qLower.includes('tuzat')
  ) {
    return [
      `Koddagi xatolikni (bug) tezda topish va tuzatish bo'yicha professional tavsiyalar:`,
      '',
      `1. 🔴 **Xatolik matnini o'qing:**`,
      `   Brauzerda F12 tugmasini bosing -> "Console" bo'limini oching. Qizil rangdagi xato matnida fayl nomi va qaysi qatorda xato yuz bergani aniq ko'rsatiladi.`,
      '',
      `2. ⚠️ **Ko'p uchraydigan xatolar:**`,
      `   • "Uncaught ReferenceError: x is not defined" — o'zgaruvchi e'lon qilinmagan yoki nomi noto'g'ri (katta-kichik harf sezgir).`,
      `   • "Uncaught TypeError: Cannot read properties of undefined" — hali yuklanmagan yoki mavjud bo'lmagan obyekt xususiyati chaqirilgan.`,
      `   • "SyntaxError: Unexpected token" — qavs, nuqta-vergul yoki qo'shtirnoq yopilmay qolgan.`,
      '',
      `3. 🛠️ **Tuzatish uchun:**`,
      `   Xato berayotgan kod qatoringizni shu chatga tashlang, xatoni darhol ko'rsatib, to'g'ri variantini yozib beraman!`,
    ].join('\n');
  }

  // 4. Taqqoslash (JS vs React, CSS vs HTML, etc.)
  if (qLower.includes('farq') || qLower.includes('vs') || (qLower.includes('react') && qLower.includes('javascript'))) {
    return [
      `**JavaScript (Vanilla JS) va React o'rtasidagi asosiy farqlar:**`,
      '',
      `• **JavaScript:** Brauzerlar tushunadigan asosiy dasturlash tili. Har qanday veb sahifaga interaktivlik berish uning yordamida amalga oshiriladi.`,
      `• **React:** Facebook (Meta) tomonidan yaratilgan, JavaScript-da yozilgan qulay va zamonaviy kutubxona.`,
      '',
      `Asosiy farqlari:`,
      `1. **Komponentlar:** React-da sahifa mustaqil bo'laklarga (Header, Button, Card) bo'linadi va ularni qayta-qayta ishlatish mumkin.`,
      `2. **Virtual DOM:** Oddiy JS butun DOM-ni qayta chizishi mumkin, React esa faqat o'zgargan qismnigina tezda yangilaydi.`,
      `3. **Holat (State):** React-da ma'lumot (state) o'zgarganda sahifa avtomatik yangilanadi (re-render bo'ladi).`,
      '',
      `Xulosa: JavaScript-ni yaxshi o'rgansangiz, React-ni tushunish juda oson kechadi! 🚀`,
    ].join('\n');
  }

  // 5. Salomlashish
  if (qLower.match(/^(salom|assalom|qalaysan|qalesiz|hi|hello)/i)) {
    return `Assalomu alaykum, ${sName}! Men sizning "${cName}" kursi bo'yicha shaxsiy AI repetitoringizman. Oxirgi mavzuingiz: "${top}". Bugun qaysi mavzu yoki vazifa bo'yicha yordam bera olaman? 😊`;
  }

  // 6. Maslahat / Karyera / Dasturchilik
  if (qLower.includes('maslahat') || qLower.includes('tavsiya') || qLower.includes('dasturchi') || qLower.includes('o\'rganish')) {
    return [
      `Dasturlashni muvaffaqiyatli o'zlashtirish uchun 4 ta amaliy maslahat, ${sName}:`,
      '',
      `1. ⏱️ **Muntazamlik:** Haftada bir kun 7 soat o'tirgandan ko'ra, har kuni 1–2 soat doimiy kod yozish 10 barobar foydaliroq.`,
      `2. ✍️ **Kodni qo'lda yozing:** Tayyor kodni nusxalamang, har bir satrni qo'lda terib, nima ishlayotganini tushunishga harakat qiling.`,
      `3. 🛠️ **Mini loyihalar qiling:** Faqat darsdagi mashq bilan to'xtamang. O'zingiz yoqtirgan biror sodda sayt (kalkulyator, to-do list, ob-havo) yasashga urinib ko'ring.`,
      `4. 🤝 **Savol berishdan tortinmang:** Tushunmagan joyingizni ustozingizdan yoki mendan so'rang.`,
      '',
      `Bugungi o'tilgan "${top}" mavzusini mustahkamlash uchun qanday mashq qilmoqchisiz?`,
    ].join('\n');
  }

  // 7. General smart educational response (NEVER admin status)
  return [
    `Salom, ${sName}! "${q}" savolingiz dasturlashda juda muhim ahamiyatga ega.`,
    '',
    `"${cName}" kursi va "${top}" mavzusi doirasida:`,
    `• Har bir dasturiy tushunchani amaliy mashqlar bilan mustahkamlang.`,
    `• Agar biron aniq kod yozayotgan bo'lsangiz yoki topshiriqda qiyinchilik bo'lsa, kod matnini shu yerga yozing.`,
    `• Qadamma-qadam tahlil qilib, to'g'ri yechimini ko'rsatib beraman! 👍`,
  ].join('\n');
}

// ==========================================
// 2. DEDICATED TEACHER ASSISTANT ENGINE
// ==========================================
function generateTeacherMethodologyAdvice(
  teacherName: string,
  teacherGroups: any[],
  centerName: string
): string {
  const grNames = teacherGroups.map((g: any) => g.name).join(', ') || 'Dasturlash guruhlari';
  return [
    `🎓 Ustoz ${teacherName} uchun dars metodikasi, rejalashtirish va amaliy mashqlar bo'yicha tavsiyalar:`,
    '',
    `1. 🎯 DARSNI SAMARALI TASHKIL ETISH METODIKASI (80/20 QOIDASI):`,
    `   • 20% Nazariya (15–20 daqiqa): Yangi mavzuni faqat eng kerakli asosiy tushunchalar bilan tushuntirish.`,
    `   • 60% Amaliyot (Live Coding va mustaqil mashq): O'quvchilar bilan birgalikda kod yozish.`,
    `   • 20% Tahlil va savol-javob: O'quvchilar yozgan kodlarini ekranda tekshirish va xatolarni tahlil qilish.`,
    '',
    `2. 💡 INTERAKTIV MASHQLAR VA GAMIFIKATSIYA:`,
    `   • "Juftlikda dasturlash" (Pair Programming): Kuchliroq o'quvchini sekinroq o'zlashtirayotgan o'quvchi bilan juft qilib, bitta loyihani birga yozdirish.`,
    `   • "Xatoni top" (Bug Hunting): Darsda ekranga ataylab 2–3 ta xatosi bor kod chiqarib, o'quvchilardan xatoni birinchi bo'lib topishini so'rash (bu ularni juda faollashtiradi).`,
    `   • Platforma reytingi (XP & Coins): Uyga vazifani vaqtida topshirganlarga +50 XP va 5 IT-Coins berilishini eslatib, guruhlararo raqobat muhitini yaratish.`,
    '',
    `3. 📝 KEYINGI DARS UCHUN AMALIY TOPSHIRIQ G'OYALARI:`,
    `   • Mini loyiha: O'tilgan mavzu bo'yicha real hayotda ishlatiladigan interaktiv mini-loyiha (masalan: hisoblagich, to'lov shakli, interaktiv kartochka).`,
    `   • Mustaqil qidiruv: O'quvchilarga bitta kichik qo'shimcha parametrni hujjatlardan (MDN / W3Schools) topib, loyihaga qo'shish topshirig'i.`,
    '',
    `4. 👥 SUSST O'ZLASHTIRAYOTGAN O'QUVCHILAR BILAN ISHLASH:`,
    `   • Dars oxirida ularga 5 daqiqa alohida e'tibor qaratib, eng qiyin tuyulgan qismini so'rash.`,
    `   • "Video darslar" bo'limidagi dars yozuvini qayta ko'rib chiqishni tayinlash va ota-onalari bilan do'stona aloqa o'rnatish.`,
    '',
    `Sizning guruhlaringiz: ${grNames}. Har bir dars o'quvchilar uchun qiziqarli sarguzashtga aylansin! 🚀`,
  ].join('\n');
}

function generateTeacherDashboardSummary(
  teacherName: string,
  centerName: string,
  myGroups: any[],
  myStudents: any[],
  todayMyGroups: any[],
  roomsMap: Map<string, string>,
  groupStudentCounts: Record<string, number>,
  todayDayNameUz: string,
  myAttendances: any[]
): string {
  const lines: string[] = [];
  lines.push(`🎓 Ustoz ${teacherName}, "${centerName}"dagi o'quv faoliyatingiz xulosasi:`);
  lines.push('');
  lines.push(`📊 ASOSIY KO'RSATKICHLARINGIZ:`);
  lines.push(`• Biriktirilgan guruhlar soni: ${myGroups.length} ta`);
  lines.push(`• Jami ta'lim olayotgan o'quvchilaringiz: ${myStudents.length} nafar`);
  lines.push('');

  lines.push(`📅 BUGUNGI DARSLARINGIZ (${todayDayNameUz}):`);
  if (todayMyGroups.length === 0) {
    lines.push(`• Bugun jadvalingiz bo'yicha darslar rejalashtirilmagan. Keyingi darslarga metodik tayyorgarlik ko'rishingiz mumkin.`);
  } else {
    todayMyGroups.forEach((g: any, idx: number) => {
      const room = g.roomId ? roomsMap.get(g.roomId) || 'Xona' : 'Xona';
      const count = groupStudentCounts[g.id] || 0;
      const timeStr = g.startTime ? `${g.startTime.slice(0, 5)} - ${g.endTime ? g.endTime.slice(0, 5) : '--:--'}` : '--:--';
      lines.push(`${idx + 1}) "${g.name}"`);
      lines.push(`   ⏰ Vaqti: ${timeStr} | 🚪 Xona: ${room} | 👥 O'quvchilar: ${count} nafar`);
    });
  }
  lines.push('');

  lines.push(`💡 PEDAGOGIK TAVSIYALAR:`);
  lines.push(`• Bugungi darslarda davomatni belgilangan dars vaqti oralig'ida olishni unutmang.`);
  lines.push(`• Dars yakunida o'quvchilarga platforma orqali uyga vazifa yuklang, bu ularning bilimini mustahkamlaydi.`);
  lines.push(`• Dars qoldirgan o'quvchilarning ota-onalari bilan bog'lanib, sababini aniqlash tavsiya etiladi.`);

  return lines.join('\n');
}

function generateTeacherAttendanceAnalysis(
  teacherName: string,
  centerName: string,
  myGroups: any[],
  myStudents: any[],
  myAttendances: any[],
  todayTashkentIso: string
): string {
  const lines: string[] = [];
  lines.push(`📋 Ustoz ${teacherName} — BIRIKTIRILGAN GURUHLARINGIZNING DAVOMAT TAHLILI:`);
  lines.push('');

  const totalMyAtt = myAttendances.length;
  const presentMyAtt = myAttendances.filter((a: any) => a.status === 'KELGAN' || a.status === 'KECHIKKAN').length;
  const rate = totalMyAtt > 0 ? Math.round((presentMyAtt / totalMyAtt) * 100) : 100;

  lines.push(`• Guruhlaringizdagi umumiy davomat darajasi: ${rate}%`);

  const absentMyAtt = myAttendances.filter((a: any) => a.status === 'KELMAGAN');
  if (absentMyAtt.length === 0) {
    lines.push(`• Guruhlaringizda dars qoldirgan o'quvchilar ro'yxatga olinmagan. Barcha talabalaringiz darslarga to'liq qatnashmoqda! 👍`);
    return lines.join('\n');
  }

  // Count absent per student
  const stAbsentMap: Record<string, { count: number; student: any; lastDate: string; groupName: string }> = {};
  const groupsLookup = new Map<string, any>();
  myGroups.forEach((g: any) => groupsLookup.set(g.id, g));
  const stLookup = new Map<string, any>();
  myStudents.forEach((s: any) => stLookup.set(s.id, s));

  absentMyAtt.forEach((att: any) => {
    const st = stLookup.get(att.studentId);
    const gr = groupsLookup.get(att.groupId);
    if (!stAbsentMap[att.studentId]) {
      stAbsentMap[att.studentId] = {
        count: 0,
        student: st,
        lastDate: att.date ? att.date.split('T')[0] : todayTashkentIso,
        groupName: gr?.name || 'Guruh',
      };
    }
    stAbsentMap[att.studentId].count += 1;
  });

  const sorted = Object.values(stAbsentMap).sort((a, b) => b.count - a.count);

  lines.push(`DARS QOLDIRGAN O'QUVCHILAR RO'YXATI (Ota-onalar bilan bog'lanish uchun):`);
  lines.push(`№  | O'quvchi F.I.Sh               | Guruhi               | Qoldirgan | Oxirgi dars | Ota-onasining telefoni`);
  lines.push(`---+-------------------------------+----------------------+-----------+-------------+--------------------------------`);
  sorted.slice(0, 15).forEach((item, idx) => {
    const st = item.student;
    const fullName = st ? `${st.firstName || ''} ${st.lastName || ''}`.trim() : 'O\'quvchi';
    const parentPhone = getParentPhoneDisplay(st);

    const padNum = String(idx + 1).padEnd(2, ' ');
    const padName = (fullName.length > 29 ? fullName.slice(0, 26) + '...' : fullName).padEnd(29, ' ');
    const padGroup = (item.groupName.length > 20 ? item.groupName.slice(0, 17) + '...' : item.groupName).padEnd(20, ' ');
    const padCount = `${item.count} marta`.padEnd(9, ' ');
    const padDate = item.lastDate.padEnd(11, ' ');

    lines.push(`${padNum} | ${padName} | ${padGroup} | ${padCount} | ${padDate} | ${parentPhone}`);
  });
  lines.push(`---+-------------------------------+----------------------+-----------+-------------+--------------------------------`);
  lines.push('');
  lines.push(`• Tavsiya: 2 martadan ortiq sababsiz dars qoldirgan o'quvchilarning ota-onalari bilan qo'ng'iroqlashib, vaziyatni aniqlash ta'lim sifatini oshiradi.`);

  return lines.join('\n');
}

function generateTeacherStudentAnalysis(
  teacherName: string,
  myGroups: any[],
  myStudents: any[],
  myAttendances: any[]
): string {
  const lines: string[] = [];
  lines.push(`👥 Ustoz ${teacherName} — O'QUVCHILARINGIZNING AKADEMIK FAOLLIGI TAHLILI:`);
  lines.push('');
  lines.push(`• Biriktirilgan guruhlaringizdagi jami o'quvchilar: ${myStudents.length} nafar`);
  const activeCount = myStudents.filter((s: any) => s.status === 'FAOL').length;
  lines.push(`• Faol ta'lim olayotganlar: ${activeCount} nafar`);
  lines.push('');

  lines.push(`GURUHLAR BO'YICHA TAQSIMOT:`);
  myGroups.forEach((g: any, idx: number) => {
    lines.push(`${idx + 1}. "${g.name}" guruhi`);
  });
  lines.push('');

  lines.push(`PEDAGOGIK TAVSIYALAR:`);
  lines.push(`• Darsda eng faol o'quvchilarni taqdirlang, ularga murakkabroq mini-loyihalar bering.`);
  lines.push(`• Sekin o'zlashtirayotgan talabalar bilan darsdan so'ng 5-10 daqiqa qo'shimcha tushuntirish o'tkazing.`);
  lines.push(`• O'quvchilarning uyga vazifalarini muntazam tekshirib, izoh (feedback) qoldiring.`);

  return lines.join('\n');
}

function generateTeacherOwnWorkload(
  teacherName: string,
  centerName: string,
  myGroups: any[],
  groupStudentCounts: Record<string, number>
): string {
  const lines: string[] = [];
  lines.push(`👨‍🏫 Ustoz ${teacherName} — SHAXSIY DARS YUKLAMANGIZ VA JADVALINGIZ:`);
  lines.push('');
  lines.push(`• Jami biriktirilgan guruhlar: ${myGroups.length} ta`);

  let totalStudents = 0;
  myGroups.forEach((g: any) => {
    totalStudents += (groupStudentCounts[g.id] || 0);
  });
  lines.push(`• Ta'lim berayotgan jami talabalaringiz: ${totalStudents} nafar`);
  lines.push('');

  lines.push(`GURUHLAR RO'YXATI VA DARS VAQTLARI:`);
  lines.push(`№  | Guruh nomi                    | Dars kunlari      | Vaqti         | O'quvchilar`);
  lines.push(`---+-------------------------------+-------------------+---------------+------------`);
  myGroups.forEach((g: any, idx: number) => {
    const padNum = String(idx + 1).padEnd(2, ' ');
    const name = (g.name.length > 29 ? g.name.slice(0, 26) + '...' : g.name).padEnd(29, ' ');
    const days = (Array.isArray(g.days) ? g.days.join(', ') : '-').padEnd(17, ' ');
    const time = (g.startTime ? `${g.startTime.slice(0, 5)}-${g.endTime ? g.endTime.slice(0, 5) : ''}` : '-').padEnd(13, ' ');
    const count = `${groupStudentCounts[g.id] || 0} nafar`.padEnd(10, ' ');
    lines.push(`${padNum} | ${name} | ${days} | ${time} | ${count}`);
  });
  lines.push(`---+-------------------------------+-------------------+---------------+------------`);
  lines.push('');
  lines.push(`• Tavsiya: Dars oralig'ida dam olish va har bir dars oldidan 15 daqiqa rejalashtirishga vaqt ajratish samaradorlikni oshiradi.`);

  return lines.join('\n');
}

function generateTeacherAssistantAnswer(
  question: string,
  teacherName: string,
  centerName: string,
  myGroups: any[],
  myStudents: any[],
  todayMyGroups: any[],
  roomsMap: Map<string, string>,
  groupStudentCounts: Record<string, number>,
  todayDayNameUz: string,
  myAttendances: any[],
  todayTashkentIso: string
): string {
  const q = (question || '').trim();
  const qLower = q.toLowerCase();

  // 1. Guruhlarim holati
  if (
    qLower.includes('mening guruh') ||
    qLower.includes('guruhlarimdagi holat') ||
    qLower.includes('guruhlarim') ||
    qLower.includes('darslarim')
  ) {
    return generateTeacherDashboardSummary(
      teacherName,
      centerName,
      myGroups,
      myStudents,
      todayMyGroups,
      roomsMap,
      groupStudentCounts,
      todayDayNameUz,
      myAttendances
    );
  }

  // 2. Davomat / Kelmagan o'quvchilar
  if (
    qLower.includes('davomat') ||
    qLower.includes('kelmagan') ||
    qLower.includes('qoldirgan') ||
    qLower.includes('kelmadi') ||
    qLower.includes('muammo')
  ) {
    return generateTeacherAttendanceAnalysis(
      teacherName,
      centerName,
      myGroups,
      myStudents,
      myAttendances,
      todayTashkentIso
    );
  }

  // 3. Metodika / Rejalar / Amaliy mashq
  if (
    qLower.includes('metodika') ||
    qLower.includes('mashq') ||
    qLower.includes('amaliy mashq') ||
    qLower.includes('reja') ||
    qLower.includes('dars rejasi') ||
    qLower.includes('o\'rgatish') ||
    qLower.includes('reyting') ||
    qLower.includes('qiziqtirish') ||
    qLower.includes('motivatsiya')
  ) {
    return generateTeacherMethodologyAdvice(teacherName, myGroups, centerName);
  }

  // 4. O'quvchilar haqida
  if (qLower.includes('o\'quvchi') || qLower.includes('talaba')) {
    return generateTeacherStudentAnalysis(teacherName, myGroups, myStudents, myAttendances);
  }

  // 5. Salomlashish
  if (qLower.match(/^(salom|assalom|qalaysiz|qalesiz)/i)) {
    return `Assalomu alaykum, Ustoz ${teacherName}! Guruhlaringiz darslari, o'quvchilar davomati yoki yangi dars metodikasi bo'yicha qanday yordam bera olaman?`;
  }

  // 6. Pedagogical default fallback (NEVER center finances!)
  return [
    `Hurmatli Ustoz ${teacherName}!`,
    '',
    `"${q}" savolingiz yuzasidan tavsiyalar:`,
    `• Guruhlaringizdagi talabalar faolligini oshirish uchun har bir darsda yangi tushunchani amaliy kod yozish bilan mustahkamlang.`,
    `• O'quvchilarning savollarini dars davomida rag'batlantirib boring.`,
    `• Agar aniq dars mavzusi yoki mashq tuzish bo'yicha maslahat kerak bo'lsa, mavzu nomini yozing, dars rejasi va topshiriqlarni tuzib beraman!`,
  ].join('\n');
}

// ==========================================
// 3. BUILT-IN RULE-BASED ANALYTICAL ENGINE
// ==========================================
function generateBuiltinAnalysis(
  taskType: string,
  centerName: string,
  dateRange: string,
  rawData: any,
  userQuestion?: string,
  callerRole?: string,
  teacherInfo?: {
    name: string;
    teacherId?: string;
    groupsCount?: number;
    studentsCount?: number;
    myGroups?: any[];
    myStudents?: any[];
    myAttendances?: any[];
  },
  extraStats?: { centersCount?: number },
  studentInfo?: { studentName?: string; courseName?: string; topic?: string }
): string {
  // Guard 1: Direct route for Student
  if (callerRole === 'STUDENT' || taskType === 'student_tutor') {
    return generateStudentTutorAnswer(
      userQuestion || '',
      studentInfo?.studentName,
      studentInfo?.courseName,
      studentInfo?.topic,
      centerName
    );
  }

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

  const coursesPriceMap = new Map<string, number>();
  courses.forEach((c: any) => coursesPriceMap.set(c.id, Number(c.price) || 0));

  const groupsMap = new Map<string, any>();
  groups.forEach((g: any) => groupsMap.set(g.id, g));

  const studentGroupsMap = new Map<string, any[]>();
  studentGroups.forEach((sg: any) => {
    const list = studentGroupsMap.get(sg.studentId) || [];
    list.push(sg);
    studentGroupsMap.set(sg.studentId, list);
  });

  // Calculate actual debtors and debt
  let calculatedDebt = 0;
  let calculatedDebtorsCount = 0;
  const processedStIds = new Set<string>();

  students.forEach((st: any) => {
    const sgs = studentGroupsMap.get(st.id) || [];
    const activeGroups = sgs.map((sg: any) => groupsMap.get(sg.groupId)).filter(Boolean);

    const stPayments = payments.filter((p: any) => p.studentId === st.id);
    const paid = stPayments
      .filter((p: any) => p.status === 'TOLANGAN' || p.status === 'QISMAN')
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

    let due = 0;
    activeGroups.forEach((g: any) => {
      due += coursesPriceMap.get(g.courseId) || 0;
    });

    const debt = Math.max(0, due - paid);
    if (debt > 0 && due > 0) {
      processedStIds.add(st.id);
      calculatedDebt += debt;
      calculatedDebtorsCount += 1;
    }
  });

  payments.forEach((p: any) => {
    if ((p.status === 'TOLANMAGAN' || p.status === 'QISMAN') && p.studentId && !processedStIds.has(p.studentId)) {
      const debt = Number(p.amount) || 0;
      if (debt > 0) {
        processedStIds.add(p.studentId);
        calculatedDebt += debt;
        calculatedDebtorsCount += 1;
      }
    }
  });

  const effectiveDebt = calculatedDebt > 0 ? calculatedDebt : totalDebt;

  // Expenses and Teacher salaries
  const paidExpensesList = expenses.filter((e: any) => e.status !== 'BEKOR_QILINDI');
  const totalExpensesAmount = paidExpensesList.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
  const totalTeacherSalariesAmount = paidExpensesList
    .filter((e: any) => {
      const t = (e.type || '').toUpperCase();
      const note = (e.note || '').toLowerCase();
      return t === 'USTOZ_MAOSHI' || note.includes('maosh') || note.includes('oylik');
    })
    .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

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

  // Guard 2: Direct route for Teacher
  if (callerRole === 'TEACHER') {
    const tName = teacherInfo?.name || 'Ustoz';
    const myGroups = teacherInfo?.myGroups || groups.filter((g: any) => g.teacherId === teacherInfo?.teacherId);
    const myGroupIds = new Set(myGroups.map((g: any) => g.id));
    const myStudents = teacherInfo?.myStudents || students.filter((s: any) => {
      const sgs = studentGroupsMap.get(s.id) || [];
      return sgs.some((sg: any) => myGroupIds.has(sg.groupId));
    });
    const myAttendances = teacherInfo?.myAttendances || attendances.filter((a: any) => myGroupIds.has(a.groupId));
    const todayMyGroups = myGroups.filter((g: any) => Array.isArray(g.days) && g.days.includes(todayDayCode));

    if (taskType === 'dashboard_summary') {
      return generateTeacherDashboardSummary(
        tName,
        centerName,
        myGroups,
        myStudents,
        todayMyGroups,
        roomsMap,
        groupStudentCounts,
        todayDayNameUz,
        myAttendances
      );
    }

    if (taskType === 'student_analysis') {
      return generateTeacherStudentAnalysis(tName, myGroups, myStudents, myAttendances);
    }

    if (taskType === 'attendance_analysis') {
      return generateTeacherAttendanceAnalysis(tName, centerName, myGroups, myStudents, myAttendances, todayTashkentIso);
    }

    if (taskType === 'teacher_load') {
      return generateTeacherOwnWorkload(tName, centerName, myGroups, groupStudentCounts);
    }

    if (taskType === 'finance_analysis' || taskType === 'teacher_methodology') {
      return generateTeacherMethodologyAdvice(tName, myGroups, centerName);
    }

    if (taskType === 'chat_qa') {
      return generateTeacherAssistantAnswer(
        userQuestion || '',
        tName,
        centerName,
        myGroups,
        myStudents,
        todayMyGroups,
        roomsMap,
        groupStudentCounts,
        todayDayNameUz,
        myAttendances,
        todayTashkentIso
      );
    }

    return generateTeacherDashboardSummary(
      tName,
      centerName,
      myGroups,
      myStudents,
      todayMyGroups,
      roomsMap,
      groupStudentCounts,
      todayDayNameUz,
      myAttendances
    );
  }

  // ==========================================
  // 4. ADMIN & SUPERADMIN ANALYTICS DISPATCH
  // ==========================================

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
        `Umumiy moliyaviy aylanma: Yig'ilgan to'lovlar ${formatMoney(totalCollected)} so'm, kutilayotgan qarzdorlik ${formatMoney(effectiveDebt)} so'm.`
      );
      lines.push(`• Tizim barqaror va barcha markaz ma'lumotlar bazalari normal yuklama bilan ishlamoqda.`);
      lines.push(`• Tavsiya: Markazlar faolligini oshirish uchun yangi o'quv markazlarini jalb qilish va o'qituvchilar reytingini kengaytirish mumkin.`);
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
      effectiveDebt,
      todayTashkentIso,
      todayDayNameUz,
      teachersMap,
      roomsMap,
      groupStudentCounts,
      studentsMap,
      totalExpensesAmount,
      totalTeacherSalariesAmount,
      calculatedDebtorsCount
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
    return generateFinanceAnalysis(centerName, students, groups, courses, studentGroups, payments, expenses, teachers);
  }

  // 5. teacher_load
  if (taskType === 'teacher_load') {
    return generateTeacherWorkloadAnalysis(centerName, teachers, groups, groupStudentCounts);
  }

  // 6. chat_qa (Admin Q&A on any center topic)
  if (taskType === 'chat_qa') {
    const q = (userQuestion || '').trim();
    const qLower = q.toLowerCase();

    if (!q) {
      return `"${centerName}" AI yordamchisiman. Markazingiz bugungi holati, davomat, qarzdorlar, ustozlar yoki guruhlar bo'yicha savolingizni bering!`;
    }

    // 1. Attendance issues / absent students
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

    // 2. Today's general status
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
        effectiveDebt,
        todayTashkentIso,
        todayDayNameUz,
        teachersMap,
        roomsMap,
        groupStudentCounts,
        studentsMap,
        totalExpensesAmount,
        totalTeacherSalariesAmount,
        calculatedDebtorsCount
      );
    }

    // 3. Debts / unpaid students / finance
    if (
      qLower.includes('to\'lov') ||
      qLower.includes('tolov') ||
      qLower.includes('qarz') ||
      qLower.includes('qarzdor') ||
      qLower.includes('moliya') ||
      qLower.includes('kassa')
    ) {
      if (qLower.includes('qarz') || qLower.includes('qarzdor')) {
        return generateFinanceAnalysis(centerName, students, groups, courses, studentGroups, payments, expenses, teachers, { onlyDebtors: true });
      }
      return generateFinanceAnalysis(centerName, students, groups, courses, studentGroups, payments, expenses, teachers);
    }

    // 4. Center Expenses / Chiqimlar
    if (
      qLower.includes('xarajat') ||
      qLower.includes('chiqim') ||
      qLower.includes('sarf') ||
      qLower.includes('nimaga xarajat') ||
      qLower.includes('xarajatlar')
    ) {
      return generateFinanceAnalysis(centerName, students, groups, courses, studentGroups, payments, expenses, teachers, { onlyExpenses: true });
    }

    // 5. Teacher Salaries / Oyliklar
    if (
      qLower.includes('oylik') ||
      qLower.includes('maosh') ||
      qLower.includes('ustoz oyligi') ||
      qLower.includes('ustoz maoshi') ||
      qLower.includes('oyliklar')
    ) {
      return generateFinanceAnalysis(centerName, students, groups, courses, studentGroups, payments, expenses, teachers, { onlySalaries: true });
    }

    // 6. Teachers' load
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

    // 7. Groups info
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

    // 8. Students info
    if (qLower.includes('o\'quvchi') || qLower.includes('talaba') || qLower.includes('nechta')) {
      return `"${centerName}" markazida jami ${totalStudents} nafar o'quvchi ro'yxatga olingan (${activeStudents} nafari faol ta'lim olmoqda). Guruhlar soni esa ${totalGroups} tani tashkil etadi.`;
    }

    // 9. Greetings
    if (qLower.match(/^(salom|assalom|qalesiz|qandaysiz|qalaysan|privet|hello|hi)/i)) {
      return `Assalomu alaykum! Men "${centerName}" o'quv markazining AI yordamchisiman. Sizga markazdagi darslar, bugungi davomat, qarzdorlik yoki ustozlar yuklamasi bo'yicha yordam berishga tayyorman.`;
    }

    // 10. Intelligent fallback for admin center questions
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
      effectiveDebt,
      todayTashkentIso,
      todayDayNameUz,
      teachersMap,
      roomsMap,
      groupStudentCounts,
      studentsMap,
      totalExpensesAmount,
      totalTeacherSalariesAmount,
      calculatedDebtorsCount
    );
  }

  return "Tahlil xulosasi tayyorlandi.";
}

export async function POST(req: NextRequest) {
  try {
    const superAdmin = getSuperAdminAuth(req);
    const authUser = getAuthUser(req);

    const body = await req.json().catch(() => ({}));
    const {
      task_type = 'dashboard_summary',
      date_range = 'Oxirgi 30 kun',
      user_question = '',
      prompt = '',
      gemini_api_key = '',
      role: bodyRole = '',
      context: bodyContext = '',
      student_name = '',
      course_name = '',
      topic = '',
      teacher_name = '',
    } = body;

    const effectiveQuestion = (user_question || prompt || '').trim();

    const isSuperAdmin = !!superAdmin;
    const tokenRole = authUser?.role?.toUpperCase();
    // Tutor / methodology modes are harmless chat helpers, so the body may request them;
    // privileged (center data) modes are decided by the token role only.
    const isStudent = tokenRole === 'STUDENT' || (!isSuperAdmin && tokenRole !== 'TEACHER' && task_type === 'student_tutor');

    const isTeacher =
      !isStudent &&
      (tokenRole === 'TEACHER' || (!isSuperAdmin && task_type === 'teacher_methodology'));

    const effectiveRole: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPERADMIN' =
      isStudent
        ? 'STUDENT'
        : isTeacher
        ? 'TEACHER'
        : isSuperAdmin
        ? 'SUPERADMIN'
        : (authUser?.role?.toUpperCase() === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN');

    // Every caller must be authenticated; the role comes from the token, never the request body.
    if (!superAdmin && (!authUser || !authUser.centerId)) {
      return NextResponse.json({ message: "Avtorizatsiyadan o'tilmagan yoki markaz aniqlanmadi" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const effectiveCenterId = authUser?.centerId;

    // ====================================================
    // PATH 1: STUDENT AI REPETITOR (100% ISOLATED & SAFE)
    // ====================================================
    if (isStudent) {
      let centerName = "Toyloq IT Park";
      if (effectiveCenterId) {
        const { data: center } = await supabase.from('centers').select('name').eq('id', effectiveCenterId).maybeSingle();
        if (center?.name) centerName = center.name;
      }

      const apiKey =
        gemini_api_key ||
        process.env.GEMINI_API_KEY ||
        process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
        '';

      if (apiKey) {
        try {
          const studentPrompt = `SEN — IT PARK O'QUV MARKAZINING SHAXSIY AI REPETITORISAN.
O'quvchi ismi: ${student_name || "O'quvchi"}
Kurs: ${course_name || "Frontend Web Dasturlash"}
Oxirgi o'tilgan dars mavzusi: ${topic || "Dasturlash asoslari"}
O'quv markazi: "${centerName}"

O'QUVCHINING SAVOLI: "${effectiveQuestion}"

VAZIFANG:
1. O'quvchiga do'stona, samimiy va ilhomlantiruvchi tilda javob ber.
2. Agar o'quvchi "uyga vazifa" haqida so'rasa, vazifani qanday tartibda bajarish bo'yicha aniq 5 ta amaliy qadamni tushuntir (talablarni o'qish, modullarga bo'lish, mustaqil kod yozish, F12 konsolda testlash, GitHub orqali platformaga topshirish).
3. Agar kod xatoligi yoki dasturlash tushunchasi so'ralsa, sodda hayotiy misol va amaliy kodlar orqali tushuntir.
4. HECH QACHON markaz ma'muriyati, moliyaviy hisobotlar, qarzdorliklar, xarajatlar yoki boshqa o'quvchilar ro'yxatini BERMA! Javobing toza o'zbek tilida bo'lsin.`;

          const modelsToTry = [
            process.env.GEMINI_MODEL,
            'gemini-2.5-flash',
            'gemini-2.5-pro',
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-flash-latest',
          ].filter(Boolean) as string[];

          for (const model of modelsToTry) {
            try {
              const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: studentPrompt }] }],
                    generationConfig: {
                      temperature: 0.4,
                      maxOutputTokens: 1200,
                    },
                  }),
                }
              );

              if (response.ok) {
                const result = await response.json();
                const candidate = result.candidates?.[0]?.content?.parts?.[0]?.text;
                if (candidate && candidate.trim()) {
                  const cleaned = candidate.trim();
                  const isLeaked =
                    cleaned.includes('BUGUNGI HOLATI') ||
                    cleaned.includes('REJALASHTIRILGAN DARSLAR') ||
                    cleaned.includes('SOF FOYDA') ||
                    cleaned.includes('QARZDOR O\'QUVCHILAR');
                  if (!isLeaked) {
                    return NextResponse.json({
                      success: true,
                      result: cleaned,
                      source: 'gemini_ai',
                      task_type: 'student_tutor',
                    });
                  }
                }
              }
            } catch {}
          }
        } catch {}
      }

      // Built-in rule-based student repetitor
      const result = generateStudentTutorAnswer(effectiveQuestion, student_name, course_name, topic, centerName);
      return NextResponse.json({
        success: true,
        result,
        source: 'builtin_engine',
        task_type: 'student_tutor',
      });
    }

    // ====================================================
    // PATH 2: DATA FETCHING FOR TEACHER & ADMIN
    // ====================================================
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
        supabase.from('teachers').select('id, firstName, lastName, phone, status, salaryType, salaryValue, centerId'),
        supabase.from('payments').select('id, amount, status, paymentDate, studentId, groupId, centerId'),
        supabase.from('expenses').select('id, amount, type, ownerName, status, note, date, createdAt, centerId').order('date', { ascending: false }),
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
      // Strict multi-tenant data fetching (ONLY for authUser.centerId!)
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
        supabase.from('teachers').select('id, firstName, lastName, phone, status, salaryType, salaryValue').eq('centerId', effectiveCenterId),
        supabase.from('expenses').select('id, amount, type, ownerName, status, note, date, createdAt').eq('centerId', effectiveCenterId).order('date', { ascending: false }),
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

    // Lookup maps
    const sMap = new Map<string, any>();
    (students || []).forEach((s: any) => sMap.set(s.id, s));
    const gMap = new Map<string, any>();
    (groups || []).forEach((g: any) => gMap.set(g.id, g));
    const cMap = new Map<string, any>();
    (courses || []).forEach((c: any) => cMap.set(c.id, c));
    const sgMap = new Map<string, any[]>();
    (studentGroups || []).forEach((sg: any) => {
      const list = sgMap.get(sg.studentId) || [];
      list.push(sg);
      sgMap.set(sg.studentId, list);
    });

    // Caller teacher details if logged in as TEACHER
    let teacherInfo: {
      name: string;
      teacherId?: string;
      groupsCount: number;
      studentsCount: number;
      myGroups?: any[];
      myStudents?: any[];
      myAttendances?: any[];
    } | undefined;

    if (effectiveRole === 'TEACHER') {
      const myTeacher =
        (teachers || []).find((t: any) => t.id === authUser?.sub) ||
        (teachers || []).find((t: any) =>
          teacher_name &&
          ((t.firstName && teacher_name.includes(t.firstName)) || (t.lastName && teacher_name.includes(t.lastName)))
        ) ||
        (teachers || [])[0];

      const teacherId = myTeacher?.id;
      const myGroups = teacherId ? (groups || []).filter((g: any) => g.teacherId === teacherId) : groups;
      const myGroupIds = new Set(myGroups.map((g: any) => g.id));
      const myStudentIds = new Set(
        (studentGroups || []).filter((sg: any) => myGroupIds.has(sg.groupId)).map((sg: any) => sg.studentId)
      );
      const myStudents = (students || []).filter((st: any) => myStudentIds.has(st.id));
      const myAttendances = (attendances || []).filter((att: any) => myGroupIds.has(att.groupId));

      teacherInfo = {
        name: myTeacher ? `${myTeacher.firstName || ''} ${myTeacher.lastName || ''}`.trim() : (teacher_name || 'Ustoz'),
        teacherId,
        groupsCount: myGroups.length,
        studentsCount: myStudents.length,
        myGroups,
        myStudents,
        myAttendances,
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

    // Calculate debtors for Admin Gemini payload
    const calculatedDebtors: any[] = [];
    const seenStIds = new Set<string>();

    (students || []).forEach((st: any) => {
      const sgs = sgMap.get(st.id) || [];
      const activeG = sgs.map((sg: any) => gMap.get(sg.groupId)).filter(Boolean);
      const stP = (payments || []).filter((p: any) => p.studentId === st.id);
      const paid = stP
        .filter((p: any) => p.status === 'TOLANGAN' || p.status === 'QISMAN')
        .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
      let due = 0;
      const gN: string[] = [];
      activeG.forEach((g: any) => {
        gN.push(g.name || 'Guruh');
        const crs = cMap.get(g.courseId);
        if (crs && Number(crs.price)) due += Number(crs.price);
      });
      const d = Math.max(0, due - paid);
      if (d > 0 && due > 0) {
        seenStIds.add(st.id);
        calculatedDebtors.push({
          student: `${st.firstName || ''} ${st.lastName || ''}`.trim(),
          group: gN.join(', '),
          coursePrice: due,
          totalPaid: paid,
          debt: d,
          parentPhone: getParentPhoneDisplay(st),
        });
      }
    });

    (payments || []).forEach((p: any) => {
      if ((p.status === 'TOLANMAGAN' || p.status === 'QISMAN') && p.studentId && !seenStIds.has(p.studentId)) {
        const amt = Number(p.amount) || 0;
        if (amt > 0) {
          seenStIds.add(p.studentId);
          const st = sMap.get(p.studentId);
          calculatedDebtors.push({
            student: st ? `${st.firstName || ''} ${st.lastName || ''}`.trim() : "O'quvchi",
            group: gMap.get(p.groupId)?.name || 'Guruh',
            coursePrice: amt,
            totalPaid: 0,
            debt: amt,
            parentPhone: getParentPhoneDisplay(st),
          });
        }
      }
    });

    calculatedDebtors.sort((a, b) => b.debt - a.debt);

    // Expenses breakdown for Admin Gemini payload
    const pExpenses = (expenses || []).filter((e: any) => e.status !== 'BEKOR_QILINDI');
    const expensesByCategorySummary: Record<string, number> = {
      IJARA: 0,
      KOMMUNAL: 0,
      REKLAMA: 0,
      JIHOZLAR: 0,
      USTOZ_MAOSHI: 0,
      BOSHQA: 0,
    };
    pExpenses.forEach((e: any) => {
      const t = (e.type || 'BOSHQA').toUpperCase();
      const k = expensesByCategorySummary[t] !== undefined ? t : 'BOSHQA';
      expensesByCategorySummary[k] += Number(e.amount) || 0;
    });

    const teacherSalaryList = pExpenses
      .filter((e: any) => {
        const t = (e.type || '').toUpperCase();
        const note = (e.note || '').toLowerCase();
        return t === 'USTOZ_MAOSHI' || note.includes('maosh') || note.includes('oylik');
      })
      .map((e: any) => ({
        teacher: e.ownerName || 'Ustoz',
        amount: Number(e.amount) || 0,
        date: e.date ? e.date.split('T')[0] : (e.createdAt ? e.createdAt.split('T')[0] : '-'),
        note: e.note || '-',
      }));

    const totalCollectedAmount = (payments || [])
      .filter((p: any) => p.status === 'TOLANGAN' || p.status === 'QISMAN')
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const totalExpensesAmount = pExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
    const totalCalculatedDebt = calculatedDebtors.reduce((sum: number, d: any) => sum + d.debt, 0);

    // External Gemini API key check
    const apiKey =
      gemini_api_key ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      '';

    if (apiKey) {
      try {
        let prompt = '';

        if (effectiveRole === 'TEACHER') {
          // Dedicated TEACHER prompt for Gemini (NO center expenses or debts)
          prompt = `SEN — O'QUV MARKAZINING TAJRIBALI PEDAGOGIK VA METODIK AI YORDAMCHISISAN.
Ustoz ismi: ${teacherInfo?.name || "Ustoz"}
Markaz nomi: "${centerName}"
Biriktirilgan guruhlar: ${(teacherInfo?.myGroups || []).map((g: any) => g.name).join(', ') || 'Dasturlash guruhlari'}
O'quvchilar soni: ${teacherInfo?.studentsCount || 0} nafar
Vazifa turi: ${task_type} (dashboard_summary, student_analysis, attendance_analysis, teacher_load, teacher_methodology, chat_qa)
Ustoz savoli: "${effectiveQuestion}"

VAZIFANG:
1. Ustozga zamonaviy ta'lim metodikasi, dars rejalari, interaktiv dasturlash mashqlari va talabalar faolligini oshirish bo'yicha amaliy yordam ber.
2. Agar davomat haqida so'ralsa, o'quvchilar dars qoldirmasligi uchun pedagogik choralarni tushuntir.
3. Agar dars rejasi yoki amaliy mashq so'ralsa, aniq kod misollari va mini-loyihalar taklif qil.
4. HECH QACHON markazning umumiy kassa balansi, xarajatlari, ijarasi, boshqa ustozlarning oyliklari yoki markaz qarzdorligini aytma!
Javobing toza, chiroyli va o'qishli o'zbek tilida bo'lsin.`;
        } else {
          // ADMIN / SUPERADMIN full management prompt
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
              salaryType: t.salaryType,
              salaryValue: t.salaryValue,
            })),
            financials: {
              totalCollected: totalCollectedAmount,
              totalExpenses: totalExpensesAmount,
              netBalance: totalCollectedAmount - totalExpensesAmount,
              totalDebt: totalCalculatedDebt,
              debtorsCount: calculatedDebtors.length,
            },
            debtorsList: calculatedDebtors.slice(0, 30),
            expensesBreakdown: expensesByCategorySummary,
            recentExpenses: pExpenses.slice(0, 15).map((e: any) => ({
              type: e.type,
              owner: e.ownerName || '-',
              amount: Number(e.amount) || 0,
              date: e.date ? e.date.split('T')[0] : (e.createdAt ? e.createdAt.split('T')[0] : '-'),
              note: e.note || '-',
            })),
            teacherSalaries: {
              totalPaid: teacherSalaryList.reduce((sum: number, s: any) => sum + s.amount, 0),
              payouts: teacherSalaryList.slice(0, 15),
            },
            attendanceCount: {
              total: (attendances || []).length,
              present: (attendances || []).filter((a: any) => a.status === 'KELGAN' || a.status === 'KECHIKKAN').length,
            },
          };

          prompt = SYSTEM_PROMPT_TEMPLATE
            .replace('{{task_type}}', task_type)
            .replace('{{center_name}}', centerName)
            .replace('{{user_role}}', effectiveRole)
            .replace('{{date_range}}', date_range)
            .replace('{{data}}', JSON.stringify(summarizedDataPayload, null, 2))
            .replace('{{user_question}}', effectiveQuestion);
        }

        const modelsToTry = Array.from(
          new Set(
            [
              process.env.GEMINI_MODEL,
              'gemini-2.5-flash',
              'gemini-2.5-pro',
              'gemini-1.5-pro',
              'gemini-1.5-flash',
              'gemini-flash-latest',
            ].filter(Boolean) as string[]
          )
        );

        let generatedText = '';

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
                const cleaned = candidate.trim();
                if (effectiveRole === 'TEACHER') {
                  const leaksCenterAdmin =
                    cleaned.includes('SOF FOYDA') ||
                    cleaned.includes('KASSA') ||
                    cleaned.includes('QARZDOR O\'QUVCHILAR');
                  if (!leaksCenterAdmin) {
                    generatedText = cleaned;
                    break;
                  }
                } else {
                  generatedText = cleaned;
                  break;
                }
              }
            }
          } catch {}
        }

        if (generatedText) {
          return NextResponse.json({
            success: true,
            result: generatedText,
            source: 'gemini_ai',
            task_type,
          });
        }
      } catch (geminiError) {
        console.error('Gemini API call failed, falling back to built-in analytics:', geminiError);
      }
    }

    // High-precision role-specific built-in engine fallback
    const result = generateBuiltinAnalysis(
      task_type,
      centerName,
      date_range,
      rawData,
      effectiveQuestion,
      effectiveRole,
      teacherInfo,
      { centersCount },
      { studentName: student_name, courseName: course_name, topic }
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
