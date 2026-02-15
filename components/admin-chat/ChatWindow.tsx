import React, { useEffect, useRef } from "react";
import MessageList from "./MessageList";
import ChatComposer from "./ChatComposer";
import { adminModeMeta, adminModeOrder } from "../../lib/adminChatModes";
import { AdminChatMessage, AdminChatMode } from "../../types/adminChat";

interface ChatWindowProps {
  selectedMode: AdminChatMode;
  onModeChange: (mode: AdminChatMode) => void;
  onNewChat: () => void;
  messages: AdminChatMessage[];
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
  const meta = adminModeMeta[selectedMode];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  return (
    <section className="flex h-full flex-col rounded-[8px] border border-[#cccccc] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]">
      <div className="border-b border-[#cccccc] px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-poppins text-lg font-semibold text-[#333333]">Admin AI Assistant</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <label htmlFor="admin-mode-select" className="sr-only">
                AI mode
              </label>
              <select
                id="admin-mode-select"
                value={selectedMode}
                onChange={(event) => onModeChange(event.target.value as AdminChatMode)}
                className="rounded-[6px] border border-[#cccccc] bg-[#f7f8f7] px-3 py-2 text-xs font-medium text-[#333333] focus:border-[#1f6f5f] focus:outline-none focus:ring-2 focus:ring-[#1f6f5f]/20"
                aria-label="Select AI mode"
              >
                {adminModeOrder.map((mode) => (
                  <option key={mode} value={mode}>
                    {adminModeMeta[mode].label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={onNewChat}
              className="rounded-[6px] bg-[#1f6f5f] px-3 py-2 text-xs font-medium uppercase tracking-wide text-white hover:bg-[#185a4e] shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-colors"
              aria-label="Start a new chat"
            >
              New Chat
            </button>
          </div>
        </div>
        <p className="mb-2 text-xs text-[#666666]">{meta.description}</p>
        <div className="flex flex-wrap gap-2">
          {meta.examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onSelectPrompt(example)}
              className="rounded-full border border-[#cccccc] bg-[#f5f5f5] px-3 py-1 text-xs text-[#1f6f5f] hover:bg-[#e0e0e0] transition-colors"
              aria-label={`Quick prompt: ${example}`}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div
          className="mx-4 mt-3 rounded-[6px] bg-[#fdecea] px-4 py-3 text-sm text-[#e74c3c]"
          role="alert"
          aria-live="polite"
        >
          {errorMessage}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="rounded-[8px] border border-dashed border-[#cccccc] bg-[#f5f5f5] p-6 text-center">
            <p className="font-poppins text-base font-semibold text-[#333333]">Start your administrative session</p>
            <p className="mt-1 text-sm text-[#666666]">
              I can help you analyze enrollment data, manage announcements, and retrieve system reports.
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
