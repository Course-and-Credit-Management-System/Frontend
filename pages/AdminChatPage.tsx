import React, { useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import ChatWindow from "../components/admin-chat/ChatWindow";
import { adminModeMeta } from "../lib/adminChatModes";
import { User } from "../types";
import { api, HttpStatusError } from "../lib/api";
import {
  AdminChatHistoryItem,
  AdminChatMessage,
  AdminChatMode,
} from "../types/adminChat";

interface AdminChatPageProps {
  user: User;
  onLogout: () => void;
}

const STORAGE_KEY = "admin_ai_chat_state_v1";
const RESPONSE_TEMPLATE_SYSTEM_PROMPT = `Format every reply as clean Markdown for administrator readability.
Use clear headings, tables for data, and bold highlights for critical system information.
Keep it professional, data-driven, and concise.`;

interface ChatLocalState {
  selectedMode: AdminChatMode;
  messages: AdminChatMessage[];
}

const getInitialState = (): ChatLocalState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { selectedMode: "auto", messages: [] };
    }
    const parsed = JSON.parse(raw) as Partial<ChatLocalState>;
    const selectedMode: AdminChatMode =
      parsed.selectedMode && parsed.selectedMode in adminModeMeta
        ? (parsed.selectedMode as AdminChatMode)
        : "auto";
    return {
      selectedMode,
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    };
  } catch {
    return { selectedMode: "auto", messages: [] };
  }
};

const createMessage = (
  role: "user" | "assistant",
  content: string,
  sources?: AdminChatMessage["sources"],
): AdminChatMessage => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role,
  content,
  createdAt: new Date().toISOString(),
  sources,
});

const AdminChatPage: React.FC<AdminChatPageProps> = ({ user, onLogout }) => {
  const initialState = useMemo(() => getInitialState(), []);
  const [selectedMode, setSelectedMode] = useState<AdminChatMode>(initialState.selectedMode);
  const [messages, setMessages] = useState<AdminChatMessage[]>(initialState.messages);
  const [input, setInput] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const persistState = (next: ChatLocalState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleModeChange = (mode: AdminChatMode) => {
    setSelectedMode(mode);
    const next = { selectedMode: mode, messages };
    persistState(next);
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    setErrorMessage("");
    persistState({ selectedMode, messages: [] });
  };

  const handleSelectPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const handleSend = async () => {
    if (isPending) return;

    const trimmed = input.trim();
    if (!trimmed) return;

    setErrorMessage("");

    const userMessage = createMessage("user", trimmed);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    persistState({ selectedMode, messages: nextMessages });
    setIsPending(true);

    try {
      const history: AdminChatHistoryItem[] = [
        { role: "system", content: RESPONSE_TEMPLATE_SYSTEM_PROMPT },
        ...nextMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ];

      const response = await api.adminAiChat({
        message: trimmed,
        mode: selectedMode,
        history,
      });

      const assistantMessage = createMessage("assistant", response.answer, response.sources || []);
      const finalMessages = [...nextMessages, assistantMessage];
      setMessages(finalMessages);
      persistState({ selectedMode, messages: finalMessages });
    } catch (error) {
      if (error instanceof HttpStatusError) {
        if (error.status === 401) {
          setErrorMessage("Your session expired. Please sign in again.");
        } else if (error.status === 403) {
          setErrorMessage("You do not have permission to use Admin AI Assistant.");
        } else if (error.status === 429) {
          setErrorMessage("Too many requests. Please wait a moment and retry.");
        } else if (error.status >= 500) {
          setErrorMessage("The AI service is temporarily unavailable. Please try again shortly.");
        } else {
          setErrorMessage(error.message);
        }
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unexpected error while contacting AI service.");
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f5] font-roboto">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Admin AI Assistant" user={user} />
        <main className="flex-1 overflow-hidden p-4 md:p-6">
          <div className="h-full min-h-0">
            <ChatWindow
              selectedMode={selectedMode}
              onModeChange={handleModeChange}
              onNewChat={handleNewChat}
              messages={messages}
              input={input}
              isPending={isPending}
              errorMessage={errorMessage}
              onInputChange={setInput}
              onSend={handleSend}
              onSelectPrompt={handleSelectPrompt}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminChatPage;
