/**
 * 새로운 소식 서식 파서 및 안전 렌더링 유틸리티 (F09).
 *
 * 허용 서식:
 * 1. 소제목 (라인 시작 '### ' 또는 '## ')
 * 2. 목록 아이템 (라인 시작 '- ' 또는 '* ')
 * 3. 강조 (**bold**, *italic*)
 * 4. 일반 문단 (줄바꿈 구분)
 *
 * 엄격한 금지 사항:
 * - 임의의 raw HTML 태그 (<script>, <iframe 등)
 * - 외부 링크 마크다운 ([text](http://...))
 * - 위험한 URL 스키마
 */

export interface InlineToken {
  type: 'text' | 'bold' | 'italic';
  content: string;
}

export type BlockToken =
  | { type: 'heading'; level: number; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; text: string };

/**
 * 인라인 서식 (**bold**, *italic*) 파싱
 */
export function parseInlineTokens(rawText: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  // bold: \*\*([^*]+)\*\*, italic: \*([^*]+)\*
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(rawText)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        content: rawText.substring(lastIndex, match.index),
      });
    }

    if (match[2] !== undefined) {
      // Bold
      tokens.push({
        type: 'bold',
        content: match[2],
      });
    } else if (match[3] !== undefined) {
      // Italic
      tokens.push({
        type: 'italic',
        content: match[3],
      });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < rawText.length) {
    tokens.push({
      type: 'text',
      content: rawText.substring(lastIndex),
    });
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', content: rawText }];
}

/**
 * 블록 단위 파싱 (Heading, List, Paragraph)
 */
export function parseAnnouncementBlocks(rawBody: string): BlockToken[] {
  if (!rawBody || !rawBody.trim()) {
    return [];
  }

  const lines = rawBody.split(/\r?\n/);
  const blocks: BlockToken[] = [];
  let currentListItems: string[] | null = null;
  let currentParagraphLines: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: currentParagraphLines.join('\n').trim(),
      });
      currentParagraphLines = [];
    }
  };

  const flushList = () => {
    if (currentListItems && currentListItems.length > 0) {
      blocks.push({
        type: 'list',
        items: [...currentListItems],
      });
      currentListItems = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    // 소제목 파싱 (### 또는 ##)
    const headingMatch = line.match(/^(#{2,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    // 목록 아이템 파싱 (- 또는 *)
    const listMatch = line.match(/^[-*]\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      if (!currentListItems) {
        currentListItems = [];
      }
      currentListItems.push(listMatch[1].trim());
      continue;
    }

    // 일반 텍스트 라인
    flushList();
    currentParagraphLines.push(rawLine);
  }

  flushParagraph();
  flushList();

  return blocks;
}
