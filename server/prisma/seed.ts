import { PrismaClient, Role, GroupDay, GroupStatus, TeacherSalaryType, ActiveStatus, StudentGender, StudentStatus, AttendanceStatus, PaymentMethod, PaymentStatus, ExpenseType, ExpenseStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean DB
  await prisma.attendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.studentGroup.deleteMany();
  await prisma.student.deleteMany();
  await prisma.group.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.room.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.center.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Test Center
  const center = await prisma.center.create({
    data: {
      name: 'IT-Park Academy',
      email: 'admin@itpark.uz',
      phone: '998901234567',
      password: hashedPassword,
    },
  });

  console.log(`✅ Created Center: ${center.name} (${center.id})`);

  // 2. Create User
  const user = await prisma.user.create({
    data: {
      fullName: 'Administrator',
      email: 'admin@itpark.uz',
      password: hashedPassword,
      role: Role.OWNER,
      centerId: center.id,
    },
  });

  // 3. Create Courses
  const courseFrontend = await prisma.course.create({
    data: {
      name: 'Frontend Web Dasturlash',
      price: 600000,
      description: 'HTML, CSS, JavaScript, React va TypeScript kurslari',
      centerId: center.id,
    },
  });

  const courseBackend = await prisma.course.create({
    data: {
      name: 'Python & Backend Dasturlash',
      price: 700000,
      description: 'Python, Django, FastAPI va PostgreSQL backend kurslari',
      centerId: center.id,
    },
  });

  // 4. Create Rooms
  const room1 = await prisma.room.create({
    data: { name: 'Lab 1', floor: 1, number: '101', capacity: 15, centerId: center.id },
  });
  const room2 = await prisma.room.create({
    data: { name: 'Lab 2', floor: 1, number: '102', capacity: 15, centerId: center.id },
  });
  const room3 = await prisma.room.create({
    data: { name: 'Konferensiya xonasi', floor: 2, number: '201', capacity: 25, centerId: center.id },
  });

  // 5. Create Teachers
  const teacherNames = [
    { firstName: 'Alisher', lastName: 'Qodirov', phone: '998911112233', salaryType: TeacherSalaryType.PERCENT, salaryValue: 50 },
    { firstName: 'Nodira', lastName: 'Saipova', phone: '998912223344', salaryType: TeacherSalaryType.FIXED, salaryValue: 4500000 },
    { firstName: 'Bobur', lastName: 'Mahmudov', phone: '998913334455', salaryType: TeacherSalaryType.PERCENT, salaryValue: 45 },
    { firstName: 'Jasur', lastName: 'Temirov', phone: '998914445566', salaryType: TeacherSalaryType.FIXED, salaryValue: 4000000 },
    { firstName: 'Malika', lastName: 'Karimova', phone: '998915556677', salaryType: TeacherSalaryType.PERCENT, salaryValue: 50 },
  ];

  const teachers = [];
  for (const t of teacherNames) {
    const teacher = await prisma.teacher.create({
      data: {
        ...t,
        passportSeries: 'AD1234567',
        status: ActiveStatus.FAOL,
        centerId: center.id,
      },
    });
    teachers.push(teacher);
  }

  // 6. Create Groups
  const group1 = await prisma.group.create({
    data: {
      name: 'FE-101 (Frontend)',
      courseId: courseFrontend.id,
      teacherId: teachers[0].id,
      roomId: room1.id,
      days: [GroupDay.DUSH, GroupDay.CHOR, GroupDay.JU],
      startTime: '09:00',
      endTime: '11:00',
      status: GroupStatus.FAOL,
      startDate: new Date('2026-01-10'),
      centerId: center.id,
    },
  });

  const group2 = await prisma.group.create({
    data: {
      name: 'PY-201 (Python)',
      courseId: courseBackend.id,
      teacherId: teachers[1].id,
      roomId: room2.id,
      days: [GroupDay.SESH, GroupDay.PAY, GroupDay.SHAN],
      startTime: '14:00',
      endTime: '16:00',
      status: GroupStatus.FAOL,
      startDate: new Date('2026-01-15'),
      centerId: center.id,
    },
  });

  const group3 = await prisma.group.create({
    data: {
      name: 'FE-102 (Kechki Frontend)',
      courseId: courseFrontend.id,
      teacherId: teachers[2].id,
      roomId: room3.id,
      days: [GroupDay.DUSH, GroupDay.CHOR, GroupDay.JU],
      startTime: '18:30',
      endTime: '20:30',
      status: GroupStatus.FAOL,
      startDate: new Date('2026-02-01'),
      centerId: center.id,
    },
  });

  const groups = [group1, group2, group3];

  // 7. Create 30 Students
  const firstNames = ['Sardor', 'Javohir', 'Dilshod', 'Bekzod', 'Kamola', 'Shaxnoza', 'Zilola', 'Otabek', 'Diyor', 'Nigora', 'Aziz', 'Suhrob', 'Umida', 'Fotima', 'Zuhra'];
  const lastNames = ['Yusupov', 'Raximov', 'Karimov', 'Ismoilov', 'Tursunov', 'Abdullayev', 'Nazarov', 'Axmedov', 'Mirzayev', 'Ergashev'];

  const students = [];
  for (let i = 1; i <= 30; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const gender = i % 2 === 0 ? StudentGender.ERKAK : StudentGender.AYOL;

    const student = await prisma.student.create({
      data: {
        firstName: fn,
        lastName: `${ln} #${i}`,
        birthDate: new Date(2005, (i % 12), (i % 28) + 1),
        phone: `99890${1000000 + i}`,
        fatherPhone: `99890${2000000 + i}`,
        motherPhone: `99890${3000000 + i}`,
        passportSeries: `AD${5000000 + i}`,
        gender: gender,
        isSchoolStudent: i % 3 === 0,
        status: i > 27 ? StudentStatus.BITIRGAN : StudentStatus.FAOL,
        centerId: center.id,
      },
    });
    students.push(student);

    // Assign to group
    const assignedGroup = groups[i % groups.length];
    await prisma.studentGroup.create({
      data: {
        studentId: student.id,
        groupId: assignedGroup.id,
        joinedAt: new Date('2026-01-15'),
        centerId: center.id,
      },
    });

    // Payments
    if (i % 4 !== 0) {
      await prisma.payment.create({
        data: {
          studentId: student.id,
          groupId: assignedGroup.id,
          courseId: assignedGroup.courseId,
          amount: assignedGroup.courseId === courseFrontend.id ? 600000 : 700000,
          paymentDate: new Date(2026, 7, (i % 15) + 1),
          method: i % 2 === 0 ? PaymentMethod.NAQD : PaymentMethod.KARTA,
          status: PaymentStatus.TOLANGAN,
          receivedById: user.id,
          centerId: center.id,
        },
      });
    } else {
      // Unpaid payment record
      await prisma.payment.create({
        data: {
          studentId: student.id,
          groupId: assignedGroup.id,
          courseId: assignedGroup.courseId,
          amount: 600000,
          paymentDate: new Date(2026, 7, (i % 10) + 1),
          method: PaymentMethod.NAQD,
          status: PaymentStatus.TOLANMAGAN,
          receivedById: user.id,
          centerId: center.id,
        },
      });
    }
  }

  console.log(`✅ Created 30 Students & StudentGroups & Payments`);

  // 8. Create Attendance records for past 30 days
  const today = new Date();
  for (let d = 0; d < 30; d++) {
    const attendanceDate = new Date();
    attendanceDate.setDate(today.getDate() - d);

    // Seed attendance for a subset of students per day
    for (let sIdx = 0; sIdx < 15; sIdx++) {
      const student = students[sIdx];
      const assignedGroup = groups[sIdx % groups.length];
      const statusRand = (sIdx + d) % 10;
      const status = statusRand < 7 ? AttendanceStatus.KELGAN : (statusRand < 9 ? AttendanceStatus.KELMAGAN : AttendanceStatus.KECHIKKAN);

      try {
        await prisma.attendance.create({
          data: {
            studentId: student.id,
            groupId: assignedGroup.id,
            date: attendanceDate,
            status: status,
            centerId: center.id,
          },
        });
      } catch (e) {
        // ignore unique constraint collisions if any
      }
    }
  }
  console.log(`✅ Created 30 days of Attendance records`);

  // 9. Expenses
  await prisma.expense.createMany({
    data: [
      { date: new Date('2026-08-01'), amount: 4500000, type: ExpenseType.IJARA, ownerName: 'Bino Egasi', status: ExpenseStatus.TOLANGAN, note: 'Avgust oyi ijara haqi', centerId: center.id },
      { date: new Date('2026-08-05'), amount: 1200000, type: ExpenseType.KOMMUNAL, ownerName: 'REK', status: ExpenseStatus.TOLANGAN, note: 'Elektr va suv', centerId: center.id },
      { date: new Date('2026-08-10'), amount: 2000000, type: ExpenseType.REKLAMA, ownerName: 'Targeting', status: ExpenseStatus.TOLANGAN, note: 'Instagram va Telegram reklamalari', centerId: center.id },
      { date: new Date('2026-08-15'), amount: 5000000, type: ExpenseType.USTOZ_MAOSHI, ownerName: 'Alisher Qodirov', status: ExpenseStatus.TOLANGAN, note: 'Iyul oyi maoshi', centerId: center.id },
    ],
  });

  // 10. Employees
  await prisma.employee.createMany({
    data: [
      { firstName: 'Farruh', lastName: 'Karimov', phone: '998909998877', position: 'Menejer', salary: 3500000, hiredAt: new Date('2025-09-01'), status: ActiveStatus.FAOL, centerId: center.id },
      { firstName: 'Aziza', lastName: 'Rahimova', phone: '998908887766', position: 'Administrator', salary: 3000000, hiredAt: new Date('2025-10-15'), status: ActiveStatus.FAOL, centerId: center.id },
    ],
  });

  console.log('🚀 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
