import { describe, it, expect } from 'vitest';
import { sampleCoinMotion } from './coinMotion';

describe('sampleCoinMotion', () => {
  it('정지 상태는 처음부터 회전과 높이 변화 없이 완료된다', () => {
    expect(sampleCoinMotion('still', 0)).toEqual({ height: 0, angle: 0, done: true });
  });

  it('헤더는 로고를 가리지 않는 18도 이내의 반응 후 720ms에 제자리로 돌아온다', () => {
    for (let time = 0; time <= 720; time += 10) {
      const pose = sampleCoinMotion('tilt', time);
      expect(Math.abs(pose.angle)).toBeLessThanOrEqual(Math.PI / 10);
      expect(pose.height).toBeLessThanOrEqual(0.015);
    }
    expect(sampleCoinMotion('tilt', 360).angle).toBeGreaterThan(0);
    expect(sampleCoinMotion('tilt', 719).done).toBe(false);
    expect(sampleCoinMotion('tilt', 720)).toEqual(sampleCoinMotion('still', 0));
  });

  it('보상은 높이를 유지한 채 3초에 한 바퀴 돌고 정면에서 멈춘다', () => {
    expect(sampleCoinMotion('reveal', 0).angle).toBe(0);
    expect(sampleCoinMotion('reveal', 1500).angle).toBeCloseTo(Math.PI);
    expect(sampleCoinMotion('reveal', 2999).done).toBe(false);
    expect(sampleCoinMotion('reveal', 3000)).toEqual({ height: 0, angle: Math.PI * 2, done: true });
    for (let time = 0; time <= 3000; time += 10) {
      const pose = sampleCoinMotion('reveal', time);
      expect(pose.angle).toBeGreaterThanOrEqual(0);
      expect(pose.angle).toBeLessThanOrEqual(Math.PI * 2);
      expect(pose.height).toBe(0);
    }
  });

  it('보상 자세가 프레임 사이에 튀지 않고 처음과 끝에서 천천히 움직인다', () => {
    const start = sampleCoinMotion('reveal', 0);
    expect(Math.abs(sampleCoinMotion('reveal', 16).angle - start.angle)).toBeLessThan(0.001);
    expect(Math.abs(Math.PI * 2 - sampleCoinMotion('reveal', 2984).angle)).toBeLessThan(0.001);
    for (let time = 16; time <= 3000; time += 16) {
      const step = sampleCoinMotion('reveal', time).angle - sampleCoinMotion('reveal', time - 16).angle;
      expect(step).toBeGreaterThanOrEqual(0);
      expect(step).toBeLessThan(0.07);
    }
  });

  it('음수 시간은 시작 자세, 종료 이후 시간은 마지막 자세로 고정된다', () => {
    for (const motion of ['tilt', 'reveal'] as const) {
      expect(sampleCoinMotion(motion, -100)).toEqual(sampleCoinMotion(motion, 0));
      expect(sampleCoinMotion(motion, 100_000)).toEqual(sampleCoinMotion(motion, motion === 'tilt' ? 720 : 3000));
    }
  });

  it('프레임 간격과 관계없이 같은 경과 시간에는 같은 자세를 반환한다', () => {
    const target = sampleCoinMotion('reveal', 700);
    for (let time = 0; time < 700; time += 1000 / 30) sampleCoinMotion('reveal', time);
    expect(sampleCoinMotion('reveal', 700)).toEqual(target);
    expect(target.angle).toBeGreaterThan(0);
    expect(target.done).toBe(false);
  });
});
