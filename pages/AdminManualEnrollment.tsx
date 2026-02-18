import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { DetailedCardGridSkeleton } from "../components/Skeleton";
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
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 font-poppins relative">
      <Sidebar user={user} onLogout={onLogout} />

      {toast.type && (
        <div className={`fixed top-8 right-8 z-[100] flex items-center gap-4 rounded-2xl px-8 py-5 shadow-2xl transition-all animate-in slide-in-from-right-8 ${
            toast.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/40" : "bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/40"
        }`}>
            <span className="material-icons-outlined text-2xl">
                {toast.type === "success" ? "verified_user" : "error_outline"}
            </span>
            <p className="font-black text-xs uppercase tracking-widest">{toast.message}</p>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Header title="Enrollment Override" user={user} />
        <main className="flex-1 overflow-y-auto p-10 lg:p-16 scrollbar-hide animate-in fade-in duration-1000 slide-in-from-bottom-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
              <div className="space-y-3">
                <button 
                  onClick={() => navigate(-1)} 
                  className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-teal-600 transition-colors mb-4"
                >
                  <span className="material-icons-outlined text-sm transform group-hover:-translate-x-1 transition-transform">west</span>
                  Return to Matrix
                </button>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Manual Provisioning</h2>
                <p className="text-lg font-medium text-slate-400 dark:text-slate-500 max-w-xl">Bypass standard enrollment protocols to manually assign institutional courses to students.</p>
              </div>
              <div className="px-4 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 text-[10px] font-black uppercase tracking-[0.2em] border border-teal-100 dark:border-teal-800 shadow-sm shrink-0">
                Override Authorization Active
              </div>
            </div>
            
            <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-[40px] border border-slate-100 dark:border-slate-800 p-10 lg:p-12 shadow-sm transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-40 w-40 bg-teal-500/[0.02] rounded-bl-full pointer-events-none" />
              
              {loading ? (
                <div className="space-y-10">
                  <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
                  <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
                  <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
                </div>
              ) : error ? (
                <div className="p-8 text-center bg-rose-50 rounded-3xl border border-rose-100">
                  <p className="text-sm font-black text-rose-700 uppercase tracking-widest italic">{error}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
                  
                  {/* Student Selection (Searchable) */}
                  <div ref={studentDropdownRef} className="relative group/field">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 block ml-1">Target Subject</label>
                    <div className="relative">
                      <span className="material-icons-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/field:text-teal-500 transition-colors">person_pin</span>
                      <input
                        type="text"
                        placeholder="Search student nomenclature or UID..."
                        value={studentSearch}
                        onChange={(e) => {
                          setStudentSearch(e.target.value);
                          setIsStudentOpen(true);
                          if (selectedStudentId) setSelectedStudentId("");
                        }}
                        onFocus={() => setIsStudentOpen(true)}
                        className="w-full pl-14 pr-12 py-5 text-base font-bold rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all dark:text-white placeholder:text-slate-200"
                      />
                      <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-slate-300">
                          <span className={`material-icons-outlined transition-transform duration-300 ${isStudentOpen ? 'rotate-180' : ''}`}>expand_more</span>
                      </div>
                    </div>

                    {isStudentOpen && (
                      <ul className="absolute z-20 mt-3 max-h-72 w-full overflow-auto rounded-[24px] border border-slate-100 bg-white p-2 shadow-2xl dark:bg-slate-900 dark:border-slate-800 scrollbar-hide animate-in fade-in zoom-in-95 duration-200">
                        {students.filter(s => 
                            (s.userId || "").toLowerCase().includes(studentSearch.toLowerCase()) || 
                            (s.name || "").toLowerCase().includes(studentSearch.toLowerCase())
                        ).length === 0 ? (
                          <li className="px-6 py-10 text-center">
                            <span className="text-xs font-black text-slate-300 uppercase tracking-widest italic">No Student Records Matching Filter</span>
                          </li>
                        ) : (
                          students.filter(s => 
                              (s.userId || "").toLowerCase().includes(studentSearch.toLowerCase()) || 
                              (s.name || "").toLowerCase().includes(studentSearch.toLowerCase())
                          ).map((student) => (
                              <li
                                key={student.id}
                                className="cursor-pointer px-6 py-4 rounded-xl transition-all group/item hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
                                onClick={() => {
                                  setSelectedStudentId(student.userId);
                                  setStudentSearch(`${student.userId} — ${student.name}`);
                                  setIsStudentOpen(false);
                                }}
                              >
                                <div>
                                  <span className="text-xs font-black text-slate-900 dark:text-white group-hover/item:text-teal-600 transition-colors uppercase tracking-tight">{student.name}</span>
                                  <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{student.userId}</p>
                                </div>
                                <span className="material-icons-outlined text-slate-200 group-hover/item:text-teal-500 opacity-0 group-hover/item:opacity-100 transition-all">check_circle</span>
                              </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>

                  {/* Course Selection (Searchable) */}
                  <div ref={courseDropdownRef} className="relative group/field">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 block ml-1">Institutional Course</label>
                    <div className="relative">
                      <span className="material-icons-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/field:text-teal-500 transition-colors">auto_stories</span>
                      <input
                        type="text"
                        placeholder="Search course code or title..."
                        value={courseSearch}
                        onChange={(e) => {
                          setCourseSearch(e.target.value);
                          setIsCourseOpen(true);
                          if (selectedCourseId) setSelectedCourseId(""); 
                        }}
                        onFocus={() => setIsCourseOpen(true)}
                        className="w-full pl-14 pr-12 py-5 text-base font-bold rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all dark:text-white placeholder:text-slate-200"
                      />
                      <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-slate-300">
                          <span className={`material-icons-outlined transition-transform duration-300 ${isCourseOpen ? 'rotate-180' : ''}`}>expand_more</span>
                      </div>
                    </div>

                    {isCourseOpen && (
                      <ul className="absolute z-20 mt-3 max-h-72 w-full overflow-auto rounded-[24px] border border-slate-100 bg-white p-2 shadow-2xl dark:bg-slate-900 dark:border-slate-800 scrollbar-hide animate-in fade-in zoom-in-95 duration-200">
                        {courses.filter(c => 
                            (c.code || "").toLowerCase().includes(courseSearch.toLowerCase()) || 
                            (c.name || "").toLowerCase().includes(courseSearch.toLowerCase())
                        ).length === 0 ? (
                          <li className="px-6 py-10 text-center">
                            <span className="text-xs font-black text-slate-300 uppercase tracking-widest italic">No Curriculum Records Matching Filter</span>
                          </li>
                        ) : (
                          courses.filter(c => 
                              (c.code || "").toLowerCase().includes(courseSearch.toLowerCase()) || 
                              (c.name || "").toLowerCase().includes(courseSearch.toLowerCase())
                          ).map((course) => (
                            <li
                              key={course.id}
                              className="cursor-pointer px-6 py-4 rounded-xl transition-all group/item hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
                              onClick={() => {
                                setSelectedCourseId(course.code);
                                setCourseSearch(`${course.code} — ${course.name}`);
                                setIsCourseOpen(false);
                              }}
                            >
                              <div className="min-w-0">
                                <span className="text-xs font-black text-slate-900 dark:text-white group-hover/item:text-teal-600 transition-colors uppercase tracking-tight truncate block">{course.name}</span>
                                <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{course.code} • {course.credits} CU • {course.type}</p>
                              </div>
                              <span className="material-icons-outlined text-slate-200 group-hover/item:text-teal-500 opacity-0 group-hover/item:opacity-100 transition-all ml-4 shrink-0">add_task</span>
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>

                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={!selectedStudentId || !selectedCourseId}
                      className="w-full h-16 rounded-[24px] bg-slate-900 dark:bg-teal-600 font-black text-xs uppercase tracking-[0.3em] text-white shadow-2xl shadow-slate-200 dark:shadow-teal-900/20 transition-all hover:bg-slate-800 dark:hover:bg-teal-700 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-4 group"
                    >
                      <span>Commit Enrollment</span>
                      <span className="material-icons-outlined text-lg transition-transform group-hover:translate-x-1">east</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </main>

        {/* Global UI Decoration */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/[0.02] rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2 -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/[0.02] rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/2 -z-10" />
      </div>
    </div>
  );
};

export default AdminManualEnrollment;
