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
    <div className="sticky bottom-0 border-t border-[#cccccc] bg-white p-2 md:p-3 dark:border-gray-700 dark:bg-slate-900/70">
      <div className="flex items-end gap-2">
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
          className="min-h-[44px] md:min-h-[56px] w-full resize-none rounded-[12px] border border-[#cccccc] bg-[#f9f9f9] px-3 py-2.5 text-sm font-medium text-[#333333] focus:border-[#1f6f5f] focus:outline-none focus:ring-2 focus:ring-[#1f6f5f]/20 disabled:bg-[#f5f5f5] transition-all dark:border-gray-700 dark:bg-slate-800 dark:text-gray-100 dark:placeholder:text-gray-400 dark:disabled:bg-slate-800/70 dark:focus:border-teal-400 dark:focus:ring-teal-500/25"
          placeholder="Ask anything about courses, administration, and system management..."
          aria-label="Chat message input"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="flex h-[44px] md:h-[48px] items-center justify-center rounded-xl bg-[#1f6f5f] px-4 py-2 text-sm font-bold uppercase tracking-widest text-white hover:bg-[#185a4e] disabled:cursor-not-allowed disabled:bg-[#cccccc] shadow-md transition-all active:scale-95 dark:bg-[#247b6a] dark:hover:bg-[#1f6a5b] dark:disabled:bg-gray-600"
          aria-label="Send message"
        >
          <span className="hidden md:inline">Send</span>
          <span className="material-icons-outlined md:hidden">send</span>
        </button>
      </div>
      <p className="mt-1.5 hidden md:block text-[10px] font-bold text-[#999999] uppercase tracking-wider px-1 dark:text-gray-400">Press Enter to send, Shift + Enter for a new line.</p>
    </div>
  );
};

export default ChatComposer;
