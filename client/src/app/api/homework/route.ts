import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { forbidden, isStaff, isTeacher, teacherOwnsGroup } from '@/lib/authz';
import { safeAttachment } from '@/lib/safeContent';

const STORAGE_BUCKET = 'homework_storage';
const HOMEWORKS_FILE = 'homeworks.json';

// Helper to fetch homeworks from Supabase Storage
async function getStoredHomeworks(supabase: any): Promise<any[]> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(HOMEWORKS_FILE);

    if (error || !data) {
      return [];
    }

    const text = await data.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Error reading stored homeworks:', err);
    return [];
  }
}

// Helper to save homeworks to Supabase Storage
async function saveStoredHomeworks(supabase: any, list: any[]): Promise<boolean> {
  try {
    const jsonStr = JSON.stringify(list, null, 2);
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(HOMEWORKS_FILE, jsonStr, {
        contentType: 'application/json',
        upsert: true,
      });

    if (error) {
      console.error('Failed to save homeworks to storage:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving homeworks to storage:', err);
    return false;
  }
}

const unauthorized = () => NextResponse.json({ success: false, message: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
const MAX_HOMEWORKS = 2000;

// Homework is visible to the center's staff and to the teacher who created it; the center always comes from the token.
export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!isStaff(authUser) && !isTeacher(authUser)) return forbidden();

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');

    const supabase = createServerSupabaseClient();
    const allHw = await getStoredHomeworks(supabase);

    let filtered = allHw.filter((h) => h.centerId === authUser.centerId);
    if (isTeacher(authUser)) {
      filtered = filtered.filter((h) => h.teacherId === authUser.sub);
    }

    if (groupId && groupId !== 'all') {
      filtered = filtered.filter((h) => !h.groupId || h.groupId === 'all' || h.groupId === groupId);
    }

    return NextResponse.json({ success: true, data: filtered });
  } catch (err: any) {
    console.error('GET /api/homework error:', err);
    return NextResponse.json({ success: false, message: 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!isStaff(authUser) && !isTeacher(authUser)) return forbidden();

    const body = await req.json();
    const { groupId, groupName, courseName, title, desc, deadline, file } = body;

    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { success: false, message: 'Vazifa sarlavhasini kiritish majburiy!' },
        { status: 400 }
      );
    }
    if (title.trim().length > 200 || (desc && String(desc).length > 5000)) {
      return NextResponse.json({ success: false, message: 'Sarlavha yoki izoh juda uzun' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // A specific group must belong to the caller's center (and to the teacher, for teachers)
    let resolvedGroupName = 'Barcha guruhlar';
    if (groupId && groupId !== 'all') {
      const { data: grp } = await supabase
        .from('groups')
        .select('id, name, teacherId')
        .eq('id', groupId)
        .eq('centerId', authUser.centerId)
        .maybeSingle();
      if (!grp) return NextResponse.json({ success: false, message: 'Guruh topilmadi' }, { status: 404 });
      if (isTeacher(authUser) && !(await teacherOwnsGroup(supabase, authUser, groupId))) return forbidden();
      resolvedGroupName = grp.name;
    } else if (isTeacher(authUser)) {
      // "All groups" would spread a teacher's task over groups they do not lead: not allowed
      return NextResponse.json({ success: false, message: 'Guruhni tanlang' }, { status: 400 });
    }

    let attachment: ReturnType<typeof safeAttachment> = null;
    if (file) {
      attachment = safeAttachment(file);
      if (!attachment) {
        return NextResponse.json(
          { success: false, message: "Fayl turi ruxsat etilmagan yoki hajmi katta (PDF, rasm, hujjat, ~2 MB gacha)" },
          { status: 400 }
        );
      }
    }

    const currentList = await getStoredHomeworks(supabase);
    if (currentList.length >= MAX_HOMEWORKS) {
      return NextResponse.json({ success: false, message: 'Vazifalar soni chegaraga yetdi' }, { status: 409 });
    }

    const newHomework = {
      id: crypto.randomUUID(),
      centerId: authUser.centerId,
      groupId: groupId || 'all',
      groupName: resolvedGroupName,
      courseName: String(courseName || '').slice(0, 120) || 'Dasturlash',
      teacherId: authUser.sub,
      teacherName: String(authUser.fullName || groupName || "O'qituvchi").slice(0, 120),
      title: title.trim(),
      desc: desc ? String(desc).trim() : '',
      deadline: String(deadline || '').slice(0, 50),
      file: attachment,
      createdAt: new Date().toLocaleDateString('uz-UZ'),
      timestamp: new Date().toISOString(),
    };

    const saved = await saveStoredHomeworks(supabase, [newHomework, ...currentList]);
    if (!saved) {
      return NextResponse.json(
        { success: false, message: "Vazifani saqlashda xatolik yuz berdi" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: newHomework }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/homework error:', err);
    return NextResponse.json({ success: false, message: 'Server xatosi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!isStaff(authUser) && !isTeacher(authUser)) return forbidden();

    const id = new URL(req.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: "ID ko'rsatilmadi" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const currentList = await getStoredHomeworks(supabase);

    // Only a homework of the caller's own center; a teacher may remove only their own tasks
    const target = currentList.find((h) => h.id === id && h.centerId === authUser.centerId);
    if (!target) return NextResponse.json({ success: false, message: 'Vazifa topilmadi' }, { status: 404 });
    if (isTeacher(authUser) && target.teacherId !== authUser.sub) return forbidden();

    await saveStoredHomeworks(supabase, currentList.filter((h) => h.id !== id));

    return NextResponse.json({ success: true, message: "Vazifa o'chirildi" });
  } catch (err: any) {
    console.error('DELETE /api/homework error:', err);
    return NextResponse.json({ success: false, message: 'Server xatosi' }, { status: 500 });
  }
}