import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
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
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading student...</div>
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
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-sans">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Student Profile & Enrollment" user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <button onClick={() => navigate(-1)} className="flex items-center text-sm text-gray-500 hover:text-primary mb-6 transition-colors">
            <span className="material-icons-outlined text-sm mr-1">arrow_back</span> Back to Directory
          </button>

          {message && (
            <div className={`mb-4 rounded-lg p-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200'}`}>
              {message.text}
            </div>
          )}

          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <img src={student.avatar} alt={student.name} className="w-24 h-24 rounded-full border-4 border-gray-100 dark:border-gray-700" />
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{student.name}</h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase w-fit mx-auto md:mx-0 ${
                    student.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                    student.status === 'Graduated' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' :
                    student.status === 'Probation' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30'
                  }`}>
                    {student.status}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-4">ID: {sid} • {displayMajor}</p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                    <span className="block text-xs text-gray-500 uppercase font-bold">GPA</span>
                    <span className="text-lg font-bold text-gray-800 dark:text-white">{student.gpa?.toFixed?.(1) ?? student.gpa ?? 0}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                    <span className="block text-xs text-gray-500 uppercase font-bold">Credits</span>
                    <span className="text-lg font-bold text-gray-800 dark:text-white">{student.creditsEarned ?? 0}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                    <span className="block text-xs text-gray-500 uppercase font-bold">Year</span>
                    <span className="text-lg font-bold text-gray-800 dark:text-white">{displayYear}{displaySemester !== '—' ? ` / Sem ${String(displaySemester)}` : ''}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 min-w-[150px]">
                <button onClick={handleEditProfile} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-sm">
                  <span className="material-icons-outlined text-sm">edit</span> Edit Profile
                </button>
                <button onClick={handleSendEmail} className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                  <span className="material-icons-outlined text-sm">email</span> Send Email
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-2/3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Current Enrollment</h2>
                <button onClick={handleOpenAddCourse} className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
                  <span className="material-icons-outlined text-sm">add</span> Add Course
                </button>
              </div>

              <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-800 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold">
                    <tr><th className="px-6 py-3">Course</th><th className="px-6 py-3">Credits</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(student.enrollments || []).length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">No enrollments found.</td></tr>
                    ) : (
                      student.enrollments.map((course) => (
                        <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-800 dark:text-white">{course.code}</p>
                            <p className="text-gray-500 dark:text-gray-400 text-xs">{course.name}</p>
                          </td>
                          <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{course.credits}</td>
                          <td className="px-6 py-4">
                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-bold uppercase">{course.status}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {['Enrolled', 'Pending'].includes(course.status) && (
                              <button onClick={() => handleDrop(course.id)} disabled={saving} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded transition-colors text-xs font-bold disabled:opacity-50">
                                Drop
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-slate-800/50">
                    <tr>
                      <td className="px-6 py-3 font-bold text-gray-800 dark:text-white text-right">Total Credits (enrolled)</td>
                      <td className="px-6 py-3 font-bold text-primary">{currentCredits}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="lg:w-1/3">
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4">Degree Progress</h3>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <span className="text-xs font-semibold inline-block text-primary uppercase">Completion</span>
                    <span className="text-xs font-semibold inline-block text-primary">
                      {student.creditsRequired ? Math.min(100, Math.round((student.creditsEarned / student.creditsRequired) * 100)) : 0}%
                    </span>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary/20">
                    <div style={{ width: `${student.creditsRequired ? Math.min(100, (student.creditsEarned / student.creditsRequired) * 100) : 0}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"></div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{student.creditsEarned} / {student.creditsRequired} Credits</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Edit Profile</h3>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Name</label><input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-white" /></div>
              <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-white" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">Year</label><select value={editForm.year} onChange={e => setEditForm(f => ({ ...f, year: Number(e.target.value) }))} className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-white">{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Semester</label><select value={editForm.semester} onChange={e => setEditForm(f => ({ ...f, semester: Number(e.target.value) }))} className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-white"><option value={1}>1</option><option value={2}>2</option></select></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Major</label><input type="text" value={editForm.major} onChange={e => setEditForm(f => ({ ...f, major: e.target.value }))} className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-white" placeholder="CS" /></div>
              <div><label className="block text-sm font-medium mb-1">Section (A/B/C, years 1-3)</label><input type="text" value={editForm.section} onChange={e => setEditForm(f => ({ ...f, section: e.target.value }))} className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-white" placeholder="A or empty" /></div>
              <div><label className="block text-sm font-medium mb-1">Status</label><select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-white"><option>Active</option><option>Probation</option><option>Suspended</option><option>Graduated</option></select></div>
              <div><label className="block text-sm font-medium mb-1">Total Credits Completed</label><input type="number" min={0} value={editForm.total_credits} onChange={e => setEditForm(f => ({ ...f, total_credits: Number(e.target.value) || 0 }))} className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-white" /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}

      {showAddCourseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Add Course</h3>
            <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:text-white mb-4">
              <option value="">Select a course</option>
              {courses.map(c => <option key={c.course_code} value={c.course_code}>{c.course_code} – {c.title} ({c.credits} cr)</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowAddCourseModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">Cancel</button>
              <button onClick={handleAddCourse} disabled={saving || !selectedCourse} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudentDetails;
