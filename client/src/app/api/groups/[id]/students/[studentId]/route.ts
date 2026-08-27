import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; studentId: string } }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // Verify group belongs to center
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id')
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
      .maybeSingle();

    if (groupError || !group) {
      return NextResponse.json({ message: 'Guruh topilmadi' }, { status: 404 });
    }

    // Delete relation from student_groups
    const { error } = await supabase
      .from('student_groups')
      .delete()
      .eq('groupId', params.id)
      .eq('studentId', params.studentId);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
