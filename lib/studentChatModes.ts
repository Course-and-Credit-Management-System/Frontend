import { ModeMetaMap } from "../types/studentChat";

export const modeMeta: ModeMetaMap = {
  auto: {
    label: "Auto",
    description: "Smartly picks the best academic mode based on your prompt.",
    examples: [
      "Help me plan next semester with 15 credits.",
      "What should I focus on this week academically?",
    ],
  },
  course_selection: {
    label: "Course Selection",
    description: "Suggests course combinations while considering workload and fit.",
    examples: [
      "Pick 4 balanced courses for next term.",
      "Suggest a schedule with two labs and one elective.",
    ],
  },
  course_stats: {
    label: "Course Stats",
    description: "Explains historical course trends, pass rates, and difficulty signals.",
    examples: [
      "Show me performance trends for Data Structures.",
      "Which course has lower failure risk between A and B?",
    ],
  },
  academic_progress: {
    label: "Academic Progress",
    description: "Tracks completion status and identifies gaps in your progress.",
    examples: [
      "How close am I to graduation credits?",
      "What milestones am I missing this year?",
    ],
  },
  major_requirements: {
    label: "Major Requirements",
    description: "Checks required major courses and what remains unfinished.",
    examples: [
      "Which core courses are still pending for my major?",
      "Can you list remaining requirements by semester?",
    ],
  },
  announcements: {
    label: "Announcements",
    description: "Summarizes important university and department announcements.",
    examples: [
      "Any urgent announcements for students this week?",
      "Summarize academic notices I should not miss.",
    ],
  },
  policy_general: {
    label: "Policy & General",
    description: "Answers general policy questions with student-friendly explanations.",
    examples: [
      "What is the late registration policy?",
      "How does add/drop week work?",
    ],
  },
  course_advisor: {
    label: "Course Advisor",
    description: "Gives deep advice focused on a specific course context.",
    examples: [
      "How should I prepare for the midterm in this course?",
      "Break down a study strategy for this class.",
    ],
  },
};

export const modeOrder = Object.keys(modeMeta) as Array<keyof typeof modeMeta>;
