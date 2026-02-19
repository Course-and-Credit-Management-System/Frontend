import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { useUI } from '../context/UIContext';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { toggleTheme } from '../lib/theme';

interface HeaderProps {
  title: string;
  user: User;
}

const Header: React.FC<HeaderProps> = ({ title, user }) => {
  const { toggleSidebar } = useUI();

  const navigate = useNavigate();
  const [unread, setUnread] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    api.studentAnnouncementsUnreadCount()
      .then((res) => {
        if (mounted) setUnread(res?.count ?? 0);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const openAnnouncements = async () => {
    try {
      await api.studentAnnouncementsMarkAllRead();
      setUnread(0);
    } catch {}
    navigate(user.role === "admin" ? "/admin/announcements" : "/student/announcements");
  };

  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-100 bg-white/80 px-8 md:px-10 dark:border-slate-800 dark:bg-slate-950/80 transition-all backdrop-blur-md shrink-0 sticky top-0 z-40">
      <div className="flex items-center md:hidden">
        <button 
          onClick={toggleSidebar}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900 active:scale-[0.98] transition-transform"
        >
          <span className="material-icons-outlined">menu</span>
        </button>
        <span className="ml-4 text-xl font-black text-slate-900 dark:text-white tracking-tighter">
          Uni<span className="text-teal-600">{user.role === 'admin' ? 'Admin' : 'Portal'}</span>
        </span>
      </div>
      
      <div className="hidden md:flex flex-col">
        <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase tracking-widest text-[11px] opacity-40 mb-0.5">Navigation Context</h1>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{title}</p>
      </div>
      
      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={openAnnouncements} className="relative rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 dark:hover:text-gray-300">
            <span className="material-icons-outlined">notifications</span>
            {unread > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center ring-2 ring-white dark:ring-surface-dark">
                {unread}
              </span>
            ) : (
              <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-gray-300 ring-2 ring-white dark:ring-surface-dark"></span>
            )}
          </button>
          
          
          <button 
            onClick={() => toggleTheme()}
            className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 dark:hover:text-slate-200 active:scale-[0.98] transition-all group"
            aria-label="Toggle dark mode"
          >
          </button>
        </div>

        <div className="flex items-center gap-4 pl-6 border-l border-slate-100 dark:border-slate-800">
           <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-slate-900 dark:text-white leading-tight tracking-tight">{user.name}</p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{user.department}</p>
           </div>
           <div className="relative">
             <img src={user.avatar} className="h-10 w-10 rounded-2xl border-2 border-white dark:border-slate-800 object-cover shadow-sm hover:scale-105 transition-transform cursor-pointer" alt="avatar" />
             <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
           </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
