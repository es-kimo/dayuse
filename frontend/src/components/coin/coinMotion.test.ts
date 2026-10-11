import { describe, it, expect } from 'vitest';
import { sampleCoinMotion } from './coinMotion';

describe('sampleCoinMotion', () => {
  it('정지 상태는 처음부터 회전과 높이 변화 없이 완료된다', () => {
    expect(sampleCoinMotion('still', 0)).toEqual({ height: 0, angle: 0, settle: 1, done: true });
  });

  it('헤더 회전은 850ms에 한 바퀴를 마치고 제자리로 돌아온다', () => {
    expect(sampleCoinMotion('flip', 849).done).toBe(false);
    const final = sampleCoinMotion('flip', 850);
    expect(final.angle).toBeCloseTo(Math.PI * 2);
    expect(final.height).toBeCloseTo(0);
    expect(final.done).toBe(true);
  });

  it('보상 튕김은 반동이 점점 작아지고 1650ms에 정착한다', () => {
    // 각 포물선·반동 구간의 중간 시점에서 최고 높이를 비교한다.
    expect(sampleCoinMotion('toss', 400).height).toBeCloseTo(0.72);
    expect(sampleCoinMotion('toss', 940).height).toBeCloseTo(0.16);
    expect(sampleCoinMotion('toss', 1170).height).toBeCloseTo(0.05);
    expect(sampleCoinMotion('toss', 1649).done).toBe(false);
    expect(sampleCoinMotion('toss', 1650)).toEqual({
      height: 0, angle: Math.PI * 6, settle: 1, done: true,
    });
  });

  it('음수 시간은 시작 자세, 종료 이후 시간은 마지막 자세로 고정된다', () => {
    for (const motion of ['flip', 'toss'] as const) {
      expect(sampleCoinMotion(motion, -100)).toEqual(sampleCoinMotion(motion, 0));
      expect(sampleCoinMotion(motion, 100_000)).toEqual(sampleCoinMotion(motion, motion === 'flip' ? 850 : 1650));
    }
  });

  it('프레임 간격과 관계없이 같은 경과 시간에는 같은 자세를 반환한다', () => {
    const target = sampleCoinMotion('toss', 700);
    for (let time = 0; time < 700; time += 1000 / 30) sampleCoinMotion('toss', time);
    expect(sampleCoinMotion('toss', 700)).toEqual(target);
    expect(target.height).toBeGreaterThan(0);
    expect(target.done).toBe(false);
  });
});
