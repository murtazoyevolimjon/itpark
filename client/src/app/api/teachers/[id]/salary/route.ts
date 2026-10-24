import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/lib/dbErrors';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { fetchAll } from '@/lib/pagedFetch';

const UZ_MONTH_NAMES: Record<string, string> = {
  '01': 'Yanvar',
  '02': 'Fevral',
  '03': 'Mart',
  '04': 'Aprel',
  '05': 'May',
  '06': 'Iyun',
  '07': 'Iyul',
  '08': 'Avgust',
  '09': 'Sentabr',
  '10': 'Oktabr',
  '11': 'Noyabr',
  '12': 'Dekabr',
};

function monthRange_(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10), end: new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10) };
}

function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split('-');
  const name = UZ_MONTH_NAMES[month] || month;
  return `${name} ${year}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // Determine target teacher ID
    let teacherId = params.id;
    if (teacherId === 'me' || authUser.role === 'TEACHER') {
      teacherId = authUser.sub;
    }

    // Security check: teacher can only see their own salary
    if (authUser.role === 'TEACHER' && teacherId !== authUser.sub) {
      return NextResponse.json({ message: "Ruxsat etilmagan" }, { status: 403 });
    }

    // 1. Fetch teacher info
    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('id, firstName, lastName, phone, salaryType, salaryValue, status, centerId')
      .eq('id', teacherId)
      .eq('centerId', authUser.centerId)
      .maybeSingle();

    if (tErr || !teacher) {
      return NextResponse.json({ message: "O'qituvchi topilmadi" }, { status: 404 });
    }

    // 2. Fetch groups of this teacher
    const { data: groups, error: gErr } = await supabase
      .from('groups')
      .select('id, name, courseId, status, courses(id, name, price)')
      .eq('teacherId', teacherId)
      .eq('centerId', authUser.centerId);

    if (gErr) {
      return serverErrorResponse(gErr);
    }

    const groupList = groups || [];
    const groupIds = groupList.map((g: any) => g.id);

    // 3. Fetch student_groups for these groups
    let studentGroupsList: any[] = [];
    if (groupIds.length > 0) {
      const readMembers = (cols: string) =>
        fetchAll<any>((from, to) =>
          supabase.from('student_groups').select(cols).in('groupId', groupIds).order('id').range(from, to)
        );
      try {
        studentGroupsList = await readMembers('id, groupId, studentId, joinedAt, billingStartDate, students(id, firstName, lastName, phone, status)');
      } catch (err: any) {
        if (!/billingStartDate/i.test(String(err?.message || ''))) throw err;
        studentGroupsList = await readMembers('id, groupId, studentId, joinedAt, students(id, firstName, lastName, phone, status)');
      }
    }

    const allStudentIds = Array.from(new Set(studentGroupsList.map((sg: any) => sg.studentId)));

    // 4. Fetch payments
    let paymentsList: any[] = [];
    if (groupIds.length > 0 || allStudentIds.length > 0) {
      // Paged: one request is cut off at 1000 rows, which made big centers' salaries too low
      const monthParam = new URL(req.url).searchParams.get('month') || '';
      const monthRange = /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthRange_(monthParam) : null;
      const cols = 'id, studentId, groupId, courseId, amount, paymentDate, method, status';
      const base = () => {
        let q = supabase.from('payments').select(cols).eq('centerId', authUser.centerId).in('status', ['TOLANGAN', 'QISMAN']);
        if (monthRange) q = q.gte('paymentDate', monthRange.start).lt('paymentDate', monthRange.end);
        return q;
      };
      const chunks: string[][] = [];
      for (let i = 0; i < allStudentIds.length; i += 150) chunks.push(allStudentIds.slice(i, i + 150));
      // Only this teacher's groups, plus old payments without a group for their students
      const [byGroup, ...noGroup] = await Promise.all([
        groupIds.length > 0
          ? fetchAll<any>((from, to) => base().in('groupId', groupIds).order('id').range(from, to))
          : Promise.resolve([] as any[]),
        ...chunks.map((ids) => fetchAll<any>((from, to) => base().is('groupId', null).in('studentId', ids).order('id').range(from, to))),
      ]);
      paymentsList = [...byGroup, ...noGroup.flat()];
    }

    // Months run from the month the center started using the platform up to now: nothing earlier can have data
    const now = new Date();
    const { data: centerRow } = await supabase.from('centers').select('createdAt').eq('id', authUser.centerId).maybeSingle();
    const created = centerRow?.createdAt ? new Date(centerRow.createdAt) : now;
    const startDate = Number.isNaN(created.getTime()) || created > now ? now : created;
    const monthSet = new Set<string>();
    for (let d = new Date(startDate.getFullYear(), startDate.getMonth(), 1); d <= now; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sortedMonths = Array.from(monthSet).sort().reverse();
    const availableMonths = [
      ...sortedMonths.map((ym) => ({
        value: ym,
        label: ym === currentYm ? `${formatMonthLabel(ym)} (Joriy oy)` : formatMonthLabel(ym),
      })),
      { value: 'all', label: 'Barcha vaqt (Umumiy hisob)' },
    ];

    // Determine requested month filter
    const { searchParams } = new URL(req.url);
    let requestedMonth = searchParams.get('month') || '';

    if (!requestedMonth) {
      requestedMonth = currentYm;
    }

    // Filter payments by requested month
    const filteredPayments = requestedMonth === 'all'
      ? paymentsList
      : paymentsList.filter(
          (p: any) => p.paymentDate && p.paymentDate.startsWith(requestedMonth)
        );

    // Map payments by (groupId + '_' + studentId) or studentId
    const studentPaymentsMap: Record<string, any[]> = {};
    filteredPayments.forEach((p: any) => {
      const sId = p.studentId;
      if (!studentPaymentsMap[sId]) studentPaymentsMap[sId] = [];
      studentPaymentsMap[sId].push(p);
    });

    // 5. Build Student payment rows
    const studentRows: any[] = [];
    const uniquePaidStudentIds = new Set<string>();
    const uniquePartialStudentIds = new Set<string>();
    const uniqueUnpaidStudentIds = new Set<string>();
    const allUniqueStudentIds = new Set<string>();

    // Group breakdown map
    const groupStatsMap: Record<string, any> = {};
    groupList.forEach((g: any) => {
      const course = g.courses || {};
      groupStatsMap[g.id] = {
        groupId: g.id,
        groupName: g.name,
        courseName: course.name || "Noma'lum kurs",
        coursePrice: Number(course.price) || 0,
        totalStudents: 0,
        paidCount: 0,
        partialCount: 0,
        unpaidCount: 0,
        totalCollected: 0,
        calculatedSalary: 0,
      };
    });

    const monthEnd = requestedMonth === 'all' ? null : monthRange_(requestedMonth).end;
    // A payment without a group counts once: for the student's oldest group of this teacher
    const noGroupOwner = new Map<string, string>();
    [...studentGroupsList]
      .sort((a: any, b: any) => String(a.billingStartDate || a.joinedAt || '').localeCompare(String(b.billingStartDate || b.joinedAt || '')))
      .forEach((sg: any) => {
        if (!noGroupOwner.has(sg.studentId)) noGroupOwner.set(sg.studentId, sg.groupId);
      });

    studentGroupsList.forEach((sg: any) => {
      const student = sg.students;
      if (!student) return;
      const startedAt = String(sg.billingStartDate || sg.joinedAt || '').slice(0, 10);
      if (monthEnd && startedAt && startedAt >= monthEnd) return;

      const g = groupList.find((grp: any) => grp.id === sg.groupId);
      const course = Array.isArray(g?.courses) ? g.courses[0] : g?.courses;
      const coursePrice = Number(course?.price) || 0;
      const grpStats = groupStatsMap[sg.groupId];

      if (grpStats) {
        grpStats.totalStudents += 1;
      }
      allUniqueStudentIds.add(student.id);

      // Payments for this student
      const stPayments = (studentPaymentsMap[student.id] || []).filter((p: any) => {
        // If payment has groupId, match it, otherwise assume it's for this group
        return p.groupId ? p.groupId === sg.groupId : noGroupOwner.get(sg.studentId) === sg.groupId;
      });

      const paidAmount = stPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
      const remainingDebt = Math.max(0, coursePrice - paidAmount);

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

      if (status === 'TOLANGAN') {
        uniquePaidStudentIds.add(student.id);
        if (grpStats) grpStats.paidCount += 1;
      } else if (status === 'QISMAN') {
        uniquePartialStudentIds.add(student.id);
        if (grpStats) grpStats.partialCount += 1;
      } else {
        uniqueUnpaidStudentIds.add(student.id);
        if (grpStats) grpStats.unpaidCount += 1;
      }

      if (grpStats) {
        grpStats.totalCollected += paidAmount;
      }

      // Sort latest payment
      const sortedStPayments = [...stPayments].sort(
        (a: any, b: any) => new Date(b.paymentDate || 0).getTime() - new Date(a.paymentDate || 0).getTime()
      );
      const lastP = sortedStPayments[0] || null;

      studentRows.push({
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`.trim(),
        studentPhone: student.phone || '',
        groupId: sg.groupId,
        groupName: g?.name || "Noma'lum guruh",
        courseName: course?.name || '',
        coursePrice,
        paidAmount,
        remainingDebt,
        status,
        paymentDate: lastP?.paymentDate || null,
        paymentMethod: lastP?.method || null,
      });
    });

    // 6. Calculate teacher salary
    const totalCollected = filteredPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const paidStudentsCount = uniquePaidStudentIds.size;
    const partialStudentsCount = uniquePartialStudentIds.size;
    const unpaidStudentsCount = uniqueUnpaidStudentIds.size;
    const totalStudentsCount = allUniqueStudentIds.size;

    let calculatedSalary = 0;
    let salaryFormula = '';

    const sType = teacher.salaryType || 'PERCENT';
    const sValue = Number(teacher.salaryValue) || 0;

    if (sType === 'PERCENT') {
      calculatedSalary = Math.round(totalCollected * (sValue / 100));
      salaryFormula = `${sValue}% (Foiz) × ${totalCollected.toLocaleString('uz-UZ')} so'm`;
      
      // Calculate per group share
      Object.values(groupStatsMap).forEach((grp: any) => {
        grp.calculatedSalary = Math.round(grp.totalCollected * (sValue / 100));
      });
    } else {
      // FIXED
      if (sValue < 1000000) {
        // Per paid student rate (e.g. 120,000 so'm or 200,000 so'm)
        calculatedSalary = paidStudentsCount * sValue;
        salaryFormula = `${paidStudentsCount} ta to'lov qilgan o'quvchi × ${sValue.toLocaleString('uz-UZ')} so'm`;

        // Calculate per group share
        Object.values(groupStatsMap).forEach((grp: any) => {
          grp.calculatedSalary = grp.paidCount * sValue;
        });
      } else {
        // Fixed monthly salary base (e.g. 4,500,000 so'm)
        calculatedSalary = sValue;
        salaryFormula = `Fikslangan oylik maosh: ${sValue.toLocaleString('uz-UZ')} so'm`;

        const totalGrpCount = Object.keys(groupStatsMap).length || 1;
        Object.values(groupStatsMap).forEach((grp: any) => {
          grp.calculatedSalary = Math.round(sValue / totalGrpCount);
        });
      }
    }

    const groupsArray = Object.values(groupStatsMap);

    return NextResponse.json({
      teacher: {
        id: teacher.id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        phone: teacher.phone,
        salaryType: teacher.salaryType,
        salaryValue: Number(teacher.salaryValue) || 0,
      },
      filter: {
        selectedMonth: requestedMonth,
        selectedMonthLabel: requestedMonth === 'all' ? 'Barcha vaqt' : formatMonthLabel(requestedMonth),
        availableMonths,
      },
      summary: {
        totalGroups: groupList.length,
        totalStudents: totalStudentsCount,
        paidStudentsCount,
        partialStudentsCount,
        unpaidStudentsCount,
        totalCollected,
        calculatedSalary,
        salaryFormula,
      },
      groups: groupsArray,
      students: studentRows,
    });
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}
