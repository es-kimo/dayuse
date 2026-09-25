import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolvePageMeta,
  updateDocumentMeta,
  BRAND_DEFAULT_OG,
  BRAND_SHARE_OG,
} from './meta';

describe('Page Metadata Engine (BR-04, BR-05)', () => {
  beforeEach(() => {
    // DOM head 초기화
    document.title = '';
    document.head.innerHTML = '';
  });

  describe('1. 페이지별 메타데이터 정책 매핑 검증 (BR-04)', () => {
    it('공개 홈 및 서비스 소개 경로는 공개 타이틀과 index, follow 정책을 갖는다', () => {
      const homeMeta = resolvePageMeta('/');
      expect(homeMeta.title).toBe('dayuse · 목표는 각자, 꾸준함은 함께');
      expect(homeMeta.description).toBe('친구들과 각자의 챌린지를 인증하고 기록해요.');
      expect(homeMeta.ogImage).toBe(BRAND_DEFAULT_OG);
      expect(homeMeta.robots).toBe('index, follow');

      const aboutMeta = resolvePageMeta('/about');
      expect(aboutMeta.title).toBe('dayuse · 목표는 각자, 꾸준함은 함께');
      expect(aboutMeta.robots).toBe('index, follow');
    });

    it('로그인 및 OAuth 콜백 경로는 noindex, nofollow 정책을 갖는다', () => {
      const loginMeta = resolvePageMeta('/login');
      expect(loginMeta.title).toBe('로그인 · dayuse');
      expect(loginMeta.robots).toBe('noindex, nofollow');

      const oauthMeta = resolvePageMeta('/oauth/callback/kakao');
      expect(oauthMeta.title).toBe('로그인 · dayuse');
      expect(oauthMeta.robots).toBe('noindex, nofollow');
    });

    it('비공개 모임 관련 모든 경로는 "모임 · dayuse" 타이틀과 noindex, nofollow를 갖는다', () => {
      const paths = ['/groups', '/groups/new', '/groups/42', '/groups/42/settlements'];
      for (const path of paths) {
        const meta = resolvePageMeta(path);
        expect(meta.title).toBe('모임 · dayuse');
        expect(meta.description).toBe('친구들과 각자의 챌린지를 인증하고 기록해요.');
        expect(meta.ogImage).toBe(BRAND_DEFAULT_OG);
        expect(meta.robots).toBe('noindex, nofollow');
      }
    });

    it('비공개 챌린지 상세 및 생성 경로는 "챌린지 · dayuse" 타이틀과 noindex, nofollow를 갖는다', () => {
      const detailMeta = resolvePageMeta('/challenges/101');
      expect(detailMeta.title).toBe('챌린지 · dayuse');
      expect(detailMeta.robots).toBe('noindex, nofollow');

      const newChallengeMeta = resolvePageMeta('/groups/42/challenges/new');
      expect(newChallengeMeta.title).toBe('챌린지 · dayuse');
      expect(newChallengeMeta.robots).toBe('noindex, nofollow');
    });

    it('비공개 오늘/인증 경로는 "인증 · dayuse" 타이틀과 noindex, nofollow를 갖는다', () => {
      const todayMeta = resolvePageMeta('/today');
      expect(todayMeta.title).toBe('인증 · dayuse');
      expect(todayMeta.robots).toBe('noindex, nofollow');

      const verifyMeta = resolvePageMeta('/verify/record/7');
      expect(verifyMeta.title).toBe('인증 · dayuse');
      expect(verifyMeta.robots).toBe('noindex, nofollow');
    });

    it('모임 초대 수락 경로는 "모임 초대 · dayuse" 타이틀과 noindex, nofollow를 갖는다', () => {
      const inviteMeta = resolvePageMeta('/invite/INVITE_ABC_123');
      expect(inviteMeta.title).toBe('모임 초대 · dayuse');
      expect(inviteMeta.description).toBe('dayuse 모임에 초대되었습니다.');
      expect(inviteMeta.robots).toBe('noindex, nofollow');
    });

    it('공개 공유 카드는 "챌린지 기록 · dayuse" 타이틀과 noindex, nofollow를 갖는다', () => {
      const shareMeta = resolvePageMeta('/shares/UUID_TOKEN_123');
      expect(shareMeta.title).toBe('챌린지 기록 · dayuse');
      expect(shareMeta.description).toBe('챌린지 수행 기록을 확인해보세요.');
      expect(shareMeta.ogImage).toBe(BRAND_SHARE_OG);
      expect(shareMeta.robots).toBe('noindex, nofollow');
    });

    it('정의되지 않은 잘못된 경로는 404 안내 메타데이터로 폴백된다', () => {
      const unknownMeta = resolvePageMeta('/some/random/missing/route');
      expect(unknownMeta.title).toBe('페이지 안내 · dayuse');
      expect(unknownMeta.description).toBe('존재하지 않거나 만료된 페이지입니다.');
      expect(unknownMeta.robots).toBe('noindex, nofollow');
    });
  });

  describe('2. 비공개 리소스 보안 격리 및 개인정보 유출 방지 (BR-05)', () => {
    it('비공개 모임 경로에 악의적이거나 개인화된 데이터 주입을 시도해도 공통 정책으로 강제 격리된다', () => {
      const hostileOptions = {
        customShareDescription: '홍길동님의 비밀 계좌 110-123-456789 모임',
        customShareImage: 'https://malicious.com/private-photo.jpg',
      };

      const meta = resolvePageMeta('/groups/999', hostileOptions);
      // 개인정보가 일체 포함되지 않고 기본 모임 메타데이터로 유지되어야 함
      expect(meta.title).toBe('모임 · dayuse');
      expect(meta.description).toBe('친구들과 각자의 챌린지를 인증하고 기록해요.');
      expect(meta.ogImage).toBe(BRAND_DEFAULT_OG);
      expect(meta.description).not.toContain('홍길동');
      expect(meta.description).not.toContain('110-123');
      expect(meta.ogImage).not.toContain('malicious');
    });

    it('비공개 챌린지 및 초대 경로에서도 주입된 정보가 메타데이터에 반영되지 않는다', () => {
      const hostileOptions = {
        customShareDescription: '특정 비공개 스터디 제목',
        customShareImage: 'https://example.com/leak.jpg',
      };

      const challengeMeta = resolvePageMeta('/challenges/55', hostileOptions);
      expect(challengeMeta.title).toBe('챌린지 · dayuse');
      expect(challengeMeta.description).toBe('친구들과 각자의 챌린지를 인증하고 기록해요.');
      expect(challengeMeta.ogImage).toBe(BRAND_DEFAULT_OG);

      const inviteMeta = resolvePageMeta('/invite/SECRET_CODE', hostileOptions);
      expect(inviteMeta.title).toBe('모임 초대 · dayuse');
      expect(inviteMeta.description).toBe('dayuse 모임에 초대되었습니다.');
    });
  });

  describe('3. 만료 및 404 리소스 안전 폴백 (BR-05)', () => {
    it('공유 카드라도 isNotFound: true 인 경우 즉시 404 안내 메타데이터로 폴백된다', () => {
      const meta = resolvePageMeta('/shares/EXPIRED_TOKEN', { isNotFound: true });
      expect(meta.title).toBe('페이지 안내 · dayuse');
      expect(meta.description).toBe('존재하지 않거나 만료된 페이지입니다.');
      expect(meta.robots).toBe('noindex, nofollow');
    });

    it('isExpired: true 인 경우 이전 개인정보가 남지 않고 404 안내 메타데이터를 반환한다', () => {
      const meta = resolvePageMeta('/shares/EXPIRED_TOKEN', {
        isExpired: true,
        customShareDescription: '과거 홍길동님의 7일 연속 인증',
      });
      expect(meta.title).toBe('페이지 안내 · dayuse');
      expect(meta.description).toBe('존재하지 않거나 만료된 페이지입니다.');
      expect(meta.description).not.toContain('홍길동');
    });
  });

  describe('4. updateDocumentMeta DOM 갱신 기능', () => {
    it('메타데이터 객체에 맞춰 DOM head 요소들을 정확히 생성 및 갱신한다', () => {
      updateDocumentMeta({
        title: '테스트 타이틀 · dayuse',
        description: '테스트 설명입니다.',
        ogImage: '/assets/brand/og-default.png',
        robots: 'noindex, nofollow',
      });

      expect(document.title).toBe('테스트 타이틀 · dayuse');

      const descMeta = document.querySelector('meta[name="description"]');
      expect(descMeta?.getAttribute('content')).toBe('테스트 설명입니다.');

      const robotsMeta = document.querySelector('meta[name="robots"]');
      expect(robotsMeta?.getAttribute('content')).toBe('noindex, nofollow');

      const ogTitle = document.querySelector('meta[property="og:title"]');
      expect(ogTitle?.getAttribute('content')).toBe('테스트 타이틀 · dayuse');

      const ogDesc = document.querySelector('meta[property="og:description"]');
      expect(ogDesc?.getAttribute('content')).toBe('테스트 설명입니다.');

      const ogImage = document.querySelector('meta[property="og:image"]');
      expect(ogImage?.getAttribute('content')).toContain('/assets/brand/og-default.png');

      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      expect(twitterTitle?.getAttribute('content')).toBe('테스트 타이틀 · dayuse');
    });
  });
});
