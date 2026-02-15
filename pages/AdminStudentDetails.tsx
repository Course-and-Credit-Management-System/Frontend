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
  name: string;
  email: string;
  major: string;
  year: string | number;
  gpa: number;
  advisor: string;
  creditsEarned: number;
  creditsRequired: number;
  status: string;
  avatar: string;
  enrollments: EnrollmentRow[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const AdminStudentDetails: React.FC<StudentDetailsProps> = ({ user, onLogout }) => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const [student, setStudent] = useState<StudentDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!studentId) throw new Error('Missing studentId');

        const res = await fetch(`${API_BASE}/api/v1/admin/students/${encodeURIComponent(studentId)}`, {
          credentials: 'include',
        });

        const text = await res.text();
        const data = text ? JSON.parse(text) : null;

        if (!res.ok) {
          const msg = data?.detail || data?.message || `Request failed (${res.status})`;
          throw new Error(msg);
        }

        // fallback avatar if backend doesn't provide one
        if (!data.avatar) {
          data.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'Student')}&background=0D8ABC&color=fff`;
        }

        if (!alive) return;
        setStudent(data);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || 'Failed to load student');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [studentId]);

  const currentCredits = useMemo(() => {
    if (!student?.enrollments) return 0;
    return student.enrollments.reduce((acc, curr) => acc + (curr.credits || 0), 0);
  }, [student]);

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-sans">
        <Sidebar user={user} onLogout={onLogout} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header title="Student Profile & Enrollment" user={user} />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-sm text-gray-500 hover:text-primary mb-6 transition-colors"
            >
              <span className="material-icons-outlined text-sm mr-1">arrow_back</span>
              Back to Directory
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
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-sm text-gray-500 hover:text-primary mb-6 transition-colors"
            >
              <span className="material-icons-outlined text-sm mr-1">arrow_back</span>
              Back to Directory
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
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-sm text-gray-500 hover:text-primary mb-6 transition-colors"
          >
            <span className="material-icons-outlined text-sm mr-1">arrow_back</span>
            Back to Directory
          </button>

          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <img
                src={student.avatar}
                alt={student.name}
                className="w-24 h-24 rounded-full border-4 border-gray-100 dark:border-gray-700"
              />
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{student.name}</h1>
                  <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide w-fit mx-auto md:mx-0">
                    {student.status}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  ID: {student.id} • {student.major}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                    <span className="block text-xs text-gray-500 uppercase font-bold">GPA</span>
                    <span className="text-lg font-bold text-gray-800 dark:text-white">{student.gpa}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                    <span className="block text-xs text-gray-500 uppercase font-bold">Credits</span>
                    <span className="text-lg font-bold text-gray-800 dark:text-white">{student.creditsEarned}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                    <span className="block text-xs text-gray-500 uppercase font-bold">Year</span>
                    <span className="text-lg font-bold text-gray-800 dark:text-white">
                      {String(student.year)}
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                    <span className="block text-xs text-gray-500 uppercase font-bold">Advisor</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-white truncate" title={student.advisor}>
                      {student.advisor}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 min-w-[150px]">
                <button className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-sm">
                  <span className="material-icons-outlined text-sm">edit</span> Edit Profile
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                  <span className="material-icons-outlined text-sm">email</span> Send Email
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-2/3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Current Enrollment (Fall 2024)</h2>
                <button className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
                  <span className="material-icons-outlined text-sm">add</span> Add Course
                </button>
              </div>

              <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-800 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold">
                    <tr>
                      <th className="px-6 py-3">Course</th>
                      <th className="px-6 py-3">Credits</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(student.enrollments || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
                          No enrollments found.
                        </td>
                      </tr>
                    ) : (
                      student.enrollments.map((course) => (
                        <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-800 dark:text-white">{course.code}</p>
                            <p className="text-gray-500 dark:text-gray-400 text-xs">{course.name}</p>
                          </td>
                          <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{course.credits}</td>
                          <td className="px-6 py-4">
                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-bold uppercase">
                              {course.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded transition-colors text-xs font-bold">
                              Drop
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>

                  <tfoot className="bg-gray-50 dark:bg-slate-800/50">
                    <tr>
                      <td className="px-6 py-3 font-bold text-gray-800 dark:text-white text-right">Total Credits</td>
                      <td className="px-6 py-3 font-bold text-primary">{currentCredits}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="lg:w-1/3 space-y-6">
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4">Degree Progress</h3>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <span className="text-xs font-semibold inline-block text-primary uppercase">Completion</span>
                    <span className="text-xs font-semibold inline-block text-primary">
                      {student.creditsRequired
                        ? Math.round((student.creditsEarned / student.creditsRequired) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary/20">
                    <div
                      style={{
                        width: `${student.creditsRequired ? (student.creditsEarned / student.creditsRequired) * 100 : 0}%`,
                      }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {student.creditsEarned} / {student.creditsRequired} Credits
                  </p>
                </div>
              </div>

              <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4">Advisor Notes</h3>
                <div className="space-y-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 p-3 rounded-lg text-sm">
                    <p className="text-gray-800 dark:text-gray-200 mb-1">
                      "Notes will be wired to backend later."
                    </p>
                    <p className="text-xs text-gray-400">- System</p>
                  </div>
                  <button className="w-full py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors">
                    + Add Note
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminStudentDetails;
