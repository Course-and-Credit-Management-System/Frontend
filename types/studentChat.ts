export type StudentChatMode =
  | "auto"
  | "course_selection"
  | "course_stats"
  | "academic_progress"
  | "major_requirements"
  | "announcements"
  | "policy_general"
  | "course_advisor";

export type ChatRole = "user" | "assistant" | "system";

export interface StudentChatSource {
  text: string;
  source: string;
  score?: number;
}

export interface StudentChatHistoryItem {
  role: ChatRole;
  content: string;
}

export interface StudentChatRequest {
  message: string;
  mode: StudentChatMode;
  history: StudentChatHistoryItem[];
  course_id?: string;
}

export interface StudentChatResponse {
  answer: string;
  sources?: StudentChatSource[];
}

export interface StudentChatMessage {
  id: string;
  role: Exclude<ChatRole, "system">;
  content: string;
  createdAt: string;
  sources?: StudentChatSource[];
}

export interface ModeMetaItem {
  label: string;
  description: string;
  examples: [string, string];
  requiresCourseId?: boolean;
}

export type ModeMetaMap = Record<StudentChatMode, ModeMetaItem>;
