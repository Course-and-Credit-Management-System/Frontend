import React from "react";
import { Link, useLocation } from "react-router-dom";

interface AdminChatTriggerProps {
  visible: boolean;
}

const AdminChatTrigger: React.FC<AdminChatTriggerProps> = ({ visible }) => {
  const location = useLocation();

  if (!visible || location.pathname === "/admin/chatbot") {
    return null;
  }

  return (
    <Link
      to="/admin/chatbot"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#1f6f5f] text-white shadow-[0_8px_20px_rgba(31,111,95,0.35)] transition hover:bg-[#185a4e] focus:outline-none focus:ring-2 focus:ring-[#1f6f5f]/40"
      aria-label="Open Admin AI Assistant"
      title="Admin AI Assistant"
    >
      <span className="material-icons-outlined">smart_toy</span>
    </Link>
  );
};

export default AdminChatTrigger;
