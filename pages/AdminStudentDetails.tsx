import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User } from '../types';

interface StudentDetailsProps {
  user: User;
  onLogout: () => void;
}

const AdminStudentDetails: React.FC<StudentDetailsProps> = ({ user, onLogout }) => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  // Mock student data
  const student = {
    id: studentId || 'TNT-8801',
    name: 'John Doe',
    email: 'john.doe@uni.edu',
    major: 'Computer Science',
    year: 'Junior (3rd Year)',
    gpa: 3.42,
    advisor: 'Dr. Alan Grant',
    creditsEarned: 88,
    creditsRequired: 120,
    status: 'Active',
    avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff',
    enrollments: [
      { id: 1, code: 'CST-4010', name: 'Advanced Algorithms', credits: 4, grade: '-', status: 'Enrolled' },
      { id: 2, code: 'CST-4150', name: 'Database Systems', credits: 3, grade: '-', status: 'Enrolled' },
      { id: 3, code: 'CST-3200', name: 'Software Testing & QA', credits: 3, grade: '-', status: 'Enrolled' },
      { id: 4, code: 'CST-1050', name: 'Digital Photography', credits: 2, grade: '-', status: 'Enrolled' },
      { id: 5, code: 'CST-2010', name: 'Project Management', credits: 3, grade: '-', status: 'Enrolled' }
    ]
  };

  const currentCredits = student.enrollments.reduce((acc, curr) => acc + curr.credits, 0);

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-sans">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Student Profile & Enrollment" user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <button 
                onClick={() => navigate(-1)}
                className="flex items-center text-sm text-gray-500 hover:text-primary mb-6 transition-colors"
            >
                <span className="material-icons-outlined text-sm mr-1">arrow_back</span>
                Back to Directory
            </button>

            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm mb-8">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    <img src={student.avatar} alt={student.name} className="w-24 h-24 rounded-full border-4 border-gray-100 dark:border-gray-700" />
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{student.name}</h1>
                            <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide w-fit mx-auto md:mx-0">
                                {student.status}
                            </span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">ID: {student.id} • {student.major}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                                <span className="block text-xs text-gray-500 uppercase font-bold">GPA</span>
                                <span className="text-lg font-bold text-gray-800 dark:text-white">{student.gpa}</span>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                                <span className="block text-xs text-gray-500 uppercase font-bold">Credits</span>
                                <span className="text-lg font-bold text-gray-800 dark:text-white">{student.creditsEarned}</span>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                                <span className="block text-xs text-gray-500 uppercase font-bold">Year</span>
                                <span className="text-lg font-bold text-gray-800 dark:text-white">3rd</span>
                            </div>
                             <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                                <span className="block text-xs text-gray-500 uppercase font-bold">Advisor</span>
                                <span className="text-sm font-bold text-gray-800 dark:text-white truncate" title={student.advisor}>{student.advisor}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[150px]">
                        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-sm">
                            <span className="material-icons-outlined text-sm">edit</span> Edit Profile
                        </button>
                        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                            <span className="material-icons-outlined text-sm">email</span> Send Email
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-2/3">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Current Enrollment (Fall 2024)</h2>
                        <button className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
                            <span className="material-icons-outlined text-sm">add</span> Add Course
                        </button>
                    </div>
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-slate-800 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold">
                                <tr>
                                    <th className="px-6 py-3">Course</th>
                                    <th className="px-6 py-3">Credits</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {student.enrollments.map((course) => (
                                    <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-800 dark:text-white">{course.code}</p>
                                            <p className="text-gray-500 dark:text-gray-400 text-xs">{course.name}</p>
                                        </td>
                                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{course.credits}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-bold uppercase">
                                                {course.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded transition-colors text-xs font-bold">
                                                Drop
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 dark:bg-slate-800/50">
                                <tr>
                                    <td className="px-6 py-3 font-bold text-gray-800 dark:text-white text-right">Total Credits</td>
                                    <td className="px-6 py-3 font-bold text-primary">{currentCredits}</td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <div className="lg:w-1/3 space-y-6">
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-4">Degree Progress</h3>
                        <div className="relative pt-1">
                            <div className="flex mb-2 items-center justify-between">
                                <span className="text-xs font-semibold inline-block text-primary uppercase">
                                    Completion
                                </span>
                                <span className="text-xs font-semibold inline-block text-primary">
                                    {Math.round((student.creditsEarned / student.creditsRequired) * 100)}%
                                </span>
                            </div>
                            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary/20">
                                <div style={{ width: `${(student.creditsEarned / student.creditsRequired) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"></div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{student.creditsEarned} / {student.creditsRequired} Credits</p>
                        </div>
                    </div>

                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-4">Advisor Notes</h3>
                        <div className="space-y-4">
                            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 p-3 rounded-lg text-sm">
                                <p className="text-gray-800 dark:text-gray-200 mb-1">"John needs to complete CST-2010 before enrolling in Advanced Graphics."</p>
                                <p className="text-xs text-gray-400">- Dr. Grant, Oct 12</p>
                            </div>
                             <div className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 p-3 rounded-lg text-sm">
                                <p className="text-gray-800 dark:text-gray-200 mb-1">"Approved for credit overload (19 credits)."</p>
                                <p className="text-xs text-gray-400">- Registrar, Aug 20</p>
                            </div>
                            <button className="w-full py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors">
                                + Add Note
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

export default AdminStudentDetails;