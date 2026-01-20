import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User } from '../types';

interface StudentsProps {
  user: User;
  onLogout: () => void;
}

const AdminStudents: React.FC<StudentsProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const students = [
    { id: 'TNT-8801', name: 'John Doe', email: 'john.doe@uni.edu', init: 'JD', major: 'Computer Science', credits: 45, total: 120, status: 'Active', color: 'cyan' },
    { id: 'TNT-8802', name: 'Alice Smith', email: 'alice.smith@uni.edu', init: 'AS', major: 'Mechanical Engineering', credits: 88, total: 130, status: 'Active', color: 'purple' },
    { id: 'TNT-8803', name: 'Michael Johnson', email: 'm.johnson@uni.edu', init: 'MJ', major: 'Business Administration', credits: 15, total: 120, status: 'Probation', color: 'orange' },
    { id: 'TNT-8804', name: 'Sarah Lee', email: 'sarah.lee@uni.edu', init: 'SL', major: 'Psychology', credits: 110, total: 120, status: 'Active', color: 'blue' },
  ];

  const handleStudentClick = (studentId: string) => {
    navigate(`/admin/students/${studentId}`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Students Directory" user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="material-icons-outlined text-gray-400">search</span>
                </span>
                <input className="w-full md:w-64 rounded-lg border border-border-light bg-surface-light py-2 pl-10 pr-4 text-sm focus:border-primary outline-none dark:border-border-dark dark:bg-surface-dark dark:text-gray-200" placeholder="Search by name, ID..." type="text"/>
              </div>
              <div className="flex gap-4">
                <select className="rounded-lg border border-border-light bg-surface-light py-2 pl-3 pr-8 text-sm outline-none dark:border-border-dark dark:bg-surface-dark">
                  <option value="">All Majors</option>
                  <option value="cs">Computer Science</option>
                </select>
                <select className="rounded-lg border border-border-light bg-surface-light py-2 pl-3 pr-8 text-sm outline-none dark:border-border-dark dark:bg-surface-dark">
                  <option value="">All Years</option>
                  <option value="1">Freshman</option>
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
                    {students.map((s, i) => (
                      <tr 
                        key={i} 
                        onClick={() => handleStudentClick(s.id)}
                        className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 font-mono text-gray-900 dark:text-white">{s.id}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs mr-3 bg-${s.color}-100 text-${s.color}-700 dark:bg-opacity-20`}>{s.init}</div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{s.name}</div>
                              <div className="text-xs text-gray-500">{s.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{s.major}</td>
                        <td className="px-6 py-4">
                          <span className="font-medium">{s.credits}</span> <span className="text-xs text-gray-400">/ {s.total}</span>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                             s.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                           } dark:bg-opacity-20`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleStudentClick(s.id); }}
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
                    ))}
                  </tbody>
                </table>
             </div>
             <div className="flex items-center justify-between border-t border-border-light px-6 py-4 dark:border-border-dark">
               <div className="text-sm text-gray-500">Showing 1 to 4 of 128 results</div>
               <div className="flex gap-2">
                 <button className="rounded-lg border border-border-light px-3 py-1 text-sm font-medium text-gray-500 disabled:opacity-50" disabled>Previous</button>
                 <button className="rounded-lg border border-border-light px-3 py-1 text-sm font-medium text-gray-500">Next</button>
               </div>
             </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminStudents;