import React from 'react';
import { NavLink } from 'react-router-dom';
import { User } from '../types';

interface SidebarProps {
  user: User;
  onLogout: () => void;
}

interface SidebarLink {
  to: string;
  icon: string;
  label: string;
  section?: string;
  badge?: string;
  iconColor?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const isAdmin = user.role === 'admin';
  const prefix = isAdmin ? 'admin' : 'student';

  const adminLinks: SidebarLink[] = [
    { to: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/admin/enrollment', icon: 'group_add', label: 'Enrollment', section: 'Student Management' },
    { to: '/admin/students', icon: 'school', label: 'Students List' },
    { to: "/admin/messages", icon: "mail", label: "Messages"},
    { to: '/admin/courses', icon: 'library_books', label: 'Courses', section: 'Academic' },
    { to: '/admin/announcements', icon: 'campaign', label: 'Announcements'},
    { to: '/admin/grading', icon: 'assessment', label: 'Exam Results' },
    
  ];

  const studentLinks: SidebarLink[] = [
    { to: '/student/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/student/courses', icon: 'class', label: 'My Courses', section: 'Academics' },
    { to: '/student/enrollment', icon: 'app_registration', label: 'Course Enrollment' },
    { to: '/student/results', icon: 'assignment_turned_in', label: 'Review Results' },
    { to: '/student/status', icon: 'school', label: 'Academic Status' },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  return (
    <aside className="hidden w-64 overflow-y-auto border-r border-border-light bg-surface-light dark:bg-surface-dark dark:border-border-dark md:flex flex-col flex-shrink-0 transition-colors">
      <div className="flex h-16 items-center justify-center border-b border-border-light dark:border-border-dark px-6">
        <span className="text-xl font-bold tracking-tight text-primary">
          Uni<span className="text-gray-700 dark:text-white">{isAdmin ? 'Admin' : 'Course'}</span>
        </span>
      </div>
      
      <div className="px-4 py-6 flex-1">
        <nav className="space-y-1">
          {links.map((link, idx) => (
            <React.Fragment key={idx}>
              {link.section && (
                <div className="pt-4 pb-2">
                  <p className="px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {link.section}
                  </p>
                </div>
              )}
              <NavLink
                to={link.to}
                className={({ isActive }) => 
                  `group flex items-center rounded-lg px-4 py-2.5 transition-colors ${
                    isActive 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-700/50'
                  }`
                }
              >
                <span className={`material-icons-outlined mr-3 ${link.iconColor || (isAdmin ? 'text-gray-500 group-hover:text-primary dark:text-gray-400' : '')}`}>
                  {link.icon}
                </span>
                <span className="font-medium">{link.label}</span>
                {link.badge && (
                  <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                    {link.badge}
                  </span>
                )}
              </NavLink>
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="border-t border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark mt-auto">
        <div className="flex items-center mb-4">
          <img alt={user.name} className="h-9 w-9 rounded-full object-cover border border-gray-200 dark:border-gray-600" src={user.avatar} />
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.department}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm"
        >
          <span className="material-icons-round">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;