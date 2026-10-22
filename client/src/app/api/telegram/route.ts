import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/lib/dbErrors';
import { getAuthUser } from '@/lib/auth';
import { getSuperAdminAuth } from '@/lib/superadminAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseStudentCreds } from '@/lib/credentials';
import {
  getTelegramBotToken,
  getTelegramBotUsername,
  sendTelegramMessage,
  sendAttendanceAlert,
  sendPaymentAlert,
  sendDebtReminder,
} from '@/lib/telegram';

const ADMIN_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];

// The bot and its webhook are shared by every center: changing them, or sending free-text through the bot,
// is the platform owner's (developer's) job, never a single center's admin.
const PLATFORM_ACTIONS = ['set_webhook', 'delete_webhook', 'send_test', 'test_attendance', 'test_payment', 'test_debt'];

const MAX_MESSAGE_LENGTH = 1500;

function validateMessageText(text: unknown): string | null {
  if (typeof text !== 'string' || !text.trim()) return 'Xabar matnini kiriting';
  if (text.trim().length > MAX_MESSAGE_LENGTH) return `Xabar ${MAX_MESSAGE_LENGTH} belgidan oshmasligi kerak`;
  return null;
}

// Messages are sent with parse_mode=HTML, so user text must be escaped
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function formatCenterMessage(text: string, centerName?: string): string {
  return `🔔 <b>${escapeHtml(centerName || "O'quv markaz")}</b>\n\n${escapeHtml(text.trim())}`;
}

async function getCenterName(supabase: any, centerId: string): Promise<string | undefined> {
  const { data } = await supabase.from('centers').select('name').eq('id', centerId).maybeSingle();
  return data?.name;
}

/** Which Telegram chats to message: the student, the parent or both (default). */
function pickChatIds(
  creds: { tgChatId?: string; parentTgChatId?: string },
  target?: string
): string[] {
  const ids: string[] = [];
  if (target !== 'parent' && creds.tgChatId) ids.push(creds.tgChatId);
  if (target !== 'student' && creds.parentTgChatId) ids.push(creds.parentTgChatId);
  return Array.from(new Set(ids));
}

async function deliver(chatIds: string[], message: string) {
  const results = await Promise.all(chatIds.map((id) => sendTelegramMessage(id, message)));
  const sent = results.filter((r) => r?.ok).length;
  return { sent, failed: results.length - sent, total: results.length };
}

export async function GET(req: NextRequest) {
  try {
    if (!getSuperAdminAuth(req)) {
      return NextResponse.json({ message: "Ruxsat yo'q" }, { status: 403 });
    }

    const token = getTelegramBotToken();
    const username = getTelegramBotUsername();

    // Check webhook info from Telegram
    const webhookRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const webhookData = await webhookRes.json();

    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meRes.json();

    return NextResponse.json({
      configured: !!token,
      bot: `@${username}`,
      me: meData?.result || null,
      webhook: webhookData?.result || null,
    });
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const isPlatformAction = PLATFORM_ACTIONS.includes(action);

    if (isPlatformAction && !getSuperAdminAuth(req)) {
      return NextResponse.json({ message: "Ruxsat yo'q" }, { status: 403 });
    }

    const authUser = isPlatformAction ? null : getAuthUser(req);
    if (!isPlatformAction) {
      if (!authUser) {
        return NextResponse.json({ message: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
      }
      if (!ADMIN_ROLES.includes(authUser.role)) {
        return NextResponse.json({ message: "Ruxsat yo'q" }, { status: 403 });
      }
    }
    const token = getTelegramBotToken();

    // 1. Action: Set Webhook
    if (action === 'set_webhook') {
      const webhookUrl = body.url || `${new URL(req.url).origin}/api/telegram/webhook`;
      const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
      const setRes = await fetch(
        `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&allowed_updates=${encodeURIComponent(JSON.stringify(['message', 'contact']))}${secret ? `&secret_token=${encodeURIComponent(secret)}` : ''}`
      );
      const setData = await setRes.json();
      return NextResponse.json(setData);
    }

    // 2. Action: Delete Webhook
    if (action === 'delete_webhook') {
      const delRes = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
      const delData = await delRes.json();
      return NextResponse.json(delData);
    }

    // 3. Action: Send Direct Test Message
    if (action === 'send_test') {
      const { chatId, text } = body;
      if (!chatId || !text) {
        return NextResponse.json({ message: 'chatId va text kiritilishi shart' }, { status: 400 });
      }
      const sendRes = await sendTelegramMessage(chatId, text);
      return NextResponse.json(sendRes);
    }

    // 4. Action: Test Attendance Alert
    if (action === 'test_attendance') {
      const { chatId, studentName, status, groupName } = body;
      const res = await sendAttendanceAlert({
        studentName: studentName || "Test O'quvchi",
        status: status || 'KELMAGAN',
        date: new Date().toLocaleDateString('uz-UZ'),
        groupName: groupName || 'Frontend Web Dasturlash',
        chatId,
        centerName: 'IT Park Academy',
      });
      return NextResponse.json({ success: true, results: res });
    }

    // 5. Action: Test Payment Alert
    if (action === 'test_payment') {
      const { chatId, studentName, amount, courseName, receiptNumber } = body;
      const res = await sendPaymentAlert({
        studentName: studentName || "Test O'quvchi",
        amount: Number(amount) || 600000,
        courseName: courseName || 'Frontend Web Dasturlash',
        receiptNumber: receiptNumber || `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toLocaleDateString('uz-UZ'),
        chatId,
        centerName: 'IT Park Academy',
      });
      return NextResponse.json({ success: true, results: res });
    }

    // Everything below belongs to a single center's admin
    if (!authUser) {
      return NextResponse.json({ message: "Noma'lum harakat" }, { status: 400 });
    }

    // 6. Action: message one student and/or parent through the bot
    if (action === 'send_student_message') {
      const { studentId, text, target } = body;
      const textError = validateMessageText(text);
      if (textError) return NextResponse.json({ message: textError }, { status: 400 });

      const supabase = createServerSupabaseClient();
      const { data: student } = await supabase
        .from('students')
        .select('id, firstName, lastName, phone, passportSeries')
        .eq('id', studentId)
        .eq('centerId', authUser.centerId)
        .maybeSingle();
      if (!student) return NextResponse.json({ message: 'Talaba topilmadi' }, { status: 404 });

      const creds = parseStudentCreds(student.passportSeries, student.phone);
      const chatIds = pickChatIds(creds, target);
      if (chatIds.length === 0) {
        return NextResponse.json(
          { message: "Bu talaba yoki ota-onasi hali Telegram botga ulanmagan", sent: 0 },
          { status: 409 }
        );
      }

      const center = await getCenterName(supabase, authUser.centerId);
      const result = await deliver(chatIds, formatCenterMessage(text, center));
      return NextResponse.json({ success: result.sent > 0, ...result });
    }

    // 7. Action: announcement to every student (and/or parent) of one group
    if (action === 'send_group_message') {
      const { groupId, text, target } = body;
      const textError = validateMessageText(text);
      if (textError) return NextResponse.json({ message: textError }, { status: 400 });

      const supabase = createServerSupabaseClient();
      const { data: group } = await supabase
        .from('groups')
        .select('id, name')
        .eq('id', groupId)
        .eq('centerId', authUser.centerId)
        .maybeSingle();
      if (!group) return NextResponse.json({ message: 'Guruh topilmadi' }, { status: 404 });

      const { data: members } = await supabase
        .from('student_groups')
        .select('student:students(id, phone, passportSeries)')
        .eq('groupId', groupId)
        .eq('centerId', authUser.centerId);

      const chatIds = new Set<string>();
      let studentsWithoutTelegram = 0;
      for (const m of (members || []) as any[]) {
        if (!m.student) continue;
        const ids = pickChatIds(parseStudentCreds(m.student.passportSeries, m.student.phone), target);
        if (ids.length === 0) studentsWithoutTelegram++;
        ids.forEach((id) => chatIds.add(id));
      }
      if (chatIds.size === 0) {
        return NextResponse.json(
          { message: "Guruhdagi hech bir talaba Telegram botga ulanmagan", sent: 0 },
          { status: 409 }
        );
      }

      const center = await getCenterName(supabase, authUser.centerId);
      const result = await deliver(Array.from(chatIds), formatCenterMessage(text, center));
      return NextResponse.json({ success: result.sent > 0, studentsWithoutTelegram, ...result });
    }

    return NextResponse.json({ message: "Noma'lum harakat" }, { status: 400 });
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}
