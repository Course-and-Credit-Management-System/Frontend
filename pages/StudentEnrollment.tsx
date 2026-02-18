import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import {
  User,
  AvailableCourse,
  DropRecommendationResponse,
  EnrollmentAssistanceCourse,
  StudentEnrollmentSettingCurrent,
} from '../types';
import { api } from '../lib/api';
import { parseEnrollmentDateMs } from '../lib/enrollmentSettingsValidation';

interface EnrollmentProps {
  user: User;
  onLogout: () => void;
}

function formatRemainingTime(closeAt?: string) {
  if (!closeAt) return 'N/A';
  const closeMs = parseEnrollmentDateMs(closeAt);
  if (!Number.isFinite(closeMs)) return 'N/A';
  const remaining = closeMs - Date.now();
  if (remaining <= 0) return 'Expired';
  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

function formatLocalDateTime(value?: string) {
  if (!value) return 'N/A';
  const ms = parseEnrollmentDateMs(value);
  if (!Number.isFinite(ms)) return 'N/A';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ms));
}

const StudentEnrollment: React.FC<EnrollmentProps> = ({ user, onLogout }) => {
  type CourseFilterKey = 'enrollable' | 'track:cs' | 'track:ct' | 'major';

  const navigate = useNavigate();
  const [credits, setCredits] = useState<string>("0");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<CourseFilterKey>>(new Set());
  const [showValidation, setShowValidation] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<EnrollmentAssistanceCourse[]>([]);
  const [hasAskedAi, setHasAskedAi] = useState(false);
  const [dropLoading, setDropLoading] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  const [dropRecommendation, setDropRecommendation] = useState<DropRecommendationResponse | null>(null);
  const [dropSelectedCodes, setDropSelectedCodes] = useState<Set<string>>(new Set());
  const [maxCreditsLimit, setMaxCreditsLimit] = useState<number>(() => {
    const stored = Number(localStorage.getItem("max_credits"));
    return Number.isFinite(stored) && stored > 0 ? stored : 18;
  });
  const [enrollmentSetting, setEnrollmentSetting] = useState<StudentEnrollmentSettingCurrent | null>(() => {
    const raw = localStorage.getItem("student_enrollment_setting_current");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StudentEnrollmentSettingCurrent;
    } catch {
      return null;
    }
  });
  const [settingLoading, setSettingLoading] = useState(false);
  const [settingError, setSettingError] = useState<string | null>(null);
  const [, setTimeTick] = useState(Date.now());
  
  const [courses, setCourses] = useState<AvailableCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRegistry, setSelectedRegistry] = useState<Map<string, AvailableCourse>>(new Map());
  const searchTextQuery = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);

  const toggleFilter = (filter: CourseFilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
  };

  const effectiveSort = useMemo(() => {
    return Array.from(activeFilters).join(',');
  }, [activeFilters]);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const res = await api.studentAvailableCourses(undefined, effectiveSort || undefined);
        setCourses(res.data || []);
      } catch (error) {
        console.error("Failed to fetch courses", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [effectiveSort]);

  useEffect(() => {
    const fetchEnrollmentSetting = async () => {
      setSettingLoading(true);
      setSettingError(null);
      try {
        const res = await api.studentEnrollmentSettingCurrent();
        setEnrollmentSetting(res);
        setMaxCreditsLimit(res.max_credits);
        localStorage.setItem("max_credits", String(res.max_credits));
        localStorage.setItem("student_enrollment_setting_current", JSON.stringify(res));
      } catch (error) {
        setSettingError(error instanceof Error ? error.message : "Failed to load enrollment setting.");
      } finally {
        setSettingLoading(false);
      }
    };

    fetchEnrollmentSetting();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTimeTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleCourse = (course: AvailableCourse) => {
    // Prevent toggling if locked or enrolled (assuming enrolled shouldn't be toggled here usually, but adherence to status 'locked' is key)
    if (course.status === 'locked' || !isEnrollmentActive) return;

    setSelectedRegistry(prev => {
      const newMap = new Map(prev);
      if (newMap.has(course.code)) {
        newMap.delete(course.code);
      } else {
        newMap.set(course.code, course);
        setShowValidation(true);
      }
      return newMap;
    });
  };

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, effectiveSort]);

  const filteredCourses = courses.filter(c => {
    const enrollmentClosedForEnrollableSort = effectiveSort.includes('enrollable') && enrollmentSetting && !enrollmentSetting.is_active;
    if (enrollmentClosedForEnrollableSort) return false;

    const q = searchTextQuery;
    if (!q) return true;
    return (
      (c.title?.toLowerCase() || '').includes(q) || 
      (c.code?.toLowerCase() || '').includes(q) ||
      (c.desc?.toLowerCase() || '').includes(q) ||
      (c.type?.toLowerCase() || '').includes(q) ||
      String(c.credits || '').includes(q)
    );
  });

  const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCourses = filteredCourses.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const displayCourses = paginatedCourses.map(c => {
    if (selectedRegistry.has(c.code)) {
      return { ...c, status: 'selected' };
    }
    if (c.enrollable === false) {
      return { ...c, status: 'locked' };
    }
    return c;
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("current_credits");
    if (stored) setCredits(stored);
  }, []);

  const isEnrollmentActive = enrollmentSetting ? enrollmentSetting.is_active : true;
  const isEnrollableFilterActive = activeFilters.has('enrollable');
  const enrollmentClosedForEnrollableSort = isEnrollableFilterActive && !isEnrollmentActive;

  const baseCredits = parseInt(credits) || 0;
  const selectedCredits = Array.from(selectedRegistry.values())
    .reduce((acc, curr) => acc + curr.credits, 0);
  const totalCredits = baseCredits + selectedCredits;
  const isOverLimit = totalCredits > maxCreditsLimit;
  const hasPrereqError = Array.from(selectedRegistry.values()).some(c => !!c.error);
  const selectedCourses = Array.from(selectedRegistry.values());
  const recommendedDropCodes = new Set([
    ...(dropRecommendation?.elective?.code ? [dropRecommendation.elective.code] : []),
    ...((dropRecommendation?.others || []).map((course) => course.code)),
  ]);

  const fetchDropRecommendation = async () => {
    setDropLoading(true);
    setDropError(null);

    try {
      const response = await api.studentDropRecommendation();
      setDropRecommendation(response);
      const autoSelected = [
        ...(response.elective?.code ? [response.elective.code] : []),
        ...((response.others || []).map((course) => course.code)),
      ];
      setDropSelectedCodes(new Set(autoSelected));
    } catch (error) {
      setDropRecommendation(null);
      setDropSelectedCodes(new Set());
      setDropError(error instanceof Error ? error.message : "Failed to get drop recommendation.");
    } finally {
      setDropLoading(false);
    }
  };

  useEffect(() => {
    if (!isOverLimit) {
      setDropRecommendation(null);
      setDropSelectedCodes(new Set());
      setDropError(null);
      setDropLoading(false);
      return;
    }

    fetchDropRecommendation();
  }, [isOverLimit, selectedRegistry.size, totalCredits]);

  const toggleDropSelection = (code: string) => {
    setDropSelectedCodes((prev) => {
      const updated = new Set(prev);
      if (updated.has(code)) {
        updated.delete(code);
      } else {
        updated.add(code);
      }
      return updated;
    });
  };

  const applySelectedDrops = () => {
    if (dropSelectedCodes.size === 0) return;

    setSelectedRegistry((prev) => {
      const updated = new Map(prev);
      dropSelectedCodes.forEach((code) => updated.delete(code));
      return updated;
    });
  };

  const handleFinalize = async () => {
    if (!isEnrollmentActive) return;
    try {
      // 1. Prepare Payload
      const selectedCodes = Array.from(selectedRegistry.keys()).join(',');
      
      // 2. Call API
      const res = await api.enrollStudent({ selected_code: selectedCodes });
      
      if (res.success) {
        setIsFinalized(true);
        setSuccessMessage(res.message);
      }
    } catch (error) {
      console.error("Enrollment failed", error);
    }
  };

  const handleAiAssist = async () => {
    const message = aiMessage.trim();
    if (!message || aiLoading) return;

    setAiLoading(true);
    setAiError(null);
    setHasAskedAi(true);

    try {
      const response = await api.studentEnrollmentAssistance({ message });
      setAiResults(response.data || []);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Failed to get enrollment assistance.");
      setAiResults([]);
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiSuggestion = (course: EnrollmentAssistanceCourse) => {
    const mappedCourse: AvailableCourse = {
      code: course.code,
      title: course.title,
      type: course.type,
      credits: course.credits,
      desc: course.desc,
      color: course.color,
      status: course.enrollable === false ? 'locked' : (course.status || 'available'),
      error: course.error,
      is_retake: course.is_retake,
      schedule: course.schedule,
      message: course.message,
      enrollable: course.enrollable,
    };

    toggleCourse(mappedCourse);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-sans">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Course Enrollment" user={user} />
        <main className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 lg:p-8">
             <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">Course Enrollment</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Select your courses for {user.student_profile?.year ? `${user.student_profile.year} semester` : 'Upcoming Semester'}.</p>
              </div>
              <div className="flex items-center gap-4 bg-surface-light dark:bg-surface-dark px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="text-center">
                  <span className="block text-xs text-gray-500 uppercase font-bold tracking-wider">Credits</span>
                  <span className="text-lg font-bold text-primary">{credits}<span className="text-gray-400 text-sm font-normal">/{maxCreditsLimit}</span></span>
                </div>
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
                <div className="text-center">
                  <span className="block text-xs text-gray-500 uppercase font-bold tracking-wider">GPA</span>
                  <span className="text-lg font-bold text-green-500">3.4</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-[8px] border border-[#cccccc] shadow-[0_2px_6px_rgba(0,0,0,0.1)] mb-6 dark:bg-surface-dark dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <p className="text-sm text-[#666666] dark:text-gray-300">Enrollment Status</p>
                  <span
                    className={`inline-flex mt-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      isEnrollmentActive
                        ? "bg-[#eafaf1] text-[#27ae60] dark:bg-green-900/25 dark:text-green-300"
                        : "bg-[#fdecea] text-[#e74c3c] dark:bg-red-900/25 dark:text-red-300"
                    }`}
                  >
                    {isEnrollmentActive ? "Open" : "Closed"}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-[#666666] dark:text-gray-300">Open Time</p>
                  <p className="text-sm font-semibold text-[#333333] dark:text-gray-100">{formatLocalDateTime(enrollmentSetting?.enrollment_open_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-[#666666] dark:text-gray-300">Close Time</p>
                  <p className="text-sm font-semibold text-[#333333] dark:text-gray-100">{formatLocalDateTime(enrollmentSetting?.enrollment_close_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-[#666666] dark:text-gray-300">Remaining Time</p>
                  <p className="text-sm font-semibold text-[#333333] dark:text-gray-100">{formatRemainingTime(enrollmentSetting?.enrollment_close_at)}</p>
                </div>
              </div>
              {settingLoading && <p className="mt-3 text-sm text-[#666666] dark:text-gray-300">Loading enrollment setting...</p>}
              {settingError && <p className="mt-3 text-sm text-[#e74c3c] dark:text-red-300">{settingError}</p>}
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full md:w-auto">
                <span className="material-icons-outlined absolute left-3 top-2.5 text-gray-400 text-sm">search</span>
                <input 
                    type="text"
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">Sort By:</span>
                <button 
                    onClick={() => toggleFilter('track:cs')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${activeFilters.has('track:cs') ? 'bg-primary text-white border-primary' : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary'}`}
                >
                  CS
                </button>
                <button 
                    onClick={() => toggleFilter('track:ct')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${activeFilters.has('track:ct') ? 'bg-primary text-white border-primary' : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary'}`}
                >
                  CT
                </button>
                <button 
                    onClick={() => toggleFilter('major')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${activeFilters.has('major') ? 'bg-primary text-white border-primary' : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary'}`}
                >
                  Major
                </button>
                <button 
                    onClick={() => toggleFilter('enrollable')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isEnrollableFilterActive ? 'bg-primary text-white border-primary' : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary'}`}
                >
                  Enrollable
                </button>
              </div>
            </div>

            <section className="bg-white dark:bg-surface-dark p-4 rounded-[6px] border border-[#d8e3e8] dark:border-gray-700 shadow-[0_2px_6px_rgba(0,0,0,0.08)] mb-6">
              <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#1f6f5f]">AI Enrollment Assistant</h3>
                  <p className="text-sm text-[#666666] dark:text-gray-300">Describe your goal and get smart course suggestions based on your enrollment constraints.</p>
                </div>
              </div>

              <form
                className="flex flex-col md:flex-row gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAiAssist();
                }}
              >
                <div className="relative flex-1">
                  <span className="material-icons-outlined absolute left-3 top-2.5 text-[#1f6f5f] text-sm">smart_toy</span>
                  <input
                    type="text"
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    placeholder={`Try: I need 2 electives that keep me under ${maxCreditsLimit} credits and avoid schedule conflicts.`}
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-[6px] border border-[#b8ced6] bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1f6f5f]/20 focus:border-[#1f6f5f] transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={aiLoading || !aiMessage.trim()}
                  className={`px-4 py-2.5 rounded-[6px] text-sm font-semibold text-white transition-colors ${
                    aiLoading || !aiMessage.trim()
                      ? 'bg-[#9bbab3] cursor-not-allowed'
                      : 'bg-[#1f6f5f] hover:bg-[#185a4e]'
                  }`}
                >
                  {aiLoading ? 'Processing...' : 'Ask AI'}
                </button>
              </form>

              {aiError && (
                <div className="mt-3 bg-[#fdecea] text-[#e74c3c] px-3 py-2 rounded-[6px] text-sm border border-[#f6c9c4]">
                  {aiError}
                </div>
              )}

              {aiLoading && (
                <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="animate-pulse border border-[#d8e3e8] dark:border-gray-700 rounded-[6px] p-4 bg-[#f9fbfc] dark:bg-gray-800">
                      <div className="h-4 w-2/5 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                      <div className="h-3 w-4/5 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                      <div className="h-3 w-3/5 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                      <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-[6px]"></div>
                    </div>
                  ))}
                </div>
              )}

              {!aiLoading && hasAskedAi && !aiError && aiResults.length === 0 && (
                <div className="mt-4 bg-[#fff4e5] text-[#8a6d1f] px-3 py-2 rounded-[6px] border border-[#ffe1a8] text-sm">
                  No course suggestions were returned for this request. Try rephrasing with credits, type, or schedule preferences.
                </div>
              )}

              {!aiLoading && aiResults.length > 0 && (
                <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {aiResults.map((course) => {
                    const selected = selectedRegistry.has(course.code);
                    const isLocked = course.enrollable === false;
                    return (
                      <div key={`${course.code}-${course.title}`} className="border border-[#d8e3e8] dark:border-gray-700 rounded-[6px] p-4 bg-[#fbfdfd] dark:bg-gray-800">
                        <div className="flex justify-between gap-3 mb-2">
                          <div>
                            <h4 className="font-semibold text-[#333333] dark:text-gray-100">{course.title}</h4>
                            <p className="text-xs text-[#666666] dark:text-gray-400">{course.code} • {course.credits} Credits • {course.type}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${isLocked ? 'bg-red-100 text-red-700' : 'bg-[#eaf6f3] text-[#1f6f5f]'}`}>
                            {isLocked ? 'Blocked' : 'Suggested'}
                          </span>
                        </div>
                        <p className="text-sm text-[#666666] dark:text-gray-300 mb-2 line-clamp-2">{course.desc}</p>
                        {course.reason && <p className="text-xs text-[#1f6f5f] dark:text-green-300 mb-2">{course.reason}</p>}
                        {(course.message || course.error) && (
                          <p className={`text-xs mb-3 ${course.error ? 'text-[#e74c3c]' : 'text-[#666666] dark:text-gray-300'}`}>
                            {course.error || course.message}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => applyAiSuggestion(course)}
                          disabled={isLocked}
                          className={`px-3 py-2 rounded-[6px] text-xs font-semibold transition-colors ${
                            isLocked
                              ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                              : selected
                                ? 'bg-red-50 text-red-600 border border-red-200'
                                : 'bg-[#1f6f5f] text-white hover:bg-[#185a4e]'
                          }`}
                        >
                          {selected ? 'Remove' : 'Add to Selection'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {enrollmentClosedForEnrollableSort && (
                <div className="xl:col-span-2 rounded-[6px] border border-[#f6c9c4] bg-[#fdecea] px-4 py-3 text-sm text-[#e74c3c]">
                  Enrollment is currently closed now.
                </div>
              )}
               {displayCourses.map((course) => (
                 <div 
                   key={course.code} 
                   onClick={() => navigate(`/student/enrollment/view/${course.code}`)} 
                   className={`group relative bg-surface-light dark:bg-surface-dark rounded-xl p-4 md:p-5 border transition-all shadow-sm cursor-pointer ${
                   course.status === 'selected' ? 'border-2 border-primary ring-1 ring-primary/20 shadow-md' : 
                   course.status === 'locked' ? 'border-gray-200 dark:border-gray-700 opacity-60' : 'border-gray-200 dark:border-gray-700 hover:border-primary'
                 }`}>
                   {course.status === 'selected' && (showValidation || isFinalized) && <div className="absolute -top-3 right-4 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm z-10">Selected</div>}
                   
                   {/* Hover Tooltip for Locked/Error Courses */}
                   {course.status === 'locked' && (course.message || course.error) && (
                     <div className="absolute z-30 top-2 right-2 w-60 md:w-64 p-3 bg-gray-900/90 text-white text-[11px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none backdrop-blur-sm">
                       <div className="flex items-start gap-2">
                         <span className="material-icons-outlined text-sm text-yellow-400">info</span>
                         <span className="leading-relaxed">{course.message || course.error}</span>
                       </div>
                     </div>
                   )}

                   <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-3">
                     <div className="flex gap-3 min-w-0 flex-1">
                       <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-extrabold text-xs uppercase shrink-0 bg-${course.color || 'blue'}-100 text-${course.color || 'blue'}-600`}>
                         {course.code.split('-')[0]}
                       </div>
                       <div className="min-w-0 flex-1">
                         <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <h4 className={`font-bold text-base md:text-lg truncate ${course.status === 'selected' ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>{course.title}</h4>
                            <span className="bg-gray-100 dark:bg-gray-800 text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider text-gray-500 shrink-0">{course.type}</span>
                         </div>
                         <p className="text-[11px] text-gray-500 font-bold uppercase tracking-tight truncate">{course.code} • {course.credits} Credits</p>
                       </div>
                     </div>
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         toggleCourse(course);
                       }}
                       className={`w-full sm:w-auto px-4 py-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 ${
                       course.status === 'selected' ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' :
                       course.status === 'locked' ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50/50' : 'bg-primary text-white border-primary hover:bg-opacity-90 shadow-sm'
                     }`}>
                        <span className="material-icons-outlined text-sm">
                          {course.status === 'selected' ? 'remove' : course.status === 'locked' ? 'lock' : 'add_circle_outline'}
                        </span>
                        <span>
                          {course.status === 'selected' ? 'Remove' : course.status === 'locked' ? 'Locked' : 'Enroll'}
                        </span>
                     </button>
                   </div>
                   <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 leading-relaxed">{course.desc}</p>
                   {course.error ? (
                     <div className="flex items-center gap-2 text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 py-1.5 px-3 rounded-lg w-fit">
                       <span className="material-icons-outlined text-sm">error</span> {course.error}
                     </div>
                   ) : (
                     <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3">
                        <div className="flex items-center gap-1.5 uppercase tracking-wide">
                          <span className="material-icons-outlined text-sm text-primary/60">schedule</span> 
                          {course.schedule || 'N/A'}
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-600 uppercase tracking-wide">
                          <span className="material-icons-outlined text-sm">check_circle</span> 
                          Prerequisites Met
                        </div>
                     </div>
                   )}
                 </div>
               ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8 pb-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-1 px-4 py-2 rounded-md font-medium transition-colors ${
                    currentPage === 1 
                      ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                      : 'text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
                >
                  <span className="material-icons-outlined text-sm">chevron_left</span>
                  Previous
                </button>
                
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Page <span className="text-primary font-bold">{currentPage}</span> of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-1 px-4 py-2 rounded-md font-medium transition-colors ${
                    currentPage === totalPages 
                      ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                      : 'text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
                >
                  Next
                  <span className="material-icons-outlined text-sm">chevron_right</span>
                </button>
              </div>
            )}
          </div>

          {/* Validation Sidebar Overlay */}
          {showValidation && (
            <div 
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setShowValidation(false)}
            />
          )}

          <aside className={`fixed inset-y-0 right-0 w-96 bg-surface-light dark:bg-surface-dark border-l border-gray-200 dark:border-gray-700 flex flex-col shadow-2xl z-50 transition-transform duration-300 ease-in-out ${showValidation ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg mb-1">Enrollment Validation</h3>
                <p className="text-xs text-gray-500 font-medium">Checking requirements in real-time</p>
              </div>
              <button onClick={() => setShowValidation(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span>Total Credits</span>
                  <span className={`${isOverLimit ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'} font-bold`}>{totalCredits}/{maxCreditsLimit} Limit</span>
                </div>
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${isOverLimit ? 'bg-red-500' : 'bg-primary'} rounded-full transition-all duration-300`} 
                    style={{ width: `${Math.min((totalCredits / Math.max(maxCreditsLimit, 1)) * 100, 100)}%` }}
                  ></div>
                </div>
                {isOverLimit && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1 font-medium">
                    <span className="material-icons-outlined text-xs">error</span> Limit Exceeded by {totalCredits - maxCreditsLimit} Credit{totalCredits - maxCreditsLimit > 1 ? 's' : ''}
                    </p>
                )}
              </div>

              {!hasPrereqError ? (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
                    <span className="material-icons-outlined text-green-600 dark:text-green-400">check_circle</span>
                    <div>
                    <p className="text-sm font-bold text-green-800 dark:text-green-300">Prerequisites Met</p>
                    <p className="text-xs text-green-700 dark:text-green-400 font-medium">All selected courses are valid.</p>
                    </div>
                </div>
              ) : (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
                    <span className="material-icons-outlined text-red-600 dark:text-red-400">error</span>
                    <div>
                    <p className="text-sm font-bold text-red-800 dark:text-red-300">Prerequisite Error</p>
                    <p className="text-xs text-red-700 dark:text-red-400 font-medium">Some selected courses satisfy requirements.</p>
                    </div>
                </div>
              )}

              {isOverLimit && (
                <div className="bg-gradient-to-br from-[#eaf6f3] to-[#f4fbf9] dark:from-[#1f6f5f]/20 dark:to-[#1f6f5f]/10 border border-[#b7d8d0] dark:border-[#1f6f5f]/40 rounded-[6px] p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-icons-outlined text-[#1f6f5f]">smart_toy</span>
                      <h4 className="font-bold text-[#1f6f5f]">AI Drop Selection</h4>
                    </div>
                    <button
                      onClick={fetchDropRecommendation}
                      disabled={dropLoading}
                      className={`text-xs px-2.5 py-1 rounded-[6px] border ${
                        dropLoading
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-white text-[#1f6f5f] border-[#1f6f5f]/30 hover:bg-[#eaf6f3]'
                      }`}
                    >
                      Refresh
                    </button>
                  </div>
                  <p className="text-xs text-[#35574f] dark:text-green-200 mb-3">
                    {dropRecommendation?.message || "AI prioritizes retakes, then electives, then core courses if needed."}
                  </p>
                  {dropLoading && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-[#1f6f5f]">
                        <span className="h-2 w-2 rounded-full bg-[#1f6f5f] animate-pulse"></span>
                        AI is thinking and selecting the best courses to drop...
                      </div>
                      {[1, 2].map((item) => (
                        <div key={item} className="animate-pulse bg-white/80 dark:bg-gray-800 border border-[#cfe4df] dark:border-gray-700 rounded-[6px] p-3">
                          <div className="h-3 w-2/5 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                          <div className="h-2.5 w-4/5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!dropLoading && dropError && (
                    <div className="bg-[#fdecea] text-[#e74c3c] border border-[#f6c9c4] rounded-[6px] px-3 py-2 text-xs">
                      {dropError}
                    </div>
                  )}
                  {!dropLoading && !dropError && dropRecommendation && (
                    <div>
                      <div className="text-xs text-[#666666] dark:text-gray-300 mb-3">
                        Current: {dropRecommendation.current_total_credits} | Limit: {dropRecommendation.credit_limit} | Need to drop: {dropRecommendation.credits_to_drop}
                      </div>
                      <div className="space-y-2 mb-3">
                        {selectedCourses.map((course) => {
                          const checked = dropSelectedCodes.has(course.code);
                          const isRecommended = recommendedDropCodes.has(course.code);
                          const reason =
                            (dropRecommendation.elective?.code === course.code ? dropRecommendation.elective.reason : null) ||
                            dropRecommendation.others.find((item) => item.code === course.code)?.reason;
                          return (
                            <label
                              key={course.code}
                              className={`block rounded-[6px] border p-3 cursor-pointer transition-colors ${
                                checked
                                  ? 'border-[#1f6f5f] bg-[#edf8f5] dark:bg-[#1f6f5f]/20'
                                  : 'border-[#cfe4df] dark:border-gray-700 bg-white dark:bg-gray-800'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-4 w-4 accent-[#1f6f5f]"
                                  checked={checked}
                                  onChange={() => toggleDropSelection(course.code)}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-[#333333] dark:text-gray-100">{course.title}</p>
                                    {isRecommended && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#dff1ec] text-[#1f6f5f] font-bold uppercase">
                                        Recommended
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#666666] dark:text-gray-400">{course.code} • {course.type} • {course.credits} Credits</p>
                                  {reason && <p className="text-xs text-[#1f6f5f] dark:text-green-300 mt-1">{reason}</p>}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      {dropRecommendation.elective && (
                        <p className="text-xs text-[#1f6f5f] dark:text-green-300 mb-3">
                          Elective priority: {dropRecommendation.elective.code} - {dropRecommendation.elective.title}
                        </p>
                      )}
                      <button
                        onClick={applySelectedDrops}
                        disabled={dropSelectedCodes.size === 0}
                        className={`w-full py-2 rounded-[6px] text-sm font-semibold transition-colors ${
                          dropSelectedCodes.size === 0
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-[#1f6f5f] text-white hover:bg-[#185a4e]'
                        }`}
                      >
                        Apply Selected Drops ({dropSelectedCodes.size})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              {successMessage ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-center mb-2">
                    <span className="material-icons-outlined text-green-600 text-3xl">check_circle</span>
                  </div>
                  <h4 className="font-bold text-green-800 dark:text-green-300 mb-1">Enrollment Successful!</h4>
                  <p className="text-sm text-green-700 dark:text-green-400">{successMessage}</p>
                </div>
              ) : (
                <>
                  <button 
                  onClick={handleFinalize}
                  disabled={isOverLimit || isFinalized || selectedRegistry.size === 0 || !isEnrollmentActive}
                  className={`w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                      (isOverLimit || isFinalized || selectedRegistry.size === 0 || !isEnrollmentActive) 
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed' 
                      : 'bg-primary text-white hover:bg-primary-hover shadow-lg'
                  }`}
                  >
                   <span>{isFinalized ? 'Enrollment Finalized' : 'Finalize Enrollment'}</span>
                   <span className="material-icons-outlined text-sm">{isFinalized ? 'check' : 'lock_open'}</span>
                  </button>
                  {!isEnrollmentActive && <p className="text-center text-xs text-red-500 mt-2 font-medium">Enrollment is currently closed now</p>}
                  {isOverLimit && <p className="text-center text-xs text-red-500 mt-2 font-medium">Resolve credit limit to proceed</p>}
                </>
              )}
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default StudentEnrollment;
