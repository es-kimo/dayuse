import { describe, it, expect } from 'vitest';
import { COIN_MOTION_DURATION, COIN_REWARD_CUES, sampleCoinMotion } from './coinMotion';

describe('sampleCoinMotion', () => {
  it('정지 상태는 처음부터 크기와 자세 변화 없이 완료된다', () => {
    expect(sampleCoinMotion('still', 0)).toEqual({ height: 0, angle: 0, scale: 1, roll: 0, done: true });
  });

  it('헤더는 18도 이내의 반응 후 720ms에 제자리로 돌아온다', () => {
    for (let time = 0; time <= 720; time += 10) {
      const pose = sampleCoinMotion('tilt', time);
      expect(Math.abs(pose.angle)).toBeLessThanOrEqual(Math.PI / 10);
      expect(pose.height).toBeLessThanOrEqual(0.015);
      expect(pose.scale).toBe(1);
      expect(pose.roll).toBe(0);
    }
    expect(sampleCoinMotion('tilt', 360).angle).toBeGreaterThan(0);
    expect(sampleCoinMotion('tilt', 719).done).toBe(false);
    expect(sampleCoinMotion('tilt', 720)).toEqual(sampleCoinMotion('still', 0));
  });

  it('보상은 준비 동작 후 솟아오르고 착지 시 한 바퀴를 완성한다', () => {
    const prepare = sampleCoinMotion('reveal', COIN_REWARD_CUES.launch);
    expect(prepare.height).toBeLessThan(0);
    expect(prepare.scale).toBeLessThan(1);
    expect(prepare.angle).toBe(0);
    const peak = sampleCoinMotion('reveal', 650);
    expect(peak.height).toBeCloseTo(0.22);
    expect(peak.scale).toBeCloseTo(1.12);
    const impact = sampleCoinMotion('reveal', COIN_REWARD_CUES.impact);
    expect(impact.angle).toBeCloseTo(Math.PI * 2);
    expect(impact.scale).toBeGreaterThan(1);
    expect(sampleCoinMotion('reveal', 1540).height).toBeGreaterThan(impact.height);
  });

  it('모든 프레임이 카메라 안에 머물고 높이·회전·크기가 갑자기 튀지 않는다', () => {
    let previous = sampleCoinMotion('reveal', 0);
    for (let time = 1; time <= COIN_MOTION_DURATION.reveal; time++) {
      const pose = sampleCoinMotion('reveal', time);
      // Coin radius is 0.5; the reward camera's vertical half extent is 0.85.
      expect(Math.abs(pose.height) + pose.scale * 0.51).toBeLessThan(0.85);
      expect(Math.abs(pose.height - previous.height)).toBeLessThan(0.002);
      expect(Math.abs(pose.angle - previous.angle)).toBeLessThan(0.012);
      expect(Math.abs(pose.scale - previous.scale)).toBeLessThan(0.002);
      previous = pose;
    }
  });

  it('금액 적립이 끝난 뒤에는 정면의 원래 크기로 멈추고 다시 회전하지 않는다', () => {
    const end = sampleCoinMotion('reveal', COIN_MOTION_DURATION.reveal);
    expect(end).toEqual({ height: 0, angle: Math.PI * 2, scale: 1, roll: 0, done: true });
    expect(sampleCoinMotion('reveal', COIN_MOTION_DURATION.reveal - 1).done).toBe(false);
    expect(sampleCoinMotion('reveal', 100_000)).toEqual(end);
    expect(COIN_REWARD_CUES.impact).toBeLessThan(COIN_REWARD_CUES.countEnd);
    expect(COIN_REWARD_CUES.countEnd).toBeLessThan(COIN_MOTION_DURATION.reveal);
  });

  it('음수 시간은 시작 자세로 고정되고 호출 빈도는 같은 시점의 자세를 바꾸지 않는다', () => {
    expect(sampleCoinMotion('reveal', -10)).toEqual(sampleCoinMotion('reveal', 0));
    const expected = sampleCoinMotion('reveal', 700);
    for (let time = 0; time < 700; time += 1000 / 30) sampleCoinMotion('reveal', time);
    expect(sampleCoinMotion('reveal', 700)).toEqual(expected);
  });
});
