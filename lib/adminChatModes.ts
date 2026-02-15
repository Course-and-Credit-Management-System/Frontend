import { AdminModeMetaMap } from "../types/adminChat";

export const adminModeMeta: AdminModeMetaMap = {
  auto: {
    label: "Auto",
    description: "Intelligently routes administrative queries to the appropriate system tools.",
    examples: [
      "Summarize current enrollment trends.",
      "Are there any pending system alerts?",
    ],
  },
  enrollment_management: {
    label: "Enrollment Management",
    description: "Deep dive into course capacities, waitlists, and student registrations.",
    examples: [
      "Which courses are over capacity this semester?",
      "Analyze waitlist patterns for core CS courses.",
    ],
  },
  course_planning: {
    label: "Course Planning",
    description: "Assists in curriculum management and scheduling strategies.",
    examples: [
      "Propose a balanced schedule for next year's electives.",
      "Check for scheduling conflicts in the Science department.",
    ],
  },
  announcement_strategy: {
    label: "Announcement Strategy",
    description: "Helps draft and target administrative communications.",
    examples: [
      "Draft an urgent announcement about the system maintenance.",
      "Who should receive the notice about graduation deadline?",
    ],
  },
  student_performance: {
    label: "Student Performance",
    description: "Analyzes aggregate student data and grading trends.",
    examples: [
      "What is the average GPA distribution for this year's seniors?",
      "Identify courses with unusually high failure rates.",
    ],
  },
  system_health: {
    label: "System Health",
    description: "Monitors administrative system logs and performance metrics.",
    examples: [
      "Show me the system log for the last 24 hours.",
      "Report any API latency issues from this morning.",
    ],
  },
};

export const adminModeOrder = Object.keys(adminModeMeta) as Array<keyof typeof adminModeMeta>;
