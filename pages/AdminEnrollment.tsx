import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User, EnrollmentRequest } from '../types';

interface EnrollmentProps {
  user: User;
  onLogout: () => void;
}

const AdminEnrollment: React.FC<EnrollmentProps> = ({ user, onLogout }) => {
  const requests: EnrollmentRequest[] = [
    { id: '1', studentName: 'John Doe', studentInitials: 'JD', courseName: 'Introduction to CS (CST-1010)', status: 'Enrolled', date: 'Nov 02, 2024' },
    { id: '2', studentName: 'Alice Smith', studentInitials: 'AS', courseName: 'Data Structures (CST-3020)', status: 'Conflict', date: 'Nov 02, 2024' },
    { id: '3', studentName: 'Robert Johnson', studentInitials: 'RJ', courseName: 'Advanced Calculus (CST-3010)', status: 'Pending', date: 'Nov 01, 2024' },
    { id: '4', studentName: 'Emily White', studentInitials: 'EW', courseName: 'Physics I (CST-1020)', status: 'Enrolled', date: 'Oct 31, 2024' },
    { id: '5', studentName: 'Michael King', studentInitials: 'MK', courseName: 'History of Art (CST-1050)', status: 'Waitlisted', date: 'Oct 30, 2024' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Enrollment Management" user={user} />
        <main className="flex-1 overflow-y-auto p-6">
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
                <button className="inline-flex items-center text-sm font-medium text-primary hover:text-primary-hover">
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
                  <button className="flex items-center rounded-lg border border-border-light bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-border-dark dark:bg-slate-800 dark:text-gray-300">
                    <span className="material-icons-outlined mr-1 text-sm">filter_list</span> Filter
                  </button>
                  <button className="text-sm text-primary hover:underline">View All</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                   <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-slate-800 dark:text-gray-300">
                    <tr>
                      <th className="px-6 py-3">Student Name</th>
                      <th className="px-6 py-3">Course</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {requests.map((req, i) => (
                      <tr key={i} className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 ${req.status === 'Conflict' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                         <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          <div className="flex items-center">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs mr-3 ${
                              req.status === 'Enrolled' ? 'bg-blue-100 text-blue-600' :
                              req.status === 'Conflict' ? 'bg-pink-100 text-pink-600' :
                              req.status === 'Pending' ? 'bg-purple-100 text-purple-600' :
                              'bg-orange-100 text-orange-600'
                            }`}>{req.studentInitials}</div>
                            {req.studentName}
                          </div>
                        </td>
                        <td className="px-6 py-4">{req.courseName}</td>
                        <td className="px-6 py-4">
                           <div className="flex items-center">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              req.status === 'Enrolled' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              req.status === 'Conflict' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                              req.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {req.status}{req.status === 'Waitlisted' ? ' #3' : ''}
                            </span>
                            {req.status === 'Conflict' && (
                              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400" title="AI Detected Time Conflict">
                                <span className="material-icons-outlined text-sm">smart_toy</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">{req.date}</td>
                        <td className="px-6 py-4 text-right">
                          {req.status === 'Conflict' ? (
                            <button className="text-primary hover:text-primary-hover font-medium text-xs">Resolve</button>
                          ) : req.status === 'Pending' ? (
                            <div className="flex justify-end space-x-2">
                              <button className="text-green-600 hover:text-green-800 dark:text-green-400"><span className="material-icons-outlined text-base">check</span></button>
                              <button className="text-red-600 hover:text-red-800 dark:text-red-400"><span className="material-icons-outlined text-base">close</span></button>
                            </div>
                          ) : (
                            <button className="text-gray-400 hover:text-primary dark:hover:text-primary">
                              <span className="material-icons-outlined text-base">more_vert</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
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
        </main>
      </div>
    </div>
  );
};

export default AdminEnrollment;