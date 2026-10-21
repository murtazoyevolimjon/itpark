import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { dbErrorResponse } from '@/lib/dbErrors';
import { checkEnrollment, violationResponse } from '@/lib/groupRules';
import { ENUMS, date, firstError, oneOf, phone as phone_, text } from '@/lib/validation';
import {
  parseStudentCreds,
  serializeStudentCreds,
} from '@/lib/credentials';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = searchParams.get('order') === 'asc' ? true : false;
    const groupId = searchParams.get('groupId');

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('students')
      .select('*, studentGroups:student_groups(*, group:groups(*)), payments(*)', { count: 'exact' })
      .eq('centerId', authUser.centerId);

    if (search) {
      query = query.or(`firstName.ilike.%${search}%,lastName.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order(sortBy, { ascending: order })
      .range(from, to);

    if (error) {
      return dbErrorResponse(error);
    }

    const formattedData = (data || []).map((student: any) => {
      const payments = student.payments || [];
      const hasPaid = payments.some((p: any) => p.status === 'TOLANGAN');
      const hasPartial = payments.some((p: any) => p.status === 'QISMAN');

      const paymentStatus = hasPaid ? 'TOLANGAN' : hasPartial ? 'QISMAN' : 'TOLANMAGAN';

      const sgList = (student.studentGroups || (student as any).student_groups || []).sort((a: any, b: any) => {
        const dateA = new Date(a.updatedAt || a.createdAt || a.joinedAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || b.joinedAt || 0).getTime();
        return dateB - dateA;
      });

      const creds = parseStudentCreds(student.passportSeries, student.phone);

      return {
        ...student,
        subject: creds.subject || null,
        studentGroups: sgList,
        paymentStatus,
      };
    });

    return NextResponse.json({
      data: formattedData,
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

    const body = await req.json();
    const {
      firstName,
      lastName,
      birthDate,
      phone,
      fatherPhone,
      motherPhone,
      passportSeries,
      subject,
      gender,
      isSchoolStudent,
      groupId,
      status,
    } = body;

    const cleanFather = (fatherPhone || '').replace(/\D/g, '');
    const cleanMother = (motherPhone || '').replace(/\D/g, '');
    if (!cleanFather && !cleanMother) {
      return NextResponse.json(
        { message: "Otasi yoki onasining telefon raqamini kiritish majburiy (kamida bittasi qat'iy kiritilishi shart)" },
        { status: 400 }
      );
    }

    const inputError = firstError(
      text(firstName, 'Ism', 60),
      text(lastName, 'Familiya', 60),
      phone_(phone, 'Telefon raqam'),
      phone_(fatherPhone, 'Otasining telefon raqami', false),
      phone_(motherPhone, 'Onasining telefon raqami', false),
      date(birthDate, "Tug'ilgan sana", { notFuture: true, required: false }),
      gender !== undefined && gender !== null && gender !== '' ? oneOf(gender, ENUMS.gender, 'Jins') : null,
      status !== undefined && status !== null && status !== '' ? oneOf(status, ENUMS.studentStatus, 'Holat') : null
    );
    if (inputError) {
      return NextResponse.json({ message: inputError }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Validate the target group BEFORE creating the student, so a rejected enrollment leaves no orphan student
    if (groupId) {
      const violation = await checkEnrollment(supabase, authUser.centerId, groupId, null);
      if (violation) return violationResponse(violation);
    }
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const subjectToSave = (subject !== undefined ? subject : passportSeries || '').trim();

    // 2. Check duplicate student for the same subject
    if (cleanPhone) {
      const { data: existingStudents } = await supabase
        .from('students')
        .select('id, firstName, lastName, phone, passportSeries')
        .eq('centerId', authUser.centerId);

      if (existingStudents && existingStudents.length > 0) {
        const matched = existingStudents.filter((st: any) => {
          const stClean = (st.phone || '').replace(/\D/g, '');
          return stClean === cleanPhone || (cleanPhone.length >= 9 && stClean.endsWith(cleanPhone.slice(-9)));
        });

        if (matched.length > 0 && subjectToSave) {
          const dup = matched.find((st: any) => {
            const parsed = parseStudentCreds(st.passportSeries, st.phone);
            return parsed.subject.trim().toLowerCase() === subjectToSave.toLowerCase();
          });

          if (dup) {
            return NextResponse.json(
              {
                message: `Ushbu talaba (${dup.firstName} ${dup.lastName}) allaqachon "${subjectToSave}" faniga qo'shilgan! Bitta talabani bir xil fanga ikki marta qo'shib bo'lmaydi.`,
              },
              { status: 400 }
            );
          }
        }
      }
    }

    const serializedCreds = serializeStudentCreds('', '', subjectToSave);
    const studentId = crypto.randomUUID();

    const { data: student, error } = await supabase
      .from('students')
      .insert({
        id: studentId,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        birthDate: birthDate ? new Date(birthDate).toISOString() : new Date().toISOString(),
        phone,
        fatherPhone: fatherPhone || null,
        motherPhone: motherPhone || null,
        passportSeries: serializedCreds,
        gender: gender || 'ERKAK',
        isSchoolStudent: !!isSchoolStudent,
        status: status || 'FAOL',
        centerId: authUser.centerId,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return dbErrorResponse(error);
    }

    if (groupId) {
      const studentGroupId = crypto.randomUUID();
      await supabase.from('student_groups').insert({
        id: studentGroupId,
        studentId,
        groupId,
        centerId: authUser.centerId,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ...student,
      login: '',
      password: '',
      subject: subjectToSave,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
