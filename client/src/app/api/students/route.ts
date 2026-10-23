import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { requireStaff } from '@/lib/authz';
import { dbErrorResponse, serverErrorResponse } from '@/lib/dbErrors';
import { clampLimit, clampPage, fetchAll, safeSearch } from '@/lib/pagedFetch';
import { computeDebt } from '@/lib/billing';
import { findSamePerson } from '@/lib/studentRules';

// Billing starts at the first attendance (billingStartDate); before that column exists, the join date is used
const billingStart = (sg: any): string | null =>
  'billingStartDate' in sg ? sg.billingStartDate || null : sg.joinedAt || null;
import { checkEnrollment, violationResponse } from '@/lib/groupRules';
import { normalizeUzPhone } from '@/utils/uzPhone';
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
    const search = safeSearch(searchParams.get('search'));
    const page = clampPage(searchParams.get('page'));
    const limit = clampLimit(searchParams.get('limit'));
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = searchParams.get('order') === 'asc' ? true : false;
    const groupId = searchParams.get('groupId');

    const supabase = createServerSupabaseClient();

    // Light mode feeds the "pick a student" dropdowns: every student of the center, but only the few
    // fields those lists need (no payment rows, no login blob), read page by page past the 1000-row cap.
    if (searchParams.get('light') === '1') {
      const lightStaffOnly = requireStaff(authUser);
      if (lightStaffOnly) return lightStaffOnly;
      const [students, paymentRows] = await Promise.all([
        fetchAll<any>((from, to) =>
          supabase
            .from('students')
            .select(
              'id, firstName, lastName, phone, fatherPhone, motherPhone, birthDate, gender, isSchoolStudent, status, createdAt, studentGroups:student_groups(*, group:groups(id, name, courseId, status, course:courses(id, name, price)))'
            )
            .eq('centerId', authUser.centerId)
            .order('id')
            .range(from, to)
        ),
        fetchAll<any>((from, to) =>
          supabase
            .from('payments')
            .select('id, studentId, groupId, amount, status, paymentDate')
            .eq('centerId', authUser.centerId)
            .order('id')
            .range(from, to)
        ),
      ]);

      const paymentsByStudent = new Map<string, any[]>();
      for (const p of paymentRows) {
        const list = paymentsByStudent.get(p.studentId) || [];
        list.push({ groupId: p.groupId, amount: Number(p.amount) || 0, status: p.status, paymentDate: p.paymentDate });
        paymentsByStudent.set(p.studentId, list);
      }

      const data = students
        .map((s: any) => {
          const debt = computeDebt({
            groups: (s.studentGroups || [])
              .filter((sg: any) => sg.group)
              .map((sg: any) => {
                const course = Array.isArray(sg.group.course) ? sg.group.course[0] : sg.group.course;
                return { id: sg.group.id, name: sg.group.name, price: Number(course?.price) || 0, startedAt: billingStart(sg) };
              }),
            payments: paymentsByStudent.get(s.id) || [],
          });
          return { ...s, paymentStatus: debt.status, debtAmount: debt.debt, unpaidMonths: debt.unpaidMonths };
        })
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      return NextResponse.json({ data, total: data.length, page: 1, limit: data.length });
    }

    let query = supabase
      .from('students')
      .select('*, studentGroups:student_groups(*, group:groups(*, course:courses(id, name, price))), payments(*)', { count: 'exact' })
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

      const sgList = (student.studentGroups || (student as any).student_groups || []).sort((a: any, b: any) => {
        const dateA = new Date(a.updatedAt || a.createdAt || a.joinedAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || b.joinedAt || 0).getTime();
        return dateB - dateA;
      });

      const creds = parseStudentCreds(student.passportSeries, student.phone);

      // Month-by-month: every group is due every month; the badge reflects what is still unpaid
      const debt = computeDebt({
        groups: sgList
          .filter((sg: any) => sg.group)
          .map((sg: any) => {
            const course = Array.isArray(sg.group.course) ? sg.group.course[0] : sg.group.course;
            return { id: sg.group.id, name: sg.group.name, price: Number(course?.price) || 0, startedAt: billingStart(sg) };
          }),
        payments: payments.map((p: any) => ({
          groupId: p.groupId,
          amount: Number(p.amount) || 0,
          status: p.status,
          paymentDate: p.paymentDate,
        })),
      });
      const paymentStatus = debt.status;

      // Teachers only need who the student is: no logins / Telegram ids, no payments or debts
      if (authUser.role === 'TEACHER') {
        return {
          ...student,
          passportSeries: creds.subject || null,
          subject: creds.subject || null,
          studentGroups: sgList,
          payments: [],
        };
      }

      return {
        ...student,
        subject: creds.subject || null,
        studentGroups: sgList,
        paymentStatus,
        debtAmount: debt.debt,
        unpaidMonths: debt.unpaidMonths,
      };
    });

    return NextResponse.json({
      data: formattedData,
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

    const staffOnly = requireStaff(authUser);
    if (staffOnly) return staffOnly;

    const body = await req.json();
    const {
      firstName,
      lastName,
      birthDate,
      phone: rawPhone,
      fatherPhone: rawFatherPhone,
      motherPhone: rawMotherPhone,
      passportSeries,
      subject,
      gender,
      isSchoolStudent,
      groupId,
      status,
    } = body;

    // Phones are stored as 998XXXXXXXXX whatever way they were typed; the parent phone is optional
    const phone = normalizeUzPhone(rawPhone);
    const fatherPhone = normalizeUzPhone(rawFatherPhone);
    const motherPhone = normalizeUzPhone(rawMotherPhone);

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
    const subjectToSave = (subject !== undefined ? subject : passportSeries || '').trim();

    // Both checks are independent: run them at the same time instead of one after the other.
    // The same person (same phone and name) is never created twice: add the existing student to another group instead
    const [violation, samePerson] = await Promise.all([
      groupId ? checkEnrollment(supabase, authUser.centerId, groupId, null) : Promise.resolve(null),
      findSamePerson(supabase, authUser.centerId, {
        firstName: String(firstName),
        lastName: String(lastName),
        phone: String(phone || ''),
      }),
    ]);
    if (violation) return violationResponse(violation);
    if (samePerson) {
      return NextResponse.json(
        {
          message: `${samePerson.firstName} ${samePerson.lastName} shu telefon raqam bilan allaqachon ro'yxatda. Bir talaba bir nechta fanga qatnashishi mumkin, shuning uchun yangi yozuv yaratilmaydi: mavjud talabani kerakli guruhga qo'shing.`,
          existingStudentId: samePerson.id,
        },
        { status: 409 }
      );
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
    return serverErrorResponse(error);
  }
}
