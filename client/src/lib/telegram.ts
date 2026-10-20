/**
 * Telegram Bot Service for Markaz CRM
 * Official bot: @crm_olimjonbot
 */
import { createServerSupabaseClient } from './supabase/server';
import { parseStudentCreds, serializeStudentCreds } from './credentials';

const DEFAULT_BOT_USERNAME = 'crm_olimjonbot';

export const getTelegramBotToken = (): string => {
  return process.env.TELEGRAM_BOT_TOKEN || '';
};

export const getTelegramBotUsername = (): string => {
  return process.env.TELEGRAM_BOT_USERNAME || DEFAULT_BOT_USERNAME;
};

export interface SendMessageOptions {
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  reply_markup?: any;
  disable_web_page_preview?: boolean;
}

/**
 * Send an arbitrary message to a Telegram chat ID
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: SendMessageOptions
): Promise<{ ok: boolean; result?: any; description?: string }> {
  try {
    const token = getTelegramBotToken();
    if (!token || !chatId) {
      return { ok: false, description: 'Bot token or chatId is missing' };
    }

    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode || 'HTML',
      disable_web_page_preview: options?.disable_web_page_preview ?? true,
    };

    if (options?.reply_markup) {
      payload.reply_markup = options.reply_markup;
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error('Telegram send message error:', error);
    return { ok: false, description: error.message };
  }
}

/**
 * Link a student's Telegram chat ID by student ID
 */
export async function linkStudentTelegram(
  studentId: string,
  chatId: string | number,
  username?: string,
  isParent: boolean = false
): Promise<{ success: boolean; studentName?: string; message?: string }> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: student, error } = await supabase
      .from('students')
      .select('id, firstName, lastName, phone, passportSeries')
      .eq('id', studentId)
      .maybeSingle();

    if (error || !student) {
      return { success: false, message: "O'quvchi topilmadi" };
    }

    const creds = parseStudentCreds(student.passportSeries, student.phone);
    const newChatId = String(chatId);
    const newUsername = username ? username.replace('@', '') : creds.tgUser;

    const updatedPassportSeries = serializeStudentCreds(
      creds.login,
      creds.password,
      creds.subject || '',
      isParent ? creds.tgChatId : newChatId,
      newUsername,
      isParent ? newChatId : creds.parentTgChatId
    );

    const { error: updateErr } = await supabase
      .from('students')
      .update({
        passportSeries: updatedPassportSeries,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', studentId);

    if (updateErr) {
      return { success: false, message: updateErr.message };
    }

    const fullName = `${student.firstName} ${student.lastName}`.trim();
    return { success: true, studentName: fullName };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Link a student or parent by their phone number
 */
export async function linkTelegramByPhone(
  rawPhone: string,
  chatId: string | number,
  username?: string
): Promise<{ success: boolean; studentName?: string; count?: number; message?: string }> {
  try {
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      return { success: false, message: "Telefon raqam noto'g'ri" };
    }

    const last9 = cleanPhone.slice(-9); // e.g. 901234567

    const supabase = createServerSupabaseClient();
    // Search in phone, fatherPhone, motherPhone
    const { data: students, error } = await supabase
      .from('students')
      .select('id, firstName, lastName, phone, fatherPhone, motherPhone, passportSeries')
      .or(`phone.ilike.%${last9}%,fatherPhone.ilike.%${last9}%,motherPhone.ilike.%${last9}%`)
      .limit(5);

    if (error || !students || students.length === 0) {
      return { success: false, message: "Bu raqam bo'yicha o'quvchi topilmadi" };
    }

    const student = students[0];
    const isParentMatch =
      (student.fatherPhone && student.fatherPhone.includes(last9)) ||
      (student.motherPhone && student.motherPhone.includes(last9));

    const linkRes = await linkStudentTelegram(student.id, chatId, username, isParentMatch);
    return {
      success: linkRes.success,
      studentName: linkRes.studentName,
      count: students.length,
      message: linkRes.message,
    };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Send attendance alert to Student and/or Parent
 */
export async function sendAttendanceAlert(params: {
  studentName: string;
  status: 'KELGAN' | 'KECHIKKAN' | 'KELMAGAN';
  date: string;
  groupName: string;
  chatId?: string | number;
  parentChatId?: string | number;
  centerName?: string;
  teacherName?: string;
}) {
  const { studentName, status, date, groupName, chatId, parentChatId, centerName, teacherName } = params;

  let emoji = '✅';
  let title = 'Darsda qatnashdi (+10 XP)';
  let desc = `Farzandingiz <b>${studentName}</b> bugungi darsga o'z vaqtida keldi va faol qatnashdi!`;

  if (status === 'KECHIKKAN') {
    emoji = '⏱';
    title = 'Darsga kechikib keldi';
    desc = `Farzandingiz <b>${studentName}</b> bugungi darsga kechikib keldi. Iltimos, darslarga o'z vaqtida qatnashishni nazorat qiling.`;
  } else if (status === 'KELMAGAN') {
    emoji = '🚨';
    title = 'DIQQAT: Darsga kelmadi!';
    desc = `Hurmatli ota-ona! Farzandingiz <b>${studentName}</b> bugungi darsga <b>qatnashmadi</b>. Agar sababli bo'lsa, markaz ma'muriyatiga xabar berishingizni so'raymiz.`;
  }

  const message = `
${emoji} <b>DAVOMAT BILDIRISHNOMASI</b>

📌 <b>Holat:</b> ${title}
👤 <b>O'quvchi:</b> ${studentName}
📚 <b>Guruh:</b> ${groupName}
📅 <b>Sana:</b> ${date}
${teacherName ? `👨‍🏫 <b>Ustoz:</b> ${teacherName}\n` : ''}${centerName ? `🏢 <b>Markaz:</b> ${centerName}\n` : ''}
${desc}
`.trim();

  const targets = [chatId, parentChatId].filter(Boolean);
  const results = await Promise.all(
    targets.map((id) =>
      sendTelegramMessage(id!, message, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🌐 O'quvchi kabinetiga kirish",
                url: 'https://itpark-pi.vercel.app/student',
              },
            ],
          ],
        },
      })
    )
  );
  return results;
}

/**
 * Send payment receipt alert to Student and/or Parent
 */
export async function sendPaymentAlert(params: {
  studentName: string;
  amount: number;
  courseName: string;
  receiptNumber: string;
  date: string;
  chatId?: string | number;
  parentChatId?: string | number;
  centerName?: string;
  method?: string;
}) {
  const { studentName, amount, courseName, receiptNumber, date, chatId, parentChatId, centerName, method } = params;

  const formattedSum = amount.toLocaleString('uz-UZ');
  const message = `
🧾 <b>TO'LOV QABUL QILINDI</b>

Hurmatli <b>${studentName}</b>!
Sizning kurs uchun to'lovingiz tizimda muvaffaqiyatli qayd etildi.

💰 <b>To'langan summa:</b> ${formattedSum} so'm
📚 <b>Kurs yo'nalishi:</b> ${courseName}
🔢 <b>Kvitansiya raqami:</b> <code>${receiptNumber}</code>
📅 <b>Sana:</b> ${date}
${method ? `💳 <b>To'lov usuli:</b> ${method}\n` : ''}${centerName ? `🏢 <b>O'quv markaz:</b> ${centerName}\n` : ''}
<i>To'lovingiz uchun tashakkur! Elektron kvitansiyani shaxsiy kabinetingizdan yuklab olishingiz mumkin.</i>
`.trim();

  const targets = [chatId, parentChatId].filter(Boolean);
  return Promise.all(
    targets.map((id) =>
      sendTelegramMessage(id!, message, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📄 Kvitansiyani ko'rish",
                url: 'https://itpark-pi.vercel.app/student/payments',
              },
            ],
          ],
        },
      })
    )
  );
}

/**
 * Send debt / monthly fee reminder
 */
export async function sendDebtReminder(params: {
  studentName: string;
  debtAmount: number;
  courseName: string;
  dueDate: string;
  chatId?: string | number;
  parentChatId?: string | number;
  centerName?: string;
}) {
  const { studentName, debtAmount, courseName, dueDate, chatId, parentChatId, centerName } = params;

  const formattedSum = debtAmount.toLocaleString('uz-UZ');
  const message = `
💳 <b>OYLIK TO'LOV ESLATMASI</b>

Hurmatli <b>${studentName}</b>!
<b>"${courseName}"</b> kursi bo'yicha to'lov muddati yaqinlashmoqda.

⚠️ <b>To'lanishi kerak:</b> ${formattedSum} so'm
📅 <b>Muddati:</b> ${dueDate}
${centerName ? `🏢 <b>Markaz:</b> ${centerName}\n` : ''}
<i>Darslarda uzilishlar bo'lmasligi uchun to'lovni o'z vaqtida amalga oshirishingizni so'raymiz.</i>
`.trim();

  const targets = [chatId, parentChatId].filter(Boolean);
  return Promise.all(
    targets.map((id) =>
      sendTelegramMessage(id!, message, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "💳 To'lovlar bo'limi",
                url: 'https://itpark-pi.vercel.app/student/payments',
              },
            ],
          ],
        },
      })
    )
  );
}
