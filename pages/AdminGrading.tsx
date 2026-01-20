import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User } from '../types';

interface GradingProps {
  user: User;
  onLogout: () => void;
}

const AdminGrading: React.FC<GradingProps> = ({ user, onLogout }) => {
  const grades = [
    { id: 'TNT-8842', name: 'John Doe', init: 'JD', code: 'CST-1010', score: 92, grade: 'A+', points: 4.0, status: 'Passed' },
    { id: 'TNT-8845', name: 'Alice Smith', init: 'AS', code: 'CST-1010', score: 85, grade: 'A', points: 4.0, status: 'Passed' },
    { id: 'TNT-8888', name: 'Michael Ross', init: 'MR', code: 'CST-1010', score: 72, grade: 'B+', points: 3.3, status: 'Passed' },
    { id: 'TNT-8891', name: 'Jessica Wang', init: 'JW', code: 'CST-1010', score: 58, grade: 'C', points: 2.0, status: 'Probation' },
    { id: 'TNT-8904', name: 'David Kim', init: 'DK', code: 'CST-1010', score: 35, grade: 'F', points: 0.0, status: 'Failed' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-sans">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Grading & Results Management" user={user} />
        <main className="flex-1 overflow-y-auto p-6">
           <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <select className="pl-3 pr-10 py-2 bg-white dark:bg-slate-800 border border-border-light dark:border-border-dark rounded-md text-sm shadow-sm outline-none">
                <option>CST-1010 - Intro to Computer Science</option>
              </select>
              <select className="pl-3 pr-10 py-2 bg-white dark:bg-slate-800 border border-border-light dark:border-border-dark rounded-md text-sm shadow-sm outline-none">
                <option>Section A</option>
              </select>
              <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-border-light rounded-md text-sm font-medium transition-colors">
                <span className="material-icons-outlined text-base">filter_list</span>
                More Filters
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-medium shadow-sm transition-colors">
                <span className="material-icons-outlined text-base">file_upload</span>
                Import Excel
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-medium shadow-sm transition-colors">
                <span className="material-icons-outlined text-base">save</span>
                Save Grades
              </button>
            </div>
          </div>

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
                  {grades.map((g, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <td className="px-6 py-4 font-mono">{g.id}</td>
                      <td className="px-6 py-4 flex items-center gap-3 font-medium">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">{g.init}</div>
                        {g.name}
                      </td>
                      <td className="px-6 py-4">{g.code}</td>
                      <td className="px-6 py-3 text-center">
                        <input className="w-20 text-center rounded-md border-gray-300 dark:bg-slate-700 dark:text-white text-sm font-semibold" type="number" defaultValue={g.score} />
                      </td>
                      <td className={`px-6 py-4 text-center font-bold ${g.grade === 'F' ? 'text-red-500' : 'text-green-600'}`}>{g.grade}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          g.status === 'Passed' ? 'bg-green-100 text-green-800' :
                          g.status === 'Probation' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>{g.status}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-primary transition-colors p-1"><span className="material-icons-outlined text-lg">edit_note</span></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminGrading;