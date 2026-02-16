import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
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
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Announcements" user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="material-icons-outlined text-gray-400">search</span>
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search announcements..."
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-10 py-2 text-sm text-gray-800 dark:text-white"
                />
              </div>
              <select
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value as any)}
              >
                <option>Newest</option>
                <option>Oldest</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-sm text-gray-600 dark:text-gray-300">Loading announcements...</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-sm text-gray-600 dark:text-gray-300">No announcements found.</div>
            ) : (
              filtered.map((a) => (
                <div key={a._id} className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-white">{a.title}</h3>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-2">
                          <span className="material-icons-outlined text-[16px]">schedule</span>
                          {new Date(a.date_posted || "").toLocaleString()}
                        </span>
                        {a.expiry_date && (
                          <span className="ml-4 inline-flex items-center gap-2 text-red-600">
                            <span className="material-icons-outlined text-[16px]">hourglass_empty</span>
                            Expires: {new Date(a.expiry_date).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${a.type === "Urgent" ? "bg-red-100 text-red-700" : a.type === "Event" ? "bg-blue-100 text-blue-700" : a.type === "Academic" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700"}`}>
                        {a.type || "General"}
                      </span>
                      {!a.is_read && <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">New</span>}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{a.content}</p>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentAnnouncements;
