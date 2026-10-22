import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { clampLimit, clampPage, safeSearch } from '@/lib/pagedFetch';
import { requireStaff } from '@/lib/authz';
import { dbErrorResponse, serverErrorResponse } from '@/lib/dbErrors';
import { ENUMS, date as dateRule, firstError, money, oneOf } from '@/lib/validation';
import { parseStudentCreds } from '@/lib/credentials';
import { evaluateMonthlyPayment } from '@/lib/paymentRules';
import { fetchCenterName, sendPaymentAlert } from '@/lib/telegram';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const staffOnly = requireStaff(authUser);
    if (staffOnly) return staffOnly;

    const { searchParams } = new URL(req.url);
    const page = clampPage(searchParams.get('page'));
    const limit = clampLimit(searchParams.get('limit'), 10, 500);
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
    return serverErrorResponse(error);
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

    // Group, monthly price and status: parts of one month may be paid separately but never exceed the price
    const evaluation = await evaluateMonthlyPayment(supabase, authUser.centerId, {
      studentId,
      groupId,
      courseId,
      payDate,
      amount: Number(amount) || 0,
      status,
    });
    if (!evaluation.ok) {
      return NextResponse.json({ message: evaluation.message }, { status: 400 });
    }
    const targetGroupId = evaluation.groupId;
    const targetCourseId = evaluation.courseId;
    const finalStatus = evaluation.status;
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
        status: finalStatus,
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

        // Awaited: a serverless function may be frozen right after the response is sent
        await sendPaymentAlert({
          studentName: studentFullName,
          amount: data.amount,
          courseName: courseTitle,
          receiptNumber: receiptCode,
          date: payDateStr,
          chatId: studentChatId,
          parentChatId,
          centerName: await fetchCenterName(supabase, authUser.centerId),
          method: data.method === 'NAQD' ? 'Naqd pul' : data.method === 'KARTA' ? 'Karta' : "O'tkazma",
        }).catch((err) => console.error('Error sending telegram payment alert:', err));
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}
