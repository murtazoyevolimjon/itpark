import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { dbErrorResponse } from '@/lib/dbErrors';
import { ENUMS, date as dateRule, firstError, money, oneOf } from '@/lib/validation';
import { parseStudentCreds } from '@/lib/credentials';
import { sendPaymentAlert } from '@/lib/telegram';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page =parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const sortBy = searchParams.get('sortBy') || 'paymentDate';
    const order = searchParams.get('order') === 'asc' ? true : false;
    const studentId = searchParams.get('studentId');
    const groupId = searchParams.get('groupId');

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('payments')
      .select('*, student:students(*), group:groups(*), course:courses(*)', { count: 'exact' })
      .eq('centerId', authUser.centerId);

    if (studentId) query = query.eq('studentId', studentId);
    if (groupId) query = query.eq('groupId', groupId);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order(sortBy, { ascending: order })
      .range(from, to);

    if (error) {
      return dbErrorResponse(error);
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }
    if (authUser.role === 'TEACHER' || authUser.role === 'STUDENT') {
      return NextResponse.json({ message: "Ruxsat yo'q" }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, groupId, courseId, amount, paymentDate, method, status } = body;

    if (!studentId) {
      return NextResponse.json({ message: 'Talaba tanlanishi shart' }, { status: 400 });
    }
    const inputError = firstError(
      money(amount, "To'lov summasi"),
      method ? oneOf(method, ENUMS.paymentMethod, "To'lov usuli") : null,
      status ? oneOf(status, ENUMS.paymentStatus, "To'lov holati") : null,
      dateRule(paymentDate, "To'lov sanasi", { required: false })
    );
    if (inputError) {
      return NextResponse.json({ message: inputError }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Student / group / course must belong to the caller's center
    const [studentRow, groupRow, courseRow] = await Promise.all([
      supabase.from('students').select('id').eq('id', studentId).eq('centerId', authUser.centerId).maybeSingle(),
      groupId
        ? supabase.from('groups').select('id').eq('id', groupId).eq('centerId', authUser.centerId).maybeSingle()
        : Promise.resolve({ data: true }),
      courseId
        ? supabase.from('courses').select('id').eq('id', courseId).eq('centerId', authUser.centerId).maybeSingle()
        : Promise.resolve({ data: true }),
    ]);
    if (!studentRow.data) return NextResponse.json({ message: 'Talaba topilmadi' }, { status: 404 });
    if (!groupRow.data) return NextResponse.json({ message: 'Guruh topilmadi' }, { status: 404 });
    if (!courseRow.data) return NextResponse.json({ message: 'Kurs topilmadi' }, { status: 404 });

    const payDate = paymentDate ? new Date(paymentDate) : new Date();

    // Check month boundary: 1st of month 00:00:00 to last day 23:59:59
    const year = payDate.getFullYear();
    const month = payDate.getMonth();
    const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0)).toISOString();
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString();

    // Strict Rule: A student can only pay once per course/group in the same calendar month
    let duplicateCheckQuery = supabase
      .from('payments')
      .select('id, amount, paymentDate, status, group:groups(name)')
      .eq('centerId', authUser.centerId)
      .eq('studentId', studentId)
      .gte('paymentDate', startOfMonth)
      .lte('paymentDate', endOfMonth)
      .neq('status', 'TOLANMAGAN');

    if (groupId) {
      duplicateCheckQuery = duplicateCheckQuery.eq('groupId', groupId);
    }

    const { data: existingPayments, error: checkError } = await duplicateCheckQuery;

    if (checkError) {
      return NextResponse.json({ message: checkError.message }, { status: 500 });
    }

    if (existingPayments && existingPayments.length > 0) {
      const monthNames = [
        'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
        'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
      ];
      const monthName = `${monthNames[month]} ${year}`;
      const groupName = (existingPayments[0] as any)?.group?.name || 'ushbu guruh';

      return NextResponse.json(
        {
          message: `Bu talaba ${groupName} uchun ${monthName} oyida allaqachon to'lov qilgan! Bir oyda bitta fandan faqat 1 marta to'lov qilinishi mumkin. Qolib ketgan oy uchun to'lamoqchi bo'lsangiz, o'sha oy sanasini tanlang.`,
        },
        { status: 400 }
      );
    }

    let targetGroupId = groupId || null;
    let targetCourseId = courseId || null;

    if (!targetGroupId) {
      const { data: sg } = await supabase
        .from('student_groups')
        .select('groupId, group:groups(courseId)')
        .eq('studentId', studentId)
        .eq('centerId', authUser.centerId)
        .limit(1)
        .maybeSingle();

      if (sg) {
        targetGroupId = sg.groupId;
        targetCourseId = (sg as any)?.group?.courseId || targetCourseId;
      }
    }

    const id = crypto.randomUUID();

    const { data, error } = await supabase
      .from('payments')
      .insert({
        id,
        studentId,
        groupId: targetGroupId,
        courseId: targetCourseId,
        amount: Number(amount) || 0,
        paymentDate: payDate.toISOString(),
        method: method || 'NAQD',
        status: status || 'TOLANGAN',
        receivedById: authUser.sub,
        centerId: authUser.centerId,
        updatedAt: new Date().toISOString(),
      })
      .select('*, student:students(*), group:groups(*), course:courses(*)')
      .single();

    if (error) {
      return dbErrorResponse(error);
    }

    // Dispatch Telegram payment receipt alert asynchronously
    if (data && data.student) {
      const student = data.student;
      const creds = parseStudentCreds(student.passportSeries, student.phone);
      const studentChatId = creds.tgChatId;
      const parentChatId = creds.parentTgChatId;

      if (studentChatId || parentChatId) {
        const studentFullName = `${student.firstName} ${student.lastName}`.trim();
        const courseTitle = data.course?.name || data.group?.name || 'Kurs';
        const receiptCode = `ITP-REC-${data.id.slice(0, 8).toUpperCase()}`;
        const payDateStr = new Date(data.paymentDate).toLocaleDateString('uz-UZ');

        sendPaymentAlert({
          studentName: studentFullName,
          amount: data.amount,
          courseName: courseTitle,
          receiptNumber: receiptCode,
          date: payDateStr,
          chatId: studentChatId,
          parentChatId,
          centerName: authUser.centerName,
          method: data.method === 'NAQD' ? 'Naqd pul' : data.method === 'KARTA' ? 'Karta' : "O'tkazma",
        }).catch((err) => console.error('Error sending telegram payment alert:', err));
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
