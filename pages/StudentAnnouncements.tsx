import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { DetailedCardGridSkeleton } from "../components/Skeleton";
import { User } from "../types";
import { api } from "../lib/api";

type Announcement = {
  _id: string;
  title: string;
  content: string;
  type?: string;
  posted_by?: string;
  date_posted?: string;
  expiry_date?: string | null;
  target_audience?: string;
  is_read?: boolean;
};

const TYPES: string[] = ["All", "General", "Urgent", "Event", "Academic"];

const StudentAnnouncements: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [sortDir, setSortDir] = useState<"Newest" | "Oldest">("Newest");

  useEffect(() => {
    const load = async () => {
      setError(null);
      setLoading(true);
      try {
        const data = await api.studentAnnouncements();
        setItems(Array.isArray(data) ? data : []);
        // mark all read silently to clear header badge
        try {
          await api.studentAnnouncementsMarkAllRead();
        } catch {}
      } catch (e: any) {
        setError(e?.message || "Failed to load announcements");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = [...items];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((x) => (x.title || "").toLowerCase().includes(q) || (x.content || "").toLowerCase().includes(q));
    }
    if (typeFilter !== "All") {
      list = list.filter((x) => (x.type || "General") === typeFilter);
    }
    list.sort((a, b) => {
      const ta = new Date(a.date_posted || 0).getTime();
      const tb = new Date(b.date_posted || 0).getTime();
      return sortDir === "Newest" ? tb - ta : ta - tb;
    });
    return list;
  }, [items, query, typeFilter, sortDir]);

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 font-poppins relative">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Header title="Institutional Dispatches" user={user} />
        <main className="flex-1 overflow-y-auto p-10 lg:p-16 scrollbar-hide animate-in fade-in duration-1000 slide-in-from-bottom-4">
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-3">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Announcements</h1>
                <p className="text-lg font-medium text-slate-400 dark:text-slate-500">Official broadcasts and academic updates from the administrative nexus.</p>
              </div>
            </div>

            {error && (
              <div className="p-5 rounded-2xl bg-rose-50 text-rose-700 text-sm font-bold border border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/40 flex items-center gap-3 animate-in slide-in-from-top-2">
                <span className="material-icons-outlined">error_outline</span>
                {error}
              </div>
            )}

            <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-[32px] border border-slate-100 dark:border-slate-800 p-6 shadow-sm transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-5">
                    <span className="material-icons-outlined text-slate-300 group-focus-within:text-teal-500 transition-colors">search</span>
                  </span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter dispatches by content..."
                    className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-12 py-3.5 text-sm font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:text-white"
                  />
                </div>
                <select
                  className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 py-3.5 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 outline-none focus:ring-4 focus:ring-teal-500/10 cursor-pointer transition-all"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>{t.toUpperCase()} CATEGORY</option>
                  ))}
                </select>
                <select
                  className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 py-3.5 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 outline-none focus:ring-4 focus:ring-teal-500/10 cursor-pointer transition-all"
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value as any)}
                >
                  <option>Newest</option>
                  <option>Oldest</option>
                </select>
              </div>
            </div>

            <div className="space-y-8 pb-10">
              {loading ? (
                <div className="grid grid-cols-1 gap-8">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-48 bg-slate-50 dark:bg-slate-900 rounded-[40px] animate-pulse border border-slate-100 dark:border-slate-800" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800 p-20 text-center animate-in zoom-in-95">
                  <div className="h-20 w-20 rounded-3xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-200 dark:text-slate-800 mx-auto mb-8 border border-slate-100 dark:border-slate-800 shadow-inner">
                    <span className="material-icons-outlined text-4xl">notifications_off</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.4em]">Null Dispatch Set</h3>
                  <p className="text-sm font-medium text-slate-400 mt-2">No active announcements matching your parameters</p>
                </div>
              ) : (
                filtered.map((a) => (
                  <div key={a._id} className="group bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm p-10 lg:p-12 transition-all hover:shadow-2xl hover:-translate-y-1 relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 h-32 w-32 bg-teal-500/[0.01] rounded-bl-full pointer-events-none" />
                    
                    <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-8">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight group-hover:text-teal-600 transition-colors">{a.title}</h3>
                          {!a.is_read && (
                            <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.6)]" title="New Dispatch" />
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <span className="flex items-center gap-2">
                            <span className="material-icons-outlined text-sm opacity-40">event</span>
                            {new Date(a.date_posted || "").toLocaleDateString(undefined, { dateStyle: 'long' })}
                          </span>
                          <span className="opacity-20 text-lg">•</span>
                          <span className="flex items-center gap-2">
                            <span className="material-icons-outlined text-sm opacity-40">schedule</span>
                            {new Date(a.date_posted || "").toLocaleTimeString(undefined, { timeStyle: 'short' })}
                          </span>
                          {a.expiry_date && (
                            <>
                              <span className="opacity-20 text-lg">•</span>
                              <span className="flex items-center gap-2 text-rose-500/80">
                                <span className="material-icons-outlined text-sm">timer_off</span>
                                Recall: {new Date(a.expiry_date).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm ${
                          a.type === "Urgent" ? "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400" : 
                          a.type === "Event" ? "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400" : 
                          a.type === "Academic" ? "bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-900/20 dark:text-teal-400" : 
                          "bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {a.type || "General"}
                        </span>
                        {!a.is_read && (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">Active</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      <p className="text-base font-medium text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed italic">
                        "{a.content}"
                      </p>
                    </div>
                    
                    <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-black">
                          {String(a.posted_by || "A").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Origin: {a.posted_by || "Institutional Admin"}</span>
                      </div>
                      <button className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-teal-600 transition-colors flex items-center gap-2 group/btn">
                        Dispatch Log <span className="material-icons-outlined text-sm transform group-hover/btn:translate-x-1 transition-transform">east</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>

        {/* Global UI Decoration */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/[0.02] rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2 -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/[0.02] rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/2 -z-10" />
      </div>
    </div>
  );
};

export default StudentAnnouncements;
