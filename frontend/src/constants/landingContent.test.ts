import { describe, it, expect } from 'vitest';
import {
  HERO_CONTENT,
  HABIT_PHOTO_CONTENT,
  HOW_IT_WORKS_STEPS,
  TOGETHER_CONTENT,
  FAQ_ITEMS,
  OUTRO_CONTENT,
  LANDING_SCREEN_CAPTURES,
} from './landingContent';

describe('랜딩 콘텐츠 모듈 및 정책 일치성 검증 (F02, F04)', () => {
  it('Hero 섹션의 핵심 카피가 프로토타입과 완전히 일치해야 한다', () => {
    expect(HERO_CONTENT.title).toBe('목표는 각자, 꾸준함은 함께.');
    expect(HERO_CONTENT.subtitle).toContain('인증하고 기록해요');
    expect(HERO_CONTENT.primaryCta).toBe('친구들과 시작하기');
    expect(HERO_CONTENT.chips.length).toBeGreaterThanOrEqual(3);
  });

  it('3단계 사용 방법이 순서대로 명확히 정의되어 있어야 한다', () => {
    expect(HOW_IT_WORKS_STEPS).toHaveLength(3);
    expect(HOW_IT_WORKS_STEPS.map((s) => s.step)).toEqual([1, 2, 3]);
    expect(HOW_IT_WORKS_STEPS[0].title).toBe('오늘 할 일 확인');
    expect(HOW_IT_WORKS_STEPS[1].title).toBe('사진으로 인증');
    expect(HOW_IT_WORKS_STEPS[2].title).toBe('연속 기록 쌓기');
  });

  it('FAQ 항목들이 프로덕션 배포 정책(0원 설정 가능, 자동 출금 없음)과 정확히 일치해야 한다', () => {
    expect(FAQ_ITEMS).toHaveLength(4);

    const feeFaq = FAQ_ITEMS.find((f) => f.id === 'faq-fee-deposit');
    expect(feeFaq).toBeDefined();
    expect(feeFaq?.answer).toContain('0원');
    expect(feeFaq?.answer).toContain('자동 출금이나 강제 결제 기능은 일절 없습니다');

    const differentGoalsFaq = FAQ_ITEMS.find((f) => f.id === 'faq-different-goals');
    expect(differentGoalsFaq?.answer).toContain('자유롭게');
  });

  it('콘텐츠에 검증되지 않은 과장/허위 표현이 포함되지 않아야 한다', () => {
    const allTexts = [
      HERO_CONTENT.title,
      HERO_CONTENT.subtitle,
      HABIT_PHOTO_CONTENT.title,
      HABIT_PHOTO_CONTENT.description,
      ...HOW_IT_WORKS_STEPS.map((s) => s.title + ' ' + s.description),
      TOGETHER_CONTENT.title,
      TOGETHER_CONTENT.description,
      ...FAQ_ITEMS.map((f) => f.question + ' ' + f.answer),
      OUTRO_CONTENT.title,
      OUTRO_CONTENT.description,
    ].join(' ');

    // 금지어 체크
    expect(allTexts).not.toContain('100% 성공 보장');
    expect(allTexts).not.toContain('자동 출금됩니다');
    expect(allTexts).not.toContain('유료 결제');
  });

  it('5종 주요 화면 자산에 고정 종횡비 및 접근성 대체 텍스트가 모두 정의되어 있어야 한다', () => {
    const requiredKeys = ['feed', 'calendar', 'today', 'groupNew', 'verificationModal'];
    expect(Object.keys(LANDING_SCREEN_CAPTURES)).toEqual(expect.arrayContaining(requiredKeys));

    for (const key of requiredKeys) {
      const asset = LANDING_SCREEN_CAPTURES[key];
      expect(asset.id).toBeTruthy();
      expect(asset.title).toBeTruthy();
      expect(asset.caption).toBeTruthy();
      expect(asset.alt).toBeTruthy();
      expect(asset.width).toBeGreaterThan(0);
      expect(asset.height).toBeGreaterThan(0);
      expect(asset.aspectRatio).toMatch(/^\d+\/\d+$/);
      expect(asset.webpPath).toMatch(/^\/landing\/assets\/captures\/.*\.webp$/);
      expect(asset.pngPath).toMatch(/^\/landing\/assets\/captures\/.*\.png$/);
    }
  });

  it('실제 빌드 에셋 디렉토리에 캡처된 WebP 및 PNG 파일이 존재해야 한다', () => {
    // Vite 번들러 레벨에서 public 디렉토리 내 캡처 파일들을 glob으로 검증
    const webpFiles = import.meta.glob('/public/landing/assets/captures/*.webp');
    const pngFiles = import.meta.glob('/public/landing/assets/captures/*.png');

    for (const asset of Object.values(LANDING_SCREEN_CAPTURES)) {
      const webpKey = `/public${asset.webpPath}`;
      const pngKey = `/public${asset.pngPath}`;

      expect(webpFiles[webpKey], `WebP 파일 누락: ${webpKey}`).toBeDefined();
      expect(pngFiles[pngKey], `PNG 파일 누락: ${pngKey}`).toBeDefined();
    }
  });
});
