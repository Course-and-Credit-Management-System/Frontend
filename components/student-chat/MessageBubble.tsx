import React, { useState } from "react";
import { StudentChatMessage } from "../../types/studentChat";
import MarkdownContent from "./MarkdownContent";

interface MessageBubbleProps {
  message: StudentChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === "user";
  const [showSources, setShowSources] = useState(false);

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500`}>
      <div
        className={`max-w-[85%] rounded-[24px] px-6 py-4 shadow-sm transition-all hover:shadow-md ${
          isUser
            ? "bg-slate-900 text-white dark:bg-teal-600 rounded-tr-none"
            : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-tl-none"
        }`}
      >
        <div className="prose prose-slate dark:prose-invert max-w-none">
          {isUser ? (
            <p className="whitespace-pre-wrap break-words text-base font-medium leading-relaxed">{message.content}</p>
          ) : (
            <div className="text-[15px] leading-relaxed font-normal">
              <MarkdownContent content={message.content} />
            </div>
          )}
        </div>
        
        <div className={`mt-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest ${isUser ? "text-white/50" : "text-slate-400"}`}>
          <span>{isUser ? 'Member' : 'System Intelligence'}</span>
          <span className="opacity-30">•</span>
          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowSources((current) => !current)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-teal-600 hover:text-teal-700 transition-colors"
              aria-expanded={showSources}
            >
              <span className="material-icons-outlined text-sm">{showSources ? 'expand_less' : 'expand_more'}</span>
              {showSources ? "Conceal Citations" : `View Evidence (${message.sources.length})`}
            </button>
            {showSources && (
              <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {message.sources.map((item, index) => (
                  <div key={`${item.source}-${index}`} className="rounded-2xl bg-slate-50/50 dark:bg-slate-950/50 p-4 border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-900">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed mb-2">{item.text}</p>
                    <div className="flex items-center gap-2">
                      <span className="material-icons-outlined text-[14px] text-slate-400">link</span>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate italic">{item.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
