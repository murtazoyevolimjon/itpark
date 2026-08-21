import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

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
    const { data: group, error } = await supabase
      .from('groups')
      .select(`
        *,
        course:courses(*),
        teacher:teachers(*),
        room:rooms(*),
        studentGroups:student_groups(*, student:students(*)),
        attendances:attendances(*, student:students(*)),
        payments:payments(*, student:students(*))
      `)
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
      .maybeSingle();

    if (error || !group) {
      return NextResponse.json({ message: 'Guruh topilmadi' }, { status: 404 });
    }

    return NextResponse.json(group);
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

    const updatePayload: any = { updatedAt: new Date().toISOString() };
    if (body.name !== undefined) updatePayload.name = body.name;
    if (body.courseId !== undefined) updatePayload.courseId = body.courseId;
    if (body.teacherId !== undefined) updatePayload.teacherId = body.teacherId;
    if (body.roomId !== undefined) updatePayload.roomId = body.roomId;
    if (body.days !== undefined) updatePayload.days = body.days;
    if (body.startTime !== undefined) updatePayload.startTime = body.startTime;
    if (body.endTime !== undefined) updatePayload.endTime = body.endTime;
    if (body.status !== undefined) updatePayload.status = body.status;
    if (body.startDate !== undefined) updatePayload.startDate = new Date(body.startDate).toISOString();

    const { data, error } = await supabase
      .from('groups')
      .update(updatePayload)
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
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
      .from('groups')
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
