import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { DetailedCardGridSkeleton, Skeleton } from '../components/Skeleton';
import { User, CurrentCoursesResponse, DropRecommendationResponse } from '../types';
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
  const [downloadingSchedule, setDownloadingSchedule] = useState(false);
  const [showTradeOff, setShowTradeOff] = useState(false);
  const [selectedToDrop, setSelectedToDrop] = useState<string[]>([]);
  const [selectedElective, setSelectedElective] = useState<string | null>(null);
  const [dropRecommendation, setDropRecommendation] = useState<DropRecommendationResponse | null>(null);
  const [dropRecommendationLoading, setDropRecommendationLoading] = useState(false);
  const [dropRecommendationError, setDropRecommendationError] = useState<string>("");

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

  const applyDropRecommendation = (recommendation: DropRecommendationResponse) => {
    if (!data) return;

    const recommendedCodes = [
      ...(recommendation.elective?.code ? [recommendation.elective.code] : []),
      ...recommendation.others.map((c) => c.code),
    ];

    const droppableCodes = new Set(
      data.courses
        .filter((course) => !course.is_retake)
        .map((course) => course.code)
    );

    const validDropCodes = recommendedCodes.filter((code) => droppableCodes.has(code));
    setSelectedToDrop(Array.from(new Set(validDropCodes)));

    const electives = data.courses.filter((course) => course.tag?.toUpperCase() === 'ELECTIVE');
    if (electives.length > 1) {
      const keptElective = electives.find(
        (course) => !validDropCodes.includes(course.code) || course.is_retake
      );
      setSelectedElective(keptElective?.code || null);
    }
  };

  const fetchDropRecommendation = async () => {
    try {
      setDropRecommendationLoading(true);
      setDropRecommendationError("");
      const recommendation = await api.studentDropRecommendation();
      setDropRecommendation(recommendation);
      applyDropRecommendation(recommendation);
    } catch (err: any) {
      setDropRecommendation(null);
      setDropRecommendationError(err?.message || "Failed to load drop recommendations.");
    } finally {
      setDropRecommendationLoading(false);
    }
  };

  useEffect(() => {
    const hasConflict = !!data && data.total_credits > data.max_credits;
    if (!showTradeOff || !hasConflict) return;
    fetchDropRecommendation();
  }, [showTradeOff, data?.total_credits, data?.max_credits]);

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

  const handleDownloadSchedule = async () => {
    try {
      setDownloadingSchedule(true);
      const { blob, filename } = await api.studentCurrentCoursesPdf();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = decodeURIComponent(filename || 'current_schedule.pdf');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err?.message || 'Failed to download schedule. Please try again.');
    } finally {
      setDownloadingSchedule(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins">
        <Sidebar user={user} onLogout={onLogout} />
        <div className="flex flex-1 flex-col overflow-hidden p-6 lg:p-8 space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-16 w-64 rounded-xl" />
          </div>
          <DetailedCardGridSkeleton count={4} />
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
  const dropReasonByCode = new Map<string, string>(
    [
      ...(dropRecommendation?.elective ? [dropRecommendation.elective] : []),
      ...(dropRecommendation?.others || []),
    ].map((item) => [item.code, item.reason])
  );

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 font-poppins relative">
      <Sidebar user={user} onLogout={onLogout} />
      <div className={`flex flex-1 flex-col overflow-hidden transition-all duration-700 ${isConflict ? 'blur-2xl scale-[0.98] pointer-events-none' : ''}`}>
        <Header title="My Courses" user={user} />
        <main className="flex-1 overflow-y-auto p-10 lg:p-12 animate-in fade-in duration-1000 slide-in-from-bottom-4 scrollbar-hide max-w-[1600px] mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Academic Load</h2>
              <p className="text-lg font-medium text-slate-400 dark:text-slate-500">{data.semester_name} • Current Inventory</p>
            </div>
            <div className="bg-slate-50/50 dark:bg-slate-900/50 px-8 py-5 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-10">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Credit Volume</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-teal-600 tabular-nums">{data.total_credits}</span>
                    <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase">Limit: {data.max_credits}</span>
                </div>
              </div>
              <div className="w-px h-10 bg-slate-200 dark:bg-slate-800"></div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Registrations</p>
                <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{data.courses_count}</span>
              </div>
            </div>
          </div>

          {data.total_credits > data.max_credits && (
            <div className="mb-12 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 p-6 rounded-[32px] shadow-sm animate-in slide-in-from-top-4 duration-500">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-2xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          <span className="material-icons-outlined text-2xl">warning_amber</span>
                        </div>
                        <div>
                            <p className="text-rose-900 dark:text-rose-200 text-lg font-black tracking-tight">Capacity Protocol Breach</p>
                            <p className="text-rose-700/70 dark:text-rose-400/70 text-sm font-medium">
                                System indicates an excess of <span className="font-black text-rose-600">{data.total_credits - data.max_credits} credits</span>. Adjustment required.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowTradeOff(true)}
                        className="px-8 py-3.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-rose-500/20"
                    >
                        Resolve Protocol
                    </button>
                </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {data.courses.map((course, index) => (
              <div 
                key={index} 
                onClick={() => handleCourseClick(course.code)}
                className="group bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all relative overflow-hidden cursor-pointer"
              >
                <div className="absolute top-0 right-0 h-24 w-24 bg-teal-500/[0.03] rounded-bl-full transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700" />
                
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border ${
                    course.tag === 'MAJOR' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' :
                    course.tag === 'CORE' ? 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' :
                    'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                  }`}>
                    {course.tag}
                  </span>
                  <div className="text-right">
                    <span className="block text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{course.credits}</span>
                    <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Units</span>
                  </div>
                </div>
                
                <div className="relative z-10">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-teal-600 transition-colors tracking-tight leading-tight">{course.title}</h3>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 font-mono uppercase tracking-[0.2em] mb-8">{course.code}</p>
                  
                  <div className="space-y-4 pt-6 border-t border-slate-50 dark:border-slate-800/50">
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <div className="h-8 w-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <span className="material-icons-outlined text-sm">person</span>
                      </div>
                      <span className="truncate uppercase tracking-wider">{course.instructor}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <div className="h-8 w-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <span className="material-icons-outlined text-sm">sensors</span>
                      </div>
                      <span className="truncate uppercase tracking-wider">{course.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-slate-900 dark:bg-teal-600 rounded-[40px] p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-full w-1/2 bg-white/[0.02] transform skew-x-12 translate-x-20 pointer-events-none" />
            <div className="flex items-center gap-8 relative z-10 text-center md:text-left">
                <div className="h-16 w-16 bg-white/10 backdrop-blur-md rounded-[24px] flex items-center justify-center text-white border border-white/10 transform transition-transform duration-700 group-hover:rotate-12">
                    <span className="material-icons-outlined text-3xl">print</span>
                </div>
                <div>
                    <h4 className="text-2xl font-black text-white tracking-tight mb-1">Schedule Export</h4>
                    <p className="text-sm font-medium text-white/60">Generate a high-fidelity cryptographic ledger of your current courses.</p>
                </div>
            </div>
            <button
              onClick={handleDownloadSchedule}
              disabled={downloadingSchedule}
              className={`px-10 py-4 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all shadow-xl active:scale-[0.98] whitespace-nowrap relative z-10 ${
                downloadingSchedule
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'bg-white text-slate-900 hover:bg-slate-50 hover:shadow-white/10'
              }`}
            >
                {downloadingSchedule ? 'SYCHRONIZING...' : 'Download PDF Manifest'}
            </button>
          </div>
        </main>
      </div>

      {isConflict && !showTradeOff && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/40 dark:bg-slate-950/40 backdrop-blur-3xl pointer-events-auto">
            <div className="bg-white dark:bg-slate-900 p-12 rounded-[48px] shadow-2xl border border-slate-100 dark:border-slate-800 text-center max-w-lg mx-4 flex flex-col items-center gap-10 animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 rounded-[32px] flex items-center justify-center border border-rose-100 dark:border-rose-800 shadow-inner">
                    <span className="material-icons-outlined text-rose-500 text-5xl animate-pulse">lock</span>
                </div>
                <div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white font-poppins tracking-tight">Access Restricted</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-4 leading-relaxed font-medium">
                        Your credit volume (<span className="text-rose-500 font-black tabular-nums">{data.total_credits}</span>) violates the institutional ceiling of <span className="font-black tabular-nums">{data.max_credits}</span>.
                    </p>
                    <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-4 uppercase tracking-[0.4em] font-black">Authentication Shield Engaged</p>
                </div>
                <button 
                    onClick={() => setShowTradeOff(true)}
                    className="w-full py-5 bg-slate-900 dark:bg-teal-600 text-white text-xs font-black uppercase tracking-[0.2em] rounded-[24px] shadow-2xl hover:bg-slate-800 dark:hover:bg-teal-700 transition-all active:scale-[0.98]"
                >
                    Initiate Resolution
                </button>
            </div>
        </div>
      )}

      {showTradeOff && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 backdrop-blur-2xl p-4 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-500">
                <div className="bg-slate-50/50 dark:bg-slate-950/50 px-10 py-10 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            <span className="material-icons-outlined text-rose-500">troubleshoot</span>
                            Conflict Engine
                        </h3>
                        <p className="text-slate-400 dark:text-slate-500 text-sm font-medium tracking-tight">Equilibrate load to institutional {data.max_credits} ceiling.</p>
                    </div>
                    <button
                        onClick={fetchDropRecommendation}
                        disabled={dropRecommendationLoading}
                        className={`h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${
                            dropRecommendationLoading
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : 'bg-white dark:bg-slate-800 text-teal-600 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        {dropRecommendationLoading ? 'CALCULATING...' : 'AI RE-SYNTHESIS'}
                    </button>
                </div>
                

                <div className="p-10 max-h-[60vh] overflow-y-auto bg-white dark:bg-slate-900 scrollbar-hide">
                    <div className="mb-10 bg-teal-50/30 dark:bg-teal-900/10 rounded-[24px] border border-teal-100/50 dark:border-teal-900/20 p-6 transition-all hover:bg-teal-50/50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-8 w-8 rounded-xl bg-teal-500 flex items-center justify-center text-white">
                              <span className="material-icons-outlined text-sm">auto_awesome</span>
                            </div>
                            <p className="text-[10px] font-black text-teal-700 dark:text-teal-400 uppercase tracking-widest">Neural Guidance Output</p>
                        </div>
                        {dropRecommendationLoading && (
                            <div className="space-y-4">
                                <div className="h-2 bg-teal-200/30 dark:bg-teal-800/30 rounded-full w-3/4 animate-pulse"></div>
                                <div className="h-2 bg-teal-200/30 dark:bg-teal-800/30 rounded-full w-1/2 animate-pulse"></div>
                            </div>
                        )}
                        {!dropRecommendationLoading && dropRecommendationError && (
                            <p className="text-xs font-bold text-rose-500 italic">{dropRecommendationError}</p>
                        )}
                        {!dropRecommendationLoading && !dropRecommendationError && dropRecommendation && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <p className="text-sm font-bold text-teal-900 dark:text-teal-200 leading-relaxed italic">"{dropRecommendation.message}"</p>
                                <div className="mt-6 flex flex-wrap gap-4">
                                  <div className="px-3 py-1.5 bg-white dark:bg-slate-950 rounded-xl border border-teal-100/50 dark:border-teal-900/50">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Delta Requirement</p>
                                    <p className="text-xs font-black text-teal-600">-{dropRecommendation.credits_to_drop} Units</p>
                                  </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-10">
                        {/* Electives Section */}
                        {(() => {
                            const electives = data.courses.filter(c => c.tag?.toUpperCase() === 'ELECTIVE');
                            if (electives.length > 1) {
                                return (
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-1">Specialization Electives</h4>
                                        <div className="grid grid-cols-1 gap-3">
                                            {electives.map(course => (
                                                <label key={course.code} className={`flex items-center gap-5 p-5 rounded-[24px] border transition-all cursor-pointer group/label ${
                                                    course.is_retake 
                                                        ? 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed'
                                                    : selectedElective === course.code 
                                                        ? 'bg-teal-50/50 border-teal-500 ring-4 ring-teal-500/5' 
                                                        : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-teal-500/30'
                                                }`}>
                                                    <div className="relative">
                                                      <input 
                                                          type="radio" 
                                                          name="elective_choice"
                                                          className="sr-only"
                                                          checked={selectedElective === course.code}
                                                          disabled={course.is_retake} 
                                                          onChange={() => !course.is_retake && handleElectiveSelect(course.code)}
                                                      />
                                                      <div className={`h-6 w-6 rounded-full border-2 transition-all flex items-center justify-center ${selectedElective === course.code ? 'border-teal-500 bg-teal-500' : 'border-slate-200 dark:border-slate-700'}`}>
                                                        {selectedElective === course.code && <div className="h-2 w-2 rounded-full bg-white shadow-sm" />}
                                                      </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="font-black text-sm text-slate-900 dark:text-white tracking-tight truncate mr-4">{course.title}</span>
                                                            <span className="text-[10px] font-black text-teal-600 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded-md uppercase tracking-tighter whitespace-nowrap">{course.credits} UNITS</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                          <p className="text-[10px] font-bold text-slate-400 font-mono tracking-widest">{course.code}</p>
                                                          {dropReasonByCode.has(course.code) && (
                                                              <p className="text-[9px] font-black text-teal-600/70 uppercase tracking-tighter">Guidance Match</p>
                                                          )}
                                                        </div>
                                                        {course.is_retake && <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest mt-2">Core Retake Policy Active</p>}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* Other Courses */}
                        <div className="space-y-6">
                             <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-1">Foundation & Core Hierarchy</h4>
                             <div className="grid grid-cols-1 gap-3">
                                {data.courses
                                    .filter(c => c.tag?.toUpperCase() !== 'ELECTIVE' || (data.courses.filter(e => e.tag?.toUpperCase() === 'ELECTIVE').length <= 1))
                                    .map((course) => {
                                    const isSelected = selectedToDrop.includes(course.code);
                                    return (
                                        <div 
                                            key={course.code} 
                                            onClick={() => !course.is_retake && handleToggleSelection(course.code)}
                                            className={`flex items-center justify-between p-5 rounded-[24px] border transition-all cursor-pointer group/row ${
                                                course.is_retake 
                                                ? 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 opacity-40 cursor-not-allowed' 
                                                : isSelected 
                                                ? 'bg-rose-50/50 border-rose-500 ring-4 ring-rose-500/5' 
                                                : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-teal-500/30 shadow-sm'
                                            }`}
                                        >
                                            <div className="flex items-center gap-5 flex-1 min-w-0">
                                                <div className={`flex items-center justify-center w-6 h-6 rounded-xl border-2 transition-all ${
                                                    course.is_retake ? 'border-slate-200 bg-slate-100' :
                                                    isSelected ? 'bg-rose-500 border-rose-500 shadow-lg shadow-rose-500/20' : 'border-slate-200 dark:border-slate-700'
                                                }`}>
                                                    {isSelected && <span className="material-icons-outlined text-white text-xs">close</span>}
                                                    {course.is_retake && <span className="material-icons-outlined text-slate-400 text-xs">lock</span>}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-sm font-black tracking-tight truncate ${isSelected ? 'text-rose-900 dark:text-rose-200' : 'text-slate-900 dark:text-white'}`}>
                                                        {course.title}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{course.code}</span>
                                                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{course.credits} UNITS</span>
                                                        <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500">{course.tag}</span>
                                                        {dropReasonByCode.has(course.code) && (
                                                            <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-teal-50 dark:bg-teal-900/40 text-teal-600">Guidance Apex</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <span className="text-[9px] font-black text-rose-600 uppercase tracking-[0.2em] bg-rose-100 px-3 py-1.5 rounded-xl ml-4 whitespace-nowrap">Marked for Deletion</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-10 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-10">
                        <div className="space-y-1">
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-[0.3em]">Projected Load</p>
                            <p className={`text-3xl font-black tabular-nums tracking-tighter transition-colors ${
                                (data.total_credits - data.courses.filter(c => selectedToDrop.includes(c.code)).reduce((s,c)=>s+c.credits,0)) <= data.max_credits 
                                ? 'text-emerald-600' 
                                : 'text-rose-600'
                            }`}>
                                {data.total_credits - data.courses.filter(c => selectedToDrop.includes(c.code)).reduce((s,c)=>s+c.credits,0)}
                                <span className="text-sm text-slate-300 dark:text-slate-600 font-bold ml-2">/ {data.max_credits} MAX</span>
                            </p>
                        </div>
                        <div className="h-12 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
                        <div className="space-y-1">
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-[0.3em]">Delta Volume</p>
                            <p className="text-3xl font-black text-rose-500 tabular-nums tracking-tighter">
                                -{data.courses.filter(c => selectedToDrop.includes(c.code)).reduce((s,c)=>s+c.credits,0)}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={handleBulkDrop}
                        disabled={selectedToDrop.length === 0}
                        className={`px-12 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-[0.98] ${
                            selectedToDrop.length > 0
                            ? 'bg-slate-900 dark:bg-teal-600 text-white hover:bg-slate-800 dark:hover:bg-teal-700 shadow-teal-500/20'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                        }`}
                    >
                        Commit Adjustments
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default StudentCourses;
