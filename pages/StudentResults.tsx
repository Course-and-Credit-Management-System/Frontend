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
      className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins"
      onClick={clearHighlighting}
      onScroll={clearHighlighting}
    >
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Academic Records" user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <div>
               <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Academic Records</h2>
               <p className="text-gray-500 dark:text-gray-400 mt-1">
                 {academicData?.student?.name || 'Student'} • {academicData?.academic_summary?.total_credits_earned || 0} Credits Earned
               </p>
            </div>
            
            {/* Download Grading Certificate Dropdown */}
            <div className="download-menu-container relative">
              <button 
                onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                disabled={downloading || !academicData || shouldDisableDownload()}
                className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl text-base font-medium hover:from-teal-700 hover:to-teal-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <span className="material-icons-outlined text-xl">download</span>
                {downloading ? 'Downloading...' : (shouldDisableDownload() ? 'Download Unavailable' : 'Download Grading Certificate')}
                <span className="material-icons-outlined text-xl ml-1">
                  {downloadMenuOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {/* Dropdown Menu */}
              {downloadMenuOpen && (
                <div className="absolute right-0 mt-4 w-full sm:w-96 bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-fade-in">
                  {/* By Semester Section */}
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        By Semester
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {academicData?.academic_summary?.semesters?.length || 0} options
                      </span>
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {academicData?.academic_summary?.semesters?.map((sem) => (
                        <button
                          key={`${sem.academic_year}-${sem.semester}`}
                          onClick={() => handleDownloadSemester(`${sem.academic_year}, ${sem.semester}`)}
                          className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors group"
                        >
                          <div>
                            <p className="font-medium text-gray-800 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                              {formatSemesterDisplay(sem.academic_year, sem.semester)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* By Year Section */}
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        By Academic Year
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {getAcademicYears().length} options
                      </span>
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {getAcademicYears().map((year) => {
                        const semesters = getSemestersByYear(year);
                        const totalCredits = getTotalCreditsForYear(year);
                        return (
                          <button
                            key={year}
                            onClick={() => handleDownloadYear(year)}
                            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors group"
                          >
                            <div>
                              <p className="font-medium text-gray-800 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                {year}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {semesters.length} semester{semesters.length !== 1 ? 's' : ''} • {totalCredits} credits
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Full Year</p>
                              <span className="material-icons-outlined text-gray-400 text-sm">download</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* All Finished Years Section */}
                  <div className="p-4">
                    <button
                      onClick={handleDownloadAll}
                      className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl text-lg font-medium hover:from-teal-600 hover:to-teal-700 transition-all shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-teal-400/20 flex items-center justify-center">
                          <span className="material-icons-outlined text-2xl text-teal-600">summarize</span>
                        </div>
                        <div>
                          <p className="font-bold">All Finished Years</p>
                        
                        </div>
                      </div>
                      <span className="text-2xl material-icons-outlined">download</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-teal-700 to-teal-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                   <h3 className="text-teal-100 font-medium text-sm sm:text-base mb-2">Cumulative Performance</h3>
                   <div className="flex items-baseline gap-2 sm:gap-3">
                      <span className="text-3xl sm:text-4xl font-bold">
                        {loading ? '...' : (academicData?.academic_summary?.cgpa?.toFixed(2) || '0.00')}
                      </span>
                      <span className="text-xl text-teal-200">/ 4.00 CGPA</span>
                   </div>
                </div>
                
                <div className="w-px bg-teal-500/50 h-16 sm:h-20 hidden md:block"></div>
                
                <div>
                    <h3 className="text-3xl sm:text-4xl font-bold">
                      {loading ? '...' : (academicData?.academic_summary?.semesters?.[academicData.academic_summary.semesters.length - 1]?.gpa?.toFixed(2) || '0.00')}
                    </h3>
                    <p className="text-base text-teal-200 mt-1">Current GPA</p>
                </div>

                <div className="w-px bg-teal-500/50 h-16 sm:h-20 hidden md:block"></div>

                <div>
                    <p className="text-base text-teal-100 font-medium mb-1">Credits Earned</p>
                    <h3 className="text-3xl sm:text-4xl font-bold">
                      {loading ? '...' : (academicData?.academic_summary?.total_credits_earned || 0)}
                    </h3>
                </div>
             </div>
             
             <div className="absolute top-0 right-0 -mt-10 sm:-mt-12 -mr-10 sm:-mr-12 w-56 sm:w-72 h-56 sm:h-72 bg-white opacity-5 rounded-full blur-3xl sm:blur-4xl"></div>
             <div className="absolute bottom-0 left-0 -mb-10 sm:-mb-12 -ml-10 sm:-ml-12 w-48 sm:w-64 h-48 sm:h-64 bg-teal-400 opacity-10 rounded-full blur-2xl sm:blur-3xl"></div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 sm:pl-5">
                <span className="material-icons-outlined text-gray-400 text-lg">search</span>
              </span>
              <input 
                type="text" 
                placeholder="Search course code or title..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 sm:pl-14 pr-4 py-3 text-base border border-gray-200 dark:border-gray-700 rounded-xl w-full bg-gray-50 dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
                style={{ boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -1px rgb(0 0 0 / 0.05)' }}
              />
            </div>
          </div>

          {/* Semester Accordion */}
          <div className="space-y-6">
            {academicData?.academic_summary?.semesters?.map((semesterData) => {
              const courses = semesterData.results;
              const filteredCourses = filterCourses(courses);
              const isExpanded = expandedSemester === `${semesterData.academic_year}-${semesterData.semester}`;
              
              return (
                <div 
                  key={`${semesterData.academic_year}-${semesterData.semester}`} 
                  className={`bg-surface-light dark:bg-surface-dark rounded-xl border shadow-sm overflow-hidden ${
                    highlightedSemester && (semesterData.academic_year === highlightedSemester || semesterData.semester === highlightedSemester)
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {/* Semester Header - Clickable */}
                  <div 
                    onClick={() => toggleSemester(`${semesterData.academic_year}-${semesterData.semester}`)}
                    className={`p-6 cursor-pointer transition-colors ${
                      highlightedSemester && (semesterData.academic_year === highlightedSemester || semesterData.semester === highlightedSemester)
                        ? 'bg-primary/5 dark:bg-primary/10'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start gap-4 w-full sm:w-auto">
                        <div className="bg-primary/10 dark:bg-primary/20 p-2.5 rounded-lg flex-shrink-0">
                          <span className="material-symbols-outlined text-primary text-xl">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                            {formatSemesterDisplay(semesterData.academic_year, semesterData.semester)}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {courses.length} courses • {semesterData.total_credit_unit} credits
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Semester GPA</p>
                          <p className="font-bold text-2xl text-primary mt-1">{semesterData.gpa.toFixed(2)}</p>
                        </div>
                        <div className="w-px h-12 bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                          {(() => {
                            // Only show status if courses are actually completed (all passed) or have failed courses
                            const hasCompletedCourses = courses.every(c => c.status === 'Passed');
                            const hasFailedCourses = courses.some(c => c.status === 'Failed' || c.grade === 'F');
                            
                            if (hasCompletedCourses || hasFailedCourses) {
                              return (
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                                  courses.every(c => c.status === 'Passed') 
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {hasFailedCourses ? 'Has Fails' : 'All Passed'}
                                </span>
                              );
                            } else {
                              // Don't show any status for enrolled courses without completion
                              return (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  In Progress
                                </span>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Course Table - Collapsible */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300">
                      {filteredCourses.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-slate-800/50 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold tracking-wider">
                              <tr>
                                <th className="px-6 py-4">Course Code</th>
                                <th className="px-6 py-4">Course Title</th>
                                <th className="px-6 py-4">Credits</th>
                                <th className="px-6 py-4">Grade</th>
                                <th className="px-6 py-4">Points</th>
                                <th className="px-6 py-4 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {filteredCourses.map((course, index) => (
                                <tr 
                                  key={index} 
                                  className={`transition-colors group ${
                                    highlightedCourse === course.course_code
                                      ? 'bg-primary/10 dark:bg-primary/20 ring-1 ring-primary/30'
                                      : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                                  }`}
                                >
                                  <td className="px-6 py-4 font-medium text-primary dark:text-teal-400 group-hover:underline">
                                    <button className="hover:underline" onClick={() => handleCourseClick(course.course_code)}>
                                      {course.course_code}
                                    </button>
                                  </td>
                                  <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">
                                    {course.course_title}
                                  </td>
                                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-medium">
                                    {course.credit_unit.toFixed(1)}
                                  </td>
                                  <td className={`px-6 py-4 font-bold ${
                                    course.grade === 'W' ? 'text-gray-400' : 
                                    course.grade.startsWith('A') ? 'text-green-600' : 'text-green-500'
                                  }`}>
                                    {course.grade}
                                  </td>
                                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-medium">
                                    {course.grade_points_earned.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                                      course.status === 'Passed' 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                        : course.status === 'Failed'
                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
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
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                          <span className="material-icons-outlined text-3xl mb-3">search_off</span>
                          <p className="text-lg font-medium">No courses match your search criteria</p>
                          <p className="text-sm mt-1">Try adjusting your search terms</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentResults;
