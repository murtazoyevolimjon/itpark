import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import {
  parseTeacherCreds,
  serializeTeacherCreds,
  checkLoginUniqueness,
} from '@/lib/credentials';
import { dbErrorResponse } from '@/lib/dbErrors';
import { clampLimit, clampPage, fetchAll, safeSearch } from '@/lib/pagedFetch';
import { ENUMS, firstError, numberValue, oneOf, phone as phoneRule, text } from '@/lib/validation';

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

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('teachers')
      .select('*, groups:groups(count)', { count: 'exact' })
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
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    const teacherIds = (data || []).map((t: any) => t.id);

    let groupsList: any[] = [];
    let studentGroupsList: any[] = [];
    let paymentsList: any[] = [];

    if (teacherIds.length > 0) {
      const { data: grpData } = await supabase
        .from('groups')
        .select('id, name, teacherId, courseId')
        .in('teacherId', teacherIds)
        .eq('centerId', authUser.centerId);

      groupsList = grpData || [];
      const grpIds = groupsList.map((g: any) => g.id);

      if (grpIds.length > 0) {
        studentGroupsList = await fetchAll<any>((from, to) =>
          supabase
            .from('student_groups')
            .select('id, groupId, studentId')
            .in('groupId', grpIds)
            .order('id')
            .range(from, to)
        );

        // Only this page's groups are needed (page by page past the 1000-row cap). Payments saved without a
        // group are matched through the students, so those few are read separately.
        const [groupPayments, ungroupedPayments] = await Promise.all([
          fetchAll<any>((from, to) =>
            supabase
              .from('payments')
              .select('id, studentId, groupId, amount, status, paymentDate')
              .eq('centerId', authUser.centerId)
              .neq('status', 'BEKOR_QILINGAN')
              .in('groupId', grpIds)
              .order('id')
              .range(from, to)
          ),
          fetchAll<any>((from, to) =>
            supabase
              .from('payments')
              .select('id, studentId, groupId, amount, status, paymentDate')
              .eq('centerId', authUser.centerId)
              .neq('status', 'BEKOR_QILINGAN')
              .is('groupId', null)
              .order('id')
              .range(from, to)
          ),
        ]);
        paymentsList = [...groupPayments, ...ungroupedPayments];      }
    }

    const formattedData = (data || []).map((item: any) => {
      const { password: plainPassword, passportSeries: cleanPassport } = parseTeacherCreds(item.passportSeries);
      const sanitized = { ...item };
      sanitized.password = plainPassword || (item.password ? '******' : '');
      sanitized.passportSeries = cleanPassport || null;

      const myGroups = groupsList.filter((g: any) => g.teacherId === item.id);
      const myGroupIds = myGroups.map((g: any) => g.id);
      const mySg = studentGroupsList.filter((sg: any) => myGroupIds.includes(sg.groupId));
      const myStudentIds = Array.from(new Set(mySg.map((sg: any) => sg.studentId)));

      const myPayments = paymentsList.filter((p: any) =>
        (p.groupId && myGroupIds.includes(p.groupId)) ||
        (!p.groupId && p.studentId && myStudentIds.includes(p.studentId))
      );

      const totalCollected = myPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
      const paidStudentsSet = new Set(
        myPayments.filter((p: any) => (Number(p.amount) || 0) > 0).map((p: any) => p.studentId)
      );
      const paidStudentsCount = paidStudentsSet.size;

      const sType = item.salaryType || 'PERCENT';
      const sVal = Number(item.salaryValue) || 0;
      let calculatedSalary = 0;
      let salaryFormula = '';

      if (sType === 'PERCENT') {
        calculatedSalary = Math.round(totalCollected * (sVal / 100));
        salaryFormula = `${sVal}% × ${totalCollected.toLocaleString('uz-UZ')} so'm`;
      } else {
        if (sVal < 1000000) {
          calculatedSalary = paidStudentsCount * sVal;
          salaryFormula = `${paidStudentsCount} ta to'lovchi × ${sVal.toLocaleString('uz-UZ')} so'm`;
        } else {
          calculatedSalary = sVal;
          salaryFormula = `Fikslangan: ${sVal.toLocaleString('uz-UZ')} so'm`;
        }
      }

      return {
        ...sanitized,
        _count: {
          groups: item.groups ? item.groups[0]?.count || 0 : myGroups.length,
        },
        salaryStats: {
          totalStudents: myStudentIds.length,
          paidStudents: paidStudentsCount,
          totalCollected,
          calculatedSalary,
          salaryFormula,
        },
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
    if (authUser.role === 'TEACHER' || authUser.role === 'STUDENT') {
      return NextResponse.json({ message: "Ruxsat yo'q" }, { status: 403 });
    }

    const body = await req.json();
    const { firstName, lastName, phone, passportSeries, salaryType, salaryValue, status, login, password } = body;

    const inputError = firstError(
      text(firstName, 'Ism', 60),
      text(lastName, 'Familiya', 60),
      phoneRule(phone, 'Telefon raqam'),
      numberValue(salaryValue ?? 0, 'Oylik', { min: 0, max: 1_000_000_000_000 }),
      salaryType ? oneOf(salaryType, ENUMS.salaryType, 'Oylik turi') : null,
      salaryType === 'PERCENT' ? numberValue(salaryValue ?? 0, 'Foiz', { min: 0, max: 100 }) : null,
      status ? oneOf(status, ENUMS.activeStatus, 'Holat') : null
    );
    if (inputError) {
      return NextResponse.json({ message: inputError }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const cleanPhone = (phone || '').replace(/\D/g, '');

    // Check login uniqueness if provided
    let trimmedLogin = (login || '').trim().toLowerCase();
    if (!trimmedLogin) {
      trimmedLogin = cleanPhone || `ustoz_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const rawPassword = (password || '').trim() || (cleanPhone && cleanPhone.length >= 6 ? cleanPhone.slice(-6) : '123456');

    // Hashing the password takes a good part of a second of CPU: do it while the login check waits for the database
    const bcrypt = await import('bcryptjs');
    const [uniquenessCheck, hashedPassword] = await Promise.all([
      checkLoginUniqueness(supabase, trimmedLogin, { type: 'teacher' }),
      bcrypt.default.hash(rawPassword, 10),
    ]);
    if (!uniquenessCheck.available) {
      return NextResponse.json(
        { message: uniquenessCheck.conflictMessage || 'Bu login allaqachon band qilingan' },
        { status: 400 }
      );
    }
    const serializedPassport = serializeTeacherCreds(rawPassword, passportSeries);
    const id = crypto.randomUUID();

    const insertPayload: any = {
      id,
      firstName,
      lastName,
      phone,
      passportSeries: serializedPassport,
      salaryType: salaryType || 'FIXED',
      salaryValue: Number(salaryValue) || 0,
      status: status || 'FAOL',
      centerId: authUser.centerId,
      login: trimmedLogin,
      password: hashedPassword,
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('teachers')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return dbErrorResponse(error);
    }

    return NextResponse.json({
      ...data,
      login: trimmedLogin,
      password: rawPassword,
      passportSeries: passportSeries || null,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
