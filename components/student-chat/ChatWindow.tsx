import React, { useEffect, useRef } from "react";
import MessageList from "./MessageList";
import ChatComposer from "./ChatComposer";
import { modeMeta, modeOrder } from "../../lib/studentChatModes";
import { StudentChatMessage, StudentChatMode } from "../../types/studentChat";

import { useNavigate } from "react-router-dom";

interface ChatWindowProps {
  selectedMode: StudentChatMode;
  onModeChange: (mode: StudentChatMode) => void;
  onNewChat: () => void;
  messages: StudentChatMessage[];
  input: string;
  isPending: boolean;
  errorMessage: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onSelectPrompt: (prompt: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  selectedMode,
  onModeChange,
  onNewChat,
  messages,
  input,
  isPending,
  errorMessage,
  onInputChange,
  onSend,
  onSelectPrompt,
}) => {
  const endRef = useRef<HTMLDivElement | null>(null);
  const meta = modeMeta[selectedMode];
  const navigate = useNavigate();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  return (
    <section className="flex h-full flex-col bg-transparent overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/student/dashboard")}
              className="h-10 w-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-teal-600 transition-all shadow-sm active:scale-95"
              title="Return to Dashboard"
            >
              <span className="material-icons-outlined">home</span>
            </button>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Academic Intelligence</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{meta.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                id="mode-select"
                value={selectedMode}
                onChange={(event) => onModeChange(event.target.value as StudentChatMode)}
                className="appearance-none rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 py-2.5 pr-10 text-[11px] font-bold uppercase tracking-widest text-slate-700 dark:text-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all cursor-pointer shadow-sm"
                aria-label="Select AI mode"
              >
                {modeOrder.map((mode) => (
                  <option key={mode} value={mode}>
                    {modeMeta[mode].label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={onNewChat}
              className="h-10 px-6 rounded-2xl bg-slate-900 dark:bg-teal-600 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-slate-800 dark:hover:bg-teal-700 shadow-lg transition-all active:scale-[0.98]"
              aria-label="Start a new chat"
            >
              Clear
            </button>
          </div>
        </div>
        
        <div className="flex flex-nowrap overflow-x-auto gap-2 scrollbar-hide">
          {meta.examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onSelectPrompt(example)}
              className="whitespace-nowrap rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:border-teal-500/50 hover:text-teal-600 transition-all shadow-sm"
              aria-label={`Quick prompt: ${example}`}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div
          className="mx-6 mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40 flex items-center gap-3 animate-in fade-in slide-in-from-top-2"
          role="alert"
          aria-live="polite"
        >
          <span className="material-icons-outlined text-lg">error_outline</span>
          {errorMessage}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-700">
            <div className="h-20 w-20 rounded-[32px] bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 dark:text-slate-700 mb-8 border border-slate-100 dark:border-slate-800">
              <span className="material-icons-outlined text-4xl">auto_awesome</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Student Knowledge Base</h3>
            <p className="max-w-md text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Inquire about curriculum metrics, administrative logs, faculty updates, or campus policies.
            </p>
          </div>
        ) : (
          <MessageList messages={messages} isPending={isPending} />
        )}
        <div ref={endRef} />
      </div>

      <div className="px-6 pb-5 pt-1">
        <div className="max-w-4xl mx-auto w-full">
          <ChatComposer value={input} onChange={onInputChange} onSend={onSend} disabled={isPending} />
        </div>
      </div>
    </section>
  );
};

export default ChatWindow;
