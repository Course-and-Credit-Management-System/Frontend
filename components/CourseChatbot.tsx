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
    <div className="fixed bottom-6 right-24 z-40">
      {isOpen ? (
        <div className="flex flex-col w-80 sm:w-96 h-[500px] bg-white rounded-[8px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#cccccc] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#1f6f5f] text-white">
            <div className="flex items-center gap-2">
              <span className="material-icons-outlined text-xl">psychology</span>
              <h3 className="font-poppins font-medium text-sm tracking-tight">Course Assistant ({courseId})</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <span className="material-icons-outlined text-xl">close</span>
            </button>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 bg-[#f5f5f5] space-y-4"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400">
                <span className="material-icons-outlined text-5xl mb-2 opacity-20">chat_bubble_outline</span>
                <p className="text-sm font-poppins font-medium">Have questions about {courseId}?</p>
                <p className="text-xs mt-1">Ask me about the syllabus, schedule, or course content.</p>
              </div>
            ) : (
              <MessageList messages={messages} isPending={isLoading} />
            )}
          </div>

          {/* Input */}
          <form 
            onSubmit={handleSend}
            className="p-3 bg-white border-t border-[#cccccc] flex gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-white border border-[#cccccc] rounded-[6px] px-3 py-2 text-sm focus:outline-none focus:border-[#1f6f5f] focus:ring-1 focus:ring-[#1f6f5f]/20"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-[#1f6f5f] text-white p-2 rounded-[6px] hover:bg-[#185a4e] disabled:opacity-50 disabled:hover:bg-[#1f6f5f] transition-colors flex items-center justify-center"
            >
              <span className="material-icons-outlined text-sm">send</span>
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-[#1f6f5f] text-white rounded-full shadow-[0_8px_20px_rgba(31,111,95,0.3)] hover:bg-[#185a4e] transition-all hover:scale-105 active:scale-95"
        >
          <span className="material-icons-outlined">psychology</span>
          <span className="font-poppins font-medium text-sm">Course AI</span>
        </button>
      )}
    </div>
  );
};

export default CourseChatbot;
