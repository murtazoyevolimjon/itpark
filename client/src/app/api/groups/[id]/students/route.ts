import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }

    const { studentId } = await req.json();
    if (!studentId) {
      return NextResponse.json({ message: 'Talaba tanlanishi shart' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Check if group belongs to center
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
      .maybeSingle();

    if (groupError || !group) {
      return NextResponse.json({ message: 'Guruh topilmadi' }, { status: 404 });
    }

    // Check if already in group
    const { data: existing } = await supabase
      .from('student_groups')
      .select('id')
      .eq('groupId', params.id)
      .eq('studentId', studentId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ message: 'Talaba bu guruhda allaqachon mavjud' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const { data, error } = await supabase
      .from('student_groups')
      .insert({
        id,
        groupId: params.id,
        studentId,
        centerId: authUser.centerId,
        joinedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select('*, student:students(*)')
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
