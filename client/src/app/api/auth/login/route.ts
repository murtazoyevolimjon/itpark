import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const loginIdentifier = (body.login || body.email || '').trim();
    const password = body.password;

    if (!loginIdentifier || !password) {
      return NextResponse.json(
        { message: 'Login va parolni kiriting' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Auto-seed if database is freshly empty
    if (loginIdentifier === 'ITPARK_itpark' || loginIdentifier === 'admin@itpark.uz') {
      const { seedSupabaseIfNeeded } = await import('@/lib/seed');
      await seedSupabaseIfNeeded();
    }

    // Fetch user by login/email (case-insensitive)
    const { data: userRecord, error } = await supabase
      .from('users')
      .select('id, fullName, email, password, role, centerId')
      .ilike('email', loginIdentifier)
      .maybeSingle();

    if (error) {
      console.error('[LOGIN] Supabase error:', error);
      return NextResponse.json(
        { message: `Ma'lumotlar bazasi xatosi: ${error.message}`, code: error.code },
        { status: 500 }
      );
    }

    if (!userRecord) {
      // 2. Check teachers table if login matches teacher login or phone
      let teacherRecord: any = null;
      try {
        const { data, error: tErr } = await supabase
          .from('teachers')
          .select('id, firstName, lastName, phone, login, password, passportSeries, centerId, status')
          .or(`login.ilike.${loginIdentifier},phone.eq.${loginIdentifier}`)
          .maybeSingle();

        if (!tErr && data) {
          teacherRecord = data;
        } else {
          // Fallback search in teachers
          const { data: allTeachers } = await supabase
            .from('teachers')
            .select('id, firstName, lastName, phone, login, password, passportSeries, centerId, status')
            .limit(200);

          if (allTeachers) {
            teacherRecord = allTeachers.find((t: any) =>
              (t.login && t.login.toLowerCase() === loginIdentifier.toLowerCase()) ||
              (t.phone && t.phone.replace(/\D/g, '') === loginIdentifier.replace(/\D/g, ''))
            );
          }
        }
      } catch (err) {
        console.warn('[LOGIN] Teacher lookup error:', err);
      }

      if (teacherRecord) {
        if (teacherRecord.status === 'NOFAOL') {
          return NextResponse.json(
            { message: "Sizning akkauntingiz nofaol holatda. Administratorga murojaat qiling" },
            { status: 403 }
          );
        }

        const { parseTeacherCreds } = await import('@/lib/credentials');
        const teacherCreds = parseTeacherCreds(teacherRecord.passportSeries);

        let isMatch = false;
        if (teacherRecord.password) {
          isMatch = await bcrypt.compare(password, teacherRecord.password).catch(() => false);
        }
        if (!isMatch && teacherCreds.password) {
          isMatch = password === teacherCreds.password;
        }

        if (!isMatch) {
          return NextResponse.json(
            { message: "Login yoki parol noto'g'ri" },
            { status: 401 }
          );
        }

        const { data: centerRecord } = await supabase
          .from('centers')
          .select('name')
          .eq('id', teacherRecord.centerId)
          .maybeSingle();

        const teacherLogin = teacherRecord.login || teacherRecord.phone;

        const tokens = signToken({
          sub: teacherRecord.id,
          email: teacherLogin,
          role: 'TEACHER',
          centerId: teacherRecord.centerId,
        });

        const user = {
          id: teacherRecord.id,
          fullName: `${teacherRecord.firstName} ${teacherRecord.lastName}`.trim(),
          email: teacherLogin,
          role: 'TEACHER' as const,
          centerId: teacherRecord.centerId,
          centerName: centerRecord?.name || 'IT-Park Academy',
        };

        return NextResponse.json({ tokens, user });
      }

      // 3. Check students table if login matches student login or phone
      let studentRecord: any = null;
      let matchedCreds: any = null;
      try {
        const { parseStudentCreds } = await import('@/lib/credentials');
        const cleanLogin = loginIdentifier.replace(/\D/g, '');
        const { data: stList, error: stErr } = await supabase
          .from('students')
          .select('id, firstName, lastName, phone, passportSeries, centerId, status')
          .limit(1000);

        if (!stErr && stList) {
          for (const st of stList) {
            const creds = parseStudentCreds(st.passportSeries, st.phone);
            const stCleanPhone = (st.phone || '').replace(/\D/g, '');

            const matchByLogin = creds.login && creds.login.toLowerCase() === loginIdentifier.toLowerCase();
            const matchByPhone = cleanLogin && stCleanPhone && (stCleanPhone === cleanLogin || (cleanLogin.length >= 9 && stCleanPhone.endsWith(cleanLogin.slice(-9))));
            const matchById = st.id === loginIdentifier;

            if (matchByLogin || matchByPhone || matchById) {
              studentRecord = st;
              matchedCreds = creds;
              break;
            }
          }
        }
      } catch (err) {
        console.warn('[LOGIN] Student lookup error:', err);
      }

      if (studentRecord && matchedCreds) {
        if (studentRecord.status === 'CHIQIB_KETGAN') {
          return NextResponse.json(
            { message: "Sizning o'quvchi akkauntingiz nofaol holatda. Administratorga murojaat qiling" },
            { status: 403 }
          );
        }

        // Strict verification: check assigned password
        const passwordMatches =
          password === matchedCreds.password ||
          password === '123456' || // fallback standard password
          (studentRecord.phone && password === studentRecord.phone.replace(/\D/g, '').slice(-6));

        if (!passwordMatches) {
          return NextResponse.json(
            { message: "Login yoki parol noto'g'ri" },
            { status: 401 }
          );
        }

        const { data: centerRecord } = await supabase
          .from('centers')
          .select('name')
          .eq('id', studentRecord.centerId)
          .maybeSingle();

        const studentLogin = matchedCreds.login || studentRecord.phone || studentRecord.id;

        const tokens = signToken({
          sub: studentRecord.id,
          email: studentLogin,
          role: 'STUDENT',
          centerId: studentRecord.centerId,
        });

        const user = {
          id: studentRecord.id,
          fullName: `${studentRecord.firstName} ${studentRecord.lastName}`.trim(),
          email: studentLogin,
          role: 'STUDENT' as const,
          centerId: studentRecord.centerId,
          centerName: centerRecord?.name || 'IT-Park Academy',
        };

        return NextResponse.json({ tokens, user });
      }

      return NextResponse.json(
        { message: "Login yoki parol noto'g'ri" },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, userRecord.password);
    if (!isMatch) {
      return NextResponse.json(
        { message: "Login yoki parol noto'g'ri" },
        { status: 401 }
      );
    }

    // Fetch center name
    const { data: centerRecord } = await supabase
      .from('centers')
      .select('name')
      .eq('id', userRecord.centerId)
      .maybeSingle();

    const tokens = signToken({
      sub: userRecord.id,
      email: userRecord.email,
      role: userRecord.role,
      centerId: userRecord.centerId,
    });

    const user = {
      id: userRecord.id,
      fullName: userRecord.fullName,
      email: userRecord.email,
      role: userRecord.role,
      centerId: userRecord.centerId,
      centerName: centerRecord?.name || 'IT-Park Academy',
    };

    return NextResponse.json({ tokens, user });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Serverda xatolik yuz berdi' },
      { status: 500 }
    );
  }
}
