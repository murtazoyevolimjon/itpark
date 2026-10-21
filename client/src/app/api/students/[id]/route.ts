import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { dbErrorResponse } from '@/lib/dbErrors';
import { checkEnrollment, violationResponse } from '@/lib/groupRules';
import { ENUMS, date, firstError, oneOf, phone as phone_, phoneDigits, text } from '@/lib/validation';
import {
  parseStudentCreds,
  serializeStudentCreds,
} from '@/lib/credentials';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const studentId = params.id === 'me' ? authUser.sub : params.id;
    const { data: student, error } = await supabase
      .from('students')
      .select(`
        *,
        studentGroups:student_groups(*, group:groups(*, course:courses(*), teacher:teachers(*))),
        attendances:attendances(*),
        payments:payments(*)
      `)
      .eq('id', studentId)
      .eq('centerId', authUser.centerId)
      .maybeSingle();

    if (error || !student) {
      return NextResponse.json({ message: 'Talaba topilmadi' }, { status: 404 });
    }

    const sgList = (student.studentGroups || (student as any).student_groups || []).sort((a: any, b: any) => {
      const dateA = new Date(a.updatedAt || a.createdAt || a.joinedAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || b.joinedAt || 0).getTime();
      return dateB - dateA;
    });

    const attendances = student.attendances || [];
    const totalAttendances = attendances.length;
    const presentCount = attendances.filter((a: any) => a.status === 'KELGAN').length;
    const attendancePercentage = totalAttendances > 0 ? Math.round((presentCount / totalAttendances) * 100) : 100;

    const creds = parseStudentCreds(student.passportSeries, student.phone);
    const canSeeCreds = authUser.role !== 'TEACHER';

    return NextResponse.json({
      ...student,
      // Teachers must not receive student login/password data.
      passportSeries: canSeeCreds ? student.passportSeries : creds.subject || null,
      subject: creds.subject || null,
      studentGroups: sgList,
      totalAttendances,
      presentCount,
      attendancePercentage,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
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
    const supabase = createServerSupabaseClient();

    // Fetch existing student to get current credentials & phone
    const { data: currentStudent, error: fetchErr } = await supabase
      .from('students')
      .select('*')
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
      .maybeSingle();

    if (fetchErr || !currentStudent) {
      return NextResponse.json({ message: 'Talaba topilmadi' }, { status: 404 });
    }

    const inputError = firstError(
      body.firstName !== undefined ? text(body.firstName, 'Ism', 60) : null,
      body.lastName !== undefined ? text(body.lastName, 'Familiya', 60) : null,
      body.phone !== undefined ? phone_(body.phone, 'Telefon raqam') : null,
      body.fatherPhone ? phone_(body.fatherPhone, 'Otasining telefon raqami') : null,
      body.motherPhone ? phone_(body.motherPhone, 'Onasining telefon raqami') : null,
      body.birthDate !== undefined ? date(body.birthDate, "Tug'ilgan sana", { notFuture: true }) : null,
      body.gender !== undefined ? oneOf(body.gender, ENUMS.gender, 'Jins') : null,
      body.status !== undefined ? oneOf(body.status, ENUMS.studentStatus, 'Holat') : null
    );
    if (inputError) {
      return NextResponse.json({ message: inputError }, { status: 400 });
    }

    // At least one parent phone must stay on the student
    const nextFather = body.fatherPhone !== undefined ? body.fatherPhone : currentStudent.fatherPhone;
    const nextMother = body.motherPhone !== undefined ? body.motherPhone : currentStudent.motherPhone;
    if (!phoneDigits(nextFather) && !phoneDigits(nextMother)) {
      return NextResponse.json(
        { message: "Otasi yoki onasining telefon raqamini kiritish majburiy" },
        { status: 400 }
      );
    }

    // Moving the student into another group: same rules as enrolling (open group, free seat, no clash)
    if (body.groupId) {
      const { data: memberships } = await supabase
        .from('student_groups')
        .select('groupId')
        .eq('studentId', params.id);
      const currentIds = (memberships || []).map((m: any) => m.groupId);
      if (!currentIds.includes(body.groupId)) {
        const violation = await checkEnrollment(
          supabase,
          authUser.centerId,
          body.groupId,
          params.id,
          currentIds
        );
        if (violation) return violationResponse(violation);
      }
    }

    const existingCreds = parseStudentCreds(currentStudent.passportSeries, currentStudent.phone);

    const targetSubject = body.subject !== undefined
      ? (body.subject || '').trim()
      : (body.passportSeries !== undefined ? (body.passportSeries || '').trim() : existingCreds.subject);

    // Keep the student's existing login/password; only the subject may change here.
    const serializedCreds = serializeStudentCreds(existingCreds.login, existingCreds.password, targetSubject, existingCreds.tgChatId, existingCreds.tgUser, existingCreds.parentTgChatId);

    const updatePayload: any = {
      passportSeries: serializedCreds,
      updatedAt: new Date().toISOString(),
    };

    if (body.firstName !== undefined) updatePayload.firstName = body.firstName;
    if (body.lastName !== undefined) updatePayload.lastName = body.lastName;
    if (body.birthDate !== undefined) updatePayload.birthDate = new Date(body.birthDate).toISOString();
    if (body.phone !== undefined) updatePayload.phone = body.phone;
    if (body.fatherPhone !== undefined) updatePayload.fatherPhone = body.fatherPhone || null;
    if (body.motherPhone !== undefined) updatePayload.motherPhone = body.motherPhone || null;
    if (body.gender !== undefined) updatePayload.gender = body.gender;
    if (body.isSchoolStudent !== undefined) updatePayload.isSchoolStudent = body.isSchoolStudent;
    if (body.status !== undefined) updatePayload.status = body.status;

    const { data, error } = await supabase
      .from('students')
      .update(updatePayload)
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
      .select()
      .single();

    if (error) {
      return dbErrorResponse(error);
    }

    if (body.groupId !== undefined) {
      if (body.groupId) {
        // Remove previous group memberships that are not the selected group
        await supabase
          .from('student_groups')
          .delete()
          .eq('studentId', params.id)
          .neq('groupId', body.groupId);

        // Check if student is already in the target group
        const { data: existingSg } = await supabase
          .from('student_groups')
          .select('id')
          .eq('studentId', params.id)
          .eq('groupId', body.groupId)
          .maybeSingle();

        if (!existingSg) {
          await supabase.from('student_groups').insert({
            id: crypto.randomUUID(),
            studentId: params.id,
            groupId: body.groupId,
            centerId: authUser.centerId,
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        // If groupId is empty or null, remove student from groups
        await supabase
          .from('student_groups')
          .delete()
          .eq('studentId', params.id);
      }
    }

    const creds = parseStudentCreds(data.passportSeries, data.phone);

    return NextResponse.json({
      ...data,
      login: creds.login,
      password: creds.password,
      subject: creds.subject || null,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
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

    // Deleting a student cascades to the payment history and would corrupt financial reports.
    const { count: paymentCount } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('studentId', params.id)
      .eq('centerId', authUser.centerId);
    if ((paymentCount || 0) > 0) {
      return NextResponse.json(
        {
          message: `Talabada ${paymentCount} ta to'lov tarixi bor, uni o'chirib bo'lmaydi (moliya hisoboti buzilmasligi uchun). Buning o'rniga talaba holatini "CHIQIB_KETGAN" yoki "BITIRGAN" qiling.`,
        },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', params.id)
      .eq('centerId', authUser.centerId);

    if (error) {
      return dbErrorResponse(error);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
