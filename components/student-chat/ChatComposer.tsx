import React from "react";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

const ChatComposer: React.FC<ChatComposerProps> = ({
  value,
  onChange,
  onSend,
  disabled = false,
}) => {
  const canSend = !disabled && value.trim().length > 0;

  return (
    <div className="relative group">
      <div className="flex flex-col gap-3 p-4 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-lg focus-within:ring-4 focus-within:ring-teal-500/10 focus-within:border-teal-500/50 transition-all">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              if (window.innerWidth >= 768) {
                event.preventDefault();
                if (canSend) {
                  onSend();
                }
              }
            }
          }}
          rows={1}
          className="w-full min-h-[60px] max-h-[300px] resize-none bg-transparent px-2 py-2 text-base font-medium text-slate-900 dark:text-white outline-none placeholder:text-slate-400 leading-relaxed scrollbar-hide"
          placeholder="Ask anything about courses, faculty, or institutional guidelines..."
          aria-label="Chat message input"
          disabled={disabled}
        />
        <div className="flex items-center justify-between px-2 pb-1">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block">
              {value.length > 0 ? `${value.length} characters` : 'Neural Processing Active'}
            </span>
          </div>
          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            className={`flex items-center justify-center gap-3 h-10 px-6 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-[0.98] ${
              canSend 
                ? "bg-slate-900 dark:bg-teal-600 text-white shadow-md hover:bg-slate-800 dark:hover:bg-teal-700" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
            }`}
            aria-label="Send message"
          >
            <span className="hidden md:inline">Execute</span>
            <span className="material-icons-outlined text-lg">arrow_upward</span>
          </button>
        </div>
      </div>
      <p className="absolute -bottom-8 left-6 hidden md:block text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] opacity-0 group-focus-within:opacity-100 transition-opacity">
        CMD + Enter to dispatch • Shift + Enter for multiline
      </p>
    </div>
  );
};

export default ChatComposer;
