import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User } from '../types';
import { api } from '../lib/api';

interface CoursesProps {
  user: User;
  onLogout: () => void;
}

type CourseRow = {
  id: string;
  course_code: string;
  title: string;
  department: string;
  credits: number;
  type: 'Core' | 'Elective' | 'Prerequisite' | 'Major' | string;
  instructor?: string;
  schedule?: any; // backend stores schedule as array; we’ll display as string
  room?: string;
  description?: string;
  prerequisites?: string[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const AdminCourses: React.FC<CoursesProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const [rawCourses, setRawCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // ✅ Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    course_code: '',
    title: '',
    department: '',
    credits: '',
    type: 'Elective',
    instructor: '',
    schedule: '', // user types string -> backend stores array
    room: '',
    description: '',
    prerequisites: '', // comma separated
  });

  // ✅ Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    department: '',
    credits: '',
    type: 'Elective',
    instructor: '',
    schedule: '',
    room: '',
    description: '',
    prerequisites: '',
  });

  const handleCourseClick = (courseCode: string) => {
    navigate(`/admin/courses/${courseCode}`);
  };

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminCourses();
      setRawCourses(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await fetchCourses();
      } finally {
        if (!alive) return;
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ✅ Map EXACTLY to your DB schema fields
  const courses: CourseRow[] = useMemo(() => {
    return (rawCourses || []).map((c) => {
      const courseCode = String(c.course_code ?? '');
      return {
        id: String(c._id ?? courseCode),
        course_code: courseCode,
        title: String(c.title ?? '—'),
        department: String(c.department ?? '—'),
        credits: Number(c.credits ?? 0) || 0,
        type: String(c.type ?? 'Elective'),
        instructor: c.instructor ? String(c.instructor) : undefined,
        schedule: c.schedule,
        room: c.room ? String(c.room) : undefined,
        description: c.description ? String(c.description) : undefined,
        prerequisites: Array.isArray(c.prerequisites) ? c.prerequisites : undefined,
      };
    });
  }, [rawCourses]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => {
      if (c.department && c.department !== '—') set.add(c.department);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [courses]);

  const types = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => {
      if (c.type) set.add(String(c.type));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [courses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return courses.filter((c) => {
      const matchesSearch =
        !q ||
        c.course_code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.instructor ?? '').toLowerCase().includes(q);

      const matchesDept = !deptFilter || c.department === deptFilter;
      const matchesType = !typeFilter || String(c.type) === typeFilter;

      return matchesSearch && matchesDept && matchesType;
    });
  }, [courses, search, deptFilter, typeFilter]);

  const typeBadgeClass = (t: string) => {
    if (t === 'Core')
      return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300';
    if (t === 'Prerequisite')
      return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300';
    if (t === 'Major')
      return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
    return 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300';
  };

  const scheduleToString = (s: any) => {
    if (!s) return '';
    if (Array.isArray(s)) return s.join(' | ');
    return String(s);
  };

  // ✅ DELETE
  const handleDelete = async (courseCode: string) => {
    const ok = window.confirm(`Delete course "${courseCode}"? This cannot be undone.`);
    if (!ok) return;

    try {
      setMutating(true);
      setError(null);

      const res = await fetch(
        `${API_BASE}/api/v1/admin/courses/${encodeURIComponent(courseCode)}`,
        { method: 'DELETE', credentials: 'include' }
      );

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        const msg = data?.detail || data?.message || `Request failed (${res.status})`;
        throw new Error(msg);
      }

      await fetchCourses();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete course');
    } finally {
      setMutating(false);
    }
  };

  // ✅ CREATE
  const handleCreate = async () => {
    try {
      setMutating(true);
      setError(null);

      const creditsNum = Number(addForm.credits);
      if (!addForm.course_code.trim()) throw new Error('Course code is required');
      if (!addForm.title.trim()) throw new Error('Title is required');
      if (!addForm.department.trim()) throw new Error('Department is required');
      if (!Number.isFinite(creditsNum)) throw new Error('Credits must be a number');

      const payload: any = {
        course_code: addForm.course_code.trim(),
        title: addForm.title.trim(),
        department: addForm.department.trim(),
        credits: creditsNum,
        type: addForm.type,
      };

      if (addForm.instructor.trim()) payload.instructor = addForm.instructor.trim();
      if (addForm.room.trim()) payload.room = addForm.room.trim();
      if (addForm.description.trim()) payload.description = addForm.description.trim();
      if (addForm.schedule.trim()) payload.schedule = addForm.schedule.trim();

      const prereq = addForm.prerequisites
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (prereq.length) payload.prerequisites = prereq;

      await api.adminCreateCourse(payload);

      setShowAdd(false);
      setAddForm({
        course_code: '',
        title: '',
        department: '',
        credits: '',
        type: 'Elective',
        instructor: '',
        schedule: '',
        room: '',
        description: '',
        prerequisites: '',
      });

      await fetchCourses();
    } catch (e: any) {
      setError(e?.message || 'Failed to create course');
    } finally {
      setMutating(false);
    }
  };

  // ✅ OPEN EDIT MODAL (prefill)
  const openEdit = (course: CourseRow) => {
    setEditingCode(course.course_code);

    setEditForm({
      title: course.title ?? '',
      department: course.department ?? '',
      credits: String(course.credits ?? ''),
      type: (course.type as any) ?? 'Elective',
      instructor: course.instructor ?? '',
      schedule: scheduleToString(course.schedule),
      room: course.room ?? '',
      description: course.description ?? '',
      prerequisites: Array.isArray(course.prerequisites) ? course.prerequisites.join(', ') : '',
    });

    setShowEdit(true);
  };

  // ✅ UPDATE (PUT)
  const handleUpdate = async () => {
    try {
      if (!editingCode) throw new Error('Missing course code');
      setMutating(true);
      setError(null);

      const creditsNum = Number(editForm.credits);
      if (!editForm.title.trim()) throw new Error('Title is required');
      if (!editForm.department.trim()) throw new Error('Department is required');
      if (!Number.isFinite(creditsNum)) throw new Error('Credits must be a number');

      const payload: any = {
        title: editForm.title.trim(),
        department: editForm.department.trim(),
        credits: creditsNum,
        type: editForm.type,
      };

      if (editForm.instructor.trim()) payload.instructor = editForm.instructor.trim();
      else payload.instructor = null;

      if (editForm.room.trim()) payload.room = editForm.room.trim();
      else payload.room = null;

      if (editForm.description.trim()) payload.description = editForm.description.trim();
      else payload.description = null;

      // backend accepts string or list; if blank -> empty array
      if (editForm.schedule.trim()) payload.schedule = editForm.schedule.trim();
      else payload.schedule = [];

      const prereq = editForm.prerequisites
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      payload.prerequisites = prereq; // empty list allowed

      await api.adminUpdateCourse(editingCode, payload);

      setShowEdit(false);
      setEditingCode(null);

      await fetchCourses();
    } catch (e: any) {
      setError(e?.message || 'Failed to update course');
    } finally {
      setMutating(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Courses Management" user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-col xl:flex-row items-center justify-between gap-4 mb-6 bg-white dark:bg-surface-dark p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full">
              <div className="relative w-full sm:w-72">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="material-icons-outlined text-gray-400">search</span>
                </span>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200"
                  placeholder="Search by code, title, instructor..."
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="w-full sm:w-56 rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-slate-800 dark:text-gray-300"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                className="w-full sm:w-44 rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-slate-800 dark:text-gray-300"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg border border-primary bg-white px-4 py-2.5 text-sm font-medium text-primary hover:bg-gray-50 dark:bg-transparent dark:hover:bg-slate-800 transition-colors"
                onClick={() => alert('Excel import will be added later')}
                disabled={mutating}
              >
                <span className="material-icons-outlined text-lg">description</span>
                Import from Excel
              </button>
              <button
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover shadow-sm transition-colors"
                onClick={() => setShowAdd(true)}
                disabled={mutating}
              >
                <span className="material-icons-outlined text-lg">add</span>
                Add New Course
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl bg-surface-light shadow-sm dark:bg-surface-dark overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      Course Code
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      Title
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      Department
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      Credits
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      Type
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
                        Loading courses...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
                        No courses found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((course) => (
                      <tr
                        key={course.id}
                        onClick={() => handleCourseClick(course.course_code)}
                        className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                          {course.course_code}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-10 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                              {course.credits}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate">
                                {course.title}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {course.instructor ? `Instructor: ${course.instructor}` : '—'}
                                {course.room ? ` • Room: ${course.room}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{course.department}</td>

                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {Number(course.credits).toFixed(1)}
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${typeBadgeClass(course.type)}`}>
                            {course.type}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(course);
                              }}
                              className="p-1 text-gray-400 hover:text-primary transition-colors"
                              title="Edit"
                              disabled={mutating}
                            >
                              <span className="material-icons-outlined text-lg">edit</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(course.course_code);
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete"
                              disabled={mutating}
                            >
                              <span className="material-icons-outlined text-lg">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 bg-white px-6 py-3 dark:border-gray-700 dark:bg-surface-dark">
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-400">
                    Showing <span className="font-medium">{filtered.length === 0 ? 0 : 1}</span> to{' '}
                    <span className="font-medium">{filtered.length}</span> of <span className="font-medium">{courses.length}</span> results
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ Add Course Modal */}
          {showAdd && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-xl rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-bold text-gray-800 dark:text-white">Add New Course</h3>
                  <button
                    onClick={() => setShowAdd(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    disabled={mutating}
                  >
                    <span className="material-icons-outlined">close</span>
                  </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Course Code</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      value={addForm.course_code}
                      onChange={(e) => setAddForm((p) => ({ ...p, course_code: e.target.value }))}
                      placeholder="e.g. CST-1010"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Credits</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      value={addForm.credits}
                      onChange={(e) => setAddForm((p) => ({ ...p, credits: e.target.value }))}
                      placeholder="e.g. 3"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Title</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      value={addForm.title}
                      onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Course name"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Department</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      value={addForm.department}
                      onChange={(e) => setAddForm((p) => ({ ...p, department: e.target.value }))}
                      placeholder="e.g. Computer Science"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Type</label>
                    <select
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      value={addForm.type}
                      onChange={(e) => setAddForm((p) => ({ ...p, type: e.target.value }))}
                    >
                      <option value="Core">Core</option>
                      <option value="Elective">Elective</option>
                      <option value="Prerequisite">Prerequisite</option>
                      <option value="Major">Major</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Instructor</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      value={addForm.instructor}
                      onChange={(e) => setAddForm((p) => ({ ...p, instructor: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Room</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      value={addForm.room}
                      onChange={(e) => setAddForm((p) => ({ ...p, room: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Schedule</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      value={addForm.schedule}
                      onChange={(e) => setAddForm((p) => ({ ...p, schedule: e.target.value }))}
                      placeholder='e.g. "Mon/Wed 10:00-11:30"'
                    />
                    <p className="mt-1 text-[11px] text-gray-400">Backend stores schedule as an array.</p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Prerequisites (comma separated)</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      value={addForm.prerequisites}
                      onChange={(e) => setAddForm((p) => ({ ...p, prerequisites: e.target.value }))}
                      placeholder="e.g. CST-1010, CST-2010"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Description</label>
                    <textarea
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      rows={3}
                      value={addForm.description}
                      onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => setShowAdd(false)}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                    disabled={mutating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
                    disabled={mutating}
                  >
                    {mutating ? 'Saving...' : 'Create Course'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ✅ Edit Course Modal */}
          {showEdit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-xl rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-bold text-gray-800 dark:text-white">
                    Edit Course {editingCode ? `(${editingCode})` : ''}
                  </h3>
                  <button
                    onClick={() => setShowEdit(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    disabled={mutating}
                  >
                    <span className="material-icons-outlined">close</span>
                  </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Title</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      value={editForm.title}
                      onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Department</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      value={editForm.department}
                      onChange={(e) => setEditForm((p) => ({ ...p, department: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Credits</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      value={editForm.credits}
                      onChange={(e) => setEditForm((p) => ({ ...p, credits: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Type</label>
                    <select
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      value={editForm.type}
                      onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))}
                    >
                      <option value="Core">Core</option>
                      <option value="Elective">Elective</option>
                      <option value="Prerequisite">Prerequisite</option>
                      <option value="Major">Major</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Instructor</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      value={editForm.instructor}
                      onChange={(e) => setEditForm((p) => ({ ...p, instructor: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Room</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      value={editForm.room}
                      onChange={(e) => setEditForm((p) => ({ ...p, room: e.target.value }))}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Schedule</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      value={editForm.schedule}
                      onChange={(e) => setEditForm((p) => ({ ...p, schedule: e.target.value }))}
                    />
                    <p className="mt-1 text-[11px] text-gray-400">Backend stores schedule as an array.</p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Prerequisites (comma separated)</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      value={editForm.prerequisites}
                      onChange={(e) => setEditForm((p) => ({ ...p, prerequisites: e.target.value }))}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Description</label>
                    <textarea
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      rows={3}
                      value={editForm.description}
                      onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => setShowEdit(false)}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                    disabled={mutating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdate}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
                    disabled={mutating}
                  >
                    {mutating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default AdminCourses;
