import React, { useEffect, useRef } from "react";
import MessageList from "./MessageList";
import ChatComposer from "./ChatComposer";
import { modeMeta, modeOrder } from "../../lib/studentChatModes";
import { StudentChatMessage, StudentChatMode } from "../../types/studentChat";

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  return (
    <section className="flex h-full flex-col rounded-[8px] border border-[#cccccc] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.1)] overflow-hidden dark:border-gray-700 dark:bg-surface-dark">
      <div className="border-b border-[#cccccc] px-3 py-3 md:px-4 dark:border-gray-700">
        <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-poppins text-base md:text-lg font-bold text-[#333333] truncate dark:text-white">Student AI Chatbot</h2>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <label htmlFor="mode-select" className="sr-only">
                AI mode
              </label>
              <select
                id="mode-select"
                value={selectedMode}
                onChange={(event) => onModeChange(event.target.value as StudentChatMode)}
                className="w-full sm:w-auto rounded-[6px] border border-[#cccccc] bg-[#f7f8f7] px-2 py-1.5 text-[10px] md:text-[11px] font-bold text-[#333333] focus:border-[#1f6f5f] focus:outline-none focus:ring-2 focus:ring-[#1f6f5f]/20 transition-all dark:border-gray-700 dark:bg-slate-800/60 dark:text-gray-100 dark:focus:border-teal-400 dark:focus:ring-teal-500/30"
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
              className="rounded-[6px] bg-[#1f6f5f] px-2.5 py-1.5 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.12em] text-white hover:bg-[#185a4e] shadow-sm transition-all active:scale-95 whitespace-nowrap dark:bg-[#247b6a] dark:hover:bg-[#1f6a5b]"
              aria-label="Start a new chat"
            >
              New Chat
            </button>
          </div>
        </div>
        <p className="mb-3 text-[11px] md:text-xs text-[#666666] leading-relaxed line-clamp-2 md:line-clamp-none dark:text-gray-300">{meta.description}</p>
        <div className="hidden lg:flex lg:flex-nowrap lg:overflow-x-auto lg:pb-1 lg:-mx-1 lg:px-1 lg:gap-2 lg:scrollbar-none">
          {meta.examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onSelectPrompt(example)}
              className="whitespace-nowrap rounded-full border border-[#cccccc] bg-[#f5f5f5] px-3 py-1.5 text-[10px] md:text-xs font-bold text-[#1f6f5f] hover:bg-[#e0e0e0] transition-colors active:bg-[#d0d0d0] dark:border-gray-700 dark:bg-slate-800/60 dark:text-teal-300 dark:hover:bg-slate-700"
              aria-label={`Quick prompt: ${example}`}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div
          className="mx-4 mt-3 rounded-[6px] bg-[#fdecea] px-4 py-3 text-sm text-[#e74c3c] dark:bg-red-900/20 dark:text-red-200"
          role="alert"
          aria-live="polite"
        >
          {errorMessage}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="rounded-[8px] border border-dashed border-[#cccccc] bg-[#f5f5f5] p-6 text-center dark:border-gray-700 dark:bg-slate-800/40">
            <p className="font-poppins text-base font-semibold text-[#333333] dark:text-white">Start your conversation</p>
            <p className="mt-1 text-sm text-[#666666] dark:text-gray-300">
              Ask about courses, policies, announcements, and academic planning.
            </p>
          </div>
        ) : (
          <MessageList messages={messages} isPending={isPending} />
        )}
        <div ref={endRef} />
      </div>

      <ChatComposer value={input} onChange={onInputChange} onSend={onSend} disabled={isPending} />
    </section>
  );
};

export default ChatWindow;
