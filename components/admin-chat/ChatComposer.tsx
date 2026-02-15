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
    <div className="sticky bottom-0 border-t border-[#cccccc] bg-white p-3">
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (canSend) {
                onSend();
              }
            }
          }}
          rows={2}
          className="min-h-[56px] w-full resize-y rounded-[6px] border border-[#cccccc] px-3 py-2 text-sm text-[#333333] focus:border-[#1f6f5f] focus:outline-none focus:ring-2 focus:ring-[#1f6f5f]/20 disabled:bg-[#f5f5f5]"
          placeholder="Ask anything about courses, administration, and system management..."
          aria-label="Chat message input"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="rounded-[6px] bg-[#1f6f5f] px-4 py-2 text-sm font-medium uppercase tracking-wide text-white hover:bg-[#185a4e] disabled:cursor-not-allowed disabled:bg-[#cccccc] shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-colors"
          aria-label="Send message"
        >
          Send
        </button>
      </div>
      <p className="mt-2 text-xs text-[#666666]">Press Enter to send, Shift + Enter for a new line.</p>
    </div>
  );
};

export default ChatComposer;
