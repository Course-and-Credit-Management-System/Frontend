import React from "react";
import MessageBubble from "./MessageBubble";
import { StudentChatMessage } from "../../types/studentChat";

interface MessageListProps {
  messages: StudentChatMessage[];
  isPending: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isPending }) => {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {isPending && (
        <div className="flex justify-start">
          <div className="rounded-[8px] border border-[#cccccc] bg-white px-4 py-3 shadow-[0_2px_6px_rgba(0,0,0,0.1)] dark:border-gray-700 dark:bg-slate-800/70">
            <div className="flex items-center gap-1" aria-label="Assistant is typing">
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#1f6f5f]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#1f6f5f] [animation-delay:120ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#1f6f5f] [animation-delay:240ms]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;
