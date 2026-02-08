
export interface CourseDetail {
  code: string; // or course_code from backend mapped?
  title: string;
  instructor: string;
  instructor_email?: string;
  email?: string;
  credits: number;
  schedule: string[] | string;
  room: string;
  description: string;
  syllabus: { week: number; topic: string }[];
  prerequisites: string[];
  type?: string;
  department?: string;
    
  // backend specific fields to map from if needed, but usually we define the clean interface here
  course_code?: string;
}
