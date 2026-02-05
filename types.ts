export type Role = 'student' | 'admin';

export interface User {
  // backend fields (MongoDB)
  _id?: string;
  user_id?: string;

  // existing field used in UI (mock)
  id?: string;

  name: string;
  role: Role;
  email: string;

  department?: string;
  avatar?: string;

  // backend may return these
  student_profile?: any;
  admin_profile?: any;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  department: string;
  credits: number;
  type: 'Core' | 'Elective' | 'Prerequisite';
}

export interface EnrollmentRequest {
  id: string;
  studentName: string;
  studentInitials: string;
  courseName: string;
  status: 'Enrolled' | 'Pending' | 'Conflict' | 'Waitlisted';
  date: string;
}
