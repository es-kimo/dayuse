import { describe, it, expect } from 'vitest';
import { resolveKakaoImageUrl } from './kakao';

describe('resolveKakaoImageUrl', () => {
  it('상대 경로를 현재 오리진 기준 절대 URL로 올린다', () => {
    expect(resolveKakaoImageUrl('/assets/brand/og-invite.png', 'https://dayuse.kr')).toBe(
      'https://dayuse.kr/assets/brand/og-invite.png'
    );
  });

  it('localhost 오리진은 카카오가 받아갈 수 있는 공개 도메인으로 바꾼다', () => {
    expect(resolveKakaoImageUrl('/assets/brand/og-invite.png', 'http://localhost:5173')).toBe(
      'https://dayuse.kr/assets/brand/og-invite.png'
    );
  });

  it('쿼리스트링이 붙은 OG 엔드포인트도 경로와 쿼리를 함께 살린다', () => {
    expect(resolveKakaoImageUrl('http://localhost:8080/api/v1/x/og.jpg?v=2', 'http://localhost:5173')).toBe(
      'https://dayuse.kr/api/v1/x/og.jpg?v=2'
    );
  });

  it('SVG와 빈 값, 잘못된 URL은 쓸 수 없다고 판정한다', () => {
    expect(resolveKakaoImageUrl('/favicon.svg', 'https://dayuse.kr')).toBeNull();
    expect(resolveKakaoImageUrl(undefined, 'https://dayuse.kr')).toBeNull();
    expect(resolveKakaoImageUrl('', 'https://dayuse.kr')).toBeNull();
    expect(resolveKakaoImageUrl('data:image/png;base64,AAAA', 'https://dayuse.kr')).toBeNull();
  });
});
