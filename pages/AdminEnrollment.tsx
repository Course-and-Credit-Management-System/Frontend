import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { TableSkeletonRows } from '../components/Skeleton';
import { User, EnrollmentRequest } from '../types';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

interface EnrollmentProps {
  user: User;
  onLogout: () => void;
}

type SemesterKey = 'fall' | 'summer';

const AdminEnrollment: React.FC<EnrollmentProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | null }>({ message: '', type: null });
  const [advanceLoading, setAdvanceLoading] = useState<SemesterKey | null>(null);
  const [advanceDetail, setAdvanceDetail] = useState<string | null>(null);
  const [advanceState, setAdvanceState] = useState<'success' | 'error' | 'info'>('info');
  const [currentSemester, setCurrentSemester] = useState<SemesterKey>(() => {
    const raw = localStorage.getItem("admin_current_semester");
    return raw === "summer" ? "summer" : "fall";
  });

  const [sortConfig, setSortConfig] = useState<{ key: keyof EnrollmentRequest; direction: 'asc' | 'desc' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: null }), 3000);
  };


  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const data: any = await api.adminEnrollments();
      // Map backend data to frontend interface
      const items = Array.isArray(data) ? data : (data.items || []);
      
      const mapped: EnrollmentRequest[] = items.map((item: any) => ({
        id: item._id, // Updated ID mapping
        studentName: item.student_name || 'Unknown Student',
        studentInitials: getInitials(item.student_name || 'Unknown Student'),
        studentAvatar: item.student_avatar,
        courseName: item.course_title || 'Unknown Course',
        status: item.status || 'Pending',
      }));
      setRequests(mapped);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load enrollments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Reject Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const handleSort = (key: keyof EnrollmentRequest) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedRequests = React.useMemo(() => {
    if (!sortConfig) return requests;
    return [...requests].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [requests, sortConfig]);

  const openRejectModal = (id: string) => {
    setSelectedRequestId(id);
    setRejectReason("");
    setIsRejectModalOpen(true);
  };

  const confirmReject = async () => {
    if (selectedRequestId) {
      try {
        await api.adminUpdateEnrollmentStatus(selectedRequestId, { status: "Dropped", reason: rejectReason });
        showToast("Mission Complete", 'success');
        setRequests(prev => prev.filter(r => r.id !== selectedRequestId));
      } catch (err: any) {
        showToast(err.message || "Failed to reject enrollment", 'error');
      } finally {
        setIsRejectModalOpen(false);
      }
    }
  };

  const approveRequest = async (id: string) => {
    try {
      await api.adminUpdateEnrollmentStatus(id, { status: "Enrolled", reason: "" });
      showToast("Mission Complete", 'success');
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Enrolled' } : r));
    } catch (err: any) {
      showToast(err.message || "Failed to approve enrollment", 'error');
    }
  };

  const handleAdvanceSemester = async (targetSemester: SemesterKey) => {
    if (targetSemester === currentSemester) return;

    try {
      setAdvanceLoading(targetSemester);
      setAdvanceDetail(null);
      const res = await api.adminAdvanceSemester();
      const detail = res?.detail || "Semester advanced successfully.";
      const isBlocked = detail.toLowerCase().includes("blocked");
      if (isBlocked) {
        setAdvanceState('error');
        setAdvanceDetail("Can't advance now.");
        showToast("Can't advance now.", 'error');
      } else {
        setAdvanceState('success');
        setCurrentSemester(targetSemester);
        localStorage.setItem("admin_current_semester", targetSemester);
        const targetLabel = targetSemester === 'fall' ? 'Fall (First Sem)' : 'Summer (Second Sem)';
        setAdvanceDetail(`Changed to ${targetLabel}.`);
        showToast("Semester changed successfully.", 'success');
      }
    } catch (err: any) {
      setAdvanceState('error');
      setAdvanceDetail("Can't advance now.");
      showToast("Can't advance now.", 'error');
    } finally {
      setAdvanceLoading(null);
    }
  };


  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 relative">
      <Sidebar user={user} onLogout={onLogout} />
      
      {/* Toast Notification */}
      {toast.type && (
        <div className={`fixed top-8 right-8 z-50 flex items-center gap-4 rounded-2xl px-6 py-4 shadow-xl border transition-all animate-in slide-in-from-right-10 duration-500 ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40' : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40'
        }`}>
            <span className="material-icons-outlined text-xl">
                {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <p className="font-bold text-sm tracking-tight">{toast.message}</p>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Enrollment Management" user={user} />
        <main className="flex-1 overflow-y-auto p-8 animate-in fade-in duration-700 slide-in-from-bottom-4 scrollbar-hide">
          <div className="mb-10 grid grid-cols-1 gap-8 md:grid-cols-3">
             <div className="group relative overflow-hidden rounded-3xl bg-slate-50/50 dark:bg-slate-900/30 p-8 border border-slate-200/60 dark:border-slate-800/60 transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-lg hover:-translate-y-1">
              <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-teal-500/5 transition-all group-hover:scale-150 group-hover:bg-teal-500/10" />
              <div className="relative z-10 flex items-start justify-between mb-8">
                <div className="rounded-2xl bg-teal-100/50 p-4 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 transform group-hover:rotate-12 transition-transform duration-500">
                  <span className="material-icons-outlined text-2xl">how_to_reg</span>
                </div>
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Manual Enrollment</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">Direct student-to-course registration.</p>
                <button 
                  onClick={() => window.location.hash = "#/admin/enrollment/manual"}
                  className="mt-6 inline-flex items-center text-sm font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 group/btn"
                >
                  Launch Form 
                  <span className="material-icons-outlined ml-2 text-sm transform group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl bg-slate-50/50 dark:bg-slate-900/30 p-8 border border-slate-200/60 dark:border-slate-800/60 transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-lg hover:-translate-y-1">
              <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-orange-500/5 transition-all group-hover:scale-150 group-hover:bg-orange-500/10" />
              <div className="relative z-10 flex items-start justify-between mb-8">
                <div className="rounded-2xl bg-orange-100/50 p-4 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 transform group-hover:rotate-12 transition-transform duration-500">
                  <span className="material-icons-outlined text-2xl">psychology</span>
                </div>
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Conflict Resolver</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">AI-driven schedule optimization.</p>
                <button className="mt-6 inline-flex items-center text-sm font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 group/btn">
                  Audit Conflicts 
                  <span className="material-icons-outlined ml-2 text-sm transform group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl bg-slate-50/50 dark:bg-slate-900/30 p-8 border border-slate-200/60 dark:border-slate-800/60 transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-lg hover:-translate-y-1">
              <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-indigo-500/5 transition-all group-hover:scale-150 group-hover:bg-indigo-500/10" />
              <div className="relative z-10 flex items-start justify-between mb-8">
                <div className="rounded-2xl bg-indigo-100/50 p-4 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 transform group-hover:rotate-12 transition-transform duration-500">
                  <span className="material-icons-outlined text-2xl">tune</span>
                </div>
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Enrollment Settings</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">Periods, limits, and prerequisites.</p>
                <button
                  onClick={() => navigate('/admin/enrollment-settings')}
                  className="mt-6 inline-flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 group/btn"
                >
                  Global Config 
                  <span className="material-icons-outlined ml-2 text-sm transform group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-8 overflow-hidden">
               <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-8 py-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Recent Requests</h3>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Live feed of student submissions</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleSort('status')} 
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                     <span className="material-icons-outlined text-sm">sort</span> Sort
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[600px] scrollbar-hide">
                <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50/50 dark:bg-slate-950/50 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-8 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleSort('studentName')}>
                        <div className="flex items-center">Student {sortConfig?.key === 'studentName' && <span className="material-icons-outlined text-xs ml-1">{sortConfig.direction === 'asc' ? 'north' : 'south'}</span>}</div>
                      </th>
                      <th className="px-8 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleSort('courseName')}>
                        <div className="flex items-center">Course {sortConfig?.key === 'courseName' && <span className="material-icons-outlined text-xs ml-1">{sortConfig.direction === 'asc' ? 'north' : 'south'}</span>}</div>
                      </th>
                      <th className="px-8 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleSort('status')}>
                        <div className="flex items-center">Status {sortConfig?.key === 'status' && <span className="material-icons-outlined text-xs ml-1">{sortConfig.direction === 'asc' ? 'north' : 'south'}</span>}</div>
                      </th>
                      <th className="px-8 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {loading ? (
                      <TableSkeletonRows rows={6} cols={4} />
                    ) : error ? (
                      <tr><td colSpan={4} className="px-8 py-12 text-center text-rose-500 font-bold">{error}</td></tr>
                    ) : sortedRequests.length === 0 ? (
                      <tr><td colSpan={4} className="px-8 py-12 text-center text-slate-400 italic">No pending requests found.</td></tr>
                    ) : (
                      sortedRequests.map((req, i) => (
                      <tr key={i} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                         <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            {req.studentAvatar ? (
                              <img 
                                src={req.studentAvatar} 
                                alt={req.studentName}
                                className="h-10 w-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm object-cover"
                              />
                            ) : (
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white dark:border-slate-800 shadow-sm ${
                                req.status === 'Enrolled' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400' :
                                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}>{req.studentInitials}</div>
                            )}
                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">{req.studentName}</div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-slate-600 dark:text-slate-400 font-medium">{req.courseName}</td>
                        <td className="px-8 py-5">
                           <div className="flex items-center">
                            <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                              req.status === 'Enrolled' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' :
                              'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                            }`}>
                              {req.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          {req.status === 'Pending' ? (
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => approveRequest(req.id)} className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 transition-all" title="Approve">
                                <span className="material-icons-outlined text-lg">check</span>
                              </button>
                              <button onClick={() => openRejectModal(req.id)} className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 transition-all" title="Reject">
                                <span className="material-icons-outlined text-lg">close</span>
                              </button>
                            </div>
                          ) : (
                            <button className="p-2 rounded-lg text-slate-300 hover:text-slate-600 dark:hover:text-slate-400 transition-all">
                              <span className="material-icons-outlined text-lg">more_horiz</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-8 lg:col-span-4">
              <div className="rounded-3xl bg-slate-50/50 dark:bg-slate-900/30 p-8 border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Advance Semester</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Switch the institutional active period.
                </p>

                <div className="mt-8 space-y-4">
                  {([
                    { key: 'fall' as SemesterKey, title: 'Fall Semester', subtitle: 'Academic Period 1', icon: 'wb_sunny' },
                    { key: 'summer' as SemesterKey, title: 'Summer Semester', subtitle: 'Academic Period 2', icon: 'dark_mode' },
                  ]).map((item) => {
                    const isActive = currentSemester === item.key;
                    const isLoading = advanceLoading === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleAdvanceSemester(item.key)}
                        disabled={isLoading || isActive || advanceLoading !== null}
                        className={`w-full rounded-2xl border p-5 text-left transition-all relative group ${
                          isActive
                            ? 'border-teal-500 bg-white dark:bg-slate-900 shadow-md'
                            : 'border-slate-200 dark:border-slate-800 bg-transparent hover:border-slate-300 dark:hover:border-slate-700'
                        } disabled:cursor-not-allowed`}
                      >
                        {isActive && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-teal-500" />
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className={`material-icons-outlined ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-600'}`}>
                              {item.icon}
                            </span>
                            <div>
                              <p className={`text-sm font-bold ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{item.title}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.subtitle}</p>
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-widest ${
                            isActive ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                          }`}>
                            {isActive ? 'Active' : isLoading ? '...' : 'Switch'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {advanceDetail && (
                  <div
                    className={`mt-6 rounded-2xl px-5 py-4 text-xs font-bold leading-relaxed animate-in fade-in slide-in-from-top-2 ${
                      advanceState === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40'
                        : advanceState === 'error'
                        ? 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/40'
                    }`}
                  >
                    <span className="mr-2">ℹ️</span> {advanceDetail}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Reject Modal */}
          {isRejectModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
              <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
                <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-2xl text-slate-900 dark:text-white tracking-tight">Decline Request</h3>
                    <p className="text-xs font-medium text-slate-400">Provide administrative feedback</p>
                  </div>
                  <button onClick={() => setIsRejectModalOpen(false)} className="h-10 w-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                    <span className="material-icons-outlined">close</span>
                  </button>
                </div>
                <div className="p-10">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                    Rejecting this enrollment will notify the student immediately. Please specify the reason for this decision below.
                  </p>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Rejection Reason</label>
                    <textarea 
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Prerequisites not met, Course capacity reached..."
                      className="w-full h-32 p-5 text-sm font-medium border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500/50 bg-slate-50 dark:bg-slate-950/50 dark:text-white resize-none outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                    ></textarea>
                  </div>
                </div>
                <div className="px-10 py-8 bg-slate-50/50 dark:bg-slate-950/50 flex justify-end gap-4 border-t border-slate-100 dark:border-slate-800">
                   <button 
                     onClick={() => setIsRejectModalOpen(false)}
                     className="px-6 py-3 text-sm font-bold text-slate-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={confirmReject}
                     disabled={!rejectReason.trim()}
                     className="px-8 py-3 text-sm font-bold text-white bg-slate-900 dark:bg-slate-800 rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg transition-all flex items-center gap-3"
                   >
                     <span>Decline Enrollment</span>
                     <span className="material-icons-outlined text-sm">gavel</span>
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

export default AdminEnrollment;
