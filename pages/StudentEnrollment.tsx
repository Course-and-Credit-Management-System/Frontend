import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User } from '../types';

interface EnrollmentProps {
  user: User;
  onLogout: () => void;
}

const StudentEnrollment: React.FC<EnrollmentProps> = ({ user, onLogout }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-sans">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Course Enrollment" user={user} />
        <main className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 lg:p-8">
             <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">Course Enrollment</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Select your courses for Fall 2024 semester.</p>
              </div>
              <div className="flex items-center gap-4 bg-surface-light dark:bg-surface-dark px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="text-center">
                  <span className="block text-xs text-gray-500 uppercase font-bold tracking-wider">Credits</span>
                  <span className="text-lg font-bold text-primary">15<span className="text-gray-400 text-sm font-normal">/18</span></span>
                </div>
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
                <div className="text-center">
                  <span className="block text-xs text-gray-500 uppercase font-bold tracking-wider">GPA</span>
                  <span className="text-lg font-bold text-green-500">3.4</span>
                </div>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 mb-8 flex items-start gap-4">
              <div className="bg-red-100 dark:bg-red-800/50 p-2 rounded-full shrink-0">
                <span className="material-icons text-red-600 dark:text-red-400">warning</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-red-800 dark:text-red-300">Action Required: Retake Subjects</h3>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1 mb-3">You have subjects from previous semesters that require retaking before proceeding to major electives.</p>
                <div className="bg-white dark:bg-surface-dark border border-red-100 dark:border-red-900/50 rounded-lg p-3 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded">CST-1020</span>
                    <div>
                      <p className="font-semibold text-sm">Data Structures & Algorithms</p>
                      <p className="text-xs text-gray-500">Prerequisite for 4 major courses</p>
                    </div>
                  </div>
                  <button className="text-sm bg-primary hover:bg-opacity-90 text-white px-3 py-1.5 rounded transition-all shadow-sm">
                    Enroll Now
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
               {[
                 { code: 'CST-3050', title: 'Artificial Intelligence', type: 'Major', credits: 3, desc: 'Intro to search, knowledge representation, planning and NLP.', color: 'blue', status: 'normal' },
                 { code: 'CST-4120', title: 'Machine Learning Ops', type: 'Elective', credits: 4, desc: 'Advanced concepts in deploying ML models. Heavy project load.', color: 'purple', status: 'selected' },
                 { code: 'CST-3010', title: 'Advanced Calculus', type: 'Required', credits: 3, desc: 'Vector calculus, integral theorems and surface integrals.', color: 'orange', status: 'locked', error: 'Missing Prerequisite: CST-2010' },
                 { code: 'CST-3200', title: 'Frontend Architecture', type: 'Elective', credits: 3, desc: 'Modern frontend frameworks, state management and patterns.', color: 'teal', status: 'normal' }
               ].map((course, idx) => (
                 <div key={idx} className={`relative bg-surface-light dark:bg-surface-dark rounded-xl p-5 border transition-all shadow-sm ${
                   course.status === 'selected' ? 'border-2 border-primary ring-1 ring-primary/20 shadow-md' : 
                   course.status === 'locked' ? 'border-gray-200 dark:border-gray-700 opacity-60' : 'border-gray-200 dark:border-gray-700 hover:border-primary'
                 }`}>
                   {course.status === 'selected' && <div className="absolute -top-3 right-4 bg-primary text-white text-xs font-bold px-2 py-1 rounded shadow-sm">Selected</div>}
                   <div className="flex justify-between items-start mb-3">
                     <div className="flex gap-3">
                       <div className={`h-10 w-10 rounded flex items-center justify-center font-bold text-xs uppercase bg-${course.color}-100 text-${course.color}-600`}>{course.code.split('-')[0]}</div>
                       <div>
                         <div className="flex items-center gap-2">
                            <h4 className={`font-bold text-lg ${course.status === 'selected' ? 'text-primary' : ''}`}>{course.title}</h4>
                            <span className="bg-gray-100 dark:bg-gray-800 text-xs px-1.5 py-0.5 rounded font-bold uppercase">{course.type}</span>
                         </div>
                         <p className="text-xs text-gray-500 font-mono">{course.code} • {course.credits} Credits</p>
                       </div>
                     </div>
                     <button className={`h-8 w-8 rounded-full border flex items-center justify-center transition-all ${
                       course.status === 'selected' ? 'bg-red-50 text-red-500 border-red-200' :
                       course.status === 'locked' ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-gray-400 hover:bg-primary hover:text-white'
                     }`}>
                       <span className="material-icons text-sm">{course.status === 'selected' ? 'remove' : course.status === 'locked' ? 'lock' : 'add'}</span>
                     </button>
                   </div>
                   <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">{course.desc}</p>
                   {course.error ? (
                     <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 py-1 px-2 rounded w-fit">
                       <span className="material-icons text-xs">error</span> {course.error}
                     </div>
                   ) : (
                     <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3">
                        <div className="flex items-center gap-1"><span className="material-icons text-xs">schedule</span> Mon/Wed 10:00 AM</div>
                        <div className="flex items-center gap-1 text-green-600 font-medium"><span className="material-icons text-xs">check_circle</span> Prerequisites Met</div>
                     </div>
                   )}
                 </div>
               ))}
            </div>
          </div>

          <aside className="w-96 bg-surface-light dark:bg-surface-dark border-l border-gray-200 dark:border-gray-700 flex flex-col shadow-xl z-20 transition-colors">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-lg mb-1">Enrollment Validation</h3>
              <p className="text-xs text-gray-500 font-medium">Checking requirements in real-time</p>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span>Total Credits</span>
                  <span className="text-red-500 font-bold">19/18 Limit</span>
                </div>
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 w-[105%] rounded-full"></div>
                </div>
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1 font-medium">
                  <span className="material-icons text-xs">error</span> Limit Exceeded by 1 Credit
                </p>
              </div>

              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
                <span className="material-icons text-green-600 dark:text-green-400">check_circle</span>
                <div>
                  <p className="text-sm font-bold text-green-800 dark:text-green-300">Prerequisites Met</p>
                  <p className="text-xs text-green-700 dark:text-green-400 font-medium">All selected courses are valid.</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/20 dark:to-primary/10 border border-primary/20 dark:border-primary/50 rounded-xl p-4 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary">smart_toy</span>
                    <h4 className="font-bold text-primary">Trade-off Assistant</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 font-light leading-relaxed">
                    You've exceeded the credit limit. Based on your major (CS) and academic history, I recommend dropping one of these electives:
                  </p>
                  <div className="bg-white dark:bg-gray-800 border border-primary/20 rounded-lg p-3 mb-3 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-bold">Photography 101</p>
                        <p className="text-xs text-gray-500">Arts Elective • 3 Credits</p>
                      </div>
                      <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">Recommended</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 italic">"Dropping this keeps your workload balanced for the heavy ML course."</p>
                    <button className="mt-2 text-xs w-full py-1.5 bg-primary/10 text-primary rounded font-bold hover:bg-primary/20 transition-all">Drop Course</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button className="w-full py-3 px-4 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg font-bold flex items-center justify-center gap-2 cursor-not-allowed" disabled>
                <span>Finalize Enrollment</span>
                <span className="material-icons text-sm">lock</span>
              </button>
              <p className="text-center text-xs text-red-500 mt-2 font-medium">Resolve credit limit to proceed</p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default StudentEnrollment;