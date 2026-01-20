import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User } from '../types';

interface ResultsProps {
  user: User;
  onLogout: () => void;
}

const StudentResults: React.FC<ResultsProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const results = [
    { code: 'CST-3020', title: 'Data Structures & Algorithms', semester: 'Spring 2024', credits: 4.0, grade: 'A', points: 4.00, status: 'Passed' },
    { code: 'CST-3050', title: 'Software Architecture', semester: 'Spring 2024', credits: 3.0, grade: 'A-', points: 3.67, status: 'Passed' },
    { code: 'CST-2010', title: 'Linear Algebra', semester: 'Fall 2023', credits: 3.0, grade: 'B+', points: 3.33, status: 'Passed' },
    { code: 'CST-1020', title: 'Physics for Engineers', semester: 'Fall 2023', credits: 4.0, grade: 'W', points: 0.00, status: 'Withdrawn' },
    { code: 'CST-1010', title: 'Academic Writing', semester: 'Spring 2023', credits: 2.0, grade: 'A', points: 4.00, status: 'Passed' },
  ];

  const handleCourseClick = (courseCode: string) => {
    navigate(`/student/courses/${courseCode}`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Academic Records" user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mb-6 flex justify-between items-end">
            <div>
               <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Academic Records</h2>
               <p className="text-sm text-gray-500 dark:text-gray-400">Bachelor of Science in Software Engineering • Year 3, Semester 2</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                <span className="material-icons-outlined text-gray-500">download</span> Export PDF
            </button>
          </div>

          <div className="bg-gradient-to-r from-teal-700 to-teal-600 rounded-xl p-6 text-white shadow-lg mb-8 relative overflow-hidden">
             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                   <h3 className="text-teal-100 font-medium mb-1">Cumulative Performance</h3>
                   <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold">3.82</span>
                      <span className="text-teal-200">/ 4.00 CGPA</span>
                   </div>
                </div>
                
                <div className="w-px bg-teal-500/50 h-16 hidden md:block"></div>
                
                <div>
                    <h3 className="text-5xl font-bold">3.95</h3>
                    <p className="text-teal-200 mt-1">Current GPA</p>
                </div>

                <div className="w-px bg-teal-500/50 h-16 hidden md:block"></div>

                <div>
                    <p className="text-teal-100 text-xs font-bold uppercase tracking-wider mb-1">Credits Earned</p>
                    <h3 className="text-3xl font-bold">94 / 120</h3>
                </div>
             </div>
             
             <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
             <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-teal-400 opacity-10 rounded-full blur-2xl"></div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                   <h3 className="font-bold text-lg text-gray-800 dark:text-white">Course History</h3>
                   <div className="bg-gray-100 dark:bg-slate-800 rounded-lg p-1 flex text-xs font-medium">
                      <button className="px-3 py-1 bg-white dark:bg-surface-dark shadow-sm rounded-md text-gray-800 dark:text-white">All</button>
                      <button className="px-3 py-1 text-gray-500 dark:text-gray-400 hover:text-gray-700">Completed</button>
                   </div>
                </div>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="material-icons-outlined text-gray-400 text-sm">search</span>
                    </span>
                    <input 
                        type="text" 
                        placeholder="Search course code..." 
                        className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg w-full sm:w-64 bg-gray-50 dark:bg-slate-800 focus:ring-1 focus:ring-primary outline-none"
                    />
                </div>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50 dark:bg-slate-800/50 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold tracking-wider">
                      <tr>
                         <th className="px-6 py-4">Course Code</th>
                         <th className="px-6 py-4">Course Title</th>
                         <th className="px-6 py-4">Semester</th>
                         <th className="px-6 py-4">Credits</th>
                         <th className="px-6 py-4">Grade</th>
                         <th className="px-6 py-4">Points</th>
                         <th className="px-6 py-4 text-right">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {results.map((course, index) => (
                         <tr 
                            key={index} 
                            onClick={() => handleCourseClick(course.code)}
                            className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                         >
                            <td className="px-6 py-4 font-medium text-primary dark:text-teal-400 group-hover:underline">{course.code}</td>
                            <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">{course.title}</td>
                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{course.semester}</td>
                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{course.credits.toFixed(1)}</td>
                            <td className={`px-6 py-4 font-bold ${
                                course.grade === 'W' ? 'text-gray-400' : 
                                course.grade.startsWith('A') ? 'text-green-600' : 'text-green-500'
                            }`}>{course.grade}</td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{course.points.toFixed(2)}</td>
                            <td className="px-6 py-4 text-right">
                               <span className={`inline-flex px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                  course.status === 'Passed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                               }`}>
                                  {course.status}
                               </span>
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

export default StudentResults;