import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import {
  parseTeacherCreds,
  serializeTeacherCreds,
  checkLoginUniqueness,
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
        const { data: sgData } = await supabase
          .from('student_groups')
          .select('id, groupId, studentId')
          .in('groupId', grpIds);
        studentGroupsList = sgData || [];

        const allStudentIds = Array.from(new Set(studentGroupsList.map((sg: any) => sg.studentId)));

        // Only query payments for these specific groups or enrolled students
        let payQuery = supabase
          .from('payments')
          .select('id, studentId, groupId, amount, status, paymentDate')
          .eq('centerId', authUser.centerId)
          .neq('status', 'BEKOR_QILINGAN');

        if (grpIds.length > 0 && allStudentIds.length > 0) {
          payQuery = payQuery.or(`groupId.in.(${grpIds.join(',')}),studentId.in.(${allStudentIds.join(',')})`);
        } else if (grpIds.length > 0) {
          payQuery = payQuery.in('groupId', grpIds);
        } else if (allStudentIds.length > 0) {
          payQuery = payQuery.in('studentId', allStudentIds);
        }

        const { data: payData } = await payQuery;
        paymentsList = payData || [];
      }
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

    const body = await req.json();
    const { firstName, lastName, phone, passportSeries, salaryType, salaryValue, status, login, password } = body;

    const supabase = createServerSupabaseClient();
    const cleanPhone = (phone || '').replace(/\D/g, '');

    // Check login uniqueness if provided
    let trimmedLogin = (login || '').trim().toLowerCase();
    if (!trimmedLogin) {
      trimmedLogin = cleanPhone || `ustoz_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const uniquenessCheck = await checkLoginUniqueness(supabase, trimmedLogin, { type: 'teacher' });
    if (!uniquenessCheck.available) {
      return NextResponse.json(
        { message: uniquenessCheck.conflictMessage || 'Bu login allaqachon band qilingan' },
        { status: 400 }
      );
    }

    let hashedPassword: string | null = null;
    const rawPassword = (password || '').trim() || (cleanPhone && cleanPhone.length >= 6 ? cleanPhone.slice(-6) : '123456');

    const bcrypt = await import('bcryptjs');
    hashedPassword = await bcrypt.default.hash(rawPassword, 10);

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
      return NextResponse.json({ message: error.message }, { status: 500 });
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
