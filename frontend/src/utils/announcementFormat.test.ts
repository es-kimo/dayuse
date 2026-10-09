import { describe, it, expect } from 'vitest';
import {
  parseInlineTokens,
  parseAnnouncementBlocks,
  formatAnnouncementDate,
  formatAnnouncementUpdatedTime,
} from './announcementFormat';

describe('announcementFormat', () => {
  describe('parseInlineTokens', () => {
    it('인라인 bold 및 italic 서식을 올바르게 분리한다', () => {
      const text = '새로운 **기능**과 *포인트* 안내';
      const tokens = parseInlineTokens(text);

      expect(tokens).toEqual([
        { type: 'text', content: '새로운 ' },
        { type: 'bold', content: '기능' },
        { type: 'text', content: '과 ' },
        { type: 'italic', content: '포인트' },
        { type: 'text', content: ' 안내' },
      ]);
    });

    it('서식이 없는 일반 텍스트는 단일 text 토큰으로 반환한다', () => {
      const text = '일반 텍스트 내용입니다.';
      const tokens = parseInlineTokens(text);

      expect(tokens).toEqual([{ type: 'text', content: text }]);
    });
  });

  describe('parseAnnouncementBlocks', () => {
    it('소제목, 목록, 일반 문단을 올바르게 블록으로 파싱한다', () => {
      const markdown = `
## 주요 변경 사항
새로운 기능이 출시되었습니다.
더욱 편리하게 이용해보세요.

- 첫 번째 항목
- 두 번째 항목

### 사용 방법
인증 화면에서 확인하세요.
`;

      const blocks = parseAnnouncementBlocks(markdown);

      expect(blocks).toHaveLength(5);
      expect(blocks[0]).toEqual({
        type: 'heading',
        level: 2,
        text: '주요 변경 사항',
      });
      expect(blocks[1]).toEqual({
        type: 'paragraph',
        text: '새로운 기능이 출시되었습니다.\n더욱 편리하게 이용해보세요.',
      });
      expect(blocks[2]).toEqual({
        type: 'list',
        items: ['첫 번째 항목', '두 번째 항목'],
      });
      expect(blocks[3]).toEqual({
        type: 'heading',
        level: 3,
        text: '사용 방법',
      });
      expect(blocks[4]).toEqual({
        type: 'paragraph',
        text: '인증 화면에서 확인하세요.',
      });
    });

    it('빈 본문은 빈 배열을 반환한다', () => {
      expect(parseAnnouncementBlocks('')).toEqual([]);
      expect(parseAnnouncementBlocks('   \n  ')).toEqual([]);
    });
  });

  describe('formatAnnouncementDate', () => {
    it('ISO 날짜 문자열을 "YYYY. MM. DD." 형식으로 변환한다', () => {
      expect(formatAnnouncementDate('2026-10-09T12:00:00')).toBe('2026. 10. 09.');
      expect(formatAnnouncementDate(null)).toBe('');
      expect(formatAnnouncementDate(undefined)).toBe('');
    });
  });

  describe('formatAnnouncementUpdatedTime', () => {
    it('게시 시각 대비 수정 시각이 존재하면 "YYYY. MM. DD. HH:mm 수정됨" 문자열을 반환한다', () => {
      const publishAt = '2026-10-09T10:00:00';
      const updatedAt = '2026-10-09T14:30:00';
      expect(formatAnnouncementUpdatedTime(publishAt, updatedAt)).toBe('2026. 10. 09. 14:30 수정됨');
    });

    it('게시 시각과 수정 시각이 거의 같은 경우 null을 반환한다', () => {
      const time = '2026-10-09T10:00:00';
      expect(formatAnnouncementUpdatedTime(time, time)).toBeNull();
    });

    it('updatedAt이 없으면 null을 반환한다', () => {
      expect(formatAnnouncementUpdatedTime('2026-10-09T10:00:00', null)).toBeNull();
    });
  });
});
