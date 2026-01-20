
import React from 'react';
import { User } from '../types';

interface HeaderProps {
  title: string;
  user: User;
}

const Header: React.FC<HeaderProps> = ({ title, user }) => {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border-light bg-surface-light px-6 dark:border-border-dark dark:bg-surface-dark transition-colors shrink-0">
      <div className="flex items-center md:hidden">
        <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
          <span className="material-icons-outlined">menu</span>
        </button>
        <span className="ml-3 text-lg font-bold text-gray-900 dark:text-white">
          {user.role === 'admin' ? 'UniAdmin' : 'UniCourse'}
        </span>
      </div>
      
      <h1 className="hidden text-xl font-semibold text-gray-800 dark:text-white md:block">{title}</h1>
      
      <div className="flex items-center space-x-4">
        <div className="relative hidden md:block">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="material-icons-outlined text-gray-400">search</span>
          </span>
          <input 
            className="w-64 rounded-lg border border-border-light bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-slate-800 dark:text-gray-200" 
            placeholder="Search records..." 
            type="text"
          />
        </div>
        
        <button className="relative rounded-full p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
          <span className="material-icons-outlined">notifications</span>
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-surface-dark"></span>
        </button>
        
        <button 
          onClick={() => document.documentElement.classList.toggle('dark')}
          className="rounded-full p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
        >
          <span className="material-icons-outlined">dark_mode</span>
        </button>

        {user.role === 'student' && (
          <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-border-dark">
             <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-800 dark:text-white leading-tight">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.department}</p>
             </div>
             <img src={user.avatar} className="h-9 w-9 rounded-full border border-primary/20" alt="avatar" />
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
