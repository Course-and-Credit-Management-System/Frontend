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
  must_reset_password?: boolean;

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

export interface StudentCourse {
  tag: string;
  credits: number;
  title: string;
  code: string;
  instructor: string;
  location: string;
  is_retake?: boolean;
}

export interface CurrentCoursesResponse {
  semester_name: string;
  total_credits: number;
  max_credits: number;
  courses_count: number;
  courses: StudentCourse[];
}

export interface CourseDetail {
  code: string;
  title: string;
  instructor: string;
  credits: number;
  schedule: string[] | string;
  room: string;
  description: string;
  syllabus: { week: number; topic: string }[];
  prerequisites: string[];
  type?: string;
  department?: string;

  // Potential API raw fields
  course_code?: string;
  instructor_email?: string;
  email?: string;
}
