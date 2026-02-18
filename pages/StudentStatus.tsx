import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { DetailedCardGridSkeleton } from '../components/Skeleton';
import { User } from '../types';
import { api } from '../lib/api';

interface StatusProps {
  user: User;
  onLogout: () => void;
}

interface ProgressData {
  student_id: string;
  total_courses: {
    core: number;
    elective: number;
    overall: number;
  };
  completed_courses: {
    core: number;
    elective: number;
    overall: number;
  };
  progress_percentage: {
    core: number;
    elective: number;
    overall: number;
  };
  passed_course_details: any[];
}

const StudentStatus: React.FC<StatusProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [passedCourses, setPassedCourses] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllCourses, setShowAllCourses] = useState(false);

  const handleCourseClick = (course: any) => {
    // Navigate to results with course information to highlight the relevant semester
    const params = new URLSearchParams();
    if (course.academic_year) {
      params.set('semester', course.academic_year);
    }
    if (course.course_code) {
      params.set('course', course.course_code);
    }
    navigate(`/student/results?${params.toString()}`);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const progressData = await api.studentDegreeProgress();
        setProgressData(progressData);
        
        // Fetch all academic data including passed, retake, failed courses
        try {
          const academicData = await api.studentResults();
          console.log('STUDENT STATUS: Academic data received:', academicData);
          
          if (academicData && academicData.academic_history) {
            // Extract all courses from all semesters
            const allCoursesFromHistory: any[] = [];
            
            academicData.academic_history.forEach((semester: any) => {
              if (semester.results && Array.isArray(semester.results)) {
                semester.results.forEach((course: any) => {
                  allCoursesFromHistory.push({
                    title: course.course_title || course.course_name || course.title,
                    code: course.course_code || course.code,
                    status: course.status || (course.grade === 'F' ? 'Failed' : course.grade === 'W' ? 'Dropped' : course.is_retake ? 'Retake' : 'Passed'),
                    grade: course.grade || 'N/A',
                    academic_year: semester.academic_year || semester.semester,
                    semester: semester.semester || semester.academic_year,
                    credits: course.credits || 0,
                    is_retake: course.is_retake || false
                  });
                });
              }
            });
            
            console.log('STUDENT STATUS: All courses extracted:', allCoursesFromHistory);
            setAllCourses(allCoursesFromHistory);
          }
        } catch (error) {
          console.log('STUDENT STATUS: Could not fetch academic data, trying enrollment data');
          
          // Fallback to enrollment data
          try {
            const enrollmentData = await api.currentStudentCourses();
            console.log('STUDENT STATUS: Enrollment data received:', enrollmentData);
            
            if (enrollmentData && enrollmentData.courses && enrollmentData.courses.length > 0) {
              const processedCourses = enrollmentData.courses.map((course: any) => ({
                title: course.title,
                code: course.code,
                status: 'Enrolled',
                grade: 'N/A',
                academic_year: enrollmentData.semester_name || 'Current',
                semester: enrollmentData.semester_name || 'Current',
                credits: course.credits || 0,
                is_retake: course.is_retake || false
              }));
              
              setAllCourses(processedCourses);
            }
          } catch (fallbackError) {
            console.log('STUDENT STATUS: Could not fetch enrollment data either');
          }
        }
        
      } catch (error) {
        console.error('STUDENT STATUS: Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins">
        <Sidebar user={user} onLogout={onLogout} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header title="Academic Status" user={user} />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <DetailedCardGridSkeleton count={4} />
          </main>
        </div>
      </div>
    );
  }

  const studentProfile = user.student_profile || {};
  const progressItems = progressData ? [
    { 
      label: 'Core', 
      prog: `${Math.round(progressData.progress_percentage.core)}%`, 
      color: 'text-primary', 
      stats: `${progressData.completed_courses.core}/${progressData.total_courses.core}` 
    },
    { 
      label: 'Electives', 
      prog: `${Math.round(progressData.progress_percentage.elective)}%`, 
      color: 'text-gray-700 dark:text-gray-400', 
      stats: `${progressData.completed_courses.elective}/${progressData.total_courses.elective}` 
    },
    { 
      label: 'Overall', 
      prog: `${Math.round(progressData.progress_percentage.overall)}%`, 
      color: 'text-green-500', 
      stats: `${progressData.completed_courses.overall}/${progressData.total_courses.overall}` 
    }
  ] : [];

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 font-poppins relative">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Header title="Academic Trajectory" user={user} />
        <main className="flex-1 overflow-y-auto p-10 lg:p-16 scrollbar-hide animate-in fade-in duration-1000 slide-in-from-bottom-4">
          <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Academic Standing</h1>
              <p className="text-lg font-medium text-slate-400 dark:text-slate-500">Comprehensive audit of your degree progress and institutional metrics.</p>
            </div>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden mb-12 transition-all hover:shadow-md">
            <div className="flex flex-col md:flex-row">
              <div className="p-10 md:w-1/3 bg-white dark:bg-slate-950/50 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-100 dark:border-emerald-800/50 flex items-center gap-3 mb-6 shadow-sm">
                  <span className="material-symbols-outlined text-lg animate-pulse">verified</span>
                  {studentProfile.academic_status || 'Optimal Integrity'}
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Status</p>
              </div>
              <div className="p-10 flex-1 grid grid-cols-2 md:grid-cols-3 gap-12 items-center">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cumulative GPA</p>
                  <h3 className="text-5xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{studentProfile.cgpa || '0.00'}</h3>
                  <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest mt-3">
                    <span className="material-symbols-outlined text-sm">trending_up</span> Percentile Peak
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Units Validated</p>
                  <h3 className="text-5xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{studentProfile.total_credits_completed || 0}</h3>
                  <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mt-3">of {studentProfile.total_credits || 0} Required</p>
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1 pt-8 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Interval</p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{studentProfile.current_year || 'Year 01'}</h3>
                  <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest mt-3">
                    {progressData ? `${Math.round(progressData.progress_percentage.overall)}% Cycle Completion` : 'Sync Pending'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-12">
            <section className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-10 lg:p-12 transition-all hover:shadow-md group">
              <div className="flex justify-between items-center mb-12 border-b border-slate-50 dark:border-slate-800 pb-8 bg-slate-50/30 dark:bg-slate-950/20 -mx-12 px-12 -mt-12">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm text-teal-600">
                    <span className="material-symbols-outlined text-lg">analytics</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Curriculum Velocity</h2>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Aggregate: {progressData ? `${Math.round(progressData.progress_percentage.overall)}%` : '—'}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-16 lg:gap-24">
                {progressItems.map((it, i) => (
                  <div key={i} className="flex flex-col items-center text-center group/item">
                    <div className="relative w-40 h-40 mb-8 transition-transform duration-700 group-hover/item:scale-105">
                       <svg className="w-full h-full transform -rotate-90" viewBox="0 0 112 112">
                         <circle className="text-slate-50 dark:text-slate-800" cx="56" cy="56" fill="transparent" r="50" stroke="currentColor" strokeWidth="6" />
                         <circle className={`text-teal-500 drop-shadow-[0_0_8px_rgba(20,184,166,0.2)]`} cx="56" cy="56" fill="transparent" r="50" stroke="currentColor" strokeDasharray="314" strokeDashoffset={314 - (3.14 * parseInt(it.prog))} strokeLinecap="round" strokeWidth="6" />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{it.prog}</span>
                       </div>
                    </div>
                    <h4 className="font-black text-xs uppercase tracking-[0.3em] text-slate-400 group-hover/item:text-teal-600 transition-colors mb-2">{it.label}</h4>
                    <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">{it.stats} DISPATCHES</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>

        {/* Global UI Decoration */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/[0.02] rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2 -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/[0.02] rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/2 -z-10" />
      </div>

      {/* Full Screen Courses Modal */}
      {showAllCourses && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-50 flex items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-5xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-500">
            <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-950/20">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Institutional Ledger</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full sequence of course completions</p>
              </div>
              <button 
                onClick={() => setShowAllCourses(false)}
                className="h-12 w-12 rounded-full flex items-center justify-center text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-rose-500 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            <div className="p-10 overflow-y-auto max-h-[65vh] scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {allCourses.map((course, index) => (
                  <div 
                    key={index}
                    className="p-6 bg-slate-50/50 dark:bg-slate-950/50 rounded-[24px] border border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer group hover:shadow-xl hover:-translate-y-1"
                    onClick={() => {
                      handleCourseClick(course);
                      setShowAllCourses(false);
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-base font-black text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors tracking-tight line-clamp-1">
                        {course.title || course.code}
                      </h4>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border shadow-sm ${
                        course.status === 'Passed' || (course.grade && course.grade !== 'F' && course.grade !== 'W')
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400'
                          : course.status === 'Failed' || course.grade === 'F'
                          ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400'
                          : course.status === 'Retake'
                          ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400'
                          : 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-900/20 dark:text-teal-400'
                      }`}>
                        {course.status === 'Passed' || (course.grade && course.grade !== 'F' && course.grade !== 'W') ? 'Optimal' : 
                        course.status === 'Failed' || course.grade === 'F' ? 'Deficient' : 
                        course.status === 'Retake' ? 'Correction' : 'Active'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>{course.academic_year || course.semester || 'Recent'}</span>
                      <span className="opacity-20 text-lg">•</span>
                      <span className="font-mono">{course.code}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

};

export default StudentStatus;
