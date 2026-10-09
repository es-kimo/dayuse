import React, { useMemo } from 'react';
import { parseAnnouncementBlocks, parseInlineTokens, type BlockToken } from '../../utils/announcementFormat';

interface AnnouncementBodyRendererProps {
  body: string;
  className?: string;
}

export const AnnouncementBodyRenderer: React.FC<AnnouncementBodyRendererProps> = ({
  body,
  className = '',
}) => {
  const blocks = useMemo(() => parseAnnouncementBlocks(body), [body]);

  const renderInline = (text: string) => {
    const tokens = parseInlineTokens(text);
    return tokens.map((token, index) => {
      if (token.type === 'bold') {
        return (
          <strong key={index} className="font-semibold text-ink">
            {token.content}
          </strong>
        );
      }
      if (token.type === 'italic') {
        return (
          <em key={index} className="italic text-ink-secondary">
            {token.content}
          </em>
        );
      }
      return <React.Fragment key={index}>{token.content}</React.Fragment>;
    });
  };

  return (
    <div className={`space-y-4 break-words text-body-sm leading-relaxed text-ink-secondary ${className}`}>
      {blocks.map((block: BlockToken, blockIndex: number) => {
        if (block.type === 'heading') {
          return block.level === 2 ? (
            <h2
              key={blockIndex}
              className="mt-7 mb-3 border-l-[3px] border-primary pl-3 text-title-sm font-bold tracking-tight text-ink first:mt-0"
            >
              {renderInline(block.text)}
            </h2>
          ) : (
            <h3
              key={blockIndex}
              className="mt-5 mb-2 text-body-sm font-bold tracking-tight text-ink first:mt-0"
            >
              {renderInline(block.text)}
            </h3>
          );
        }

        if (block.type === 'list') {
          return (
            <ul key={blockIndex} className="space-y-2 text-ink-secondary">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex items-start gap-3 rounded-xl bg-page px-3.5 py-3 leading-relaxed">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="min-w-0">{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={blockIndex} className="whitespace-pre-line leading-relaxed">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
};
