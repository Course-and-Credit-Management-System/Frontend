import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User } from '../types';

interface StudentsProps {
  user: User;
  onLogout: () => void;
}

interface Student {
  id: string;
  user_id: string;
  name: string;
  email: string;
  major: string;
  year: number;
  semester: number;
  section: string | null;
  status: string;
  total_credits: number;
  required_credits: number;
}

interface StudentFormData {
  user_id: string;
  name: string;
  email: string;
  major: string;
  year: number;
  semester: number;
  section: string;
  status: string;
  total_credits: number;
}

// Use relative /api/v1 when proxied (avoids CORS). Fallback to explicit URL for direct backend.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim()
  ? ((import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "")) + "/api/v1"
  : "/api/v1";


const AdminStudents: React.FC<StudentsProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for students data
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [semester, setSemester] = useState<number | ''>('');
  const [sectionFilter, setSectionFilter] = useState<string>('');
  const [major, setMajor] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<StudentFormData>({
    user_id: '',
    name: '',
    email: '',
    major: 'CS',
    year: 1,
    semester: 1,
    section: 'A',
    status: 'Active',
    total_credits: 0,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Major options based on year (like AdminGrading)
  const selectedYear = typeof year === 'number' ? year : 0;
  const showSection = selectedYear >= 1 && selectedYear <= 3;
  const showMajorFilter = selectedYear >= 3 && selectedYear <= 5;
  const majorOptions = selectedYear === 3 
    ? ['CS', 'CT'] 
    : ['SE', 'KE', 'HPC', 'CSec', 'CN', 'BIS', 'ES'];

  // Fetch students
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (year !== '') params.append('year', year.toString());
      if (semester !== '') params.append('semester', semester.toString());
      if (sectionFilter) params.append('section', sectionFilter);
      if (major) params.append('major', major);
      if (statusFilter) params.append('status', statusFilter);
      params.append('skip', ((currentPage - 1) * pageSize).toString());
      params.append('limit', pageSize.toString());

      const res = await fetch(`${API_BASE}/admin/students?${params}`, { credentials: 'include' });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data)) {
        setStudents(data);
      } else {
        const d = data?.detail;
        const errText = Array.isArray(d) ? d.map((x: { msg?: string }) => x?.msg || JSON.stringify(x)).join('; ') : (d ? String(d) : 'Failed to load students');
        setMessage({ type: 'error', text: errText });
        setStudents([]);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
      setMessage({ type: 'error', text: 'Failed to load students. Check if the backend is running and CORS is configured.' });
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, searchQuery ? 500 : 0);
    return () => clearTimeout(timer);
  }, [searchQuery, year, semester, sectionFilter, major, statusFilter, currentPage]);

  // Handle import Excel
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/admin/students/import-excel`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        let msg = `Import completed! Inserted: ${data.inserted}, Skipped (already exist): ${data.skipped ?? data.updated ?? 0}`;
        if (data.error_details?.length) {
          msg += `. Errors (${data.error_details.length}): ${data.error_details.slice(0, 3).join('; ')}`;
        }
        setMessage({ 
          type: data.inserted > 0 || data.updated > 0 ? 'success' : 'error', 
          text: msg
        });
        if (data.inserted > 0 || data.updated > 0) fetchStudents();
      } else {
        const errDetail = data.detail || data.message || (res.status ? `HTTP ${res.status}` : 'Unknown error');
        const errText = Array.isArray(errDetail) ? errDetail.join('; ') : String(errDetail);
        setMessage({ type: 'error', text: `Import failed: ${errText}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Import failed: ${err instanceof Error ? err.message : 'Network error'}` });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle add student
  const handleAddStudent = async () => {
    if (!formData.user_id || !formData.name || !formData.email) {
      setMessage({ type: 'error', text: 'Student ID, Name, and Email are required' });
      return;
    }

    try {
      const payload = {
        ...formData,
        section: (formData.year >= 1 && formData.year <= 3 && formData.section) ? formData.section : null,
      };

      const res = await fetch(`${API_BASE}/admin/students/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const errData = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: 'success', text: 'Student added successfully' });
        setShowAddModal(false);
        resetForm();
        fetchStudents();
      } else {
        const detail = errData?.detail ?? (res.status === 405 ? 'Method not allowed' : res.status === 422 ? 'Invalid data – check all required fields' : `Server error (${res.status})`);
        const msg = Array.isArray(detail) ? detail.map((x: { msg?: string }) => x?.msg ?? JSON.stringify(x)).join('; ') : String(detail);
        setMessage({ type: 'error', text: `Failed to add student: ${msg}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to add student: ${err instanceof Error ? err.message : 'Network error'}` });
    }
  };

  // Handle edit student
  const handleEditStudent = async () => {
    if (!editingStudent) return;

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        major: formData.major,
        year: formData.year,
        semester: formData.semester,
        section: (formData.year >= 1 && formData.year <= 3 && formData.section) ? formData.section : null,
        status: formData.status,
        total_credits: formData.total_credits,
      };

      const res = await fetch(`${API_BASE}/admin/students/${encodeURIComponent(editingStudent.user_id)}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const errData = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: 'success', text: 'Student updated successfully' });
        setEditingStudent(null);
        resetForm();
        fetchStudents();
      } else {
        const detail = errData?.detail ?? (res.status ? `HTTP ${res.status}` : 'Unknown error');
        const msg = Array.isArray(detail) ? detail.map((x: { msg?: string }) => x?.msg ?? JSON.stringify(x)).join('; ') : String(detail);
        setMessage({ type: 'error', text: `Failed to update: ${msg}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to update: ${err instanceof Error ? err.message : 'Network error'}` });
    }
  };

  // Handle delete student
  const handleDeleteStudent = async (student: Student) => {
    if (!confirm(`Are you sure you want to delete ${student.name} (${student.user_id})?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/students/${encodeURIComponent(student.user_id)}/delete`, {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Student deleted successfully' });
        fetchStudents();
      } else {
        const errData = await res.json().catch(() => ({}));
        const detail = errData?.detail ?? (res.status ? `HTTP ${res.status}` : 'Unknown error');
        const errText = Array.isArray(detail) ? detail.map((x: { msg?: string }) => x?.msg ?? JSON.stringify(x)).join('; ') : String(detail);
        setMessage({ type: 'error', text: `Failed to delete: ${errText}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to delete: ${err instanceof Error ? err.message : 'Network error'}` });
    }
  };

  // Open edit modal
  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      user_id: student.user_id,
      name: student.name,
      email: student.email,
      major: student.major,
      year: student.year,
      semester: student.semester,
      section: student.section ?? '',
      status: student.status,
      total_credits: student.total_credits,
    });
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      user_id: '',
      name: '',
      email: '',
      major: 'CS',
      year: 1,
      semester: 1,
      section: 'A',
      status: 'Active',
      total_credits: 0,
    });
  };

  // Get initials
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get avatar color based on name
  const getAvatarColor = (name: string) => {
    const colors = ['bg-cyan-100 text-cyan-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-pink-100 text-pink-700', 'bg-indigo-100 text-indigo-700', 'bg-teal-100 text-teal-700'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const handleStudentClick = (studentId: string) => {
    navigate(`/admin/students/${studentId}`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Students Directory" user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Filters Row */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="material-icons-outlined text-gray-400">search</span>
                </span>
                <input 
                  className="w-full md:w-64 rounded-lg border border-border-light bg-surface-light py-2 pl-10 pr-4 text-sm focus:border-primary outline-none dark:border-border-dark dark:bg-surface-dark dark:text-gray-200" 
                  placeholder="Search by name, ID..." 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Year Filter */}
              <select 
                value={year}
                onChange={(e) => {
                  const newYear = e.target.value ? Number(e.target.value) : '';
                  setYear(newYear);
                  // Reset major when year changes
                  if (typeof newYear === 'number') {
                    if (newYear <= 2) {
                      setMajor('');
                    } else if (newYear === 3) {
                      setMajor('CS');
                    } else {
                      setMajor('SE');
                    }
                  } else {
                    setMajor('');
                  }
                }}
                className="rounded-lg border border-border-light bg-surface-light py-2 pl-3 pr-8 text-sm outline-none dark:border-border-dark dark:bg-surface-dark dark:text-gray-200"
              >
                <option value="">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
                <option value="5">5th Year</option>
              </select>

              {/* Semester Filter */}
              <select 
                value={semester}
                onChange={(e) => setSemester(e.target.value ? Number(e.target.value) : '')}
                className="rounded-lg border border-border-light bg-surface-light py-2 pl-3 pr-8 text-sm outline-none dark:border-border-dark dark:bg-surface-dark dark:text-gray-200"
              >
                <option value="">All Semesters</option>
                <option value="1">1st Semester</option>
                <option value="2">2nd Semester</option>
              </select>

              {/* Section Filter (shown for years 1-3) */}
              {showSection && (
                <select 
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="rounded-lg border border-border-light bg-surface-light py-2 pl-3 pr-8 text-sm outline-none dark:border-border-dark dark:bg-surface-dark dark:text-gray-200"
                >
                  <option value="">All Sections</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
              )}

              {/* Major Filter (shown for years 3-5) */}
              {showMajorFilter && (
                <select 
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  className="rounded-lg border border-border-light bg-surface-light py-2 pl-3 pr-8 text-sm outline-none dark:border-border-dark dark:bg-surface-dark dark:text-gray-200"
                >
                  <option value="">All Majors</option>
                  {majorOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}

              {/* Status Filter */}
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-border-light bg-surface-light py-2 pl-3 pr-8 text-sm outline-none dark:border-border-dark dark:bg-surface-dark dark:text-gray-200"
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Probation">Probation</option>
                <option value="Suspended">Suspended</option>
                <option value="Graduated">Graduated</option>
              </select>
            </div>

            {/* Action Buttons */}
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
                className="flex items-center rounded-lg border border-primary bg-surface-light px-4 py-2 text-sm font-medium text-primary hover:bg-gray-50 dark:bg-surface-dark dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <span className="material-icons-outlined mr-2 text-base">table_view</span>
                {importing ? 'Importing...' : 'Import from Excel'}
              </button>
              <button 
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                <span className="material-icons-outlined mr-2 text-base">add</span>
                Add Student
              </button>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message.text}
            </div>
          )}

          {/* Students Table */}
          <div className="rounded-xl bg-surface-light shadow-sm dark:bg-surface-dark overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-slate-800 dark:text-gray-300">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Student ID</th>
                      <th className="px-6 py-4 font-semibold">Name</th>
                      <th className="px-6 py-4 font-semibold">Major</th>
                      <th className="px-6 py-4 font-semibold">Year / Sem</th>
                      <th className="px-6 py-4 font-semibold">Section</th>
                      <th className="px-6 py-4 font-semibold">Total Credits</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                      </tr>
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">No students found</td>
                      </tr>
                    ) : (
                      students.map((s) => (
                        <tr 
                          key={s.id} 
                          onClick={() => handleStudentClick(s.user_id)}
                          className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4 font-mono text-gray-900 dark:text-white">{s.user_id}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs mr-3 ${getAvatarColor(s.name)} dark:bg-opacity-20`}>
                                {getInitials(s.name)}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">{s.name}</div>
                                <div className="text-xs text-gray-500">{s.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">{s.major}</td>
                          <td className="px-6 py-4">
                            <span className="font-medium">Year {s.year}</span>
                            <span className="text-xs text-gray-400 ml-1">/ Sem {s.semester}</span>
                          </td>
                          <td className="px-6 py-4">{s.section ?? '-'}</td>
                          <td className="px-6 py-4">
                            <span className="font-medium">{s.total_credits}</span> 
                            <span className="text-xs text-gray-400">/ {s.required_credits}</span>
                          </td>
                          <td className="px-6 py-4">
                             <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                               s.status === 'Active' ? 'bg-green-100 text-green-800' : 
                               s.status === 'Probation' ? 'bg-yellow-100 text-yellow-800' :
                               s.status === 'Graduated' ? 'bg-blue-100 text-blue-800' :
                               'bg-red-100 text-red-800'
                             } dark:bg-opacity-20`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button 
                                  onClick={(e) => { e.stopPropagation(); handleStudentClick(s.user_id); }}
                                  className="rounded p-1 text-gray-400 hover:text-primary"
                                  title="View"
                              >
                                  <span className="material-icons-outlined text-lg">visibility</span>
                              </button>
                              <button 
                                  onClick={(e) => { e.stopPropagation(); openEditModal(s); }} 
                                  className="rounded p-1 text-gray-400 hover:text-blue-600"
                                  title="Edit"
                              >
                                  <span className="material-icons-outlined text-lg">edit</span>
                              </button>
                              <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteStudent(s); }} 
                                  className="rounded p-1 text-gray-400 hover:text-red-600"
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
             <div className="flex items-center justify-between border-t border-border-light px-6 py-4 dark:border-border-dark">
               <div className="text-sm text-gray-500">
                 Showing {students.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0} to {((currentPage - 1) * pageSize) + students.length} results
               </div>
               <div className="flex gap-2">
                 <button 
                   onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                   className="rounded-lg border border-border-light px-3 py-1 text-sm font-medium text-gray-500 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-800" 
                   disabled={currentPage === 1}
                 >
                   Previous
                 </button>
                 <button 
                   onClick={() => setCurrentPage(p => p + 1)}
                   className="rounded-lg border border-border-light px-3 py-1 text-sm font-medium text-gray-500 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-800"
                   disabled={students.length < pageSize}
                 >
                   Next
                 </button>
               </div>
             </div>
          </div>
        </main>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Add New Student</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Student ID *</label>
                  <input
                    type="text"
                    value={formData.user_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                    placeholder="e.g. TNT-9001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                  placeholder="john.doe@uni.edu"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Year</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData(prev => ({ ...prev, year: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                    <option value={5}>5th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData(prev => ({ ...prev, semester: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                  >
                    <option value={1}>1st Semester</option>
                    <option value={2}>2nd Semester</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Major</label>
                  <select
                    value={formData.major}
                    onChange={(e) => setFormData(prev => ({ ...prev, major: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                  >
                    {formData.year === 3 ? (
                      <>
                        <option value="CS">CS</option>
                        <option value="CT">CT</option>
                      </>
                    ) : (
                      <>
                        <option value="CS">CS</option>
                        <option value="CT">CT</option>
                        <option value="SE">SE</option>
                        <option value="KE">KE</option>
                        <option value="HPC">HPC</option>
                        <option value="CSec">CSec</option>
                        <option value="CN">CN</option>
                        <option value="BIS">BIS</option>
                        <option value="ES">ES</option>
                      </>
                    )}
                  </select>
                </div>
                {formData.year >= 1 && formData.year <= 3 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Section</label>
                    <select
                      value={formData.section}
                      onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                    >
                      <option value="">No Section</option>
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Probation">Probation</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Graduated">Graduated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Total Credits</label>
                  <input
                    type="number"
                    value={formData.total_credits}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_credits: Number(e.target.value) }))}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 p-3 rounded-md">
                <span className="font-medium">Note:</span> Default password will be set to <code className="bg-slate-200 dark:bg-slate-600 px-1 rounded">{formData.user_id || '<StudentID>'}@123</code>
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
                onClick={handleAddStudent}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md transition-colors"
              >
                Add Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Edit Student</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Student ID</label>
                  <input
                    type="text"
                    value={formData.user_id}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-slate-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Year</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData(prev => ({ ...prev, year: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                    <option value={5}>5th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData(prev => ({ ...prev, semester: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                  >
                    <option value={1}>1st Semester</option>
                    <option value={2}>2nd Semester</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Major</label>
                  <select
                    value={formData.major}
                    onChange={(e) => setFormData(prev => ({ ...prev, major: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                  >
                    {formData.year === 3 ? (
                      <>
                        <option value="CS">CS</option>
                        <option value="CT">CT</option>
                      </>
                    ) : (
                      <>
                        <option value="CS">CS</option>
                        <option value="CT">CT</option>
                        <option value="SE">SE</option>
                        <option value="KE">KE</option>
                        <option value="HPC">HPC</option>
                        <option value="CSec">CSec</option>
                        <option value="CN">CN</option>
                        <option value="BIS">BIS</option>
                        <option value="ES">ES</option>
                      </>
                    )}
                  </select>
                </div>
                {formData.year >= 1 && formData.year <= 3 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Section</label>
                    <select
                      value={formData.section}
                      onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                    >
                      <option value="">No Section</option>
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Probation">Probation</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Graduated">Graduated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Total Credits</label>
                  <input
                    type="number"
                    value={formData.total_credits}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_credits: Number(e.target.value) }))}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditStudent}
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

export default AdminStudents;
