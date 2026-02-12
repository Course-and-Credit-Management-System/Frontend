import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { User, Course } from "../types";
import { api } from "../lib/api";

interface Props {
  user: User;
  onLogout: () => void;
}

const AdminManualEnrollment: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<{id: string, userId: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | null }>({ message: "", type: null });

  // Custom Searchable Dropdown State
  const [isCourseOpen, setIsCourseOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const courseDropdownRef = useRef<HTMLDivElement>(null);

  // Student Dropdown State
  const [isStudentOpen, setIsStudentOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const studentDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target as Node)) {
        setIsCourseOpen(false);
      }
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target as Node)) {
        setIsStudentOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [coursesData, studentsData] = await Promise.all([
          api.adminCourses(),
          api.adminStudents()
        ]);

        // Handle student data normalization
        const rawStudents = Array.isArray(studentsData) ? studentsData : (studentsData.items || studentsData.data || []);
        const mappedStudents = rawStudents.map((s: any) => ({
             id: s._id || s.id, // Internal ID
             userId: s.user_id || s.id || "N/A", // Display/Link ID
             name: s.name || "Unknown Student"
        }));

        // Handle possible { items: [] } structure for courses
        const rawCourses = Array.isArray(coursesData) ? coursesData : (coursesData.items || coursesData.data || []);
        const mappedCourses: Course[] = rawCourses.map((c: any) => ({
            id: c._id || c.id,
            code: c.course_code || c.code,
            name: c.title || c.name,
            department: c.department || '',
            credits: c.credits || 0,
            type: c.type || 'Elective'
        }));

        setCourses(mappedCourses);
        setStudents(mappedStudents);
      } catch (err: any) {
        setError(err.message || "Failed to load data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: null }), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedCourseId) {
      showToast("Please select both student and course", "error");
      return;
    }

    try {
      await api.adminCreateEnrollment({
        student_id: selectedStudentId,
        course_id: selectedCourseId
      });
      showToast("Enrollment created successfully", "success");
      // Reset form
      setSelectedStudentId("");
      setSelectedCourseId("");
      setCourseSearch("");
      setStudentSearch("");
    } catch (err: any) {
      showToast(err.message || "Failed to create enrollment", "error");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark relative">
      <Sidebar user={user} onLogout={onLogout} />

      {toast.type && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg px-6 py-4 shadow-lg transition-all animate-in slide-in-from-top-5 ${
            toast.type === "success" ? "bg-[#eafaf1] text-[#27ae60] border border-[#27ae60]/20" : "bg-[#fdecea] text-[#e74c3c] border border-[#e74c3c]/20"
        }`}>
            <span className="material-icons-outlined text-xl">
                {toast.type === "success" ? "check_circle" : "error"}
            </span>
            <p className="font-medium text-sm">{toast.message}</p>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Manual Enrollment" user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto rounded-xl bg-surface-light p-8 shadow-sm dark:bg-surface-dark border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-6">
              <button 
                onClick={() => navigate(-1)} 
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Go Back"
              >
                <span className="material-icons-outlined text-gray-600 dark:text-gray-300">arrow_back</span>
              </button>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Create New Enrollment</h2>
            </div>
            
            {loading ? (
              <p className="text-gray-500">Loading data...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Student Selection (Searchable) */}
                <div ref={studentDropdownRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Student</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Select a student..."
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setIsStudentOpen(true);
                        if (selectedStudentId) setSelectedStudentId("");
                      }}
                      onFocus={() => setIsStudentOpen(true)}
                      className="w-full rounded-lg border border-gray-300 bg-white p-3 pr-10 text-gray-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                        <span className="material-icons-outlined text-sm">expand_more</span>
                    </div>
                  </div>

                  {isStudentOpen && (
                    <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:bg-slate-800 dark:border-gray-700">
                      {students.filter(s => 
                          (s.userId || "").toLowerCase().includes(studentSearch.toLowerCase()) || 
                          (s.name || "").toLowerCase().includes(studentSearch.toLowerCase())
                      ).length === 0 ? (
                        <li className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">No students found</li>
                      ) : (
                        students.filter(s => 
                            (s.userId || "").toLowerCase().includes(studentSearch.toLowerCase()) || 
                            (s.name || "").toLowerCase().includes(studentSearch.toLowerCase())
                        ).map((student) => (
                            <li
                              key={student.id}
                              className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-700"
                              onClick={() => {
                                setSelectedStudentId(student.userId);
                                setStudentSearch(`${student.userId} — ${student.name}`);
                                setIsStudentOpen(false);
                              }}
                            >
                              <span className="font-semibold">{student.userId}</span> — {student.name}
                            </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>

                {/* Course Selection (Searchable) */}
                <div ref={courseDropdownRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Course</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Select a course..."
                      value={courseSearch}
                      onChange={(e) => {
                        setCourseSearch(e.target.value);
                        setIsCourseOpen(true);
                        if (selectedCourseId) setSelectedCourseId(""); // Reset ID if user types
                      }}
                      onFocus={() => setIsCourseOpen(true)}
                      className="w-full rounded-lg border border-gray-300 bg-white p-3 pr-10 text-gray-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                        <span className="material-icons-outlined text-sm">expand_more</span>
                    </div>
                  </div>

                  {isCourseOpen && (
                    <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:bg-slate-800 dark:border-gray-700">
                      {courses.filter(c => 
                          (c.code || "").toLowerCase().includes(courseSearch.toLowerCase()) || 
                          (c.name || "").toLowerCase().includes(courseSearch.toLowerCase())
                      ).length === 0 ? (
                        <li className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">No courses found</li>
                      ) : (
                        courses.filter(c => 
                            (c.code || "").toLowerCase().includes(courseSearch.toLowerCase()) || 
                            (c.name || "").toLowerCase().includes(courseSearch.toLowerCase())
                        ).map((course) => (
                          <li
                            key={course.id}
                            className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-700"
                            onClick={() => {
                              setSelectedCourseId(course.code);
                              setCourseSearch(`${course.code} — ${course.name}`);
                              setIsCourseOpen(false);
                            }}
                          >
                            <span className="font-semibold">{course.code}</span> — {course.name}
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-primary py-3 font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    Enroll
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminManualEnrollment;
