import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { forbidden, isStaff, isTeacher } from '@/lib/authz';
import { safeHttpUrl } from '@/lib/safeContent';
import { HOMEWORK_ENABLED, HOMEWORK_OFF_NOTICE } from '@/lib/featureFlags';

const STORAGE_BUCKET = 'homework_storage';
const SUBMISSIONS_FILE = 'submissions.json';

// Helper to fetch submissions from Supabase Storage
async function getStoredSubmissions(supabase: any): Promise<any[]> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(SUBMISSIONS_FILE);

    if (error || !data) {
      return [];
    }

    const text = await data.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Error reading stored submissions:', err);
    return [];
  }
}

// Helper to save submissions to Supabase Storage
async function saveStoredSubmissions(supabase: any, list: any[]): Promise<boolean> {
  try {
    const jsonStr = JSON.stringify(list, null, 2);
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(SUBMISSIONS_FILE, jsonStr, {
        contentType: 'application/json',
        upsert: true,
      });

    if (error) {
      console.error('Failed to save submissions to storage:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving submissions to storage:', err);
    return false;
  }
}

const unauthorized = () => NextResponse.json({ success: false, message: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
const STATUSES = ['KUTILMOQDA', 'BAHOLANDI'];

async function getOwnedHomeworkIds(supabase: any, authUser: any): Promise<Set<string>> {
  const { data } = await supabase.storage.from(STORAGE_BUCKET).download('homeworks.json');
  let list: any[] = [];
  try {
    const parsed = data ? JSON.parse(await data.text()) : [];
    list = Array.isArray(parsed) ? parsed : [];
  } catch {}
  return new Set(
    list
      .filter((h) => h.centerId === authUser.centerId && (!isTeacher(authUser) || h.teacherId === authUser.sub))
      .map((h) => h.id)
  );
}

// Submissions are visible to the center's staff and, for teachers, only on their own homework.
export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!isStaff(authUser) && !isTeacher(authUser)) return forbidden();

    const { searchParams } = new URL(req.url);
    const hwId = searchParams.get('hwId');
    const groupId = searchParams.get('groupId');
    const studentId = searchParams.get('studentId');

    const supabase = createServerSupabaseClient();
    const allSubs = await getStoredSubmissions(supabase);

    let filtered = allSubs.filter((s) => s.centerId === authUser.centerId);

    if (isTeacher(authUser)) {
      const owned = await getOwnedHomeworkIds(supabase, authUser);
      filtered = filtered.filter((s) => owned.has(s.hwId));
    }
    if (hwId) filtered = filtered.filter((s) => s.hwId === hwId);
    if (groupId) filtered = filtered.filter((s) => !s.groupId || s.groupId === groupId);
    if (studentId) filtered = filtered.filter((s) => s.studentId === studentId);

    // Links saved before validation existed may use another scheme (javascript:, data:): drop them on the way out
    const clean = filtered.map((s) => ({ ...s, submissionLink: s.submissionLink ? safeHttpUrl(s.submissionLink) : '' }));

    return NextResponse.json({ success: true, data: clean });
  } catch (err: any) {
    console.error('GET /api/homework/submissions error:', err);
    return NextResponse.json({ success: false, message: 'Server xatosi' }, { status: 500 });
  }
}

// There is no student login any more: staff record a submission on behalf of a student of their own center.
export async function POST(req: NextRequest) {
  try {
    if (!HOMEWORK_ENABLED) {
      return NextResponse.json({ success: false, message: HOMEWORK_OFF_NOTICE }, { status: 503 });
    }
    const authUser = getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!isStaff(authUser) && !isTeacher(authUser)) return forbidden();

    const body = await req.json();
    const { hwId, groupId, studentId, submissionLink, comment } = body;

    if (!hwId || !studentId) {
      return NextResponse.json(
        { success: false, message: "Vazifa va talaba ko'rsatilishi shart!" },
        { status: 400 }
      );
    }
    if (!submissionLink && !comment) {
      return NextResponse.json(
        { success: false, message: 'Topshiriq havolasi yoki izoh kiritilishi shart!' },
        { status: 400 }
      );
    }
    const link = submissionLink ? safeHttpUrl(submissionLink) : '';
    if (submissionLink && !link) {
      return NextResponse.json({ success: false, message: "Havola http yoki https bo'lishi kerak" }, { status: 400 });
    }
    if (comment && String(comment).length > 2000) {
      return NextResponse.json({ success: false, message: 'Izoh juda uzun' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // The student and the homework must belong to the caller's center (and the homework to the teacher)
    const [{ data: student }, owned] = await Promise.all([
      supabase
        .from('students')
        .select('id, firstName, lastName, phone')
        .eq('id', studentId)
        .eq('centerId', authUser.centerId)
        .maybeSingle(),
      getOwnedHomeworkIds(supabase, authUser),
    ]);
    if (!student) return NextResponse.json({ success: false, message: 'Talaba topilmadi' }, { status: 404 });
    if (!owned.has(hwId)) return NextResponse.json({ success: false, message: 'Vazifa topilmadi' }, { status: 404 });

    const currentList = await getStoredSubmissions(supabase);
    const existingIndex = currentList.findIndex(
      (s) => s.hwId === hwId && s.studentId === student.id && s.centerId === authUser.centerId
    );

    const submissionRecord = {
      id: existingIndex >= 0 ? currentList[existingIndex].id : crypto.randomUUID(),
      hwId,
      groupId: groupId || 'all',
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      studentPhone: student.phone || '',
      centerId: authUser.centerId,
      submissionLink: link,
      comment: comment ? String(comment).trim() : '',
      submittedAt: new Date().toLocaleString('uz-UZ'),
      timestamp: new Date().toISOString(),
      status: existingIndex >= 0 && currentList[existingIndex].status === 'BAHOLANDI' ? 'BAHOLANDI' : 'KUTILMOQDA',
      grade: existingIndex >= 0 ? currentList[existingIndex].grade : undefined,
      teacherFeedback: existingIndex >= 0 ? currentList[existingIndex].teacherFeedback : undefined,
    };

    const updatedList =
      existingIndex >= 0
        ? currentList.map((s, i) => (i === existingIndex ? submissionRecord : s))
        : [submissionRecord, ...currentList];

    const saved = await saveStoredSubmissions(supabase, updatedList);
    if (!saved) {
      return NextResponse.json(
        { success: false, message: 'Topshiriqni saqlashda xatolik yuz berdi' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: submissionRecord }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/homework/submissions error:', err);
    return NextResponse.json({ success: false, message: 'Server xatosi' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!HOMEWORK_ENABLED) {
      return NextResponse.json({ success: false, message: HOMEWORK_OFF_NOTICE }, { status: 503 });
    }
    const authUser = getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!isStaff(authUser) && !isTeacher(authUser)) return forbidden();

    const body = await req.json();
    const { submissionId, grade, teacherFeedback, status } = body;

    if (!submissionId) {
      return NextResponse.json({ success: false, message: "Topshiriq ID si ko'rsatilmadi!" }, { status: 400 });
    }
    if (grade !== undefined && (!Number.isFinite(Number(grade)) || Number(grade) < 0 || Number(grade) > 100)) {
      return NextResponse.json({ success: false, message: "Baho 0 dan 100 gacha bo'lishi kerak" }, { status: 400 });
    }
    if (status !== undefined && !STATUSES.includes(status)) {
      return NextResponse.json({ success: false, message: "Holat noto'g'ri" }, { status: 400 });
    }
    if (teacherFeedback !== undefined && String(teacherFeedback).length > 2000) {
      return NextResponse.json({ success: false, message: 'Izoh juda uzun' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const currentList = await getStoredSubmissions(supabase);

    const index = currentList.findIndex((s) => s.id === submissionId && s.centerId === authUser.centerId);
    if (index === -1) {
      return NextResponse.json({ success: false, message: 'Topshiriq topilmadi' }, { status: 404 });
    }
    if (isTeacher(authUser)) {
      const owned = await getOwnedHomeworkIds(supabase, authUser);
      if (!owned.has(currentList[index].hwId)) return forbidden();
    }

    const updated = {
      ...currentList[index],
      grade: grade !== undefined ? Number(grade) : currentList[index].grade,
      teacherFeedback: teacherFeedback !== undefined ? String(teacherFeedback).trim() : currentList[index].teacherFeedback,
      status: status || 'BAHOLANDI',
      reviewedBy: String(authUser.fullName || "O'qituvchi").slice(0, 120),
      reviewedAt: new Date().toLocaleString('uz-UZ'),
    };

    await saveStoredSubmissions(supabase, currentList.map((s, i) => (i === index ? updated : s)));

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('PATCH /api/homework/submissions error:', err);
    return NextResponse.json({ success: false, message: 'Server xatosi' }, { status: 500 });
  }
}