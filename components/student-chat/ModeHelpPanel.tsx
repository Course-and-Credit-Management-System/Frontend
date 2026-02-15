import React from "react";
import { ModeMetaItem } from "../../types/studentChat";

interface ModeHelpPanelProps {
  modeLabel: string;
  meta: ModeMetaItem;
}

const ModeHelpPanel: React.FC<ModeHelpPanelProps> = ({ modeLabel, meta }) => {
  return (
    <section className="rounded-[8px] border border-[#cccccc] bg-white p-4 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-poppins text-sm font-semibold text-[#333333]">{meta.label}</h3>
        <span className="rounded-full bg-[#edf4f2] px-2 py-0.5 text-xs font-medium text-[#1f6f5f]">
          {modeLabel}
        </span>
      </div>
      <p className="mb-3 text-sm text-[#666666]">{meta.description}</p>
      <div className="space-y-2">
        {meta.examples.map((example) => (
          <p key={example} className="rounded-[6px] bg-[#f5f5f5] px-3 py-2 text-xs text-[#333333]">
            {example}
          </p>
        ))}
      </div>
      {meta.requiresCourseId && (
        <p className="mt-3 text-xs text-[#077d8a]">
          This mode requires a course ID (example: `CST-1010`).
        </p>
      )}
    </section>
  );
};

export default ModeHelpPanel;
