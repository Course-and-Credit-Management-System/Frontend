import React, { useState, useRef, useEffect } from "react";
import { StudentChatMessage, StudentChatHistoryItem } from "../types/studentChat";
import { api } from "../lib/api";
import MessageList from "./student-chat/MessageList";

interface CourseChatbotProps {
  courseId: string;
}

const CourseChatbot: React.FC<CourseChatbotProps> = ({ courseId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<StudentChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: StudentChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const history: StudentChatHistoryItem[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await api.studentCourseChat({
        message: userMessage.content,
        course_id: courseId,
        history,
        mode: "auto",
      });

      const assistantMessage: StudentChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.answer,
        createdAt: new Date().toISOString(),
        sources: response.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: StudentChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again later.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      {isOpen ? (
        <div className="flex flex-col w-[calc(100vw-2rem)] sm:w-96 h-[85vh] sm:h-[500px] max-h-[600px] rounded-2xl border border-gray-200 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.18)] overflow-hidden animate-in slide-in-from-bottom-8 duration-300 dark:border-gray-700 dark:bg-surface-dark">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#1f6f5f] text-white shrink-0 dark:bg-[#216e5f]">
            <div className="flex items-center gap-2">
              <span className="material-icons-outlined text-xl">psychology</span>
              <h3 className="font-poppins font-bold text-sm tracking-tight truncate max-w-[180px] sm:max-w-none">Course Assistant ({courseId})</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-xl p-1.5 transition-colors active:scale-95"
            >
              <span className="material-icons-outlined text-xl">close</span>
            </button>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3 md:p-4 bg-[#f5f5f5] space-y-4 dark:bg-slate-900/40"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400 dark:text-gray-300">
                <span className="material-icons-outlined text-5xl mb-4 opacity-10">chat_bubble_outline</span>
                <p className="text-sm font-poppins font-bold text-gray-600 dark:text-gray-200">Have questions about {courseId}?</p>
                <p className="text-xs mt-2 leading-relaxed text-gray-500 dark:text-gray-300">Ask me about the syllabus, schedule, or course content.</p>
              </div>
            ) : (
              <MessageList messages={messages} isPending={isLoading} />
            )}
          </div>

          {/* Input */}
          <form 
            onSubmit={handleSend}
            className="p-3 bg-white border-t border-gray-200 flex gap-2 shrink-0 dark:bg-surface-dark dark:border-gray-700"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#1f6f5f] focus:ring-2 focus:ring-[#1f6f5f]/10 transition-all dark:border-gray-600 dark:bg-slate-800 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:border-teal-400 dark:focus:ring-teal-500/20"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-[#1f6f5f] text-white p-2.5 rounded-xl hover:bg-[#185a4e] disabled:opacity-50 disabled:bg-gray-400 transition-all flex items-center justify-center active:scale-95 shadow-md dark:bg-[#247b6a] dark:hover:bg-[#1f6a5b] dark:disabled:bg-gray-600"
            >
              <span className="material-icons-outlined text-[20px]">send</span>
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2 rounded-[28px] border border-teal-400/20 bg-gradient-to-r from-[#1f6f5f] to-[#22806e] px-4 py-2.5 text-white shadow-[0_8px_24px_rgba(31,111,95,0.4)] ring-1 ring-teal-300/15 transition-all hover:brightness-105 active:scale-95 dark:border-teal-300/25 dark:ring-teal-200/20"
          aria-label="Open Course AI assistant"
        >
          <span className="material-icons-outlined rounded-full bg-white/15 p-1 text-[18px] leading-none transition-transform group-hover:rotate-12">psychology</span>
          <span className="font-poppins text-sm font-bold tracking-[0.02em] leading-none">Course AI</span>
          <span className="material-icons-outlined rounded-full bg-white/15 p-1 text-[18px] leading-none">smart_toy</span>
        </button>
      )}
    </div>
  );
};

export default CourseChatbot;
