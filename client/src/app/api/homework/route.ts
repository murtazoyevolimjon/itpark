import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');
    const centerId = searchParams.get('centerId');

    const authUser = getAuthUser(req);
    const targetCenterId = centerId || authUser?.centerId;

    const supabase = createServerSupabaseClient();
    const allHw = await getStoredHomeworks(supabase);

    let filtered = allHw;

    if (targetCenterId) {
      filtered = filtered.filter((h) => !h.centerId || h.centerId === targetCenterId);
    }

    if (groupId && groupId !== 'all') {
      filtered = filtered.filter((h) => !h.groupId || h.groupId === 'all' || h.groupId === groupId);
    }

    return NextResponse.json({ success: true, data: filtered });
  } catch (err: any) {
    console.error('GET /api/homework error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    const body = await req.json();

    const {
      groupId,
      groupName,
      courseName,
      title,
      desc,
      deadline,
      file,
      centerId,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, message: 'Vazifa sarlavhasini kiritish majburiy!' },
        { status: 400 }
      );
    }

    const resolvedCenterId = centerId || authUser?.centerId || 'demo-center';
    const supabase = createServerSupabaseClient();

    const currentList = await getStoredHomeworks(supabase);

    const newHomework = {
      id: crypto.randomUUID(),
      centerId: resolvedCenterId,
      groupId: groupId || 'all',
      groupName: groupName || 'Barcha guruhlar',
      courseName: courseName || 'Dasturlash',
      teacherId: authUser?.sub || authUser?.id || null,
      teacherName: authUser?.fullName || "O'qituvchi",
      title: title.trim(),
      desc: desc ? desc.trim() : '',
      deadline: deadline || '',
      file: file || null,
      createdAt: new Date().toLocaleDateString('uz-UZ'),
      timestamp: new Date().toISOString(),
    };

    // Prepend new homework
    const updatedList = [newHomework, ...currentList];
    const saved = await saveStoredHomeworks(supabase, updatedList);

    if (!saved) {
      return NextResponse.json(
        { success: false, message: "Vazifani saqlashda xatolik yuz berdi" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: newHomework }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/homework error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID ko\'rsatilmadi' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const currentList = await getStoredHomeworks(supabase);

    const filtered = currentList.filter((h) => h.id !== id);
    await saveStoredHomeworks(supabase, filtered);

    return NextResponse.json({ success: true, message: 'Vazifa o\'chirildi' });
  } catch (err: any) {
    console.error('DELETE /api/homework error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
