import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User } from '../types';

interface CoursesProps {
  user: User;
  onLogout: () => void;
}

const StudentCourses: React.FC<CoursesProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const currentCourses = [
    { code: 'CST-4010', name: 'Advanced Algorithms', instructor: 'Dr. Sarah Connor', schedule: 'Mon/Wed 10:00 - 11:30', room: 'Bldg A, 302', credits: 4, type: 'Major' },
    { code: 'CST-4150', name: 'Database Systems', instructor: 'Prof. Alan Grant', schedule: 'Tue/Thu 14:00 - 15:30', room: 'Bldg C, 101', credits: 3, type: 'Major' },
    { code: 'CST-3200', name: 'Software Testing & QA', instructor: 'Dr. Ian Malcolm', schedule: 'Fri 09:00 - 12:00', room: 'Lab 4', credits: 3, type: 'Core' },
    { code: 'CST-1050', name: 'Digital Photography', instructor: 'Ms. Ellie Sattler', schedule: 'Wed 16:00 - 18:00', room: 'Studio B', credits: 2, type: 'Elective' },
    { code: 'CST-2010', name: 'Project Management', instructor: 'Mr. John Hammond', schedule: 'Mon 13:00 - 14:30', room: 'Bldg B, 205', credits: 3, type: 'Elective' }
  ];

  const totalCredits = currentCourses.reduce((acc, curr) => acc + curr.credits, 0);

  const handleCourseClick = (courseCode: string) => {
    navigate(`/student/courses/${courseCode}`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="My Courses" user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Current Schedule</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Fall Semester 2024</p>
            </div>
            <div className="bg-surface-light dark:bg-surface-dark px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-6">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Credits</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-primary">{totalCredits}</span>
                    <span className="text-sm text-gray-500 font-medium">/ 18 Max</span>
                </div>
              </div>
              <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Courses</p>
                <span className="text-2xl font-bold text-gray-800 dark:text-white">{currentCourses.length}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {currentCourses.map((course, index) => (
              <div 
                key={index} 
                onClick={() => handleCourseClick(course.code)}
                className="group bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-all hover:border-primary/50 cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                    course.type === 'Major' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                    course.type === 'Core' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                  }`}>
                    {course.type}
                  </span>
                  <div className="text-right">
                    <span className="block text-lg font-bold text-gray-800 dark:text-white">{course.credits}</span>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">Credits</span>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1 group-hover:text-primary transition-colors">{course.name}</h3>
                <p className="text-sm text-gray-500 font-mono mb-4">{course.code}</p>
                
                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <span className="material-icons-outlined text-gray-400">person</span>
                    {course.instructor}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <span className="material-icons-outlined text-gray-400">location_on</span>
                    {course.room}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="bg-white dark:bg-surface-dark p-3 rounded-full shadow-sm text-primary">
                    <span className="material-icons-outlined">print</span>
                </div>
                <div>
                    <h4 className="font-bold text-gray-800 dark:text-white">Need a copy of your schedule?</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Download a printable PDF version for your records.</p>
                </div>
            </div>
            <button className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg shadow-sm transition-colors whitespace-nowrap">
                Download Schedule
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentCourses;