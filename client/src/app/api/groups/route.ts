import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { dbErrorResponse } from '@/lib/dbErrors';
import { checkGroupReferences, checkGroupSchedule, violationResponse } from '@/lib/groupRules';
import { validateSlot } from '@/lib/schedule';
import { ENUMS, date, firstError, oneOf, text } from '@/lib/validation';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const teacherId = searchParams.get('teacherId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = searchParams.get('order') === 'asc' ? true : false;

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('groups')
      .select('*, course:courses(*), teacher:teachers(*), room:rooms(*), studentGroups:student_groups(count)', { count: 'exact' })
      .eq('centerId', authUser.centerId);

    // If teacher, return their assigned groups
    if (authUser.role === 'TEACHER') {
      const { data: teacherRecord } = await supabase
        .from('teachers')
        .select('id')
        .eq('centerId', authUser.centerId)
        .or(`login.eq.${authUser.email},phone.eq.${authUser.email}`)
        .maybeSingle();

      if (teacherRecord) {
        query = query.or(`teacherId.eq.${authUser.sub},teacherId.eq.${teacherRecord.id}`);
      } else {
        query = query.eq('teacherId', authUser.sub);
      }
    } else if (teacherId) {
      query = query.eq('teacherId', teacherId);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order(sortBy, { ascending: order })
      .range(from, to);

    if (error) {
      return dbErrorResponse(error);
    }

    const formattedData = (data || []).map((item: any) => ({
      ...item,
      _count: {
        studentGroups: item.studentGroups ? item.studentGroups[0]?.count || 0 : 0,
      },
    }));

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

    if (authUser.role === 'TEACHER') {
      return NextResponse.json({ message: "O'qituvchilar guruh yarata olmaydi" }, { status: 403 });
    }

    const body = await req.json();
    const { name, courseId, teacherId, roomId, days, startTime, endTime, status, startDate } = body;

    const inputError = firstError(
      text(name, 'Guruh nomi', 100),
      oneOf(status || 'FAOL', ENUMS.groupStatus, 'Guruh holati'),
      date(startDate || new Date().toISOString(), 'Boshlanish sanasi')
    );
    if (inputError) {
      return NextResponse.json({ message: inputError }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const refViolation = await checkGroupReferences(supabase, authUser.centerId, { courseId, teacherId, roomId });
    if (refViolation) return violationResponse(refViolation);

    // A teacher or a room cannot be in two active groups at the same time.
    if ((status || 'FAOL') === 'FAOL') {
      const scheduleViolation = await checkGroupSchedule(supabase, authUser.centerId, {
        days: days || [],
        startTime,
        endTime,
        teacherId,
        roomId,
      });
      if (scheduleViolation) return violationResponse(scheduleViolation);
    } else {
      const slotError = validateSlot({ days: days || [], startTime, endTime });
      if (slotError) return NextResponse.json({ message: slotError }, { status: 400 });
    }

    const id = crypto.randomUUID();

    const { data, error } = await supabase
      .from('groups')
      .insert({
        id,
        name: String(name).trim(),
        courseId,
        teacherId,
        roomId,
        days: days || [],
        startTime,
        endTime,
        status: status || 'FAOL',
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        centerId: authUser.centerId,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return dbErrorResponse(error);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
