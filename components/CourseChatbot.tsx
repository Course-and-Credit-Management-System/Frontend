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
    <div className="fixed bottom-8 right-8 z-50">
      {isOpen ? (
        <div className="flex flex-col w-[calc(100vw-2rem)] sm:w-[440px] h-[80vh] sm:h-[650px] max-h-[800px] rounded-[40px] border border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-800/50">
                <span className="material-icons-outlined text-xl">psychology</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase tracking-widest">{courseId} Assistant</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Neural Response Active</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="h-10 w-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-90"
            >
              <span className="material-icons-outlined text-xl">close</span>
            </button>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-8 py-10 space-y-2 scrollbar-hide"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-700">
                <div className="h-16 w-16 rounded-[24px] bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-200 dark:text-slate-800 mb-6 border border-slate-100 dark:border-slate-800">
                  <span className="material-icons-outlined text-3xl">auto_awesome</span>
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-2">Curriculum Intelligence</h4>
                <p className="text-sm font-medium text-slate-400 leading-relaxed">Inquire about the syllabus, prerequisites, or complex course concepts.</p>
              </div>
            ) : (
              <MessageList messages={messages} isPending={isLoading} />
            )}
          </div>

          {/* Input */}
          <div className="p-8 bg-transparent border-t border-slate-50 dark:border-slate-800 shrink-0">
            <form 
              onSubmit={handleSend}
              className="flex flex-col gap-3 p-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-inner focus-within:ring-4 focus-within:ring-teal-500/10 focus-within:border-teal-500/50 transition-all"
            >
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder="Ask course anything..."
                className="w-full min-h-[44px] max-h-[150px] resize-none bg-transparent px-2 py-2 text-sm font-medium text-slate-900 dark:text-white outline-none placeholder:text-slate-400 leading-relaxed scrollbar-hide"
                disabled={isLoading}
              />
              <div className="flex justify-end px-1 pb-1">
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className={`h-10 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] flex items-center gap-3 ${
                    !inputValue.trim() || isLoading
                      ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed"
                      : "bg-slate-900 dark:bg-teal-600 text-white shadow-lg hover:bg-slate-800 dark:hover:bg-teal-700 shadow-teal-500/10"
                  }`}
                >
                  <span>Execute</span>
                  <span className="material-icons-outlined text-lg">arrow_upward</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-4 rounded-[24px] border border-teal-400/20 bg-slate-900 dark:bg-teal-600 px-6 py-3.5 text-white shadow-2xl transition-all hover:scale-105 active:scale-95"
          aria-label="Open Course AI assistant"
        >
          <div className="flex items-center gap-3">
            <span className="material-icons-outlined text-xl transition-transform group-hover:rotate-12 duration-500">auto_awesome</span>
            <span className="text-xs font-black uppercase tracking-[0.2em]">Course Intel</span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{courseId}</span>
        </button>
      )}
    </div>
  );
};

export default CourseChatbot;
