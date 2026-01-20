import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User } from '../types';

interface CourseDetailsProps {
  user: User;
  onLogout: () => void;
}

const CourseDetails: React.FC<CourseDetailsProps> = ({ user, onLogout }) => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  // Mock data lookup
  const course = {
    code: courseId || 'CST-4010',
    title: 'Advanced Algorithms',
    instructor: 'Dr. Sarah Connor',
    email: 's.connor@uni.edu',
    credits: 4,
    schedule: 'Mon/Wed 10:00 - 11:30',
    room: 'Bldg A, 302',
    description: 'This course covers advanced data structures and algorithms, including graph theory, dynamic programming, and NP-completeness. Students will learn to analyze algorithm complexity and design efficient solutions for complex computational problems.',
    syllabus: [
      { week: 1, topic: 'Amortized Analysis' },
      { week: 2, topic: 'Advanced Graph Algorithms' },
      { week: 3, topic: 'Network Flow' },
      { week: 4, topic: 'Linear Programming' },
      { week: 5, topic: 'NP-Completeness' },
    ],
    prerequisites: ['CST-3020 (Data Structures)', 'CST-2010 (Discrete Math)'],
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Course Details" user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-sm text-gray-500 hover:text-primary mb-6 transition-colors"
          >
            <span className="material-icons-outlined text-sm mr-1">arrow_back</span>
            Back to Courses
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-5">
                    <span className="material-icons-outlined text-9xl">menu_book</span>
                 </div>
                 <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Major Core</span>
                        <span className="text-gray-500 dark:text-gray-400 font-mono text-sm">{course.code}</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">{course.title}</h1>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        {course.description}
                    </p>
                 </div>
              </div>

              <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">Weekly Syllabus</h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {course.syllabus.map((item, i) => (
                        <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                W{item.week}
                            </div>
                            <span className="text-gray-700 dark:text-gray-200 font-medium">{item.topic}</span>
                        </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
               <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                  <h3 className="font-bold text-gray-800 dark:text-white mb-4">Course Information</h3>
                  <div className="space-y-4">
                     <div className="flex items-start gap-3">
                        <span className="material-icons-outlined text-gray-400 mt-0.5">person</span>
                        <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-white">{course.instructor}</p>
                            <p className="text-xs text-gray-500 hover:text-primary cursor-pointer">{course.email}</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-3">
                        <span className="material-icons-outlined text-gray-400 mt-0.5">schedule</span>
                        <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-white">Schedule</p>
                            <p className="text-xs text-gray-500">{course.schedule}</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-3">
                        <span className="material-icons-outlined text-gray-400 mt-0.5">location_on</span>
                        <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-white">Location</p>
                            <p className="text-xs text-gray-500">{course.room}</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-3">
                        <span className="material-icons-outlined text-gray-400 mt-0.5">stars</span>
                        <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-white">Credits</p>
                            <p className="text-xs text-gray-500">{course.credits} Credit Hours</p>
                        </div>
                     </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                     <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Prerequisites</h4>
                     <div className="flex flex-wrap gap-2">
                        {course.prerequisites.map((req, i) => (
                            <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded text-xs font-medium">
                                {req}
                            </span>
                        ))}
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

export default CourseDetails;