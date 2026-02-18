import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User } from '../types';
import { api } from '../lib/api';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

async function fetchPdf(path: string, params: Record<string, string | undefined> = {}) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const url = `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { method: 'GET', credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to download (${res.status})`);
  return await res.blob();
}

interface Course {
  course_code: string;
  course_title: string;
  grade: string;
  points: number;
  status: string;
  result_tag: string;
  credit_unit: number;
  grade_points_earned: number;
}

interface Semester {
  academic_year: string;
  semester: string;
  results: Course[];
  total_credit_unit: number;
  total_grade_points: number;
  gpa: number;
}

interface AcademicData {
  student: {
    name: string;
    nrc: string;
    sex: string;
    dob: string;
  };
  academic_summary: {
    total_credits_earned: number;
    total_grade_points: number;
    cgpa: number;
    semesters: Semester[];
  };
}

interface ResultsProps {
  user: User;
  onLogout: () => void;
}

const StudentResults: React.FC<ResultsProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [academicData, setAcademicData] = useState<AcademicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSemester, setExpandedSemester] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [highlightedSemester, setHighlightedSemester] = useState<string | null>(null);
  const [highlightedCourse, setHighlightedCourse] = useState<string | null>(null);

  useEffect(() => {
    fetchAcademicData();
  }, []);

  useEffect(() => {
    // Handle URL parameters for semester and course highlighting
    const semesterParam = searchParams.get('semester');
    const courseParam = searchParams.get('course');
    
    if (semesterParam) {
      setHighlightedSemester(semesterParam);
      // Auto-expand highlighted semester
      const semesterKey = academicData?.academic_summary?.semesters?.find(
        sem => sem.academic_year === semesterParam || sem.semester === semesterParam
      );
      if (semesterKey) {
        setExpandedSemester(`${semesterKey.academic_year}-${semesterKey.semester}`);
      }
    }
    
    if (courseParam) {
      setHighlightedCourse(courseParam);
    }

    // Clear URL parameters after applying highlighting (release hook)
    if (semesterParam || courseParam) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('semester');
      newSearchParams.delete('course');
      navigate(`/student/results${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`, { replace: true });
      
      // Clear highlighting after 5 seconds to release the visual highlight
      const timer = setTimeout(() => {
        setHighlightedSemester(null);
        setHighlightedCourse(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams, academicData, navigate]);

  // Clear highlighting on any user interaction (scroll, click, etc.)
  const clearHighlighting = () => {
    if (highlightedSemester || highlightedCourse) {
      setHighlightedSemester(null);
      setHighlightedCourse(null);
    }
  };

  const fetchAcademicData = async () => {
    try {
      setLoading(true);
      const data = await api.studentResults();
      setAcademicData(data);
    } catch (error) {
      console.error('Error fetching academic data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = (courseCode: string) => {
    navigate(`/student/courses/${courseCode}`);
  };

  const toggleSemester = (semester: string) => {
    setExpandedSemester(expandedSemester === semester ? null : semester);
  };

  // Get unique academic years from semesters (extract just year level)
  const getAcademicYears = () => {
    if (!academicData?.academic_summary?.semesters) return [];
    const years = new Set<string>();
    academicData.academic_summary.semesters.forEach(sem => {
      // The backend now sends proper format like "First Year", "Second Year", etc.
      const academicYearStr = sem.academic_year;
      
      // Direct mapping for the new format
      if (academicYearStr.includes("First Year")) {
        years.add("First Year");
      } else if (academicYearStr.includes("Second Year")) {
        years.add("Second Year");
      } else if (academicYearStr.includes("Third Year")) {
        years.add("Third Year");
      } else if (academicYearStr.includes("Fourth Year")) {
        years.add("Fourth Year");
      } else {
        // Fallback for any other format
        years.add(academicYearStr);
      }
    });
    return Array.from(years).sort();
  };

  // Get semesters grouped by year level
  const getSemestersByYear = (yearLevel: string) => {
    if (!academicData?.academic_summary?.semesters) return [];
    
    return academicData.academic_summary.semesters.filter(sem => {
      const academicYearStr = sem.academic_year;
      
      // Direct match for the new format
      if (yearLevel === "First Year") {
        return academicYearStr.includes("First Year");
      } else if (yearLevel === "Second Year") {
        return academicYearStr.includes("Second Year");
      } else if (yearLevel === "Third Year") {
        return academicYearStr.includes("Third Year");
      } else if (yearLevel === "Fourth Year") {
        return academicYearStr.includes("Fourth Year");
      }
      
      // Fallback to exact match for any other cases
      return academicYearStr.includes(yearLevel);
    });
  };

  // Calculate total credits for a year
  const getTotalCreditsForYear = (year: string) => {
    const semesters = getSemestersByYear(year);
    return semesters.reduce((sum, sem) => sum + sem.total_credit_unit, 0);
  };

  // Download handlers
  const handleDownloadSemester = async (semesterKey: string) => {
    try {
      setDownloading(true);
      setDownloadMenuOpen(false);
      
      const [year, semester] = semesterKey.split(', ');
      const blob = await fetchPdf('/api/v1/student/results/certificate/pdf', {
        type: 'semester',
        academic_year: year,
        semester,
      });
      
      downloadFile(blob, `grading_certificate_${semesterKey.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error downloading semester certificate:', error);
      alert('Failed to download semester certificate. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadYear = async (yearLevel: string) => {
    try {
      setDownloading(true);
      setDownloadMenuOpen(false);
      
      const blob = await fetchPdf('/api/v1/student/results/certificate/pdf', {
        type: 'year',
        academic_year: yearLevel, // Send the clean year level (e.g., "First Year")
      });
      downloadFile(blob, `grading_certificate_${yearLevel.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error downloading year certificate:', error);
      alert('Failed to download year certificate. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    try {
      setDownloading(true);
      setDownloadMenuOpen(false);
      
      const blob = await fetchPdf('/api/v1/student/results/certificate/pdf', {
        type: 'all',
      });
      downloadFile(blob, 'complete_grading_certificate.pdf');
    } catch (error) {
      console.error('Error downloading complete certificate:', error);
      alert('Failed to download complete certificate. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Check if download should be disabled
  const shouldDisableDownload = () => {
    if (!academicData?.academic_summary?.semesters) return true;
    
    // Check if CGPA is 0.0
    if (academicData.academic_summary.cgpa === 0.0) return true;
    
    // Count failed subjects
    let failedCount = 0;
    for (const semester of academicData.academic_summary.semesters) {
      for (const course of semester.results) {
        if (course.status === 'Failed' || course.status === 'Retake' || course.grade === 'F') {
          failedCount++;
        }
      }
    }
    
    // Disable only if failed in MORE than 3 subjects (not 3 or less)
    if (failedCount > 3) return true;
    
    return false;
  };

  // Format semester display name
  const formatSemesterDisplay = (academicYear: string, semester: string) => {
    // The backend now sends proper format, so just return as is
    return `${academicYear}, ${semester}`;
  };

  // Filter courses based on search query
  const filterCourses = (courses: Course[]) => {
    if (!searchQuery.trim()) return courses;
    
    const query = searchQuery.toLowerCase();
    return courses.filter(course => 
      course.course_code.toLowerCase().includes(query) ||
      course.course_title.toLowerCase().includes(query)
    );
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.download-menu-container')) {
        setDownloadMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 font-poppins"
      onClick={clearHighlighting}
      onScroll={clearHighlighting}
    >
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Header title="Academic Portfolio" user={user} />
        <main className="flex-1 overflow-y-auto p-10 lg:p-16 scrollbar-hide animate-in fade-in duration-1000 slide-in-from-bottom-4">
          <div className="mb-12 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-8">
            <div className="space-y-2">
               <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Academic Records</h2>
               <p className="text-lg font-medium text-slate-400 dark:text-slate-500">
                 Integrated transcript for <span className="text-slate-900 dark:text-white font-bold">{academicData?.student?.name || 'Authorized Member'}</span>
               </p>
            </div>
            
            {/* Download Grading Certificate Dropdown */}
            <div className="download-menu-container relative group">
              <button 
                onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                disabled={downloading || !academicData || shouldDisableDownload()}
                className="flex items-center gap-4 px-8 py-4 bg-slate-900 dark:bg-teal-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-slate-800 dark:hover:bg-teal-700 transition-all shadow-2xl shadow-slate-200 dark:shadow-teal-900/20 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <span className="material-icons-outlined text-lg">{downloading ? 'sync' : 'verified_user'}</span>
                {downloading ? 'Processing...' : (shouldDisableDownload() ? 'Access Restricted' : 'Export Transcript')}
                <span className="material-icons-outlined text-lg ml-2">
                  {downloadMenuOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {/* Dropdown Menu */}
              {downloadMenuOpen && (
                <div className="absolute right-0 mt-4 w-full sm:w-[420px] bg-white dark:bg-slate-900 rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                  {/* By Semester Section */}
                  <div className="p-8 border-b border-slate-50 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6 px-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Semester Dispatches
                      </p>
                      <span className="text-[10px] font-black bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-400">
                        {academicData?.academic_summary?.semesters?.length || 0} Records
                      </span>
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-hide pr-1">
                      {academicData?.academic_summary?.semesters?.map((sem) => (
                        <button
                          key={`${sem.academic_year}-${sem.semester}`}
                          onClick={() => handleDownloadSemester(`${sem.academic_year}, ${sem.semester}`)}
                          className="w-full flex items-center justify-between p-5 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 rounded-[20px] transition-all group active:scale-95"
                        >
                          <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors tracking-tight">
                              {formatSemesterDisplay(sem.academic_year, sem.semester)}
                            </p>
                          </div>
                          <span className="material-icons-outlined text-slate-300 group-hover:text-teal-500 transition-colors">download</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* By Year Section */}
                  <div className="p-8 border-b border-slate-50 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6 px-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Academic Cycles
                      </p>
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-hide pr-1">
                      {getAcademicYears().map((year) => {
                        const semesters = getSemestersByYear(year);
                        const totalCredits = getTotalCreditsForYear(year);
                        return (
                          <button
                            key={year}
                            onClick={() => handleDownloadYear(year)}
                            className="w-full flex items-center justify-between p-5 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 rounded-[20px] transition-all group active:scale-95"
                          >
                            <div className="text-left">
                              <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors tracking-tight">
                                {year}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {semesters.length} periods • {totalCredits} units
                              </p>
                            </div>
                            <span className="material-icons-outlined text-slate-300 group-hover:text-teal-500 transition-colors">archive</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* All Finished Years Section */}
                  <div className="p-8 bg-slate-50/30 dark:bg-slate-950/30">
                    <button
                      onClick={handleDownloadAll}
                      className="w-full flex items-center justify-between p-6 bg-slate-900 dark:bg-teal-600 text-white rounded-[24px] shadow-xl hover:bg-slate-800 dark:hover:bg-teal-700 transition-all active:scale-[0.98] group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 group-hover:rotate-12 transition-transform duration-500">
                          <span className="material-icons-outlined text-2xl text-white">layers</span>
                        </div>
                        <div className="text-left">
                          <p className="font-black tracking-tight">Comprehensive Export</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">All validated intervals</p>
                        </div>
                      </div>
                      <span className="text-2xl material-icons-outlined group-hover:translate-y-1 transition-transform">south</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 dark:bg-slate-900 rounded-[40px] p-10 lg:p-12 text-white shadow-2xl mb-12 relative overflow-hidden transition-all hover:shadow-teal-500/5 group border border-white/5">
             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
                <div className="space-y-4">
                   <h3 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">Institutional Standing</h3>
                   <div className="flex items-baseline gap-4">
                      <span className="text-6xl font-black tracking-tighter tabular-nums group-hover:text-teal-400 transition-colors">
                        {loading ? '—' : (academicData?.academic_summary?.cgpa?.toFixed(2) || '0.00')}
                      </span>
                      <span className="text-xl text-slate-500 font-bold tracking-tight">/ 4.00 CGPA</span>
                   </div>
                </div>
                
                <div className="h-20 w-px bg-white/5 hidden md:block" />
                
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Interval Performance</p>
                    <h3 className="text-4xl font-black tracking-tighter tabular-nums">
                      {loading ? '—' : (academicData?.academic_summary?.semesters?.[academicData.academic_summary.semesters.length - 1]?.gpa?.toFixed(2) || '0.00')}
                    </h3>
                    <div className="flex items-center gap-2 text-teal-400 text-[10px] font-black uppercase tracking-widest mt-2">
                      <span className="material-icons-round text-sm">trending_up</span>
                      <span>Operational Peak</span>
                    </div>
                </div>

                <div className="h-20 w-px bg-white/5 hidden md:block" />

                <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Unit Accumulation</p>
                    <h3 className="text-4xl font-black tracking-tighter tabular-nums">
                      {loading ? '—' : (academicData?.academic_summary?.total_credits_earned || 0)}
                    </h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">Validated Credits</p>
                </div>
             </div>
             
             <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-teal-500/[0.03] to-transparent pointer-events-none" />
             <div className="absolute bottom-0 left-0 h-32 w-32 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
          </div>

          {/* Search Bar */}
          <div className="mb-12 max-w-2xl">
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-6">
                <span className="material-icons-outlined text-slate-300 group-focus-within:text-teal-500 transition-colors">search</span>
              </span>
              <input 
                type="text" 
                placeholder="Filter course dispatches by code or title..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-16 pr-8 py-5 text-base font-medium border border-slate-100 dark:border-slate-800 rounded-3xl w-full bg-slate-50/50 dark:bg-slate-900/50 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 focus:bg-white outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Semester Accordion */}
          <div className="space-y-10">
            {academicData?.academic_summary?.semesters?.map((semesterData) => {
              const courses = semesterData.results;
              const filteredCourses = filterCourses(courses);
              const isExpanded = expandedSemester === `${semesterData.academic_year}-${semesterData.semester}`;
              
              return (
                <div 
                  key={`${semesterData.academic_year}-${semesterData.semester}`} 
                  className={`bg-white dark:bg-slate-900 rounded-[40px] border transition-all duration-500 overflow-hidden ${
                    isExpanded ? 'shadow-2xl shadow-slate-200 dark:shadow-black border-slate-100 dark:border-slate-800' : 'border-slate-50 dark:border-slate-800/50'
                  } ${
                    highlightedSemester && (semesterData.academic_year === highlightedSemester || semesterData.semester === highlightedSemester)
                      ? 'border-teal-500 ring-4 ring-teal-500/5'
                      : ''
                  }`}
                >
                  {/* Semester Header - Clickable */}
                  <div 
                    onClick={() => toggleSemester(`${semesterData.academic_year}-${semesterData.semester}`)}
                    className={`p-10 cursor-pointer transition-all ${
                      isExpanded ? 'bg-slate-50/30 dark:bg-slate-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
                      <div className="flex items-center gap-8 w-full xl:w-auto">
                        <div className={`h-14 w-14 rounded-[20px] transition-all duration-500 flex items-center justify-center shrink-0 ${isExpanded ? 'bg-slate-900 text-white dark:bg-teal-600 rotate-180' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                          <span className="material-icons-outlined text-2xl">
                            {isExpanded ? 'expand_more' : 'expand_more'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-2xl text-slate-900 dark:text-white tracking-tight">
                            {formatSemesterDisplay(semesterData.academic_year, semesterData.semester)}
                          </h3>
                          <div className="flex items-center gap-4 mt-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                              {courses.length} DISPATCHES • {semesterData.total_credit_unit} UNITS
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-10 xl:gap-16">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">GPA Metrics</p>
                          <p className="font-black text-3xl text-teal-600 dark:text-teal-500 tabular-nums">{semesterData.gpa.toFixed(2)}</p>
                        </div>
                        <div className="h-12 w-px bg-slate-100 dark:bg-slate-800 hidden sm:block"></div>
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Standing</p>
                          {(() => {
                            const hasFailedCourses = courses.some(c => c.status === 'Failed' || c.grade === 'F');
                            const isInProgress = courses.length > 0 && courses.every(c => c.grade === 'W' || !c.grade);
                            
                            return (
                              <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                                isInProgress
                                  ? 'bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-800 dark:text-slate-500'
                                  : !hasFailedCourses 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50'
                                    : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/50'
                              }`}>
                                {isInProgress ? 'Synchronizing' : hasFailedCourses ? 'Deficit Detected' : 'Optimal'}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Course Table - Collapsible */}
                  {isExpanded && (
                    <div className="border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4 duration-500">
                      {filteredCourses.length > 0 ? (
                        <div className="overflow-x-auto scrollbar-hide">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50/50 dark:bg-slate-950/50 text-[9px] uppercase font-black tracking-[0.3em] text-slate-400 dark:text-slate-500 border-b border-slate-50 dark:border-slate-800">
                              <tr>
                                <th className="px-10 py-5">Course Code</th>
                                <th className="px-10 py-5">Nomenclature</th>
                                <th className="px-10 py-5">Volume</th>
                                <th className="px-10 py-5">Index</th>
                                <th className="px-10 py-5">Yield</th>
                                <th className="px-10 py-5 text-right">Integrity</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                              {filteredCourses.map((course, index) => (
                                <tr 
                                  key={index} 
                                  className={`transition-all group hover:bg-slate-50/50 dark:hover:bg-slate-800/40 ${
                                    highlightedCourse === course.course_code
                                      ? 'bg-teal-50/50 dark:bg-teal-900/20 ring-1 ring-teal-500/20'
                                      : ''
                                  }`}
                                >
                                  <td className="px-10 py-6">
                                    <button 
                                      className="font-mono text-xs font-black text-slate-400 group-hover:text-teal-600 transition-colors tracking-tighter" 
                                      onClick={() => handleCourseClick(course.course_code)}
                                    >
                                      {course.course_code}
                                    </button>
                                  </td>
                                  <td className="px-10 py-6 font-bold text-slate-900 dark:text-white tracking-tight">
                                    {course.course_title}
                                  </td>
                                  <td className="px-10 py-6 text-xs font-black text-slate-400 tabular-nums">
                                    {course.credit_unit.toFixed(1)} CU
                                  </td>
                                  <td className={`px-10 py-6 text-xl font-black tracking-tighter tabular-nums ${
                                    course.grade === 'F' ? 'text-rose-500' : 
                                    course.grade === 'W' ? 'text-slate-300' : 'text-slate-900 dark:text-white'
                                  }`}>
                                    {course.grade || '—'}
                                  </td>
                                  <td className="px-10 py-6 text-sm font-black text-slate-500 dark:text-slate-400 tabular-nums">
                                    {course.grade_points_earned.toFixed(2)}
                                  </td>
                                  <td className="px-10 py-6 text-right">
                                    <span className={`inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                                      course.status === 'Passed' 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50' 
                                        : course.status === 'Failed'
                                        ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/50'
                                        : 'bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                                    }`}>
                                      {course.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-20 text-center space-y-4">
                          <div className="h-16 w-16 rounded-[24px] bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-200 dark:text-slate-800 mx-auto border border-slate-100 dark:border-slate-800 shadow-inner">
                            <span className="material-icons-outlined text-3xl">inbox</span>
                          </div>
                          <p className="text-sm font-black text-slate-300 uppercase tracking-widest">Null Set Discovered</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>

        {/* Global UI Decoration */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/[0.02] rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2 -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/[0.02] rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/2 -z-10" />
      </div>
    </div>
  );
};

export default StudentResults;
