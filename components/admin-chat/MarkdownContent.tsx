import React from "react";

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; lines: string[] }
  | { type: "hr" };

interface MarkdownContentProps {
  content: string;
}

const renderInline = (text: string, keyPrefix: string) => {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={key} className="rounded bg-[#f0f0f0] px-1 py-0.5 text-[0.92em] font-mono text-[#1f6f5f]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
};

const parseMarkdown = (raw: string): Block[] => {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i += 1;
      continue;
    }

    if (/^---+$/.test(line)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      });
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", lines: quoteLines });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s+/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^>\s?/.test(lines[i].trim()) &&
      !/^---+$/.test(lines[i].trim())
    ) {
      paragraphLines.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
};

const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  const blocks = parseMarkdown(content);

  return (
    <div className="space-y-2 text-sm leading-6">
      {blocks.map((block, index) => {
        const key = `block-${index}`;

        if (block.type === "heading") {
          if (block.level === 1) {
            return (
              <h1 key={key} className="font-poppins text-xl font-semibold">
                {renderInline(block.text, key)}
              </h1>
            );
          }
          if (block.level === 2) {
            return (
              <h2 key={key} className="font-poppins text-lg font-semibold">
                {renderInline(block.text, key)}
              </h2>
            );
          }
          return (
            <h3 key={key} className="font-poppins text-base font-semibold">
              {renderInline(block.text, key)}
            </h3>
          );
        }

        if (block.type === "paragraph") {
          return <p key={key}>{renderInline(block.text, key)}</p>;
        }

        if (block.type === "ul") {
          return (
            <ul key={key} className="list-disc space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-li-${itemIndex}`}>{renderInline(item, `${key}-li-${itemIndex}`)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "ol") {
          return (
            <ol key={key} className="list-decimal space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-li-${itemIndex}`}>{renderInline(item, `${key}-li-${itemIndex}`)}</li>
              ))}
            </ol>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={key}
              className="rounded-[6px] border-l-4 border-[#1f6f5f] bg-[#edf4f2] px-3 py-2 text-[#333333]"
            >
              {block.lines.map((line, lineIndex) => (
                <p key={`${key}-q-${lineIndex}`}>{renderInline(line, `${key}-q-${lineIndex}`)}</p>
              ))}
            </blockquote>
          );
        }

        return <hr key={key} className="border-[#cccccc]" />;
      })}
    </div>
  );
};

export default MarkdownContent;
