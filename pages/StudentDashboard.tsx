import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User, StudentAlert } from '../types';
import { api } from '../lib/api';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const StudentDashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [alerts, setAlerts] = useState<StudentAlert[]>([]);

  useEffect(() => {
    // Fetch alerts on mount
    api.studentAlerts()
      .then((data) => {
        if (Array.isArray(data)) setAlerts(data);
      })
      .catch((err) => console.error("Failed to fetch alerts", err));
  }, []);

  const handleDismissAlert = async (id: string) => {
    try {
      await api.studentDeleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      console.error("Failed to dismiss alert", err);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins relative">
      {/* Toast Container */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
        {alerts.map((alert) => (
          <div 
            key={alert._id} 
            className="flex items-start gap-3 rounded-lg bg-[#fff4e5] px-5 py-4 shadow-[0_4px_12px_rgba(0,0,0,0.1)] border-l-4 border-[#ffc20e] transition-all animate-in slide-in-from-right duration-300"
          >
            <span className="material-icons-outlined text-[#ffc20e] mt-0.5">warning</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#333333] leading-relaxed">
                {alert.message}
              </p>
              <p className="text-xs text-[#666666] mt-2 opacity-80">
                {new Date(alert.created_at).toLocaleDateString()}
              </p>
            </div>
            <button 
              onClick={() => handleDismissAlert(alert._id)}
              className="text-[#666666] hover:text-[#333333] transition-colors p-1 -mr-2 -mt-2"
            >
              <span className="material-icons-outlined text-sm">close</span>
            </button>
          </div>
        ))}
      </div>

      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={`Welcome back, Alex! 👋`} user={user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-6">
            <div className="min-w-0">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white truncate">Welcome back, Alex! 👋</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">Here's your academic progress overview for today.</p>
            </div>
            <div className="w-full sm:w-auto bg-surface-light dark:bg-surface-dark px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-2 shrink-0">
              <span className="material-icons-round text-primary text-sm">calendar_today</span>
              <span className="text-xs md:text-sm font-bold text-gray-700 dark:text-gray-200">Fall Semester 2024 - Week 8</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
            <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Enrollment Status</p>
                  <h3 className="text-xl md:text-2xl font-bold mt-1 text-green-600 dark:text-green-400">Active</h3>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                  <span className="material-icons-round text-xl">check_circle</span>
                </div>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
              </div>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-2 uppercase">Full-time • 18 Credits</p>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Current GPA</p>
                  <h3 className="text-xl md:text-2xl font-bold mt-1 text-gray-800 dark:text-white">3.85</h3>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-500">
                  <span className="material-icons-round text-xl">analytics</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-green-500 text-xs font-bold mt-2">
                <span className="material-icons-round text-sm">trending_up</span>
                <span>+0.2 from last term</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between group cursor-pointer hover:border-primary transition-all hover:shadow-md sm:col-span-2 lg:col-span-1">
               <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Next Step</p>
                  <h3 className="text-xl font-bold mt-1 text-gray-800 dark:text-white">Major Selection</h3>
                </div>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-500">
                  <span className="material-icons-round text-xl">alt_route</span>
                </div>
              </div>
              <button className="text-xs font-bold text-primary flex items-center gap-1 group-hover:underline uppercase tracking-wide">
                Start Process <span className="material-icons-round text-sm">arrow_forward</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                  <span className="material-icons-round text-primary">auto_graph</span>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white">Degree Progress</h2>
                </div>
                <div className="p-5 md:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="relative flex items-center justify-center">
                      <div className="relative w-32 h-32 md:w-40 md:h-40">
                         <svg className="w-full h-full transform -rotate-90" viewBox="0 0 112 112">
                           <circle className="text-gray-100 dark:text-gray-800" cx="56" cy="56" fill="transparent" r="50" stroke="currentColor" strokeWidth="8" />
                           <circle className="text-primary" cx="56" cy="56" fill="transparent" r="50" stroke="currentColor" strokeDasharray="314" strokeDashoffset="78.5" strokeLinecap="round" strokeWidth="8" />
                         </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-center">
                           <span className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">75%</span>
                           <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Complete</span>
                         </div>
                      </div>
                    </div>
                    <div className="space-y-4 md:space-y-5">
                      {[
                        { label: 'Core Requirements', progress: '24/30', width: '80%', color: 'bg-primary' },
                        { label: 'Major Electives', progress: '12/18', width: '66%', color: 'bg-primary' },
                        { label: 'General Education', progress: '45/45', width: '100%', color: 'bg-green-500' }
                      ].map((item, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs md:text-sm mb-1.5">
                            <span className="font-bold text-gray-600 dark:text-gray-400">{item.label}</span>
                            <span className="font-bold text-gray-900 dark:text-white">{item.progress}</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                            <div className={`${item.color} h-2 rounded-full transition-all duration-500`} style={{ width: item.width }}></div>
                          </div>
                        </div>
                      ))}
                      <button className="w-full mt-2 py-2.5 text-xs font-bold text-primary border border-primary/20 hover:bg-primary/5 rounded-xl transition-colors uppercase tracking-wide">
                        View Degree Audit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col flex-1 min-h-[400px] overflow-hidden">
                <div className="p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="material-icons-round text-primary">history</span>
                    Recent Activity
                  </h3>
                  <a className="text-xs text-primary hover:underline font-bold uppercase tracking-wide" href="#">View All</a>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800 overflow-y-auto max-h-[500px]">
                  {[
                    { title: 'New Grade Posted', sub: 'Calculus II - Midterm Exam', time: '2 hours ago', icon: 'grade', color: 'bg-green-100 text-green-600' },
                    { title: 'Campus Announcement', sub: 'Main Library hours extended to 24/7.', time: 'Yesterday', icon: 'campaign', color: 'bg-teal-100 text-teal-600' },
                    { title: 'Course Registration', sub: 'Priority registration for Spring 2025.', time: '3 days ago', icon: 'event', color: 'bg-purple-100 text-purple-600' },
                    { title: 'Assignment Submitted', sub: 'Machine Learning Lab #4', time: '4 days ago', icon: 'assignment', color: 'bg-orange-100 text-orange-600' }
                  ].map((act, i) => (
                    <div key={i} className="p-4 md:p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex gap-4 items-start">
                      <div className={`${act.color} dark:bg-opacity-20 rounded-xl h-10 w-10 flex items-center justify-center shrink-0`}>
                        <span className="material-icons-round text-xl">{act.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{act.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{act.sub}</p>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-extrabold">{act.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <footer className="mt-12 text-center text-xs text-gray-400 dark:text-gray-600 pb-8">
            © 2024 University Portal System. All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;