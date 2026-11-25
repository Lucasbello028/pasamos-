import React from 'react';

function renderInlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-[#2B2B2B]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

interface FormattedMessageProps {
  content: string;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ content }) => {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let listItems: { ordered: boolean; text: string }[] = [];

  const flushList = (keyPrefix: string) => {
    if (listItems.length === 0) return;
    const isOrdered = listItems[0].ordered;
    const Tag = isOrdered ? 'ol' : 'ul';
    blocks.push(
      <Tag
        key={`${keyPrefix}-list-${blocks.length}`}
        className={`my-2.5 space-y-1.5 pl-5 text-[15px] leading-relaxed text-[#38342E] ${
          isOrdered ? 'list-decimal' : 'list-disc marker:text-[#C5A059]'
        }`}
      >
        {listItems.map((item, idx) => (
          <li key={idx} className="pl-1">
            {renderInlineBold(item.text)}
          </li>
        ))}
      </Tag>
    );
    listItems = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(`empty-${index}`);
      return;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
    const orderedMatch = line.match(/^(\d+)[.)]\s+(.*)$/);

    if (bulletMatch) {
      if (listItems.length > 0 && listItems[0].ordered) {
        flushList(`switch-${index}`);
      }
      listItems.push({ ordered: false, text: bulletMatch[1] });
      return;
    }

    if (orderedMatch) {
      if (listItems.length > 0 && !listItems[0].ordered) {
        flushList(`switch-${index}`);
      }
      listItems.push({ ordered: true, text: orderedMatch[2] });
      return;
    }

    flushList(`line-${index}`);

    if (line.startsWith('### ')) {
      blocks.push(
        <h4
          key={`h4-${index}`}
          className="font-display text-base font-semibold text-[#2B2B2B] mt-3.5 mb-1.5"
        >
          {renderInlineBold(line.slice(4))}
        </h4>
      );
      return;
    }

    if (line.startsWith('## ')) {
      blocks.push(
        <h3
          key={`h3-${index}`}
          className="font-display text-lg font-semibold text-[#2B2B2B] mt-4 mb-1.5"
        >
          {renderInlineBold(line.slice(3))}
        </h3>
      );
      return;
    }

    blocks.push(
      <p
        key={`p-${index}`}
        className="text-[15px] leading-relaxed text-[#38342E] my-2 first:mt-0 last:mb-0"
      >
        {renderInlineBold(line)}
      </p>
    );
  });

  flushList('final');

  return <div className="space-y-1">{blocks}</div>;
};
