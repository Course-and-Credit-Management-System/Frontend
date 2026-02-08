import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User, CurrentCoursesResponse } from '../types';
import { api } from '../lib/api';

interface CoursesProps {
  user: User;
  onLogout: () => void;
}

const StudentCourses: React.FC<CoursesProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<CurrentCoursesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTradeOff, setShowTradeOff] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.currentStudentCourses();
        setData(res);
        // Store current total credits in localStorage as requested
        localStorage.setItem("current_credits", String(res.total_credits));
      } catch (err: any) {
        setError(err.message || "Failed to fetch courses");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCourseClick = (courseCode: string) => {
    navigate(`/student/courses/${courseCode}`);
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins">
        <Sidebar user={user} onLogout={onLogout} />
        <div className="flex flex-1 flex-col overflow-hidden items-center justify-center">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins">
        <Sidebar user={user} onLogout={onLogout} />
        <div className="flex flex-1 flex-col overflow-hidden items-center justify-center p-8">
           <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 max-w-md text-center">
              <span className="material-icons-outlined text-4xl mb-2">error_outline</span>
              <p className="font-bold">Error</p>
              <p className="text-sm">{error || "No data available"}</p>
              <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                 Try Again
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="My Courses" user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Current Schedule</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">{data.semester_name}</p>
            </div>
            <div className="bg-surface-light dark:bg-surface-dark px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-6">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Credits</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-primary">{data.total_credits}</span>
                    <span className="text-sm text-gray-500 font-medium">/ {data.max_credits} Max</span>
                </div>
              </div>
              <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Courses</p>
                <span className="text-2xl font-bold text-gray-800 dark:text-white">{data.courses_count}</span>
              </div>
            </div>
          </div>

          {data.total_credits > data.max_credits && (
            <div className="mb-8 bg-orange-50 dark:bg-orange-950/20 border-l-4 border-orange-500 p-4 rounded-r-xl shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="material-icons-outlined text-orange-600">warning</span>
                        <div>
                            <p className="text-orange-900 dark:text-orange-200 font-bold">Credit Limit Exceeded</p>
                            <p className="text-orange-700 dark:text-orange-300 text-sm">
                                You are over the {data.max_credits}-credit limit by <span className="font-bold">{data.total_credits - data.max_credits} credits</span>. Please drop some courses.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowTradeOff(true)}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm uppercase tracking-wider"
                    >
                        Resolve Conflict
                    </button>
                </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.courses.map((course, index) => (
              <div 
                key={index} 
                onClick={() => handleCourseClick(course.code)}
                className="group bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-all hover:border-primary/50 cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                    course.tag === 'MAJOR' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                    course.tag === 'CORE' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                  }`}>
                    {course.tag}
                  </span>
                  <div className="text-right">
                    <span className="block text-lg font-bold text-gray-800 dark:text-white">{course.credits}</span>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">Credits</span>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1 group-hover:text-primary transition-colors">{course.title}</h3>
                <p className="text-sm text-gray-500 font-mono mb-4">{course.code}</p>
                
                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <span className="material-icons-outlined text-gray-400">person</span>
                    {course.instructor}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <span className="material-icons-outlined text-gray-400">location_on</span>
                    {course.location}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="bg-white dark:bg-surface-dark p-3 rounded-full shadow-sm text-primary">
                    <span className="material-icons-outlined">print</span>
                </div>
                <div>
                    <h4 className="font-bold text-gray-800 dark:text-white">Need a copy of your schedule?</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Download a printable PDF version for your records.</p>
                </div>
            </div>
            <button className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg shadow-sm transition-colors whitespace-nowrap">
                Download Schedule
            </button>
          </div>
        </main>
      </div>

      {showTradeOff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-surface-dark w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="bg-primary px-8 py-6 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold">Resolve Credit Conflict</h3>
                        <p className="text-primary-light/80 text-sm mt-1">Select courses to drop to reach the {data.max_credits}-credit limit.</p>
                    </div>
                    <button onClick={() => setShowTradeOff(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                
                <div className="p-8 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-4">
                        {data.courses.map((course) => (
                            <div key={course.code} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-4">
                                    <div className={`w-2 h-10 rounded-full ${course.is_retake ? 'bg-red-500' : 'bg-primary'}`}></div>
                                    <div>
                                        <p className="font-bold text-gray-800 dark:text-white">{course.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs font-mono text-gray-500 uppercase">{course.code}</span>
                                            <span className="text-xs text-gray-400">•</span>
                                            <span className="text-xs font-bold text-primary italic">{course.credits} Credits</span>
                                            {course.is_retake && (
                                                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase tracking-tighter">Retake Priority</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleDropCourse(course.code)}
                                    disabled={course.is_retake}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                        course.is_retake 
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                        : 'bg-white hover:bg-red-50 text-red-600 border border-red-100 shadow-sm'
                                    }`}
                                >
                                    {course.is_retake ? 'Fixed' : 'Drop'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Current Load</p>
                        <p className={`text-xl font-bold ${data.total_credits > data.max_credits ? 'text-orange-600' : 'text-green-600'}`}>
                            {data.total_credits} / {data.max_credits}
                        </p>
                    </div>
                    <button 
                        onClick={() => setShowTradeOff(false)}
                        className="px-8 py-3 bg-gray-800 dark:bg-white dark:text-gray-900 text-white rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default StudentCourses;