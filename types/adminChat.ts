export type AdminChatMode =
  | "auto"
  | "enrollment_management"
  | "course_planning"
  | "announcement_strategy"
  | "student_performance"
  | "system_health";

export type AdminChatRole = "user" | "assistant" | "system";

export interface AdminChatSource {
  text: string;
  source: string;
  score?: number;
}

export interface AdminChatHistoryItem {
  role: AdminChatRole;
  content: string;
}

export interface AdminChatRequest {
  message: string;
  course_id?: string;
  history: AdminChatHistoryItem[];
  mode: AdminChatMode;
}

export interface AdminChatResponse {
  answer: string;
  sources?: AdminChatSource[];
}

export interface AdminChatMessage {
  id: string;
  role: Exclude<AdminChatRole, "system">;
  content: string;
  createdAt: string;
  sources?: AdminChatSource[];
}

export interface AdminModeMetaItem {
  label: string;
  description: string;
  examples: [string, string];
  requiresCourseId?: boolean;
}

export type AdminModeMetaMap = Record<AdminChatMode, AdminModeMetaItem>;
