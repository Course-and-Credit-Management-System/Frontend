import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User } from '../types';

interface StatusProps {
  user: User;
  onLogout: () => void;
}

const StudentStatus: React.FC<StatusProps> = ({ user, onLogout }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Academic Status" user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Academic Status</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Detailed view of your current standing and degree progress.</p>
            </div>
            <button className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-sm">
              <span className="material-symbols-outlined text-xl">file_download</span>
              Export Full Report
            </button>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-8">
            <div className="flex flex-col md:flex-row">
              <div className="p-8 md:w-1/3 bg-primary/5 dark:bg-primary/10 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700">
                <div className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-lg">verified</span>
                  In Good Standing
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Academic Status</p>
              </div>
              <div className="p-8 flex-1 grid grid-cols-2 md:grid-cols-3 gap-8 text-center md:text-left">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Cumulative GPA</p>
                  <h3 className="text-4xl font-bold text-gray-800 dark:text-white">3.85</h3>
                  <p className="text-xs text-green-500 mt-1 flex items-center justify-center md:justify-start gap-1">
                    <span className="material-symbols-outlined text-sm">trending_up</span> Top 10% of class
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Credits Earned</p>
                  <h3 className="text-4xl font-bold text-gray-800 dark:text-white">81</h3>
                  <p className="text-xs text-gray-500 mt-1">out of 120 required</p>
                </div>
                <div className="col-span-2 md:col-span-1 border-t md:border-t-0 pt-4 md:pt-0">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Expected Graduation</p>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white">May 2025</h3>
                  <p className="text-xs text-primary mt-1 font-medium">3 Semesters Remaining</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <section className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">analytics</span> Degree Progress
                  </h2>
                  <span className="text-sm font-semibold text-primary">Overall: 75%</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  {[
                    { label: 'Core', prog: '80%', color: 'text-primary', stats: '24/30' },
                    { label: 'Electives', prog: '66%', color: 'text-gray-700 dark:text-gray-400', stats: '12/18' },
                    { label: 'General Ed', prog: '100%', color: 'text-green-500', stats: '45/45' }
                  ].map((it, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="relative w-24 h-24 mb-3">
                         <svg className="w-full h-full transform -rotate-90" viewBox="0 0 112 112">
                           <circle className="text-gray-100 dark:text-gray-800" cx="56" cy="56" fill="transparent" r="50" stroke="currentColor" strokeWidth="8" />
                           <circle className={it.color} cx="56" cy="56" fill="transparent" r="50" stroke="currentColor" strokeDasharray="314" strokeDashoffset={314 - (3.14 * parseInt(it.prog))} strokeLinecap="round" strokeWidth="8" />
                         </svg>
                         <div className="absolute inset-0 flex items-center justify-center">
                           <span className="text-lg font-bold text-gray-800 dark:text-white">{it.prog}</span>
                         </div>
                      </div>
                      <h4 className="font-semibold text-sm text-gray-800 dark:text-white">{it.label}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{it.stats} Credits</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-500">warning</span> Academic Alerts
                  </h2>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  <div className="p-5 flex gap-4 bg-orange-50/30 dark:bg-orange-900/10">
                    <div className="bg-orange-100 dark:bg-orange-900/40 rounded-full h-10 w-10 flex items-center justify-center shrink-0 text-orange-600">
                      <span className="material-symbols-outlined">priority_high</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Prerequisite Gap Detected</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">You are planning to enroll in "Advanced AI" next term, but "Machine Learning I" has not been completed.</p>
                      <button className="mt-2 text-xs font-bold text-primary hover:underline">Schedule Advisor Meeting</button>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <section className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-primary">history</span> Major History
                </h3>
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-gray-100 dark:before:bg-gray-800">
                   {[
                     { label: 'Current', title: 'B.S. Software Engineering', date: 'Fall 2022', active: true },
                     { label: 'Transition', title: 'Knowledge Engineering', date: 'Fall 2021 - Spring 2022', active: false },
                     { label: 'Initial', title: 'Undeclared Engineering', date: 'Admitted Fall 2020', active: false }
                   ].map((it, i) => (
                     <div key={i} className="relative flex items-center gap-6">
                       <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ${it.active ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                         <span className="material-symbols-outlined text-lg">{it.active ? 'check' : 'school'}</span>
                       </div>
                       <div>
                         <p className={`text-xs font-bold uppercase ${it.active ? 'text-primary' : 'text-gray-400'}`}>{it.label}</p>
                         <h4 className="text-sm font-bold text-gray-800 dark:text-white">{it.title}</h4>
                         <p className="text-xs text-gray-500">{it.date}</p>
                       </div>
                     </div>
                   ))}
                </div>
              </section>

              <div className="bg-gradient-to-br from-teal-700 to-primary rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="font-bold text-lg mb-2">Need a Change?</h3>
                  <p className="text-teal-100 text-sm mb-6 font-light">If you're considering a change of major or minor, your advisor can help navigate the requirements.</p>
                  <button className="w-full bg-white text-primary text-sm font-bold py-3 rounded-lg hover:bg-gray-50 transition-all shadow-md">
                    Request Consultation
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

export default StudentStatus;
