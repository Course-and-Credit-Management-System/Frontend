import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import CourseChatbot from '../components/CourseChatbot';
import { DetailedCardGridSkeleton } from '../components/Skeleton';
import { User, CourseDetail } from '../types';
import { api } from '../lib/api';

interface CourseDetailsProps {
  user: User;
  onLogout: () => void;
}

const CourseDetails: React.FC<CourseDetailsProps> = ({ user, onLogout }) => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!courseId) throw new Error('Missing course id');

        const data: any = await api.studentCourseDetails(courseId);

        //  schedule can be array OR string (supports legacy DB + current validator differences)
        const scheduleRaw = data?.schedule;
        const scheduleArr: string[] = Array.isArray(scheduleRaw)
          ? scheduleRaw.filter((x: any) => typeof x === 'string' && x.trim().length > 0)
          : typeof scheduleRaw === 'string' && scheduleRaw.trim()
            ? [scheduleRaw.trim()]
            : [];

        const mapped: CourseDetail = {
          code: data?.course_code ?? courseId,
          title: data?.title ?? '—',
          instructor: data?.instructor ?? '—',

          credits: Number(data?.credits ?? 0) || 0,
          schedule: scheduleArr,
          room: data?.room ?? '—',
          description: data?.description ?? 'No description available yet.',
          syllabus: Array.isArray(data?.syllabus) ? data.syllabus : [],
          prerequisites: Array.isArray(data?.prerequisites) ? data.prerequisites : [],
          type: data?.type,
          department: data?.department,
        };

        if (!alive) return;
        setCourse(mapped);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || 'Failed to load course');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins">
        <Sidebar user={user} onLogout={onLogout} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header title="Course Details" user={user} />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-sm text-gray-500 hover:text-primary mb-6 transition-colors"
            >
              <span className="material-icons-outlined text-sm mr-1">arrow_back</span>
              Back to Courses
            </button>
            <DetailedCardGridSkeleton count={3} />
          </main>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins">
        <Sidebar user={user} onLogout={onLogout} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header title="Course Details" user={user} />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-sm text-gray-500 hover:text-primary mb-6 transition-colors"
            >
              <span className="material-icons-outlined text-sm mr-1">arrow_back</span>
              Back to Courses
            </button>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {error || 'Course not found'}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 font-poppins">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Header title="Course Inventory" user={user} />
        <main className="flex-1 overflow-y-auto p-10 lg:p-16 scrollbar-hide animate-in fade-in duration-1000 slide-in-from-bottom-4">
          <button
            onClick={() => navigate(-1)}
            className="group inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-teal-600 transition-colors mb-10"
          >
            <span className="material-icons-outlined text-sm transform group-hover:-translate-x-1 transition-transform">west</span>
            Back to Catalog
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start max-w-[1600px] mx-auto">
            <div className="lg:col-span-8 space-y-12">
              <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-[40px] p-10 lg:p-12 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all hover:shadow-md group">
                <div className="absolute top-0 right-0 h-48 w-48 bg-teal-500/[0.02] rounded-bl-full pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex flex-wrap items-center gap-4 mb-8">
                    <span className="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-teal-100 dark:border-teal-800 shadow-sm">
                      {course.type || 'Course Protocol'}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 font-mono text-xs font-bold uppercase tracking-[0.2em]">{course.code}</span>
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-8 group-hover:text-teal-600 transition-colors">{course.title}</h1>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em] mb-4">Course Abstract</p>
                    <p className="text-lg font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-4xl">{course.description}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm text-teal-600">
                    <span className="material-icons-outlined text-lg">list_alt</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Curriculum Lifecycle</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Weekly Syllabus Manifest</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {course.syllabus.length ? (
                    course.syllabus.map((item, i) => (
                      <div
                        key={i}
                        className="px-10 py-6 flex items-center gap-8 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all group"
                      >
                        <div className="h-12 w-12 shrink-0 rounded-2xl bg-slate-50 dark:bg-slate-950 text-slate-400 group-hover:bg-teal-50 dark:group-hover:bg-teal-900/20 group-hover:text-teal-600 flex items-center justify-center font-black text-[10px] border border-slate-100 dark:border-slate-800 transition-all uppercase tracking-widest tabular-nums">
                          W{item.week < 10 ? `0${item.week}` : item.week}
                        </div>
                        <span className="text-base font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{item.topic}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-10 py-12 text-center">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">Syllabus synchronization pending...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-10">
              <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-10 shadow-sm transition-all hover:shadow-md">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 ml-1">Logistics Matrix</h3>
                <div className="space-y-8">
                  <div className="flex items-start gap-5 group">
                    <div className="h-10 w-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-800 group-hover:text-teal-600 transition-colors shrink-0">
                      <span className="material-icons-outlined text-lg">person_pin</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1">Academic Lead</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{course.instructor}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-5 group">
                    <div className="h-10 w-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-800 group-hover:text-teal-600 transition-colors shrink-0">
                      <span className="material-icons-outlined text-lg">timer</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1">Execution Schedule</p>
                      {course.schedule.length ? (
                        <div className="space-y-2 mt-2">
                          {course.schedule.map((s, i) => (
                            <div key={i} className="inline-block px-3 py-1 bg-slate-50 dark:bg-slate-950 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800 mr-2 uppercase tracking-tighter">
                              {s}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-slate-300 italic">—</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-5 group">
                    <div className="h-10 w-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-800 group-hover:text-teal-600 transition-colors shrink-0">
                      <span className="material-icons-outlined text-lg">place</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1">Vector Location</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{course.room}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-5 group">
                    <div className="h-10 w-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-800 group-hover:text-teal-600 transition-colors shrink-0">
                      <span className="material-icons-outlined text-lg">token</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1">Unit Weight</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{course.credits} Credits</p>
                    </div>
                  </div>

                  {course.department && (
                    <div className="flex items-start gap-5 group">
                      <div className="h-10 w-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-800 group-hover:text-teal-600 transition-colors shrink-0">
                        <span className="material-icons-outlined text-lg">corporate_fare</span>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1">Department Hub</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{course.department}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-12 pt-10 border-t border-slate-50 dark:border-slate-800">
                  <h4 className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em] mb-6 ml-1">System Prerequisites</h4>
                  <div className="flex flex-wrap gap-3">
                    {course.prerequisites.length ? (
                      course.prerequisites.map((req, i) => (
                        <div
                          key={i}
                          className="px-4 py-2 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:bg-white dark:hover:bg-slate-900 hover:border-teal-500/30"
                        >
                          {req}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800/50">
                        Zero Requirements
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Global UI Decoration */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/[0.02] rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2 -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/[0.02] rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/2 -z-10" />
      </div>
      {courseId && <CourseChatbot courseId={courseId} />}
    </div>
  );
};

export default CourseDetails;
