import React from "react";
import ModeHelpPanel from "./ModeHelpPanel";
import { modeMeta, modeOrder } from "../../lib/studentChatModes";
import { StudentChatMode } from "../../types/studentChat";

interface ModeSidebarProps {
  selectedMode: StudentChatMode;
  onModeChange: (mode: StudentChatMode) => void;
  courseId: string;
  onCourseIdChange: (value: string) => void;
  onNewChat: () => void;
  onSelectPrompt: (prompt: string) => void;
}

const ModeSidebar: React.FC<ModeSidebarProps> = ({
  selectedMode,
  onModeChange,
  courseId,
  onCourseIdChange,
  onNewChat,
  onSelectPrompt,
}) => {
  return (
    <aside className="h-full rounded-[8px] border border-[#cccccc] bg-white p-4 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-poppins text-base font-semibold text-[#333333]">AI Modes</h2>
        <button
          type="button"
          onClick={onNewChat}
          className="rounded-[6px] bg-[#1f6f5f] px-3 py-2 text-xs font-medium uppercase tracking-wide text-white hover:bg-[#185a4e] focus:outline-none focus:ring-2 focus:ring-[#1f6f5f]/30"
          aria-label="Start new chat"
        >
          New Chat
        </button>
      </div>

      <div className="mb-4 space-y-2">
        {modeOrder.map((mode) => {
          const active = selectedMode === mode;
          const meta = modeMeta[mode];
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onModeChange(mode)}
              className={`w-full rounded-[6px] border px-3 py-2 text-left transition ${
                active
                  ? "border-[#1f6f5f] bg-[#edf4f2] text-[#1f6f5f]"
                  : "border-[#cccccc] bg-white text-[#333333] hover:bg-[#f5f5f5]"
              }`}
              aria-label={`Select ${meta.label} mode`}
              aria-pressed={active}
            >
              <p className="font-poppins text-sm font-medium">{meta.label}</p>
              <p className="text-xs text-[#666666]">{meta.description}</p>
            </button>
          );
        })}
      </div>

      {modeMeta[selectedMode].requiresCourseId && (
        <div className="mb-4 rounded-[6px] bg-[#e6f2fa] p-3">
          <label htmlFor="course-id-input" className="mb-1 block text-xs font-medium text-[#333333]">
            Course ID
          </label>
          <input
            id="course-id-input"
            type="text"
            value={courseId}
            onChange={(event) => onCourseIdChange(event.target.value)}
            placeholder="Enter course_id"
            className="w-full rounded-[6px] border border-[#cccccc] bg-white px-3 py-2 text-sm text-[#333333] focus:border-[#1f6f5f] focus:outline-none focus:ring-2 focus:ring-[#1f6f5f]/20"
            aria-label="Course ID for course advisor mode"
          />
          <p className="mt-1 text-xs text-[#666666]">
            Required for course-specific advising responses.
          </p>
        </div>
      )}

      <ModeHelpPanel modeLabel={selectedMode} meta={modeMeta[selectedMode]} />

      <div className="mt-4">
        <h3 className="mb-2 font-poppins text-xs font-semibold uppercase tracking-wide text-[#666666]">
          Quick Prompts
        </h3>
        <div className="space-y-2">
          {modeMeta[selectedMode].examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onSelectPrompt(example)}
              className="w-full rounded-[6px] border border-[#cccccc] bg-white px-3 py-2 text-left text-xs text-[#333333] hover:bg-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#1f6f5f]/20"
              aria-label={`Use quick prompt: ${example}`}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default ModeSidebar;
