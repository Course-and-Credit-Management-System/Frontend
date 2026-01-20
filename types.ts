
export type Role = 'student' | 'admin';

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  department?: string;
  avatar: string;
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
