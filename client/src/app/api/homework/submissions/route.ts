import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hwId = searchParams.get('hwId');
    const groupId = searchParams.get('groupId');
    const studentId = searchParams.get('studentId');
    const centerId = searchParams.get('centerId');

    const authUser = getAuthUser(req);
    const targetCenterId = centerId || authUser?.centerId;

    const supabase = createServerSupabaseClient();
    const allSubs = await getStoredSubmissions(supabase);

    let filtered = allSubs;

    if (targetCenterId) {
      filtered = filtered.filter((s) => !s.centerId || s.centerId === targetCenterId);
    }

    if (hwId) {
      filtered = filtered.filter((s) => s.hwId === hwId);
    }

    if (groupId) {
      filtered = filtered.filter((s) => !s.groupId || s.groupId === groupId);
    }

    if (studentId) {
      filtered = filtered.filter((s) => s.studentId === studentId);
    }

    return NextResponse.json({ success: true, data: filtered });
  } catch (err: any) {
    console.error('GET /api/homework/submissions error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    const body = await req.json();

    const {
      hwId,
      groupId,
      studentId,
      studentName,
      studentPhone,
      submissionLink,
      comment,
      centerId,
    } = body;

    if (!hwId) {
      return NextResponse.json(
        { success: false, message: 'Vazifa ID si ko\'rsatilmadi!' },
        { status: 400 }
      );
    }

    if (!submissionLink && !comment) {
      return NextResponse.json(
        { success: false, message: 'Topshiriq havolasi yoki izoh kiritilishi shart!' },
        { status: 400 }
      );
    }

    const resolvedStudentId = studentId || authUser?.sub || authUser?.id || 'anonymous_student';
    const resolvedStudentName = studentName || authUser?.fullName || "O'quvchi";
    const resolvedCenterId = centerId || authUser?.centerId || 'demo-center';

    const supabase = createServerSupabaseClient();
    const currentList = await getStoredSubmissions(supabase);

    // Check if student already submitted this homework (upsert)
    const existingIndex = currentList.findIndex(
      (s) => s.hwId === hwId && s.studentId === resolvedStudentId
    );

    const submissionRecord = {
      id: existingIndex >= 0 ? currentList[existingIndex].id : crypto.randomUUID(),
      hwId,
      groupId: groupId || 'all',
      studentId: resolvedStudentId,
      studentName: resolvedStudentName,
      studentPhone: studentPhone || '',
      centerId: resolvedCenterId,
      submissionLink: submissionLink ? submissionLink.trim() : '',
      comment: comment ? comment.trim() : '',
      submittedAt: new Date().toLocaleString('uz-UZ'),
      timestamp: new Date().toISOString(),
      status: existingIndex >= 0 && currentList[existingIndex].status === 'BAHOLANDI' ? 'BAHOLANDI' : 'KUTILMOQDA',
      grade: existingIndex >= 0 ? currentList[existingIndex].grade : undefined,
      teacherFeedback: existingIndex >= 0 ? currentList[existingIndex].teacherFeedback : undefined,
    };

    let updatedList: any[];
    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = submissionRecord;
    } else {
      updatedList = [submissionRecord, ...currentList];
    }

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
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    const body = await req.json();

    const { submissionId, grade, teacherFeedback, status } = body;

    if (!submissionId) {
      return NextResponse.json(
        { success: false, message: 'Topshiriq ID si ko\'rsatilmadi!' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const currentList = await getStoredSubmissions(supabase);

    const index = currentList.findIndex((s) => s.id === submissionId);
    if (index === -1) {
      return NextResponse.json(
        { success: false, message: 'Topshiriq topilmadi' },
        { status: 404 }
      );
    }

    const updated = {
      ...currentList[index],
      grade: grade !== undefined ? Number(grade) : currentList[index].grade,
      teacherFeedback: teacherFeedback !== undefined ? String(teacherFeedback).trim() : currentList[index].teacherFeedback,
      status: status || 'BAHOLANDI',
      reviewedBy: authUser?.fullName || "O'qituvchi",
      reviewedAt: new Date().toLocaleString('uz-UZ'),
    };

    const updatedList = [...currentList];
    updatedList[index] = updated;

    await saveStoredSubmissions(supabase, updatedList);

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('PATCH /api/homework/submissions error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
