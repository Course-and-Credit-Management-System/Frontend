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
        <main className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="material-icons-outlined text-gray-400">search</span>
                </span>
                <input
                  className="w-full md:w-64 rounded-lg border border-border-light bg-surface-light py-2 pl-10 pr-4 text-sm focus:border-primary outline-none dark:border-border-dark dark:bg-surface-dark dark:text-gray-200"
                  placeholder="Search by name, ID..."
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <select
                  className="rounded-lg border border-border-light bg-surface-light py-2 pl-3 pr-8 text-sm outline-none dark:border-border-dark dark:bg-surface-dark"
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
                  className="rounded-lg border border-border-light bg-surface-light py-2 pl-3 pr-8 text-sm outline-none dark:border-border-dark dark:bg-surface-dark"
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

            <div className="flex items-center gap-3">
              <button className="flex items-center rounded-lg border border-primary bg-surface-light px-4 py-2 text-sm font-medium text-primary hover:bg-gray-50 dark:bg-surface-dark dark:hover:bg-slate-800 transition-colors">
                <span className="material-icons-outlined mr-2 text-base">table_view</span>
                Import from Excel
              </button>
              <button className="flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
                <span className="material-icons-outlined mr-2 text-base">add</span>
                Add Student
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-surface-light shadow-sm dark:bg-surface-dark overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-slate-800 dark:text-gray-300">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Student ID</th>
                    <th className="px-6 py-4 font-semibold">Name</th>
                    <th className="px-6 py-4 font-semibold">Major</th>
                    <th className="px-6 py-4 font-semibold">Total Credits</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {loading ? (
                    <tr>
                      <td className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400" colSpan={6}>
                        Loading students...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400" colSpan={6}>
                        No students found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s, i) => (
                      <tr
                        key={`${s.id}-${i}`}
                        onClick={() => handleStudentClick(s.id)}
                        className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 font-mono text-gray-900 dark:text-white">{s.id}</td>

                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs mr-3 ${colorClasses(
                                s.colorKey
                              )}`}
                            >
                              {s.init}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{s.name}</div>
                              <div className="text-xs text-gray-500">{s.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">{s.major}</td>

                        <td className="px-6 py-4">
                          <span className="font-medium">{s.creditsEarned}</span>{' '}
                          <span className="text-xs text-gray-400">
                            / {s.creditsTotal || '—'}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              s.status === 'Active' || s.status === 'Current'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStudentClick(s.id);
                              }}
                              className="rounded p-1 text-gray-400 hover:text-primary"
                            >
                              <span className="material-icons-outlined text-lg">visibility</span>
                            </button>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="rounded p-1 text-gray-400 hover:text-blue-600"
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

            <div className="flex items-center justify-between border-t border-border-light px-6 py-4 dark:border-border-dark">
              <div className="text-sm text-gray-500">
                Showing {filtered.length === 0 ? 0 : 1} to {filtered.length} of {students.length} results
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg border border-border-light px-3 py-1 text-sm font-medium text-gray-500 disabled:opacity-50" disabled>
                  Previous
                </button>
                <button className="rounded-lg border border-border-light px-3 py-1 text-sm font-medium text-gray-500" disabled>
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
