import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User, EnrollmentRequest } from '../types';
import { api } from '../lib/api';

interface EnrollmentProps {
  user: User;
  onLogout: () => void;
}

const AdminEnrollment: React.FC<EnrollmentProps> = ({ user, onLogout }) => {
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | null }>({ message: '', type: null });

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
        await api.adminUpdateEnrollmentStatus(selectedRequestId, { status: "Withdrawn", reason: rejectReason });
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


  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark relative">
      <Sidebar user={user} onLogout={onLogout} />
      
      {/* Toast Notification */}
      {toast.type && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg px-6 py-4 shadow-lg transition-all animate-in slide-in-from-top-5 ${
            toast.type === 'success' ? 'bg-[#eafaf1] text-[#27ae60] border border-[#27ae60]/20' : 'bg-[#fdecea] text-[#e74c3c] border border-[#e74c3c]/20'
        }`}>
            <span className="material-icons-outlined text-xl">
                {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <p className="font-medium text-sm">{toast.message}</p>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Enrollment Management" user={user} />
        <main className="flex-1 overflow-y-auto p-6 relative">
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
             <div className="group relative overflow-hidden rounded-xl bg-surface-light p-6 shadow-sm transition-all hover:shadow-md dark:bg-surface-dark">
              <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-teal-50 transition-all group-hover:scale-110 dark:bg-teal-900/10"></div>
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Manual Enrollment</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Register a student to a course directly.</p>
                </div>
                <div className="rounded-lg bg-teal-100 p-3 text-primary dark:bg-teal-900/30">
                  <span className="material-icons-outlined">how_to_reg</span>
                </div>
              </div>
              <div className="relative z-10 mt-6">
                <button 
                  onClick={() => window.location.hash = "#/admin/enrollment/manual"}
                  className="inline-flex items-center text-sm font-medium text-primary hover:text-primary-hover"
                >
                  Open Form <span className="material-icons-outlined ml-1 text-sm">arrow_forward</span>
                </button>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-surface-light p-6 shadow-sm transition-all hover:shadow-md dark:bg-surface-dark">
              <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-orange-50 transition-all group-hover:scale-110 dark:bg-orange-900/10"></div>
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Conflict Resolver</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">AI-powered schedule conflict resolution.</p>
                </div>
                <div className="rounded-lg bg-orange-100 p-3 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                  <span className="material-icons-outlined">psychology</span>
                </div>
              </div>
              <div className="relative z-10 mt-6">
                <button className="inline-flex items-center text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400">
                  Review Issues <span className="material-icons-outlined ml-1 text-sm">arrow_forward</span>
                </button>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-surface-light p-6 shadow-sm transition-all hover:shadow-md dark:bg-surface-dark">
              <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-purple-50 transition-all group-hover:scale-110 dark:bg-purple-900/10"></div>
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Enrollment Settings</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Configure periods, limits, and prerequisites.</p>
                </div>
                <div className="rounded-lg bg-purple-100 p-3 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                  <span className="material-icons-outlined">tune</span>
                </div>
              </div>
              <div className="relative z-10 mt-6">
                <button className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400">
                  Configure <span className="material-icons-outlined ml-1 text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="rounded-xl bg-surface-light shadow-sm dark:bg-surface-dark lg:col-span-8 overflow-hidden">
               <div className="flex items-center justify-between border-b border-border-light px-6 py-4 dark:border-border-dark">
                <h3 className="font-semibold text-gray-800 dark:text-white">Recent Enrollment Requests</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSortConfig({ key: 'status', direction: 'asc' })} className="button-secondary text-xs flex items-center gap-1">
                     <span className="material-icons-outlined text-sm">sort</span> Sort by Status
                  </button>
                  <button className="text-sm text-primary hover:underline">View All</button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[500px] border-b border-border-light dark:border-border-dark scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                   <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-slate-800 dark:text-gray-300 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700" onClick={() => handleSort('studentName')}>
                        <div className="flex items-center">Student Name {sortConfig?.key === 'studentName' && <span className="material-icons-outlined text-sm ml-1">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                      </th>
                      <th className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700" onClick={() => handleSort('courseName')}>
                        <div className="flex items-center">Course {sortConfig?.key === 'courseName' && <span className="material-icons-outlined text-sm ml-1">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                      </th>
                      <th className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700" onClick={() => handleSort('status')}>
                        <div className="flex items-center">Status {sortConfig?.key === 'status' && <span className="material-icons-outlined text-sm ml-1">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                      </th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {loading ? (
                      <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
                    ) : error ? (
                      <tr><td colSpan={4} className="px-6 py-4 text-center text-red-500">{error}</td></tr>
                    ) : sortedRequests.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No enrollment requests found.</td></tr>
                    ) : (
                      sortedRequests.map((req, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                         <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          <div className="flex items-center">
                            {req.studentAvatar ? (
                              <img 
                                src={req.studentAvatar} 
                                alt={req.studentName}
                                className="h-8 w-8 rounded-full object-cover mr-3"
                              />
                            ) : (
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs mr-3 ${
                                req.status === 'Enrolled' ? 'bg-blue-100 text-blue-600' :
                                'bg-purple-100 text-purple-600'
                              }`}>{req.studentInitials}</div>
                            )}
                            {req.studentName}
                          </div>
                        </td>
                        <td className="px-6 py-4">{req.courseName}</td>
                        <td className="px-6 py-4">
                           <div className="flex items-center">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              req.status === 'Enrolled' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {req.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {req.status === 'Pending' ? (
                            <div className="flex justify-end space-x-2">
                              <button onClick={() => approveRequest(req.id)} className="text-green-600 hover:text-green-800 dark:text-green-400" title="Approve">
                                <span className="material-icons-outlined text-base">check</span>
                              </button>
                              <button onClick={() => openRejectModal(req.id)} className="text-red-600 hover:text-red-800 dark:text-red-400" title="Reject">
                                <span className="material-icons-outlined text-base">close</span>
                              </button>
                            </div>
                          ) : (
                            <button className="text-gray-400 hover:text-primary dark:hover:text-primary">
                              <span className="material-icons-outlined text-base">more_vert</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-6 lg:col-span-4">
              <div className="rounded-xl bg-surface-light p-6 shadow-sm dark:bg-surface-dark">
                <h3 className="mb-4 font-semibold text-gray-800 dark:text-white">Enrollment Period</h3>
                <div className="mb-6 flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-slate-800">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Fall 2024</div>
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium">Currently Open</div>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input checked readOnly className="peer sr-only" type="checkbox" />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700 dark:border-gray-600"></div>
                  </label>
                </div>
                <div className="relative pt-1">
                   <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-semibold text-primary">Capacity Filled</div>
                    <div className="text-right text-xs font-semibold text-primary">85%</div>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded bg-teal-100 dark:bg-slate-700">
                    <div className="flex flex-col justify-center bg-primary transition-all duration-500" style={{ width: '85%' }}></div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">1,240 / 1,500 Seats Taken</p>
                </div>
              </div>

               <div className="flex-1 rounded-xl bg-surface-light p-6 shadow-sm dark:bg-surface-dark">
                <h3 className="mb-4 font-semibold text-gray-800 dark:text-white">Attention Required</h3>
                <div className="space-y-4">
                   <div className="flex items-start rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
                    <span className="material-icons-outlined mt-0.5 text-red-500">smart_toy</span>
                    <div className="ml-3 w-full">
                      <div className="flex justify-between">
                        <h4 className="text-sm font-medium text-red-800 dark:text-red-300">Schedule Conflicts</h4>
                        <span className="text-xs text-red-500">Now</span>
                      </div>
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">AI detected 3 students with overlapping course times.</p>
                      <div className="mt-2 flex gap-2">
                        <button className="text-xs font-bold text-red-700 hover:text-red-900 dark:text-red-400">View Conflicts</button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start rounded-lg border border-border-light bg-gray-50 p-3 dark:border-border-dark dark:bg-slate-800/50">
                    <span className="material-icons-outlined mt-0.5 text-orange-500">warning</span>
                    <div className="ml-3 w-full">
                      <div className="flex justify-between">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">Prerequisite Waivers</h4>
                        <span className="text-xs text-gray-500">2h ago</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">8 students requesting waivers for prerequisites.</p>
                      <div className="mt-2 flex gap-2">
                        <button className="text-xs font-medium text-primary hover:text-primary-hover">Review Requests</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Reject Modal */}
          {isRejectModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white">Reject Request</h3>
                  <button onClick={() => setIsRejectModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <span className="material-icons-outlined">close</span>
                  </button>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Are you sure you want to reject this enrollment request? Please provide a reason for the student.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Reason for Rejection</label>
                    <textarea 
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Prerequisites not met, Class full..."
                      className="w-full h-24 p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white dark:bg-gray-900 resize-none outline-none transition-all"
                    ></textarea>
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
                   <button 
                     onClick={() => setIsRejectModalOpen(false)}
                     className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={confirmReject}
                     disabled={!rejectReason.trim()}
                     className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-2"
                   >
                     <span>Reject Enrollment</span>
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