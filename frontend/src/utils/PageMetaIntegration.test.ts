import { describe, it, expect, beforeEach } from 'vitest';
import { resolvePageMeta, updateDocumentMeta, BRAND_DEFAULT_OG, BRAND_SHARE_OG } from './meta';

describe('PageMetaIntegration (BR-04, BR-05, BR-06 Integration)', () => {
  beforeEach(() => {
    // DOM head 리셋
    document.title = '';
    document.head.innerHTML = '';
  });

  const getMeta = (selector: string): string | null => {
    const el = document.querySelector(selector);
    return el ? el.getAttribute('content') : null;
  };

  it('홈(/) 방문 시 공개 검색엔진 인덱싱 허용 및 기본 브랜드 OG를 DOM에 반영한다', () => {
    const meta = resolvePageMeta('/');
    updateDocumentMeta(meta);

    expect(document.title).toBe('dayuse · 목표는 각자, 꾸준함은 함께');
    expect(getMeta('meta[name="description"]')).toBe('친구들과 각자의 챌린지를 인증하고 기록해요.');
    expect(getMeta('meta[name="robots"]')).toBe('index, follow');
    expect(getMeta('meta[property="og:title"]')).toBe('dayuse · 목표는 각자, 꾸준함은 함께');
    expect(getMeta('meta[property="og:image"]')).toContain(BRAND_DEFAULT_OG);
    expect(getMeta('meta[name="twitter:image"]')).toContain(BRAND_DEFAULT_OG);
  });

  it('비공개 모임(/groups/123) 및 챌린지(/challenges/456)는 robots noindex 처리되고 개인정보가 메타에 격리된다', () => {
    const groupMeta = resolvePageMeta('/groups/123');
    updateDocumentMeta(groupMeta);

    expect(document.title).toBe('모임 · dayuse');
    expect(getMeta('meta[name="robots"]')).toBe('noindex, nofollow');
    expect(getMeta('meta[name="description"]')).toBe('친구들과 각자의 챌린지를 인증하고 기록해요.');
    expect(getMeta('meta[property="og:image"]')).toContain(BRAND_DEFAULT_OG);

    const challengeMeta = resolvePageMeta('/challenges/456');
    updateDocumentMeta(challengeMeta);

    expect(document.title).toBe('챌린지 · dayuse');
    expect(getMeta('meta[name="robots"]')).toBe('noindex, nofollow');
    expect(getMeta('meta[property="og:image"]')).toContain(BRAND_DEFAULT_OG);
  });

  it('비공개 인증(/today, /verify) 페이지는 robots noindex 처리되고 기본 브랜드 OG를 유지한다', () => {
    const todayMeta = resolvePageMeta('/today');
    updateDocumentMeta(todayMeta);

    expect(document.title).toBe('인증 · dayuse');
    expect(getMeta('meta[name="robots"]')).toBe('noindex, nofollow');
  });

  it('모임 초대 링크(/invite/abc-token)는 robots noindex 처리되며 전용 초대 안내 메타를 반영한다', () => {
    const inviteMeta = resolvePageMeta('/invite/secret-token-123');
    updateDocumentMeta(inviteMeta);

    expect(document.title).toBe('모임 초대 · dayuse');
    expect(getMeta('meta[name="description"]')).toBe('dayuse 모임에 초대되었습니다.');
    expect(getMeta('meta[name="robots"]')).toBe('noindex, nofollow');
  });

  it('공개 공유 카드(/shares/uuid)는 noindex를 유지하면서 커스텀 설명과 공유 전용 OG 이미지를 정상 반영한다', () => {
    const shareMeta = resolvePageMeta('/shares/550e8400-e29b-41d4-a716-446655440000', {
      customShareDescription: '홍길동님이 7일 연속 인증을 달성했어요.',
      customShareImage: BRAND_SHARE_OG,
    });
    updateDocumentMeta(shareMeta);

    expect(document.title).toBe('챌린지 기록 · dayuse');
    expect(getMeta('meta[name="description"]')).toBe('홍길동님이 7일 연속 인증을 달성했어요.');
    expect(getMeta('meta[name="robots"]')).toBe('noindex, nofollow');
    expect(getMeta('meta[property="og:image"]')).toContain(BRAND_SHARE_OG);
  });

  it('만료되었거나 존재하지 않는 페이지는 안전한 안내(NOT_FOUND) 메타데이터로 즉시 격리된다', () => {
    const notFoundMeta = resolvePageMeta('/unknown-route', { isNotFound: true });
    updateDocumentMeta(notFoundMeta);

    expect(document.title).toBe('페이지 안내 · dayuse');
    expect(getMeta('meta[name="description"]')).toBe('존재하지 않거나 만료된 페이지입니다.');
    expect(getMeta('meta[name="robots"]')).toBe('noindex, nofollow');
    expect(getMeta('meta[property="og:image"]')).toContain(BRAND_DEFAULT_OG);
  });

  it('기존 메타 태그가 이미 존재하는 경우 중복 태그를 생성하지 않고 content 속성만 갱신한다', () => {
    // 1차 적용: 홈
    updateDocumentMeta(resolvePageMeta('/'));
    expect(document.querySelectorAll('meta[name="description"]').length).toBe(1);

    // 2차 적용: 로그인
    updateDocumentMeta(resolvePageMeta('/login'));
    expect(document.querySelectorAll('meta[name="description"]').length).toBe(1);
    expect(document.title).toBe('로그인 · dayuse');
    expect(getMeta('meta[name="robots"]')).toBe('noindex, nofollow');
  });
});
