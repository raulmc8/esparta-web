export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';
export type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE';

export interface User {
  id: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface Session {
  accessToken: string;
  user: User;
}

export interface StudentCourse {
  enrollmentId: string;
  course: {
    code: string;
    name: string;
    credits: number;
  };
  section: string;
  term: string;
  startsAt: string;
  endsAt: string;
  teacher: string;
  payment: {
    status: PaymentStatus;
    amount: number;
    paidAt: string | null;
  };
  canViewGrades: boolean;
  grades: {
    finalGrade: number | null;
  } | null;
}

export interface TeacherStudent {
  enrollmentId: string;
  student: {
    id: string;
    name: string;
    email: string;
    username: string | null;
  };
  grades: {
    finalGrade: number | null;
  };
}

export interface TeacherOffering {
  id: string;
  section: string;
  term: string;
  startsAt: string;
  endsAt: string;
  course: {
    code: string;
    name: string;
  };
  students: TeacherStudent[];
}

export interface AdminUser extends User {
  active: boolean;
  createdAt: string;
  paymentStatus: PaymentStatus | null;
  cohort: {
    id: string;
    name: string;
    startsAt: string;
    career: {
      id: string;
      name: string;
    };
  } | null;
}

export interface AcademicStructure {
  careers: {
    id: string;
    name: string;
    cohorts: {
      id: string;
      name: string;
      startsAt: string;
      studentCount: number;
    }[];
  }[];
}

export interface AdminPayment {
  id: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  term: string;
  status: PaymentStatus;
  amount: number;
  paidAt: string | null;
  updatedAt: string;
}

export type OfferingStage = 'ACTIVE' | 'UPCOMING' | 'COMPLETED';

export interface AdminOffering {
  id: string;
  section: string;
  term: string;
  status: OfferingStage;
  startsAt: string;
  endsAt: string;
  course: {
    code: string;
    name: string;
    credits: number;
  };
  teacher: {
    id: string;
    name: string;
  };
  studentCount: number;
  students: {
    enrollmentId: string;
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    username: string | null;
    active: boolean;
    status: string;
    visibleToTeacher: boolean;
    finalGrade: number | null;
  }[];
}

export interface AdminTranscript {
  user: User;
  history: StudentCourse[];
  generalAverage: string;
}
