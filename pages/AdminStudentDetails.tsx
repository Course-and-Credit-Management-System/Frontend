import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { DetailedCardGridSkeleton } from '../components/Skeleton';
import { User } from '../types';

interface StudentDetailsProps {
  user: User;
  onLogout: () => void;
}

type EnrollmentRow = {
  id: string;
  code: string;
  name: string;
  credits: number;
  grade: string;
  status: string;
};

type StudentDetailsResponse = {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  major: string;
  major_name?: string;
  year: number;
  semester?: number;
  section?: string | null;
  gpa: number;
  advisor: string;
  creditsEarned: number;
  creditsRequired: number;
  status: string;
  avatar: string;
  enrollments: EnrollmentRow[];
};

type CourseOption = { course_code: string; title: string; credits: number };

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim()
  ? ((import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "")) + "/api/v1"
  : "/api/v1";

const AdminStudentDetails: React.FC<StudentDetailsProps> = ({ user, onLogout }) => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const [student, setStudent] = useState<StudentDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', major: 'CS', year: 1, semester: 1, section: '', status: 'Active', total_credits: 0 });
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [saving, setSaving] = useState(false);

  const sid = student?.user_id || student?.id || studentId || '';

  const fetchStudent = async () => {
    if (!studentId) return;
    try {
      const res = await fetch(`${API_BASE}/admin/students/${encodeURIComponent(studentId)}`, { credentials: 'include' });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.detail || data?.message || `Request failed (${res.status})`);
      if (!data.avatar) {
        data.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'Student')}&background=0D8ABC&color=fff`;
      }
      setStudent(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load student');
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        if (!studentId) throw new Error('Missing studentId');
        await fetchStudent();
      } catch (e: any) {
        if (alive) setError(e?.message || 'Failed to load student');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [studentId]);

  const currentCredits = useMemo(() => {
    if (!student?.enrollments) return 0;
    return student.enrollments.reduce((acc, curr) => acc + (curr.credits || 0), 0);
  }, [student]);

  const handleEditProfile = () => {
    if (!student) return;
    setEditForm({
      name: student.name,
      email: student.email,
      major: (student as any).major || 'CS',
      year: typeof student.year === 'number' ? student.year : 1,
      semester: (student as any).semester ?? 1,
      section: (student as any).section ?? '',
      status: student.status,
      total_credits: student.creditsEarned ?? 0,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!sid) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/students/${encodeURIComponent(sid)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          major: editForm.major,
          year: editForm.year,
          semester: editForm.semester,
          section: editForm.section || null,
          status: editForm.status,
          total_credits: editForm.total_credits,
        }),
        credentials: 'include',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.detail || `Update failed (${res.status})`);
      }
      setMessage({ type: 'success', text: 'Profile updated' });
      setShowEditModal(false);
      fetchStudent();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Update failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmail = () => {
    if (student?.email) window.location.href = `mailto:${student.email}`;
  };

  const handleOpenAddCourse = async () => {
    setShowAddCourseModal(true);
    try {
      const res = await fetch(`${API_BASE}/admin/courses`, { credentials: 'include' });
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.items || data?.courses || []);
      setCourses(list.map((c: any) => ({
        course_code: c.course_code || c._id || c.code || '',
        title: c.title || c.name || c.course_code || '',
        credits: c.credits ?? 0,
      })).filter((c: CourseOption) => c.course_code));
      setSelectedCourse('');
    } catch {
      setCourses([]);
    }
  };

  const handleAddCourse = async () => {
    if (!selectedCourse || !sid) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: sid, course_id: selectedCourse }),
        credentials: 'include',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.detail || `Enrollment failed (${res.status})`);
      }
      setMessage({ type: 'success', text: 'Course added' });
      setShowAddCourseModal(false);
      fetchStudent();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to add course' });
    } finally {
      setSaving(false);
    }
  };

  const handleDrop = async (enrollmentId: string) => {
    if (!confirm('Drop this enrollment?')) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/enrollments/${enrollmentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Dropped' }),
        credentials: 'include',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.detail || `Drop failed (${res.status})`);
      }
      setMessage({ type: 'success', text: 'Enrollment dropped' });
      fetchStudent();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to drop' });
    } finally {
      setSaving(false);
    }
  };

  const displayMajor = student?.major_name || student?.major || '—';
  const displayYear = typeof student?.year === 'number' ? student.year : '—';
  const displaySemester = (student as any)?.semester ?? '—';

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-sans">
        <Sidebar user={user} onLogout={onLogout} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header title="Student Profile & Enrollment" user={user} />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <button onClick={() => navigate(-1)} className="flex items-center text-sm text-gray-500 hover:text-primary mb-6 transition-colors">
              <span className="material-icons-outlined text-sm mr-1">arrow_back</span> Back to Directory
            </button>
            <DetailedCardGridSkeleton count={3} />
          </main>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-sans">
        <Sidebar user={user} onLogout={onLogout} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header title="Student Profile & Enrollment" user={user} />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <button onClick={() => navigate(-1)} className="flex items-center text-sm text-gray-500 hover:text-primary mb-6 transition-colors">
              <span className="material-icons-outlined text-sm mr-1">arrow_back</span> Back to Directory
            </button>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {error || 'Student not found'}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 font-poppins relative">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Header title="Institutional Profile" user={user} />
        <main className="flex-1 overflow-y-auto p-10 lg:p-16 scrollbar-hide animate-in fade-in duration-1000 slide-in-from-bottom-4">
          <button 
            onClick={() => navigate(-1)} 
            className="group inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-teal-600 transition-colors mb-10"
          >
            <span className="material-icons-outlined text-sm transform group-hover:-translate-x-1 transition-transform">west</span>
            Back to Directory
          </button>

          {message && (
            <div className={`mb-10 p-5 rounded-2xl text-xs font-black uppercase tracking-widest border animate-in slide-in-from-top-2 ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/40' 
                : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/40'
            }`}>
              {message.text}
            </div>
          )}

          <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-[40px] border border-slate-100 dark:border-slate-800 p-10 lg:p-12 shadow-sm mb-12 relative overflow-hidden transition-all hover:shadow-md group">
            <div className="absolute top-0 right-0 h-64 w-64 bg-teal-500/[0.02] rounded-bl-full pointer-events-none" />
            <div className="flex flex-col xl:flex-row items-center xl:items-start gap-12 relative z-10">
              <div className="relative group/avatar">
                <img src={student.avatar} alt={student.name} className="w-32 h-32 rounded-[40px] border-4 border-white dark:border-slate-800 shadow-2xl transition-transform duration-500 group-hover/avatar:scale-105" />
                <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-teal-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/40 border-4 border-white dark:border-slate-900">
                  <span className="material-icons-outlined text-sm">verified</span>
                </div>
              </div>
              
              <div className="flex-1 text-center xl:text-left space-y-6">
                <div className="space-y-2">
                  <div className="flex flex-col xl:flex-row xl:items-center gap-4 justify-center xl:justify-start">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">{student.name}</h1>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm mx-auto xl:mx-0 ${
                      student.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400' :
                      student.status === 'Graduated' ? 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400' :
                      student.status === 'Probation' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400' :
                      'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400'
                    }`}>
                      {student.status}
                    </span>
                  </div>
                  <p className="text-lg font-medium text-slate-400 dark:text-slate-500 uppercase tracking-tighter">ID: <span className="font-mono text-slate-900 dark:text-white">{sid}</span> • {displayMajor}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-8 pt-4">
                  <div className="space-y-1">
                    <span className="block text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">Aggregate GPA</span>
                    <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{student.gpa?.toFixed?.(2) ?? student.gpa ?? '0.00'}</span>
                  </div>
                  <div className="space-y-1 border-l border-slate-100 dark:border-slate-800 pl-8">
                    <span className="block text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">Accumulated CU</span>
                    <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{student.creditsEarned ?? 0}</span>
                  </div>
                  <div className="col-span-2 md:col-span-1 space-y-1 border-l border-slate-100 dark:border-slate-800 pl-8">
                    <span className="block text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">Academic Cycle</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{displayYear}{displaySemester !== '—' ? ` / S${String(displaySemester)}` : ''}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 min-w-[200px] w-full xl:w-auto">
                <button 
                  onClick={handleEditProfile} 
                  className="h-14 rounded-2xl bg-slate-900 dark:bg-teal-600 font-black text-[10px] uppercase tracking-[0.2em] text-white shadow-2xl shadow-slate-200 dark:shadow-teal-900/20 transition-all hover:bg-slate-800 dark:hover:bg-teal-700 active:scale-95 flex items-center justify-center gap-3"
                >
                  <span className="material-icons-outlined text-lg">settings</span> Modify Profile
                </button>
                <button 
                  onClick={handleSendEmail} 
                  className="h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 font-black text-[10px] uppercase tracking-[0.2em] text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-sm"
                >
                  <span className="material-icons-outlined text-lg">alternate_email</span> Dispatch Recall
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
            <div className="xl:col-span-8 space-y-10">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm text-teal-600">
                    <span className="material-icons-outlined text-lg">list_alt</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Enrollment Matrix</h2>
                </div>
                <button 
                  onClick={handleOpenAddCourse} 
                  className="px-6 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 text-[10px] font-black uppercase tracking-widest border border-teal-100 dark:border-teal-800 transition-all hover:bg-teal-100 dark:hover:bg-teal-900/40 flex items-center gap-2"
                >
                  <span className="material-icons-outlined text-base">add</span> Provision Node
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 dark:bg-slate-950/50 text-[9px] uppercase font-black tracking-[0.3em] text-slate-400 border-b border-slate-50 dark:border-slate-800">
                      <tr>
                        <th className="px-10 py-6">Curriculum Node</th>
                        <th className="px-10 py-6 text-center">Volume</th>
                        <th className="px-10 py-6">State</th>
                        <th className="px-10 py-6 text-right">Intervention</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                      {(student.enrollments || []).length === 0 ? (
                        <tr><td colSpan={4} className="px-10 py-20 text-center space-y-4">
                          <div className="h-16 w-16 rounded-[24px] bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-200 dark:text-slate-800 mx-auto border border-slate-100 dark:border-slate-800">
                            <span className="material-icons-outlined text-3xl">inbox</span>
                          </div>
                          <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Null Enrollment State</p>
                        </td></tr>
                      ) : (
                        student.enrollments.map((course) => (
                          <tr key={course.id} className="transition-all group hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="px-10 py-8">
                              <div className="min-w-0">
                                <p className="font-mono text-xs font-black text-slate-400 uppercase tracking-tighter group-hover:text-teal-600 transition-colors">{course.code}</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate max-w-[240px] mt-1">{course.name}</p>
                              </div>
                            </td>
                            <td className="px-10 py-8 text-center">
                              <span className="text-xs font-black text-slate-400 tabular-nums">{course.credits.toFixed(1)} CU</span>
                            </td>
                            <td className="px-10 py-8">
                              <span className="inline-flex px-3 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-900/50 text-[9px] font-black uppercase tracking-widest shadow-sm">
                                {course.status}
                              </span>
                            </td>
                            <td className="px-10 py-8 text-right">
                              {['Enrolled', 'Pending'].includes(course.status) && (
                                <button 
                                  onClick={() => handleDrop(course.id)} 
                                  disabled={saving} 
                                  className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-slate-300 hover:text-rose-600 hover:border-rose-500/30 transition-all active:scale-90 flex items-center justify-center mx-auto xl:mr-0 xl:ml-auto"
                                  title="Purge Node"
                                >
                                  <span className="material-icons-outlined text-lg">close</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50/30 dark:bg-slate-950/20">
                      <tr>
                        <td className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aggregate Node Volume</td>
                        <td className="px-10 py-6 text-center">
                          <span className="text-xl font-black text-teal-600 dark:text-teal-400 tabular-nums tracking-tighter">{currentCredits.toFixed(1)}</span>
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <div className="xl:col-span-4 space-y-10">
              <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-10 shadow-sm transition-all hover:shadow-md group">
                <div className="flex items-center gap-4 mb-10">
                  <div className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm text-teal-600">
                    <span className="material-icons-outlined text-lg">track_changes</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Curriculum Audit</h3>
                </div>
                
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-end justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Completion Yield</span>
                      <span className="text-sm font-black text-teal-600 tabular-nums">
                        {student.creditsRequired ? Math.min(100, Math.round((student.creditsEarned / student.creditsRequired) * 100)) : 0}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800 shadow-inner">
                      <div 
                        style={{ width: `${student.creditsRequired ? Math.min(100, (student.creditsEarned / student.creditsRequired) * 100) : 0}%` }} 
                        className="h-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.4)] transition-all duration-1000 ease-out"
                      />
                    </div>
                    <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest text-center">
                      {student.creditsEarned} node units / {student.creditsRequired} required volume
                    </p>
                  </div>

                  <div className="pt-8 border-t border-slate-50 dark:border-slate-800 space-y-6">
                    <div className="flex items-start gap-4">
                      <span className="material-icons-outlined text-slate-200 text-lg">school</span>
                      <div>
                        <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1">Academic Advisor</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{student.advisor || 'System Default'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <span className="material-icons-outlined text-slate-200 text-lg">alternate_email</span>
                      <div>
                        <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1">Dispatch Origin</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate max-w-[200px]">{student.email}</p>
                      </div>
                    </div>
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

      {showEditModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[100] flex items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-xl w-full p-10 lg:p-12 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between mb-10">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Identity Registry</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update institutional record fields</p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="h-12 w-12 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-rose-500 transition-all shadow-sm"
              >
                <span className="material-icons-outlined">close</span>
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nomenclature</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 font-bold text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Recall Dispatch</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 font-bold text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Active Year</label>
                  <select value={editForm.year} onChange={e => setEditForm(f => ({ ...f, year: Number(e.target.value) }))} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 font-bold text-sm outline-none transition-all dark:text-white cursor-pointer">{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Active Period</label>
                  <select value={editForm.semester} onChange={e => setEditForm(f => ({ ...f, semester: Number(e.target.value) }))} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 font-bold text-sm outline-none transition-all dark:text-white cursor-pointer"><option value={1}>Period 01</option><option value={2}>Period 02</option></select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Specialization</label>
                  <input type="text" value={editForm.major} onChange={e => setEditForm(f => ({ ...f, major: e.target.value }))} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 font-bold text-sm outline-none transition-all dark:text-white" placeholder="CS" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Integrity Status</label>
                  <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 font-bold text-sm outline-none transition-all dark:text-white cursor-pointer"><option>Active</option><option>Probation</option><option>Suspended</option><option>Graduated</option></select>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 mt-12">
              <button onClick={() => setShowEditModal(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-all">Cancel Override</button>
              <button onClick={handleSaveEdit} disabled={saving} className="flex-1 h-14 rounded-2xl bg-slate-900 dark:bg-teal-600 font-black text-[10px] uppercase tracking-[0.2em] text-white shadow-xl hover:bg-slate-800 dark:hover:bg-teal-700 transition-all active:scale-95 disabled:opacity-30">Commit Record</button>
            </div>
          </div>
        </div>
      )}

      {showAddCourseModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[100] flex items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-xl w-full p-10 lg:p-12 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between mb-10">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Node Provisioning</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assign new curriculum node to matrix</p>
              </div>
              <button 
                onClick={() => setShowAddCourseModal(false)}
                className="h-12 w-12 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-rose-500 transition-all shadow-sm"
              >
                <span className="material-icons-outlined">close</span>
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Institutional Curriculum</label>
                <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="w-full px-6 py-5 rounded-2xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 font-bold text-sm outline-none transition-all dark:text-white cursor-pointer focus:ring-4 focus:ring-teal-500/10">
                  <option value="">Select Curriculum Node</option>
                  {courses.map(c => <option key={c.course_code} value={c.course_code}>{c.course_code} – {c.title} ({c.credits} CU)</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-12">
              <button onClick={() => setShowAddCourseModal(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-all">Cancel Dispatch</button>
              <button onClick={handleAddCourse} disabled={saving || !selectedCourse} className="flex-1 h-14 rounded-2xl bg-slate-900 dark:bg-teal-600 font-black text-[10px] uppercase tracking-[0.2em] text-white shadow-xl hover:bg-slate-800 dark:hover:bg-teal-700 transition-all active:scale-95 disabled:opacity-30">Authorize Provision</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

};

export default AdminStudentDetails;
