import React from "react";
import { Link, useLocation } from "react-router-dom";

interface StudentChatTriggerProps {
  visible: boolean;
}

const StudentChatTrigger: React.FC<StudentChatTriggerProps> = ({ visible }) => {
  const location = useLocation();
  const hideOnCourseDetail =
    location.pathname.startsWith("/student/courses/") ||
    location.pathname.startsWith("/student/enrollment/view/");

  if (!visible || location.pathname === "/student/chatbot" || hideOnCourseDetail) {
    return null;
  }

  return (
    <Link
      to="/student/chatbot"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#1f6f5f] text-white shadow-[0_8px_20px_rgba(31,111,95,0.35)] transition hover:bg-[#185a4e] focus:outline-none focus:ring-2 focus:ring-[#1f6f5f]/40"
      aria-label="Open Student AI Chatbot"
      title="Student AI Chatbot"
    >
      <span className="material-icons-outlined">smart_toy</span>
    </Link>
  );
};

export default StudentChatTrigger;
