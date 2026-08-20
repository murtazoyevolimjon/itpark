export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER';
  centerId: string;
  centerName?: string;
}

export interface Center {
  id: string;
  name: string;
  email: string;
  phone: string;
  registeredAt: string;
}

export interface RegisterCenterDto {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface Course {
  id: string;
  name: string;
  price: number;
  description?: string;
  isActive: boolean;
  centerId: string;
  createdAt: string;
  _count?: {
    groups: number;
  };
}

export interface Room {
  id: string;
  name: string;
  floor: number;
  number: string;
  capacity: number;
  centerId: string;
  createdAt: string;
  _count?: {
    groups: number;
  };
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  passportSeries?: string;
  salaryType: 'FIXED' | 'PERCENT';
  salaryValue: number;
  status: 'FAOL' | 'NOFAOL';
  centerId: string;
  createdAt: string;
  _count?: {
    groups: number;
  };
  groups?: Group[];
}

export type GroupDay = 'DUSH' | 'SESH' | 'CHOR' | 'PAY' | 'JU' | 'SHAN' | 'YAK';

export interface Group {
  id: string;
  name: string;
  courseId: string;
  course?: Course;
  teacherId: string;
  teacher?: Teacher;
  roomId: string;
  room?: Room;
  days: GroupDay[];
  startTime: string;
  endTime: string;
  status: 'FAOL' | 'TUGAGAN' | 'TO_XTATILGAN';
  startDate: string;
  centerId: string;
  createdAt: string;
  _count?: {
    studentGroups: number;
  };
  studentGroups?: StudentGroup[];
  attendances?: Attendance[];
  payments?: Payment[];
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  fatherPhone?: string;
  motherPhone?: string;
  passportSeries?: string;
  gender: 'ERKAK' | 'AYOL';
  isSchoolStudent: boolean;
  status: 'FAOL' | 'BITIRGAN' | 'CHIQIB_KETGAN';
  paymentStatus?: 'TOLANGAN' | 'TOLANMAGAN' | 'QISMAN';
  centerId: string;
  createdAt: string;
  studentGroups?: StudentGroup[];
  attendances?: Attendance[];
  payments?: Payment[];
  attendancePercentage?: number;
  totalAttendances?: number;
  presentCount?: number;
}

export interface StudentGroup {
  id: string;
  studentId: string;
  student?: Student;
  groupId: string;
  group?: Group;
  joinedAt: string;
}

export type AttendanceStatus = 'KELGAN' | 'KELMAGAN' | 'KECHIKKAN';

export interface Attendance {
  id: string;
  studentId: string;
  student?: Student;
  groupId: string;
  group?: Group;
  date: string;
  status: AttendanceStatus;
  note?: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  position: string;
  salary: number;
  hiredAt: string;
  status: 'FAOL' | 'NOFAOL';
  centerId: string;
}

export interface Payment {
  id: string;
  studentId: string;
  student?: Student;
  groupId?: string;
  group?: Group;
  courseId?: string;
  course?: Course;
  amount: number;
  paymentDate: string;
  method: 'NAQD' | 'KARTA' | 'OTKAZMA';
  status: 'TOLANGAN' | 'TOLANMAGAN' | 'QISMAN';
  receivedBy?: User;
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  type: 'USTOZ_MAOSHI' | 'IJARA' | 'KOMMUNAL' | 'REKLAMA' | 'BOSHQA';
  ownerName?: string;
  status: 'KUTILMOQDA' | 'TOLANGAN';
  note?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface DashboardStats {
  studentsCount: number;
  teachersCount: number;
  coursesCount: number;
  groupsCount: number;
  graduatesCount: number;
  certificatesCount: number;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  debt: number;
  netProfit: number;
}
