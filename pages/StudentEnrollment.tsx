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
  const [majorState, setMajorState] = useState<any | null>(null);
  const [maxCreditsLimit, setMaxCreditsLimit] = useState<number>(() => {
    const stored = Number(localStorage.getItem("max_credits"));
    return Number.isFinite(stored) && stored > 0 ? stored : 24;
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

  useEffect(() => {
    api.studentMajorState()
      .then((state) => setMajorState(state))
      .catch(() => setMajorState(null));
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
  const selectedHasMajorCourse = selectedCourses.some(
    (course) => String(course.type || "").trim().toLowerCase() === "major"
  );
  const normalizeTrack = (value: unknown): "CS" | "CT" | null => {
    const text = String(value || "").trim().toUpperCase();
    if (!text) return null;
    if (/\bCS\b/.test(text) || text.includes("COMPUTER SCIENCE")) return "CS";
    if (/\bCT\b/.test(text) || text.includes("COMPUTER TECHNOLOGY")) return "CT";
    return null;
  };
  const pickTrackFromCourse = (course: any): "CS" | "CT" | null => {
    const candidates = [
      course?.track,
      course?.major_track,
      course?.majorTrack,
      course?.selected_track,
      course?.selectedTrack,
      course?.type,
      course?.desc,
      course?.message,
      course?.reason,
    ];
    for (const candidate of candidates) {
      const parsed = normalizeTrack(candidate);
      if (parsed) return parsed;
    }
    return null;
  };
  const normalizeMajor = (value: unknown): string | null => {
    const text = String(value || "").trim();
    return text ? text : null;
  };
  const selectedTrackSet = new Set<"CS" | "CT">(
    selectedCourses
      .map((course: any) => pickTrackFromCourse(course))
      .filter((track): track is "CS" | "CT" => !!track)
  );
  const selectedMajorSet = new Set<string>(
    selectedCourses
      .map((course: any) => normalizeMajor(course?.major))
      .filter((major): major is string => !!major)
  );
  const selectedTrackFromCourses = selectedTrackSet.size === 1 ? Array.from(selectedTrackSet)[0] : null;
  const selectedMajorFromCourses = selectedMajorSet.size === 1 ? Array.from(selectedMajorSet)[0] : null;
  const recommendedDropCodes = new Set([
    ...(dropRecommendation?.elective?.code ? [dropRecommendation.elective.code] : []),
    ...((dropRecommendation?.others || []).map((course) => course.code)),
  ]);
  const newFlagValues = [
    user.student_profile?.new,
    user.student_profile?.is_new,
    user.student_profile?.isNew,
    majorState?.new,
    majorState?.is_new,
    majorState?.isNew,
    (user as any)?.students_progress?.new,
    (user as any)?.students_progress?.is_new,
    (user as any)?.students_progress?.isNew,
  ];
  const hasExplicitNewFlag = newFlagValues.some((value) => {
    if (value === true) return true;
    if (typeof value === "string") return value.trim().toLowerCase() === "true";
    return false;
  });
  const isNewStudentByText = [
    majorState?.status,
    user.student_profile?.registration_type,
    user.student_profile?.student_type,
    user.student_profile?.admission_status,
    user.student_profile?.status,
    user.student_profile?.current_year,
    majorState?.current_year,
    (user as any)?.students_progress?.current_year,
  ].some((value) => /\bnew\b/i.test(String(value || "")));
  const isNewStudent = hasExplicitNewFlag || isNewStudentByText;
  const parseYearNumber = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const trimmed = value.trim().toLowerCase();
      if (!trimmed) return null;
      if (trimmed.includes("first")) return 1;
      if (trimmed.includes("second")) return 2;
      if (trimmed.includes("third")) return 3;
      if (trimmed.includes("fourth")) return 4;
      if (trimmed.includes("fifth")) return 5;
      const m = trimmed.match(/\d+/);
      if (m) return Number(m[0]);
    }
    return null;
  };
  const studentYearNum =
    parseYearNumber(majorState?.current_year_num) ??
    parseYearNumber(user.student_profile?.year) ??
    parseYearNumber(user.student_profile?.current_year_num) ??
    parseYearNumber(user.student_profile?.current_year) ??
    parseYearNumber(user.student_profile?.registration_type) ??
    parseYearNumber(user.student_profile?.student_type) ??
    parseYearNumber(user.student_profile?.admission_status) ??
    parseYearNumber(user.student_profile?.status) ??
    parseYearNumber(majorState?.status);
  const isFirstOrSecondYear = studentYearNum === 1 || studentYearNum === 2;
  const shouldForceMajorSelection =
    isNewStudent &&
    isFirstOrSecondYear &&
    selectedHasMajorCourse;
  const isOldStudent = !isNewStudent;
  const hasRecordedTrack = !!(majorState?.selected_track || majorState?.profile_major_track);
  const hasRecordedMajor = !!(majorState?.selected_major || majorState?.profile_major_id);
  const shouldForceOldStudentSpecialSelection =
    isOldStudent &&
    selectedHasMajorCourse &&
    ((selectedTrackSet.size > 0 && !hasRecordedTrack) || (selectedMajorSet.size > 0 && !hasRecordedMajor));
  const shouldRouteToSpecialMajorFlow = shouldForceMajorSelection || shouldForceOldStudentSpecialSelection;
  const isPrimaryActionDisabled = shouldRouteToSpecialMajorFlow
    ? (!isEnrollmentActive || selectedRegistry.size === 0)
    : (isOverLimit || isFinalized || selectedRegistry.size === 0 || !isEnrollmentActive);

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
    if (shouldForceMajorSelection) {
      navigate("/student/special-major/access");
      return;
    }
    if (shouldForceOldStudentSpecialSelection) {
      if (selectedTrackFromCourses) {
        try {
          await api.specialMajorSelectTrack({ track: selectedTrackFromCourses });
        } catch {
          // Keep going and let special-major page retry with fallback payload shapes.
        }
      }
      navigate("/student/special-major/access", {
        state: {
          old_student_flow: true,
          pending_track: selectedTrackFromCourses,
          pending_major: selectedMajorFromCourses,
          return_to: "/student/enrollment",
        },
      });
      return;
    }
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
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 font-poppins relative">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Header title="Institutional Enrollment" user={user} />
        <main className="flex-1 flex overflow-hidden animate-in fade-in duration-700 slide-in-from-bottom-4 scrollbar-hide">
          <div className="flex-1 overflow-y-auto p-10 lg:p-16 scrollbar-hide">
             <div className="flex flex-col xl:flex-row xl:items-end justify-between mb-12 gap-8">
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Course Selection</h2>
                <p className="text-lg font-medium text-slate-400 dark:text-slate-500">Academic Period: {user.student_profile?.year ? `Year ${user.student_profile.year}` : 'Upcoming Cycle'}</p>
              </div>
              <div className="flex items-center gap-8 bg-slate-50/50 dark:bg-slate-900/50 px-8 py-5 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                <div className="space-y-1">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Credit Utilization</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-teal-600 tabular-nums">{credits}</span>
                    <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase">Limit: {maxCreditsLimit}</span>
                  </div>
                </div>
                <div className="h-10 w-px bg-slate-200 dark:bg-slate-800"></div>
                <div className="space-y-1 text-right">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Academic Index</span>
                  <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">3.40</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/30 dark:bg-slate-900/30 p-10 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm mb-12 transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Enrollment State</p>
                  <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    isEnrollmentActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isEnrollmentActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    {isEnrollmentActive ? "Operational" : "Locked"}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">System Launch</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{formatLocalDateTime(enrollmentSetting?.enrollment_open_at)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">System Termination</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{formatLocalDateTime(enrollmentSetting?.enrollment_close_at)}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Time Buffer</p>
                  <p className="text-sm font-black text-teal-600 tabular-nums">{formatRemainingTime(enrollmentSetting?.enrollment_close_at)}</p>
                </div>
              </div>
              {settingError && <p className="mt-6 text-xs font-bold text-rose-500 italic">Sync Error: {settingError}</p>}
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm mb-12 flex flex-col md:flex-row gap-8 items-center justify-between transition-all hover:shadow-md">
              <div className="relative flex-1 w-full group">
                <span className="material-icons-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors text-xl">search</span>
                <input 
                    type="text"
                    placeholder="Filter institutional courses..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 text-base font-bold rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:text-white placeholder:text-slate-300"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mr-2">Sort Protocol:</span>
                {[
                  { id: 'track:cs', label: 'CS' },
                  { id: 'track:ct', label: 'CT' },
                  { id: 'major', label: 'MAJOR' },
                  { id: 'enrollable', label: 'AVAILABLE' }
                ].map(f => (
                  <button 
                    key={f.id}
                    onClick={() => toggleFilter(f.id as CourseFilterKey)}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                      activeFilters.has(f.id as CourseFilterKey) || (f.id === 'enrollable' && isEnrollableFilterActive)
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-teal-600 dark:border-teal-600 shadow-lg" 
                        : "bg-transparent text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800 hover:border-teal-500/30"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <section className="bg-slate-50/50 dark:bg-slate-900/30 p-10 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm mb-12 transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-md group">
              <div className="flex items-center gap-6 mb-10">
                <div className="h-14 w-14 rounded-3xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400 border border-teal-100/50 dark:border-teal-800/50 group-hover:scale-110 transition-transform duration-500">
                  <span className="material-icons-outlined text-3xl">smart_toy</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Neural Enrollment Assistant</h3>
                  <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Optimize your academic matrix via descriptive intelligence dispatches.</p>
                </div>
              </div>

              <form
                className="flex flex-col md:flex-row gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAiAssist();
                }}
              >
                <div className="relative flex-1 group/input">
                  <span className="material-icons-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-teal-500 transition-colors text-xl">psychology</span>
                  <input
                    type="text"
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    placeholder={`Try: Optimize for 2 electives while maintaining sub-${maxCreditsLimit} volume...`}
                    className="w-full pl-14 pr-6 py-4 text-base font-medium rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all dark:text-white shadow-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={aiLoading || !aiMessage.trim()}
                  className={`px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-white transition-all active:scale-[0.98] shadow-lg ${
                    aiLoading || !aiMessage.trim()
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-700 shadow-slate-500/20'
                  }`}
                >
                  {aiLoading ? 'SYNTHESIZING...' : 'EXECUTE'}
                </button>
              </form>

              {aiError && (
                <div className="mt-6 bg-rose-50 text-rose-700 p-4 rounded-2xl text-xs font-bold border border-rose-100 animate-in fade-in slide-in-from-top-2">
                  Neural Error: {aiError}
                </div>
              )}

              {aiLoading && (
                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2].map((item) => (
                    <div key={item} className="animate-pulse border border-slate-100 dark:border-slate-800 rounded-[32px] p-8 bg-white dark:bg-slate-900/50">
                      <div className="h-4 w-2/5 bg-slate-100 dark:bg-slate-800 rounded-full mb-6"></div>
                      <div className="space-y-3">
                        <div className="h-2 w-full bg-slate-50 dark:bg-slate-800 rounded-full"></div>
                        <div className="h-2 w-3/4 bg-slate-50 dark:bg-slate-800 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!aiLoading && hasAskedAi && !aiError && aiResults.length === 0 && (
                <div className="mt-10 bg-amber-50 text-amber-700 p-6 rounded-[24px] border border-amber-100 text-sm font-medium italic text-center">
                  Negative response from intelligence matrix. Rephrase your inquiry with specific credit or type constraints.
                </div>
              )}

              {!aiLoading && aiResults.length > 0 && (
                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {aiResults.map((course) => {
                    const selected = selectedRegistry.has(course.code);
                    const isLocked = course.enrollable === false;
                    return (
                      <div key={`${course.code}-${course.title}`} className="group/card bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                        <div className="flex justify-between gap-4 mb-6">
                          <div className="min-w-0">
                            <h4 className="font-black text-slate-900 dark:text-white tracking-tight truncate">{course.title}</h4>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{course.code} • {course.credits} CU • {course.type}</p>
                          </div>
                          <span className={`h-fit text-[8px] px-3 py-1 rounded-full font-black uppercase tracking-widest border ${isLocked ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-teal-50 text-teal-600 border-teal-100'}`}>
                            {isLocked ? 'Inaccessible' : 'Neural Match'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 leading-relaxed italic">"{course.desc}"</p>
                        {course.reason && <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-tighter mb-6">Guidance: {course.reason}</p>}
                        
                        <button
                          type="button"
                          onClick={() => applyAiSuggestion(course)}
                          disabled={isLocked}
                          className={`w-full py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.98] ${
                            isLocked
                              ? 'bg-slate-50 dark:bg-slate-800 text-slate-300 cursor-not-allowed'
                              : selected
                                ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100'
                                : 'bg-slate-900 dark:bg-teal-600 text-white hover:bg-slate-800 dark:hover:bg-teal-700 shadow-lg shadow-teal-500/10'
                          }`}
                        >
                          {selected ? 'PURGE FROM MATRIX' : 'ADD TO SELECTION'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {enrollmentClosedForEnrollableSort && (
                <div className="md:col-span-2 rounded-[32px] border border-rose-100 bg-rose-50/50 p-8 text-sm font-bold text-rose-700 text-center animate-in fade-in duration-500">
                  <span className="material-icons-outlined text-2xl mb-2 block text-rose-500">lock_clock</span>
                  Access window terminated. Synchronization with enrollment nexus is currently offline.
                </div>
              )}
               {displayCourses.map((course) => (
                 <div 
                   key={course.code} 
                   onClick={() => navigate(`/student/enrollment/view/${course.code}`)} 
                   className={`group relative bg-white dark:bg-slate-900 rounded-[32px] p-8 border transition-all shadow-sm cursor-pointer hover:shadow-2xl hover:-translate-y-1 ${
                   course.status === 'selected' ? 'border-teal-500 ring-4 ring-teal-500/5 shadow-xl' : 
                   course.status === 'locked' ? 'border-slate-50 opacity-40 grayscale' : 'border-slate-100 dark:border-slate-800 hover:border-teal-500/30'
                 }`}>
                   {course.status === 'selected' && (showValidation || isFinalized) && (
                     <div className="absolute top-4 right-4 bg-teal-600 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-lg shadow-lg z-10 animate-in zoom-in-95">Selected</div>
                   )}
                   
                   {course.status === 'locked' && (course.message || course.error) && (
                     <div className="absolute z-30 top-4 right-4 w-64 p-4 bg-slate-900/95 text-white text-[10px] font-bold rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none backdrop-blur-md border border-white/10 translate-y-2 group-hover:translate-y-0">
                       <div className="flex items-start gap-3">
                         <span className="material-icons-outlined text-base text-amber-400">info</span>
                         <span className="leading-relaxed uppercase tracking-tighter opacity-80">{course.message || course.error}</span>
                       </div>
                     </div>
                   )}

                   <div className="flex flex-col gap-6 mb-6">
                     <div className="flex justify-between items-start">
                       <div className={`h-12 w-12 rounded-[18px] flex items-center justify-center font-black text-xs uppercase shadow-sm border ${
                         course.status === 'selected' ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700'
                       }`}>
                         {course.code.split('-')[0]}
                       </div>
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           toggleCourse(course);
                         }}
                         className={`h-10 px-6 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.98] ${
                         course.status === 'selected' ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 shadow-sm' :
                         course.status === 'locked' ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50/50' : 'bg-slate-900 dark:bg-teal-600 text-white border-transparent hover:bg-slate-800 dark:hover:bg-teal-700 shadow-lg'
                       }`}>
                          {course.status === 'selected' ? 'PURGE' : course.status === 'locked' ? 'RESTRICTED' : 'ENROLL'}
                       </button>
                     </div>
                     
                     <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                           <h4 className={`text-xl font-black truncate tracking-tight ${course.status === 'selected' ? 'text-teal-600' : 'text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors'}`}>{course.title}</h4>
                           <span className="bg-slate-50 dark:bg-slate-800 text-[8px] px-2 py-0.5 rounded-md font-black uppercase tracking-widest text-slate-400 border border-slate-100 dark:border-slate-700 shrink-0">{course.type}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">{course.code} • {course.credits} CU</p>
                     </div>
                   </div>
                   
                   <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 line-clamp-2 leading-relaxed">{course.desc}</p>
                   
                   {course.error ? (
                     <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-tighter text-rose-500 bg-rose-50/50 dark:bg-rose-900/20 py-2 px-4 rounded-xl w-fit border border-rose-100 dark:border-rose-900/40">
                       <span className="material-icons-outlined text-base">error_outline</span> {course.error}
                     </div>
                   ) : (
                     <div className="flex flex-wrap items-center gap-y-3 gap-x-6 text-[9px] font-black text-slate-400 dark:text-slate-500 border-t border-slate-50 dark:border-slate-800/50 pt-6 uppercase tracking-widest">
                        <div className="flex items-center gap-2 group/meta hover:text-slate-600 transition-colors">
                          <span className="material-icons-outlined text-base opacity-40 group-hover/meta:text-teal-500">schedule</span> 
                          {course.schedule || 'SYNCHRONIZING'}
                        </div>
                        <div className="flex items-center gap-2 text-emerald-600/80">
                          <span className="material-icons-outlined text-base">verified</span> 
                          Nominal Requirements
                        </div>
                     </div>
                   )}
                 </div>
               ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-8 mt-16 pb-8">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-all disabled:opacity-20 disabled:hover:bg-transparent"
                >
                  <span className="material-icons-outlined text-base">west</span>
                  Previous
                </button>
                
                <div className="px-6 py-2 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-inner">
                  Context <span className="text-slate-900 dark:text-white mx-2">{currentPage} / {totalPages}</span> Matrix
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-all disabled:opacity-20 disabled:hover:bg-transparent"
                >
                  Next
                  <span className="material-icons-outlined text-base">east</span>
                </button>
              </div>
            )}
          </div>

          {/* Validation Sidebar Overlay */}
          {showValidation && (
            <div 
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-40 transition-opacity duration-500 animate-in fade-in"
              onClick={() => setShowValidation(false)}
            />
          )}

          <aside className={`fixed inset-y-0 right-0 w-[420px] bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.1)] z-50 transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${showValidation ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-950/20">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Validation Logic</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time constraint analysis</p>
              </div>
              <button onClick={() => setShowValidation(false)} className="h-10 w-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-rose-500 transition-all shadow-sm">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
              <div className="space-y-4">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Projected Credit Mass</span>
                  <span className={`text-sm font-black tabular-nums ${isOverLimit ? 'text-rose-500' : 'text-teal-600'}`}>{totalCredits} / {maxCreditsLimit}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner border border-slate-100 dark:border-slate-800">
                  <div 
                    className={`h-full transition-all duration-1000 ease-out ${isOverLimit ? 'bg-rose-500' : 'bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.4)]'}`} 
                    style={{ width: `${Math.min((totalCredits / Math.max(maxCreditsLimit, 1)) * 100, 100)}%` }}
                  ></div>
                </div>
                {isOverLimit && (
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/40 animate-in slide-in-from-top-2">
                      <span className="material-icons-outlined text-rose-500 text-base mt-0.5">error_outline</span>
                      <p className="text-[11px] text-rose-700 dark:text-rose-300 font-bold leading-relaxed uppercase tracking-tighter">
                        Policy violation: Credit ceiling exceeded by {totalCredits - maxCreditsLimit} units.
                      </p>
                    </div>
                )}
              </div>

              {!hasPrereqError ? (
                <div className="p-5 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/40 rounded-[24px] flex items-start gap-4">
                    <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <span className="material-icons-outlined text-base">verified</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-widest">Protocol Nominal</p>
                      <p className="text-[11px] text-emerald-700/70 dark:text-emerald-400/70 font-medium leading-relaxed">All selected course nodes satisfy institutional prerequisites.</p>
                    </div>
                </div>
              ) : (
                <div className="p-5 bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/40 rounded-[24px] flex items-start gap-4">
                    <div className="h-8 w-8 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                      <span className="material-icons-outlined text-base">report_problem</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-rose-900 dark:text-rose-200 uppercase tracking-widest">Dependency Error</p>
                      <p className="text-[11px] text-rose-700/70 dark:text-rose-400/70 font-medium leading-relaxed">Critical requirement missing for one or more selection nodes.</p>
                    </div>
                </div>
              )}

              {isOverLimit && (
                <div className="bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-[32px] p-6 space-y-6 animate-in fade-in duration-700">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                        <span className="material-icons-outlined text-sm">auto_awesome</span>
                      </div>
                      <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Neural Drop Optimization</h4>
                    </div>
                    <button
                      onClick={fetchDropRecommendation}
                      disabled={dropLoading}
                      className="h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-teal-600 transition-all shadow-sm active:scale-90"
                    >
                      <span className={`material-icons-outlined text-base ${dropLoading ? 'animate-spin' : ''}`}>sync</span>
                    </button>
                  </div>
                  
                  {dropLoading ? (
                    <div className="space-y-4 py-4">
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full w-full animate-pulse"></div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full w-2/3 animate-pulse"></div>
                    </div>
                  ) : dropError ? (
                    <p className="text-[10px] font-bold text-rose-500 italic px-2">Neural Link Interrupted: {dropError}</p>
                  ) : dropRecommendation && (
                    <div className="space-y-6">
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic px-2">"{dropRecommendation.message}"</p>
                      
                      <div className="space-y-2">
                        {selectedCourses.map((course) => {
                          const checked = dropSelectedCodes.has(course.code);
                          const isRecommended = recommendedDropCodes.has(course.code);
                          const reason =
                            (dropRecommendation.elective?.code === course.code ? dropRecommendation.elective.reason : null) ||
                            dropRecommendation.others.find((item) => item.code === course.code)?.reason;
                          return (
                            <label
                              key={course.code}
                              className={`block rounded-2xl border p-4 cursor-pointer transition-all duration-300 ${
                                checked
                                  ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 shadow-inner'
                                  : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-teal-500/30 shadow-sm'
                              }`}
                            >
                              <div className="flex items-start gap-4">
                                <div className={`mt-1 h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all ${checked ? 'border-rose-500 bg-rose-500' : 'border-slate-200 dark:border-slate-700'}`}>
                                  {checked && <span className="material-icons-outlined text-white text-xs">close</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-3 mb-1">
                                    <p className="text-xs font-black text-slate-900 dark:text-white tracking-tight truncate">{course.title}</p>
                                    {isRecommended && (
                                      <span className="text-[7px] px-2 py-0.5 rounded-md bg-teal-500 text-white font-black uppercase tracking-widest shadow-sm shadow-teal-500/20">GUIDANCE Match</span>
                                    )}
                                  </div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{course.code} • {course.credits} CU</p>
                                  {reason && <p className="text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-tighter mt-2 border-t border-slate-50 dark:border-slate-800 pt-2">{reason}</p>}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={applySelectedDrops}
                        disabled={dropSelectedCodes.size === 0}
                        className={`w-full py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg ${
                          dropSelectedCodes.size === 0
                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                            : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/20'
                        }`}
                      >
                        Execute Batch Deletion ({dropSelectedCodes.size})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20">
              {successMessage ? (
                <div className="p-8 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 rounded-[32px] text-center animate-in zoom-in-95 duration-500 shadow-lg shadow-emerald-500/5">
                  <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-950 flex items-center justify-center text-emerald-600 mx-auto mb-4 shadow-sm">
                    <span className="material-icons-outlined text-2xl">verified</span>
                  </div>
                  <h4 className="text-xl font-black text-emerald-900 dark:text-emerald-200 tracking-tight mb-1">Protocol Success</h4>
                  <p className="text-xs font-medium text-emerald-700/70 dark:text-emerald-400/70 uppercase tracking-tighter">{successMessage}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <button 
                    onClick={handleFinalize}
                    disabled={isPrimaryActionDisabled}
                    className={`w-full py-5 rounded-[24px] text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all active:scale-[0.98] shadow-2xl ${
                        isPrimaryActionDisabled
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed shadow-none' 
                        : 'bg-slate-900 dark:bg-teal-600 text-white hover:bg-slate-800 dark:hover:bg-teal-700 shadow-slate-500/20'
                    }`}
                  >
                   <span>{shouldRouteToSpecialMajorFlow ? 'SELECT TRACK/MAJOR' : (isFinalized ? 'TRANSACTION SECURED' : 'COMMIT ENROLLMENT')}</span>
                   <span className="material-icons-outlined text-lg">{shouldRouteToSpecialMajorFlow ? 'school' : (isFinalized ? 'verified_user' : 'lock_open')}</span>
                  </button>
                  {!isEnrollmentActive && <p className="text-center text-[9px] font-black text-rose-500 uppercase tracking-widest animate-pulse">Enrollment window inactive</p>}
                  {shouldForceMajorSelection && <p className="text-center text-[9px] font-black text-amber-500 uppercase tracking-widest animate-pulse">Major selection required before enrollment commit</p>}
                  {shouldForceOldStudentSpecialSelection && <p className="text-center text-[9px] font-black text-amber-500 uppercase tracking-widest animate-pulse">Track/major sync required for old student flow</p>}
                  {isOverLimit && <p className="text-center text-[9px] font-black text-rose-500 uppercase tracking-widest animate-pulse">Constraint Violation: Credit Ceiling</p>}
                </div>
              )}
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default StudentEnrollment;
