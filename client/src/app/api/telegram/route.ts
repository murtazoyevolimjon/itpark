import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  getTelegramBotToken,
  getTelegramBotUsername,
  sendTelegramMessage,
  sendAttendanceAlert,
  sendPaymentAlert,
  sendDebtReminder,
} from '@/lib/telegram';

const ADMIN_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }
    if (!ADMIN_ROLES.includes(authUser.role)) {
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
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }

    if (!ADMIN_ROLES.includes(authUser.role)) {
      return NextResponse.json({ message: "Ruxsat yo'q" }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;
    const token = getTelegramBotToken();

    // 1. Action: Set Webhook
    if (action === 'set_webhook') {
      const webhookUrl = body.url || 'https://itpark-pi.vercel.app/api/telegram/webhook';
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
        centerName: authUser.centerName || 'IT Park Academy',
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
        centerName: authUser.centerName || 'IT Park Academy',
      });
      return NextResponse.json({ success: true, results: res });
    }

    return NextResponse.json({ message: "Noma'lum harakat" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
