import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User } from '../types';

interface GradingProps {
  user: User;
  onLogout: () => void;
}

interface ExamResult {
  student_id: string;
  student_name: string | null;
  course_code: string;
  year: number;
  semester: number;
  section: string | null;
  major: string | null;
  exam_score: number;
  grade: string;
  grade_point: number;
  status: string;
}

interface EditedScore {
  [key: string]: number; // key = `${student_id}-${course_code}-${year}-${semester}`
}

// Use relative /api/v1 when proxied (same as AdminStudents)
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim()
  ? ((import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "")) + "/api/v1"
  : "/api/v1";

const AdminGrading: React.FC<GradingProps> = ({ user, onLogout }) => {
  const [year, setYear] = useState<number | ''>('');
  const [semester, setSemester] = useState<number | ''>('');
  const [section, setSection] = useState<string>('');
  const [major, setMajor] = useState<string>('');
  const [courseCode, setCourseCode] = useState<string>('');
  const [results, setResults] = useState<ExamResult[]>([]);
  const [editedScores, setEditedScores] = useState<EditedScore>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingResult, setEditingResult] = useState<ExamResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for Add/Edit modal
  const [formData, setFormData] = useState({
    student_id: '',
    course_code: '',
    exam_score: 0,
  });

  // Determine if section or major should be shown based on year
  const yearNum = typeof year === 'number' ? year : 0;
  const showSection = yearNum === 0 || (yearNum >= 1 && yearNum <= 3);
  const showMajor = yearNum === 0 || (yearNum >= 3 && yearNum <= 5);
  const majorOptions = yearNum === 3 ? ['CS', 'CT'] : ['SE', 'KE', 'HPC', 'CSec', 'CN', 'BIS', 'ES'];

  // Fetch exam results when filters change (with debounce for courseCode)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults();
    }, courseCode ? 500 : 0); // Debounce only for courseCode typing

    return () => clearTimeout(timer);
  }, [year, semester, section, major, courseCode]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (year !== '') params.append('year', String(year));
      if (semester !== '') params.append('semester', String(semester));
      if (section) params.append('section', section);
      if (major) params.append('major', major);
      if (courseCode) params.append('course_code', courseCode);

      const res = await fetch(`${API_BASE}/admin/exam-results?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setEditedScores({}); // Reset edited scores when fetching new data
      }
    } catch (err) {
      console.error('Failed to fetch results:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/admin/exam-results/import-excel`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Import successful! Inserted: ${data.inserted}, Updated: ${data.updated}${data.errors?.length ? `, Errors: ${data.errors.length}` : ''}` });
        fetchResults();
      } else {
        setMessage({ type: 'error', text: `Import failed: ${data.message}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Import failed: Network error' });
      console.error('Import error:', err);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getResultKey = (r: ExamResult) => `${r.student_id}-${r.course_code}-${r.year}-${r.semester}`;

  const handleScoreChange = (result: ExamResult, newScore: number) => {
    const key = getResultKey(result);
    setEditedScores(prev => ({ ...prev, [key]: newScore }));
  };

  const handleSaveGrades = async () => {
    const edits = Object.entries(editedScores);
    if (edits.length === 0) {
      setMessage({ type: 'error', text: 'No changes to save' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const [key, newScore] of edits) {
        const result = results.find(r => getResultKey(r) === key);
        if (!result) continue;

        const payload = {
          student_id: result.student_id,
          course_code: result.course_code,
          year: result.year,
          semester: result.semester,
          section: result.section,
          major: result.major,
          exam_score: newScore,
        };

        const res = await fetch(`${API_BASE}/admin/exam-results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include',
        });

        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      setMessage({ type: 'success', text: `Saved ${successCount} grade(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}` });
      setEditedScores({});
      fetchResults();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save grades' });
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddResult = async () => {
    if (!formData.student_id || !formData.course_code) {
      setMessage({ type: 'error', text: 'Student ID and Course Code are required' });
      return;
    }
    if (year === '' || semester === '') {
      setMessage({ type: 'error', text: 'Please select a specific Year and Semester to add a result' });
      return;
    }
    if (showSection && !section) {
      setMessage({ type: 'error', text: 'Please select a Section (years 1-3)' });
      return;
    }
    if (showMajor && !major) {
      setMessage({ type: 'error', text: 'Please select a Major (years 3-5)' });
      return;
    }

    try {
      const payload = {
        student_id: formData.student_id,
        course_code: formData.course_code,
        year,
        semester,
        section: showSection && section ? section : null,
        major: showMajor && major ? major : null,
        exam_score: formData.exam_score,
      };

      const res = await fetch(`${API_BASE}/admin/exam-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Result added successfully' });
        setShowAddModal(false);
        setFormData({ student_id: '', course_code: '', exam_score: 0 });
        fetchResults();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: `Failed to add result: ${error.detail || 'Unknown error'}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to add result: Network error' });
    }
  };

  const handleEditResult = async () => {
    if (!editingResult) return;

    try {
      const payload = {
        student_id: editingResult.student_id,
        course_code: editingResult.course_code,
        year: editingResult.year,
        semester: editingResult.semester,
        section: editingResult.section,
        major: editingResult.major,
        exam_score: formData.exam_score,
      };

      const res = await fetch(`${API_BASE}/admin/exam-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Result updated successfully' });
        setEditingResult(null);
        setFormData({ student_id: '', course_code: '', exam_score: 0 });
        fetchResults();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: `Failed to update: ${error.detail || 'Unknown error'}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update result: Network error' });
    }
  };

  const handleDeleteResult = async (result: ExamResult) => {
    if (!confirm(`Are you sure you want to delete the result for ${result.student_id}?`)) {
      return;
    }

    try {
      const params = new URLSearchParams({
        student_id: result.student_id,
        course_code: result.course_code,
      });
      if (result.year != null && result.semester != null) {
        params.append('year', String(result.year));
        params.append('semester', String(result.semester));
      }

      const res = await fetch(`${API_BASE}/admin/exam-results?${params}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const errData = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: 'success', text: 'Result deleted successfully' });
        fetchResults();
      } else {
        const detail = errData?.detail ?? (res.status === 404 ? 'Exam result not found (may already be deleted)' : `HTTP ${res.status}`);
        setMessage({ type: 'error', text: `Failed to delete: ${detail}` });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setMessage({ type: 'error', text: `Failed to delete: ${msg}. Check backend is running and CORS allows DELETE.` });
    }
  };

  const openEditModal = (result: ExamResult) => {
    setEditingResult(result);
    setFormData({
      student_id: result.student_id,
      course_code: result.course_code,
      exam_score: result.exam_score,
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const hasChanges = Object.keys(editedScores).length > 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-sans">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Grading & Results Management" user={user} />
        <main className="flex-1 overflow-y-auto p-6">
           <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              {/* Year Selection */}
              <select
                value={year}
                onChange={(e) => {
                  const val = e.target.value;
                  const newYear = val === '' ? '' : Number(val);
                  setYear(newYear);
                  if (newYear === '') {
                    setSection('');
                    setMajor('');
                  } else if (newYear <= 2) {
                    setMajor('');
                  } else if (newYear === 3) {
                    setMajor('CS');
                  } else {
                    setSection('');
                    setMajor('SE');
                  }
                }}
                className="pl-3 pr-10 py-2 bg-white dark:bg-slate-800 border border-border-light dark:border-border-dark rounded-md text-sm shadow-sm outline-none"
              >
                <option value="">All Years</option>
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
                <option value={5}>5th Year</option>
              </select>

              {/* Semester Selection */}
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value === '' ? '' : Number(e.target.value))}
                className="pl-3 pr-10 py-2 bg-white dark:bg-slate-800 border border-border-light dark:border-border-dark rounded-md text-sm shadow-sm outline-none"
              >
                <option value="">All Semesters</option>
                <option value={1}>1st Semester</option>
                <option value={2}>2nd Semester</option>
              </select>

              {/* Section Selection (years 1-3 or when All Years) */}
              {showSection && (
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="pl-3 pr-10 py-2 bg-white dark:bg-slate-800 border border-border-light dark:border-border-dark rounded-md text-sm shadow-sm outline-none"
                >
                  <option value="">All Sections</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
              )}

              {/* Major Selection (years 3-5 or when All Years) */}
              {showMajor && (
                <select
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  className="pl-3 pr-10 py-2 bg-white dark:bg-slate-800 border border-border-light dark:border-border-dark rounded-md text-sm shadow-sm outline-none"
                >
                  <option value="">All Majors</option>
                  {majorOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}

              {/* Course Code Input */}
              <input
                type="text"
                placeholder="Course Code (optional)"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="pl-3 pr-3 py-2 bg-white dark:bg-slate-800 border border-border-light dark:border-border-dark rounded-md text-sm shadow-sm outline-none w-44"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx"
                onChange={handleImportExcel}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
              >
                <span className="material-icons-outlined text-base">file_upload</span>
                {importing ? 'Importing...' : 'Import Excel'}
              </button>
              <button
                onClick={() => {
                  setFormData({ student_id: '', course_code: '', exam_score: 0 });
                  setShowAddModal(true);
                }}
                disabled={year === '' || semester === ''}
                title={year === '' || semester === '' ? 'Select Year and Semester first' : ''}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-icons-outlined text-base">add</span>
                Add Result
              </button>
              <button
                onClick={handleSaveGrades}
                disabled={saving || !hasChanges}
                className={`flex items-center gap-2 px-4 py-2 text-white rounded-md text-sm font-medium shadow-sm transition-colors disabled:opacity-50 ${
                  hasChanges ? 'bg-primary hover:bg-primary-hover' : 'bg-gray-400'
                }`}
              >
                <span className="material-icons-outlined text-base">save</span>
                {saving ? 'Saving...' : `Save Grades${hasChanges ? ` (${Object.keys(editedScores).length})` : ''}`}
              </button>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`mb-4 p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message.text}
            </div>
          )}

          <div className="bg-[#077d8a]/5 dark:bg-[#077d8a]/20 border border-primary/20 rounded-lg p-3 mb-6 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400 items-center">
            <span className="font-semibold text-primary">Grading Scale:</span>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> 90-100 (A+)</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400"></span> 80-89 (A)</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> &lt; 40 (F)</div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-border-light rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-primary text-white text-sm uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Student ID</th>
                    <th className="px-6 py-4 font-semibold w-64">Full Name</th>
                    <th className="px-6 py-4 font-semibold">Course Code</th>
                    <th className="px-6 py-4 font-semibold text-center w-32">Exam Score (100)</th>
                    <th className="px-6 py-4 font-semibold text-center w-24">Grade</th>
                    <th className="px-6 py-4 font-semibold text-center w-24">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light text-sm text-slate-700 dark:text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading...</td>
                    </tr>
                  ) : results.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500">No exam results found for the selected filters.</td>
                    </tr>
                  ) : (
                    results.map((r, i) => (
                      <tr key={`${r.student_id}-${r.course_code}-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <td className="px-6 py-4 font-mono">{r.student_id}</td>
                        <td className="px-6 py-4 flex items-center gap-3 font-medium">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                            {getInitials(r.student_name)}
                          </div>
                          {r.student_name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4">{r.course_code}</td>
                        <td className="px-6 py-3 text-center">
                          <input 
                            className="w-20 text-center rounded-md border border-gray-300 dark:bg-slate-700 dark:text-white text-sm font-semibold" 
                            type="number" 
                            value={editedScores[getResultKey(r)] ?? r.exam_score}
                            onChange={(e) => handleScoreChange(r, Number(e.target.value))}
                            min={0}
                            max={100}
                          />
                        </td>
                        <td className={`px-6 py-4 text-center font-bold ${r.grade === 'F' ? 'text-red-500' : 'text-green-600'}`}>
                          {r.grade}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            r.status === 'Passed' ? 'bg-green-100 text-green-800' :
                            r.status === 'Probation' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => r.year != null && r.semester != null && openEditModal(r)}
                              disabled={r.year == null || r.semester == null}
                              className={`p-1 transition-colors ${r.year != null && r.semester != null ? 'text-slate-400 hover:text-primary cursor-pointer' : 'text-slate-300 cursor-not-allowed'}`}
                              title={r.year != null && r.semester != null ? 'Edit' : 'Cannot edit: missing year or semester. Delete and re-add if needed.'}
                            >
                              <span className="material-icons-outlined text-lg">edit_note</span>
                            </button>
                            <button
                              onClick={() => handleDeleteResult(r)}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1"
                              title="Delete"
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
          </div>
        </main>
      </div>

      {/* Add Result Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Add Exam Result</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Student ID</label>
                <input
                  type="text"
                  value={formData.student_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                  placeholder="e.g. TNT-1001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Course Code</label>
                <input
                  type="text"
                  value={formData.course_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, course_code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                  placeholder="e.g. CST-1010"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Exam Score (0-100)</label>
                <input
                  type="number"
                  value={formData.exam_score}
                  onChange={(e) => setFormData(prev => ({ ...prev, exam_score: Number(e.target.value) }))}
                  min={0}
                  max={100}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Will be added to: Year {year}, Semester {semester}
                {showSection && `, Section ${section || 'All'}`}
                {showMajor && `, Major ${major || 'All'}`}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddResult}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md transition-colors"
              >
                Add Result
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Result Modal */}
      {editingResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Edit Exam Result</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Student ID</label>
                <input
                  type="text"
                  value={formData.student_id}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-slate-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Course Code</label>
                <input
                  type="text"
                  value={formData.course_code}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-slate-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Exam Score (0-100)</label>
                <input
                  type="number"
                  value={formData.exam_score}
                  onChange={(e) => setFormData(prev => ({ ...prev, exam_score: Number(e.target.value) }))}
                  min={0}
                  max={100}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingResult(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditResult}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGrading;
