import { describe, it, expect } from 'vitest';
import { getResultSentiment } from './challengeResultSentiment';

describe('getResultSentiment 감정 UX 및 접근성 유틸', () => {
  it('목표를 완주한 경우 축하 문구와 축하 효과 플래그를 반환한다', () => {
    const res = getResultSentiment({
      status: 'CONFIRMED',
      isSuccess: true,
      completedCount: 7,
      targetCount: 7,
      isRevised: false,
      prefersReducedMotion: false,
    });

    expect(res.headline).toBe('끝까지 해냈어요! 🎉');
    expect(res.badgeText).toBe('목표 달성');
    expect(res.badgeTone).toBe('emerald');
    expect(res.showCelebration).toBe(true);
  });

  it('OS 동작 줄이기(prefersReducedMotion)가 켜져 있으면 완주했더라도 축하 효과(애니메이션)를 비활성화한다', () => {
    const res = getResultSentiment({
      status: 'CONFIRMED',
      isSuccess: true,
      completedCount: 7,
      targetCount: 7,
      isRevised: false,
      prefersReducedMotion: true,
    });

    expect(res.headline).toBe('끝까지 해냈어요! 🎉');
    expect(res.showCelebration).toBe(false);
  });

  it('일부만 실천한 경우 실천 횟수 존중 문구와 amber 배지를 반환한다', () => {
    const res = getResultSentiment({
      status: 'CONFIRMED',
      isSuccess: false,
      completedCount: 3,
      targetCount: 7,
    });

    expect(res.headline).toBe('이번 도전에서 3번 실천했어요! 💪');
    expect(res.badgeText).toBe('3회 실천');
    expect(res.badgeTone).toBe('amber');
    expect(res.showCelebration).toBe(false);
  });

  it('0회 실천한 경우에도 실패라는 부정적 낙인 없이 존중 문구를 안내한다', () => {
    const res = getResultSentiment({
      status: 'CONFIRMED',
      isSuccess: false,
      completedCount: 0,
      targetCount: 7,
    });

    expect(res.headline).toBe('이번 도전에서 0번 실천했어요 🌱');
    expect(res.badgeText).toBe('도전 완료');
    expect(res.badgeTone).toBe('slate');
    expect(res.showCelebration).toBe(false);
  });

  it('중단된 챌린지는 사유를 표시하고 축하 효과를 배제한다', () => {
    const res = getResultSentiment({
      status: 'ABORTED',
      isSuccess: false,
      completedCount: 5,
      targetCount: 7,
      abortReason: '모임장의 요청으로 종료',
    });

    expect(res.headline).toBe('챌린지가 중단되었어요');
    expect(res.subline).toContain('중단 사유: 모임장의 요청으로 종료');
    expect(res.badgeText).toBe('중단됨');
    expect(res.badgeTone).toBe('slate');
    expect(res.showCelebration).toBe(false);
  });

  it('결과가 보정된 경우(isRevised=true) "결과가 수정됐어요" 배지를 달고 축하 효과를 중복 재생하지 않는다', () => {
    const res = getResultSentiment({
      status: 'CONFIRMED',
      isSuccess: true,
      completedCount: 7,
      targetCount: 7,
      isRevised: true,
      prefersReducedMotion: false,
    });

    expect(res.badgeText).toBe('결과가 수정됐어요');
    expect(res.showCelebration).toBe(false);
  });
});
