import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User, Course } from '../types';

interface CoursesProps {
  user: User;
  onLogout: () => void;
}

const AdminCourses: React.FC<CoursesProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  // Extended course interface for mock data to include the number badge value (capacity/section)
  const courses = [
    { id: '1', code: 'CST-1010', name: 'Introduction to Computer Science', department: 'Computer Science', credits: 4.0, type: 'Core', count: 10 },
    { id: '2', code: 'CST-2020', name: 'Calculus II', department: 'Mathematics', credits: 3.0, type: 'Prerequisite', count: 20 },
    { id: '3', code: 'CST-3050', name: 'Thermodynamics', department: 'Engineering', credits: 3.0, type: 'Core', count: 30 },
    { id: '4', code: 'CST-1010', name: 'General Biology', department: 'Biology', credits: 4.0, type: 'Elective', count: 10 },
    { id: '5', code: 'CST-4500', name: 'Artificial Intelligence', department: 'Computer Science', credits: 3.0, type: 'Elective', count: 45 },
    { id: '6', code: 'CST-1010', name: 'General Physics', department: 'Physics', credits: 4.0, type: 'Prerequisite', count: 15 },
    { id: '7', code: 'CST-2200', name: 'World History', department: 'Humanities', credits: 3.0, type: 'Elective', count: 25 },
  ];

  const handleCourseClick = (courseCode: string) => {
    navigate(`/admin/courses/${courseCode}`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Courses Management" user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Toolbar */}
          <div className="flex flex-col xl:flex-row items-center justify-between gap-4 mb-6 bg-white dark:bg-surface-dark p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full">
               <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="material-icons-outlined text-gray-400">search</span>
                </span>
                <input 
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200" 
                  placeholder="Search courses..." 
                  type="text"
                />
              </div>
              <select className="w-full sm:w-48 rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-slate-800 dark:text-gray-300">
                  <option value="">All Departments</option>
                  <option value="cs">Computer Science</option>
                  <option value="math">Mathematics</option>
              </select>
              <select className="w-full sm:w-40 rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-slate-800 dark:text-gray-300">
                  <option value="">All Types</option>
                  <option value="core">Core</option>
                  <option value="elective">Elective</option>
              </select>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg border border-primary bg-white px-4 py-2.5 text-sm font-medium text-primary hover:bg-gray-50 dark:bg-transparent dark:hover:bg-slate-800 transition-colors">
                <span className="material-icons-outlined text-lg">description</span>
                Import from Excel
              </button>
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover shadow-sm transition-colors">
                <span className="material-icons-outlined text-lg">add</span>
                Add New Course
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl bg-surface-light shadow-sm dark:bg-surface-dark overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">Course ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">Course Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">Department</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">Credits</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {courses.map((course) => (
                    <tr 
                      key={course.id} 
                      onClick={() => handleCourseClick(course.code)}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{course.code}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                            {course.count}
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">{course.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{course.department}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{course.credits.toFixed(1)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          course.type === 'Core' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300' :
                          course.type === 'Prerequisite' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' :
                          'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                        }`}>
                          {course.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                            <button onClick={(e) => e.stopPropagation()} className="p-1 text-gray-400 hover:text-primary transition-colors">
                            <span className="material-icons-outlined text-lg">edit</span>
                            </button>
                            <button onClick={(e) => e.stopPropagation()} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                            <span className="material-icons-outlined text-lg">delete</span>
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination Placeholder if needed */}
            <div className="flex items-center justify-between border-t border-gray-100 bg-white px-6 py-3 dark:border-gray-700 dark:bg-surface-dark">
               <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-400">
                    Showing <span className="font-medium">1</span> to <span className="font-medium">7</span> of <span className="font-medium">45</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                    <button className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 dark:ring-gray-700">
                      <span className="material-icons-outlined text-sm">chevron_left</span>
                    </button>
                    <button className="relative z-10 inline-flex items-center bg-primary px-4 py-2 text-sm font-semibold text-white">1</button>
                    <button className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-200 dark:text-gray-200 dark:ring-gray-700">2</button>
                    <button className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 dark:ring-gray-700">
                      <span className="material-icons-outlined text-sm">chevron_right</span>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminCourses;