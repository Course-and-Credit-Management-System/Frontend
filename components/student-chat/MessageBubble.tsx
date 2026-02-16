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
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-[8px] px-4 py-3 shadow-[0_2px_6px_rgba(0,0,0,0.1)] ${
          isUser
            ? "bg-[#1f6f5f] text-white dark:bg-[#247b6a]"
            : "border border-[#cccccc] bg-white text-[#333333] dark:border-gray-700 dark:bg-slate-800/75 dark:text-gray-100"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
        ) : (
          <MarkdownContent content={message.content} />
        )}
        <p className={`mt-2 text-[10px] ${isUser ? "text-white/80" : "text-[#666666] dark:text-gray-400"}`}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 border-t border-[#e0e0e0] pt-2 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowSources((current) => !current)}
              className="text-xs font-medium text-[#1f6f5f] hover:text-[#185a4e] transition-colors dark:text-teal-300 dark:hover:text-teal-200"
              aria-expanded={showSources}
              aria-label="Toggle message sources"
            >
              {showSources ? "Hide Sources" : `Show Sources (${message.sources.length})`}
            </button>
            {showSources && (
              <div className="mt-2 space-y-2">
                {message.sources.map((item, index) => (
                  <div key={`${item.source}-${index}`} className="rounded-[6px] bg-[#f5f5f5] p-2 text-xs border border-[#cccccc] dark:border-gray-700 dark:bg-slate-900/45">
                    <p className="text-[#333333] font-medium dark:text-gray-100">{item.text}</p>
                    <p className="mt-1 text-[#666666] italic dark:text-gray-400">{item.source}</p>
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
