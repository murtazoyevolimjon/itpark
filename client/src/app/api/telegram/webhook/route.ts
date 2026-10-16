import { NextRequest, NextResponse } from 'next/server';
import {
  sendTelegramMessage,
  linkStudentTelegram,
  linkTelegramByPhone,
  getTelegramBotUsername,
} from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    const message = update?.message || update?.edited_message;
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat?.id;
    const fromUser = message.from;
    const username = fromUser?.username || '';
    const firstName = fromUser?.first_name || '';
    const text = (message.text || '').trim();

    // 1. Handle Contact Sharing
    if (message.contact && message.contact.phone_number) {
      const phoneNumber = message.contact.phone_number;
      const linkRes = await linkTelegramByPhone(phoneNumber, chatId, username);

      if (linkRes.success) {
        await sendTelegramMessage(
          chatId,
          `✅ <b>Muvaffaqiyatli ulandi!</b>\n\n👤 O'quvchi: <b>${linkRes.studentName}</b>\n📱 Telefon: <code>${phoneNumber}</code>\n\nEndi sizga dars davomati, to'lov kvitansiyalari va muhim dars eslatmalari avtomatik ravishda yuborib turiladi! 🎉`,
          {
            reply_markup: {
              remove_keyboard: true,
              inline_keyboard: [
                [
                  {
                    text: "🌐 O'quvchi kabinetiga o'tish",
                    url: 'https://itpark-pi.vercel.app/student',
                  },
                ],
              ],
            },
          }
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `⚠️ <b>Topilmadi!</b>\n\nTizimda <code>${phoneNumber}</code> raqami bilan ro'yxatdan o'tgan o'quvchi topilmadi.\n\nIltimos, o'quv markaz ma'muriyatiga murojaat qiling yoki shaxsiy kabinetingizdagi <b>"Telegram botga ulanish"</b> tugmasi orqali kiring.`,
          {
            reply_markup: { remove_keyboard: true },
          }
        );
      }
      return NextResponse.json({ ok: true });
    }

    // 2. Handle /start command
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const startParam = parts[1]?.trim();

      // Deep linking via /start stu_<studentId>
      if (startParam && startParam.startsWith('stu_')) {
        const studentId = startParam.substring(4);
        const linkRes = await linkStudentTelegram(studentId, chatId, username, false);

        if (linkRes.success) {
          await sendTelegramMessage(
            chatId,
            `🎉 <b>Assalomu alaykum, ${linkRes.studentName}!</b>\n\nSizning Telegram hisobingiz <b>Markaz CRM</b> platformasiga muvaffaqiyatli ulandi!\n\nEndi barcha dars davomati, oylik to'lovlar va uyga vazifalar haqidagi xabarnomalar to'g'ridan-to'g'ri shu botga yuboriladi. 🚀`,
            {
              reply_markup: {
                remove_keyboard: true,
                inline_keyboard: [
                  [
                    {
                      text: "🌐 Shaxsiy kabinetga kirish",
                      url: 'https://itpark-pi.vercel.app/student',
                    },
                  ],
                ],
              },
            }
          );
          return NextResponse.json({ ok: true });
        }
      }

      // Deep linking via /start parent_<studentId>
      if (startParam && startParam.startsWith('parent_')) {
        const studentId = startParam.substring(7);
        const linkRes = await linkStudentTelegram(studentId, chatId, username, true);

        if (linkRes.success) {
          await sendTelegramMessage(
            chatId,
            `👨‍👩‍👧 <b>Hurmatli ota-ona!</b>\n\nFarzandingiz <b>${linkRes.studentName}</b> ning o'quv markazidagi faoliyatini kuzatib borish uchun hisobingiz muvaffaqiyatli ulandi!\n\nFarzandingizning darslarga qatnashuvi, kelgan/kelmaganligi va to'lov hisobotlari sizga shu bot orqali real vaqtda yetkaziladi.`,
            {
              reply_markup: { remove_keyboard: true },
            }
          );
          return NextResponse.json({ ok: true });
        }
      }

      // Default welcome when user simply opens the bot
      await sendTelegramMessage(
        chatId,
        `👋 <b>Assalomu alaykum, ${firstName || 'foydalanuvchi'}!</b>\n\n<b>Markaz CRM Xabarnoma Botiga</b> xush kelibsiz! 🤖\n\nUshbu bot orqali o'quv markazidagi dars davomati, oylik to'lov kvitansiyalari va dars eslatmalarini real vaqtda kuzatib borishingiz mumkin.\n\n👇 <b>Profilingizni ulash uchun quyidagi tugmani bosing:</b>`,
        {
          reply_markup: {
            keyboard: [
              [
                {
                  text: '📱 Telefon raqamimni yuborish',
                  request_contact: true,
                },
              ],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }
      );
      return NextResponse.json({ ok: true });
    }

    // 3. Handle /yordam or help
    if (text === '/yordam' || text === '/help') {
      await sendTelegramMessage(
        chatId,
        `ℹ️ <b>BOT BUYRUQLARI</b>\n\n• /start — Botni qayta ishga tushirish\n• 📱 <b>Kontaktni yuborish</b> — Profilingizni telefon raqamingiz orqali tizimga bog'lash\n\nSavol va murojaatlar bo'yicha o'quv markazingiz ma'muriyatiga murojaat qiling.`
      );
      return NextResponse.json({ ok: true });
    }

    // Fallback response for unhandled text
    await sendTelegramMessage(
      chatId,
      `Xabaringiz qabul qilindi. Profilingizni bog'lash uchun iltimos pastdagi <b>"📱 Telefon raqamimni yuborish"</b> tugmasidan foydalaning.`,
      {
        reply_markup: {
          keyboard: [
            [
              {
                text: '📱 Telefon raqamimni yuborish',
                request_contact: true,
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Telegram webhook error:', err);
    return NextResponse.json({ ok: true }); // Always return 200 OK to Telegram so it doesn't retry infinitely
  }
}

export async function GET() {
  const botUsername = getTelegramBotUsername();
  return NextResponse.json({
    status: 'ACTIVE',
    bot: `@${botUsername}`,
    service: 'Markaz CRM Telegram Notification Webhook',
    timestamp: new Date().toISOString(),
  });
}
