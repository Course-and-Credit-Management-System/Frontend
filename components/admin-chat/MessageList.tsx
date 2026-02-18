import React from "react";
import MessageBubble from "./MessageBubble";
import { AdminChatMessage } from "../../types/adminChat";

interface MessageListProps {
  messages: AdminChatMessage[];
  isPending: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isPending }) => {
  return (
    <div className="space-y-2">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {isPending && (
        <div className="flex justify-start mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="rounded-[24px] rounded-tl-none border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 shadow-sm">
            <div className="flex items-center gap-1.5" aria-label="Assistant is synthesizing">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-500" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-500 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-500 [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;
