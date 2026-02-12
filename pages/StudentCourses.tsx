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
  const [selectedToDrop, setSelectedToDrop] = useState<string[]>([]);
  const [selectedElective, setSelectedElective] = useState<string | null>(null);

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

  useEffect(() => {
    fetchData();
  }, []);

  const handleCourseClick = (courseCode: string) => {
    navigate(`/student/courses/${courseCode}`);
  };

  const handleToggleSelection = (code: string) => {
    // Cannot drop retakes
    const course = data?.courses.find(c => c.code === code);
    if (course?.is_retake) return;

    // If it's an elective and we have a selected elective, we can't manually toggle it via this method
    // unless we change how electives are handled.
    // Ideally, for electives, we use the radio group.
    // If user clicks the row of an elective, it should probably select it as the 'kept' elective?
    // Or just ignore standard toggle for electives if they are handled separately.
    if (course?.tag?.toUpperCase() === 'ELECTIVE' && (data?.courses.filter(c => c.tag?.toUpperCase() === 'ELECTIVE').length ?? 0) > 1) {
        return handleElectiveSelect(code);
    }

    setSelectedToDrop(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleElectiveSelect = (keptCode: string) => {
    setSelectedElective(keptCode);
    
    // Auto-mark all OTHER electives for drop (EXCLUDING retakes)
    const allElectives = data?.courses.filter(c => c.tag?.toUpperCase() === 'ELECTIVE') || [];
    const otherElectives = allElectives
        .filter(c => c.code !== keptCode && !c.is_retake) // Ensure we don't drop retakes even if they are electives (rare edge case)
        .map(c => c.code);
    
    // Remove keptCode from drop list (if it was there) and add otherElectives
    setSelectedToDrop(prev => {
        // Remove ALL electives from current selection first to reset filtering
        const withoutElectives = prev.filter(code => !allElectives.some(e => e.code === code));
        return [...withoutElectives, ...otherElectives];
    });
  };

  const handleBulkDrop = async () => {
    if (selectedToDrop.length === 0) {
      setShowTradeOff(false);
      return;
    }

    if (!window.confirm(`Confirm dropping ${selectedToDrop.length} selected course(s)?`)) return;

    try {
      setLoading(true);
      await api.bulkDropCourses(selectedToDrop);
      
      // Refresh data from server to ensure sync
      await fetchData();
      
      setSelectedToDrop([]);
      setShowTradeOff(false);
    } catch (err) {
      setError("An error occurred while dropping courses.");
      setLoading(false);
    }
  };

  const handleDropCourse = async (courseCode: string) => {
    if (!window.confirm(`Are you sure you want to drop ${courseCode}?`)) return;
    
    try {
      await api.dropCourse(courseCode);
      if (data) {
        const droppedCourse = data.courses.find(c => c.code === courseCode);
        const updatedCourses = data.courses.filter(c => c.code !== courseCode);
        const updatedCredits = data.total_credits - (droppedCourse?.credits || 0);
        const newData = {
          ...data,
          courses: updatedCourses,
          total_credits: updatedCredits,
          courses_count: updatedCourses.length
        };
        setData(newData);
        localStorage.setItem('current_credits', updatedCredits.toString());
      }
    } catch (err) {
      setError("Failed to drop course.");
    }
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

  const isConflict = data && data.total_credits > data.max_credits;

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins relative">
      <Sidebar user={user} onLogout={onLogout} />
      <div className={`flex flex-1 flex-col overflow-hidden transition-all duration-500 ${isConflict ? 'blur-[8px] pointer-events-none' : ''}`}>
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

      {isConflict && !showTradeOff && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/5 backdrop-blur-sm pointer-events-auto">
            <div className="bg-white dark:bg-surface-dark p-10 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 text-center max-w-lg mx-4 flex flex-col items-center gap-6 animate-in zoom-in-90 duration-300">
                <div className="w-20 h-20 bg-[#077d8a]/10 rounded-full flex items-center justify-center">
                    <span className="material-icons-outlined text-[#077d8a] text-5xl">priority_high</span>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-[#333333] dark:text-white font-poppins">Action Required</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Your credit load (<span className="text-red-500 font-bold">{data.total_credits}</span>) exceeds the university limit of <span className="font-bold">{data.max_credits}</span>.
                    </p>
                    <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">Schedule is locked until resolved</p>
                </div>
                <button 
                    onClick={() => setShowTradeOff(true)}
                    className="w-full py-4 bg-[#077d8a] hover:bg-[#066a75] text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-[1.02] uppercase tracking-wider"
                >
                    Resolve Conflict Now
                </button>
            </div>
        </div>
      )}

      {showTradeOff && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xl p-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white dark:bg-surface-dark w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-[#077d8a]/20">
                <div className="bg-[#077d8a] px-8 py-6 text-white flex justify-between items-center border-b border-[#077d8a]/10">
                    <div>
                        <h3 className="text-xl font-bold font-poppins flex items-center gap-2">
                            <span className="material-icons-outlined">warning</span>
                            Resolve Credit Conflict
                        </h3>
                        <p className="text-white/80 text-sm mt-1 font-medium">Please drop courses to reach the {data.max_credits} limit.</p>
                    </div>
                </div>
                

                <div className="p-8 max-h-[60vh] overflow-y-auto bg-[#f5f5f5] dark:bg-background-dark">
                    <div className="space-y-6">
                        {/* Electives Section */}
                        {(() => {
                            // Filter electives to include available choices OR forced retakes (though retakes likely won't be choices)
                            // We typically want to show all electives so user can see what's happening
                            const electives = data.courses.filter(c => c.tag?.toUpperCase() === 'ELECTIVE');
                            if (electives.length > 1) {
                                return (
                                    <div className="bg-white dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <h4 className="font-bold text-[#333333] dark:text-white mb-3 flex items-center gap-2">
                                            <span className="material-icons-outlined text-sm bg-[#0d4a8f] text-white p-1 rounded-full">stars</span>
                                            Choose One Elective to Keep
                                        </h4>
                                        <div className="space-y-2">
                                            {electives.map(course => (
                                                <label key={course.code} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                                    course.is_retake 
                                                        ? 'bg-gray-100 border-gray-200 opacity-70 cursor-not-allowed'
                                                    : selectedElective === course.code 
                                                        ? 'bg-[#0d4a8f]/5 border-[#0d4a8f] ring-1 ring-[#0d4a8f]' 
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-[#0d4a8f]/50'
                                                }`}>
                                                    <input 
                                                        type="radio" 
                                                        name="elective_choice"
                                                        className="w-4 h-4 text-[#0d4a8f] focus:ring-[#0d4a8f]"
                                                        checked={selectedElective === course.code}
                                                        disabled={course.is_retake} 
                                                        onChange={() => !course.is_retake && handleElectiveSelect(course.code)}
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex justify-between">
                                                            <span className="font-bold text-sm text-[#333333] dark:text-white">{course.title}</span>
                                                            <span className="text-xs font-bold text-[#0d4a8f]">{course.credits} Cr</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500">{course.code}</p>
                                                        {course.is_retake && <p className="text-[10px] text-red-500 font-bold uppercase mt-1">Retake - Cannot Drop</p>}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-2 italic">* Selecting one will automatically mark others for dropping (except Retakes).</p>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* Other Courses */}
                        <div>
                             <h4 className="font-bold text-gray-400 text-xs uppercase tracking-widest mb-3">Core & Major Courses</h4>
                             <div className="space-y-3">
                                {data.courses
                                    .filter(c => c.tag?.toUpperCase() !== 'ELECTIVE' || (data.courses.filter(e => e.tag?.toUpperCase() === 'ELECTIVE').length <= 1))
                                    .map((course) => {
                                    const isSelected = selectedToDrop.includes(course.code);
                                    return (
                                        <div 
                                            key={course.code} 
                                            onClick={() => !course.is_retake && handleToggleSelection(course.code)}
                                            className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                                                course.is_retake 
                                                ? 'bg-gray-100 border-gray-200 opacity-70 cursor-not-allowed' 
                                                : isSelected 
                                                ? 'bg-red-50 border-red-200 shadow-sm' 
                                                : 'bg-white border-transparent hover:border-[#077d8a]/50 shadow-sm'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`flex items-center justify-center w-6 h-6 rounded border-2 transition-colors ${
                                                    course.is_retake ? 'bg-gray-300 border-gray-300' :
                                                    isSelected ? 'bg-red-500 border-red-500' : 'border-gray-300'
                                                }`}>
                                                    {isSelected && <span className="material-icons-outlined text-white text-sm">check</span>}
                                                    {course.is_retake && <span className="material-icons-outlined text-gray-500 text-sm">lock</span>}
                                                </div>
                                                <div>
                                                    <p className={`font-bold font-poppins ${isSelected ? 'text-red-700' : 'text-gray-800 dark:text-white'}`}>
                                                        {course.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{course.code}</span>
                                                        <span className="{`text-xs font-bold ${course.tag === 'ELECTIVE' ? 'text-purple-600' : 'text-[#333333] dark:text-gray-200'}`}">{course.credits} Credits</span>
                                                        {course.is_retake && (
                                                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase tracking-tighter ml-2">Cannot Drop</span>
                                                        )}
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-500">{course.tag}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest bg-red-100 px-2 py-1 rounded">Marked for drop</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white dark:bg-surface-dark border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6">
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Calculated Load</p>
                            <p className={`text-2xl font-bold font-poppins transition-colors ${
                                (data.total_credits - data.courses.filter(c => selectedToDrop.includes(c.code)).reduce((s,c)=>s+c.credits,0)) <= data.max_credits 
                                ? 'text-[#27ae60]' 
                                : 'text-[#e74c3c]'
                            }`}>
                                {data.total_credits - data.courses.filter(c => selectedToDrop.includes(c.code)).reduce((s,c)=>s+c.credits,0)}
                                <span className="text-sm text-gray-400 font-medium ml-1">/ {data.max_credits} Max</span>
                            </p>
                        </div>
                        <div className="h-10 w-px bg-gray-100"></div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Dropping</p>
                            <p className="text-2xl font-bold font-poppins text-red-500">
                                {data.courses.filter(c => selectedToDrop.includes(c.code)).reduce((s,c)=>s+c.credits,0)}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={handleBulkDrop}
                        disabled={selectedToDrop.length === 0}
                        className={`px-10 py-3 rounded-xl font-bold uppercase tracking-widest transition-all shadow-lg ${
                            selectedToDrop.length > 0
                            ? 'bg-[#077d8a] text-white hover:bg-[#066a75]'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        Confirm Drops
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default StudentCourses;