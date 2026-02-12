import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
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
                    status: course.status || (course.grade === 'F' ? 'Failed' : course.grade === 'W' ? 'Withdrawn' : course.is_retake ? 'Retake' : 'Passed'),
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
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Loading academic progress...</p>
              </div>
            </div>
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
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Academic Status" user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Academic Status</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Detailed view of your current standing and degree progress.</p>
            </div>
          
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-8">
            <div className="flex flex-col md:flex-row">
              <div className="p-8 md:w-1/3 bg-primary/5 dark:bg-primary/10 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700">
                <div className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-lg">verified</span>
                  {studentProfile.academic_status || 'In Good Standing'}
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Academic Status</p>
              </div>
              <div className="p-8 flex-1 grid grid-cols-2 md:grid-cols-3 gap-8 text-center md:text-left">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Cumulative GPA</p>
                  <h3 className="text-4xl font-bold text-gray-800 dark:text-white">{studentProfile.cgpa || 'N/A'}</h3>
                  <p className="text-xs text-green-500 mt-1 flex items-center justify-center md:justify-start gap-1">
                    <span className="material-symbols-outlined text-sm">trending_up</span> Top 10% of class
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Credits Earned</p>
                  <h3 className="text-4xl font-bold text-gray-800 dark:text-white">{studentProfile.total_credits_completed || 0}</h3>
                  <p className="text-xs text-gray-500 mt-1">out of {studentProfile.total_credits || 0} required</p>
                </div>
                <div className="col-span-2 md:col-span-1 border-t md:border-t-0 pt-4 md:pt-0">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Current Year</p>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{studentProfile.current_year || 'N/A'}</h3>
                  <p className="text-xs text-primary mt-1 font-medium">
                    {progressData ? `${Math.round(progressData.progress_percentage.overall)}% Complete` : 'Loading...'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-12 space-y-8">
              <section className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">analytics</span> Degree Progress
                  </h2>
                  <span className="text-sm font-semibold text-primary">
                    {progressData ? `Overall: ${Math.round(progressData.progress_percentage.overall)}%` : 'Loading...'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                  {progressItems.map((it, i) => (
                    <div key={i} className="flex flex-col items-center text-center">
                      <div className="relative w-32 h-32 mb-4">
                         <svg className="w-full h-full transform -rotate-90" viewBox="0 0 112 112">
                           <circle className="text-gray-100 dark:text-gray-800" cx="56" cy="56" fill="transparent" r="50" stroke="currentColor" strokeWidth="8" />
                           <circle className={it.color} cx="56" cy="56" fill="transparent" r="50" stroke="currentColor" strokeDasharray="314" strokeDashoffset={314 - (3.14 * parseInt(it.prog))} strokeLinecap="round" strokeWidth="8" />
                         </svg>
                         <div className="absolute inset-0 flex items-center justify-center">
                           <span className="text-xl font-bold text-gray-800 dark:text-white">{it.prog}</span>
                         </div>
                      </div>
                      <h4 className="font-semibold text-base text-gray-800 dark:text-white mb-2">{it.label}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{it.stats} Courses</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* Full Screen Courses Modal */}
      {showAllCourses && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">All Courses</h2>
                <button 
                  onClick={() => setShowAllCourses(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allCourses.map((course, index) => (
                  <div 
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                    onClick={() => {
                      handleCourseClick(course);
                      setShowAllCourses(false);
                    }}
                  >
                    <h4 className="text-sm font-medium text-gray-800 dark:text-white group-hover:text-primary transition-colors mb-2">
                      {course.title || course.code}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{course.academic_year || course.semester || 'Recent'}</span>
                      <span>•</span>
                      <span>{course.code}</span>
                    </div>
                    <div className="mt-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        course.status === 'Passed' || (course.grade && course.grade !== 'F' && course.grade !== 'W')
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                          : course.status === 'Failed' || course.grade === 'F'
                          ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                          : course.status === 'Retake'
                          ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                          : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                      }`}>
                        {course.status === 'Passed' || (course.grade && course.grade !== 'F' && course.grade !== 'W') ? 'Passed' : 
                        course.status === 'Failed' || course.grade === 'F' ? 'Failed' : 
                        course.status === 'Retake' ? 'Retake' : 'Enrolled'}
                      </span>
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