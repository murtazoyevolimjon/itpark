import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
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

    return NextResponse.json({
      ...student,
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

    const existingCreds = parseStudentCreds(currentStudent.passportSeries, currentStudent.phone);

    const targetSubject = body.subject !== undefined
      ? (body.subject || '').trim()
      : (body.passportSeries !== undefined ? (body.passportSeries || '').trim() : existingCreds.subject);

    const serializedCreds = serializeStudentCreds('', '', targetSubject, existingCreds.tgChatId, existingCreds.tgUser, existingCreds.parentTgChatId);

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
      return NextResponse.json({ message: error.message }, { status: 500 });
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

    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', params.id)
      .eq('centerId', authUser.centerId);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
