import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User } from '../types';

interface StudentsProps {
  user: User;
  onLogout: () => void;
}

type StudentRow = {
  id: string; // student user_id like "TNT-8801"
  name: string;
  email: string;
  major: string;
  creditsEarned: number;
  creditsTotal: number;
  status: string;
  init: string;
  colorKey: string; // used to pick stable badge colors
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const AdminStudents: React.FC<StudentsProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [majorFilter, setMajorFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(''); // optional; depends on your schema
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rawStudents, setRawStudents] = useState<any[]>([]);

  const handleStudentClick = (studentId: string) => {
    navigate(`/admin/students/${studentId}`);
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE}/api/v1/admin/students`, {
          credentials: 'include',
        });

        const text = await res.text();
        const data = text ? JSON.parse(text) : null;

        if (!res.ok) {
          const msg = data?.detail || data?.message || `Request failed (${res.status})`;
          throw new Error(msg);
        }

        if (!alive) return;

        // Support either { items: [...] } or direct array [...]
        const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        setRawStudents(items);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || 'Failed to load students');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const students: StudentRow[] = useMemo(() => {
    // Stable color palette (Tailwind-safe; no dynamic bg-${color} strings)
    const palette = [
      { key: 'cyan', badgeBg: 'bg-cyan-100', badgeText: 'text-cyan-700', badgeDark: 'dark:bg-cyan-900/20 dark:text-cyan-300' },
      { key: 'purple', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700', badgeDark: 'dark:bg-purple-900/20 dark:text-purple-300' },
      { key: 'emerald', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700', badgeDark: 'dark:bg-emerald-900/20 dark:text-emerald-300' },
      { key: 'amber', badgeBg: 'bg-amber-100', badgeText: 'text-amber-700', badgeDark: 'dark:bg-amber-900/20 dark:text-amber-300' },
      { key: 'rose', badgeBg: 'bg-rose-100', badgeText: 'text-rose-700', badgeDark: 'dark:bg-rose-900/20 dark:text-rose-300' },
      { key: 'blue', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', badgeDark: 'dark:bg-blue-900/20 dark:text-blue-300' },
    ];

    const pickColorKey = (id: string) => {
      let sum = 0;
      for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
      return palette[sum % palette.length].key;
    };

    const initials = (name: string) => {
      const parts = (name || '').trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return '--';
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[1][0]).toUpperCase();
    };

    return (rawStudents || []).map((s) => {
      const id = s.user_id || s.id || s.student_id || s.studentId || '';
      const name = s.name || 'Unknown';
      const email = s.email || '';

      // Try several common shapes (your DB shows student_profile exists)
      const major =
        s.student_profile?.major_name ||
        s.student_profile?.major ||
        s.student_profile?.major_id ||
        s.major ||
        '—';

      // Credits: if backend doesn’t provide yet, show 0/0 (we’ll wire later)
      const creditsEarned =
        Number(s.student_profile?.credits_earned ?? s.creditsEarned ?? s.credits ?? 0) || 0;
      const creditsTotal =
        Number(
          s.student_profile?.credits_required ??
          s.student_profile?.total_credits ??
          s.creditsTotal ??
          s.total ??
          120
        ) || 0;

      const status =
        s.student_profile?.academic_status ||
        s.status ||
        'Active';

      return {
        id,
        name,
        email,
        major: String(major),
        creditsEarned,
        creditsTotal,
        status: String(status),
        init: initials(name),
        colorKey: pickColorKey(String(id || name)),
      };
    });
  }, [rawStudents]);

  const majorOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      if (s.major && s.major !== '—') set.add(s.major);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [students]);

  const yearOptions = useMemo(() => {
    // Only works if backend includes year somewhere (optional)
    const set = new Set<string>();
    for (const s of rawStudents || []) {
      const y =
        s.student_profile?.year ??
        s.year ??
        null;
      if (y !== null && y !== undefined && String(y).trim() !== '') {
        set.add(String(y));
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rawStudents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return students.filter((s) => {
      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q);

      const matchesMajor = !majorFilter || s.major === majorFilter;

      const matchesYear =
        !yearFilter ||
        (() => {
          // if backend year isn’t present, this filter won’t match anything — that’s okay
          const raw = rawStudents.find((x) => (x.user_id || x.id || x.student_id) === s.id);
          const y = raw?.student_profile?.year ?? raw?.year ?? '';
          return String(y) === yearFilter;
        })();

      return matchesQuery && matchesMajor && matchesYear;
    });
  }, [students, query, majorFilter, yearFilter, rawStudents]);

  const colorClasses = (colorKey: string) => {
    switch (colorKey) {
      case 'cyan':
        return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300';
      case 'purple':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300';
      case 'emerald':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300';
      case 'amber':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300';
      case 'rose':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300';
      case 'blue':
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Students Directory" user={user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="mb-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="material-icons-outlined text-gray-400 text-[18px]">search</span>
                </span>
                <input
                  className="w-full rounded-xl border border-border-light bg-surface-light py-2.5 pl-10 pr-4 text-sm font-bold focus:border-primary outline-none dark:border-border-dark dark:bg-surface-dark dark:text-gray-200 transition-all focus:ring-2 focus:ring-primary/20"
                  placeholder="Search students..."
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className="flex gap-2 sm:gap-4">
                <select
                  className="flex-1 sm:flex-none rounded-xl border border-border-light bg-surface-light py-2.5 pl-3 pr-8 text-sm font-bold outline-none dark:border-border-dark dark:bg-surface-dark transition-all focus:ring-2 focus:ring-primary/20"
                  value={majorFilter}
                  onChange={(e) => setMajorFilter(e.target.value)}
                >
                  <option value="">All Majors</option>
                  {majorOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  className="flex-1 sm:flex-none rounded-xl border border-border-light bg-surface-light py-2.5 pl-3 pr-8 text-sm font-bold outline-none dark:border-border-dark dark:bg-surface-dark transition-all focus:ring-2 focus:ring-primary/20"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  <option value="">All Years</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex-1 sm:flex-none flex items-center justify-center rounded-xl border border-primary/30 bg-white px-4 py-2.5 text-sm font-bold text-primary hover:bg-gray-50 dark:bg-surface-dark dark:hover:bg-slate-800 transition-all shadow-sm">
                <span className="material-icons-outlined mr-2 text-[18px]">table_view</span>
                Import
              </button>
              <button className="flex-1 sm:flex-none flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-opacity-90 transition-all shadow-md shadow-primary/20">
                <span className="material-icons-outlined mr-2 text-[18px]">add</span>
                Add Student
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border-light bg-surface-light shadow-sm dark:border-border-dark dark:bg-surface-dark overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-border-light text-[10px] font-extrabold uppercase tracking-widest text-gray-600 dark:bg-slate-900/40 dark:border-border-dark dark:text-gray-400">
                  <tr>
                    <th className="px-4 md:px-6 py-4">Student ID</th>
                    <th className="px-4 md:px-6 py-4">Name</th>
                    <th className="px-4 md:px-6 py-4">Major</th>
                    <th className="hidden sm:table-cell px-4 md:px-6 py-4">Credits</th>
                    <th className="px-4 md:px-6 py-4">Status</th>
                    <th className="px-4 md:px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {loading ? (
                    <tr>
                      <td className="px-6 py-12 text-center text-sm font-bold text-gray-500 dark:text-gray-400" colSpan={6}>
                        <div className="flex flex-col items-center gap-2">
                           <span className="material-icons-outlined animate-spin text-primary">refresh</span>
                           Loading student directory...
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td className="px-6 py-12 text-center text-sm font-bold text-gray-500 dark:text-gray-400" colSpan={6}>
                        No students found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s, i) => (
                      <tr
                        key={`${s.id}-${i}`}
                        onClick={() => handleStudentClick(s.id)}
                        className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                      >
                        <td className="px-4 md:px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">{s.id}</td>

                        <td className="px-4 md:px-6 py-4">
                          <div className="flex items-center">
                            <div
                              className={`h-9 w-9 rounded-xl flex items-center justify-center font-extrabold text-xs mr-3 shrink-0 ${colorClasses(
                                s.colorKey
                              )}`}
                            >
                              {s.init}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 dark:text-white truncate">{s.name}</div>
                              <div className="text-xs text-gray-500 truncate">{s.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 md:px-6 py-4">
                           <div className="font-bold text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{s.major}</div>
                        </td>

                        <td className="hidden sm:table-cell px-4 md:px-6 py-4">
                          <div className="flex items-center gap-1.5 font-bold">
                             <span className="text-gray-900 dark:text-white">{s.creditsEarned}</span>
                             <span className="text-[10px] text-gray-400">/ {s.creditsTotal || '—'}</span>
                          </div>
                        </td>

                        <td className="px-4 md:px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
                              s.status === 'Active' || s.status === 'Current'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>

                        <td className="px-4 md:px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStudentClick(s.id);
                              }}
                              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              <span className="material-icons-outlined text-lg">visibility</span>
                            </button>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="hidden sm:inline-flex rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              <span className="material-icons-outlined text-lg">edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border-light px-6 py-4 gap-4 dark:border-border-dark bg-gray-50/50 dark:bg-slate-900/20">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Showing {filtered.length} of {students.length} students
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button className="flex-1 sm:flex-none rounded-xl border border-border-light bg-white px-4 py-2 text-xs font-bold text-gray-500 disabled:opacity-50 dark:bg-slate-800 dark:border-border-dark" disabled>
                  Prev
                </button>
                <button className="flex-1 sm:flex-none rounded-xl border border-border-light bg-white px-4 py-2 text-xs font-bold text-gray-500 dark:bg-slate-800 dark:border-border-dark" disabled>
                  Next
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminStudents;
