import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { requireStaff } from '@/lib/authz';
import { dbErrorResponse, serverErrorResponse } from '@/lib/dbErrors';
import { ENUMS, date as dateRule, firstError, money, oneOf } from '@/lib/validation';
import { evaluateMonthlyPayment } from '@/lib/paymentRules';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const staffOnly = requireStaff(authUser);
    if (staffOnly) return staffOnly;

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('payments')
      .select('*, student:students(*), group:groups(*), course:courses(*)')
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ message: 'To\'lov topilmadi' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const inputError = firstError(
      amount !== undefined ? money(amount, "To'lov summasi") : null,
      method !== undefined ? oneOf(method, ENUMS.paymentMethod, "To'lov usuli") : null,
      status !== undefined ? oneOf(status, ENUMS.paymentStatus, "To'lov holati") : null,
      paymentDate !== undefined ? dateRule(paymentDate, "To'lov sanasi") : null
    );
    if (inputError) {
      return NextResponse.json({ message: inputError }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Re-pointing a payment must stay inside the caller's center
    const refChecks: Array<[string, string | undefined | null, string]> = [
      ['students', studentId, 'Talaba'],
      ['groups', groupId, 'Guruh'],
      ['courses', courseId, 'Kurs'],
    ];
    for (const [table, refId, label] of refChecks) {
      if (!refId) continue;
      const { data: ref } = await supabase
        .from(table)
        .select('id')
        .eq('id', refId)
        .eq('centerId', authUser.centerId)
        .maybeSingle();
      if (!ref) return NextResponse.json({ message: `${label} topilmadi` }, { status: 404 });
    }

    const { data: current } = await supabase
      .from('payments')
      .select('studentId, groupId, courseId, amount, paymentDate, status')
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
      .maybeSingle();
    if (!current) return NextResponse.json({ message: "To'lov topilmadi" }, { status: 404 });

    // The edited payment must still fit the monthly price together with the month's other parts
    const affectsMonth =
      studentId !== undefined || groupId !== undefined || courseId !== undefined ||
      amount !== undefined || paymentDate !== undefined || status !== undefined;
    let evaluatedStatus: string | undefined;
    if (affectsMonth) {
      const evaluation = await evaluateMonthlyPayment(supabase, authUser.centerId, {
        studentId: studentId !== undefined ? studentId : current.studentId,
        groupId: groupId !== undefined ? groupId || null : current.groupId,
        courseId: courseId !== undefined ? courseId || null : current.courseId,
        payDate: new Date(paymentDate !== undefined ? paymentDate : current.paymentDate),
        amount: amount !== undefined ? Number(amount) : Number(current.amount),
        status: status !== undefined ? status : current.status,
        excludePaymentId: params.id,
      });
      if (!evaluation.ok) {
        return NextResponse.json({ message: evaluation.message }, { status: 400 });
      }
      evaluatedStatus = evaluation.status;
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (studentId !== undefined) updateData.studentId = studentId;
    if (groupId !== undefined) updateData.groupId = groupId || null;
    if (courseId !== undefined) updateData.courseId = courseId || null;
    if (amount !== undefined) updateData.amount = Number(amount);
    if (paymentDate !== undefined) updateData.paymentDate = new Date(paymentDate).toISOString();
    if (method !== undefined) updateData.method = method;
    // The status follows the month's totals (QISMAN until the price is reached, then TOLANGAN)
    if (evaluatedStatus !== undefined) updateData.status = evaluatedStatus;

    const { data, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
      .select('*, student:students(*), group:groups(*), course:courses(*)')
      .single();

    if (error) {
      return dbErrorResponse(error);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }
    if (authUser.role === 'TEACHER' || authUser.role === 'STUDENT') {
      return NextResponse.json({ message: "Ruxsat yo'q" }, { status: 403 });
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', params.id)
      .eq('centerId', authUser.centerId);

    if (error) {
      return dbErrorResponse(error);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}
