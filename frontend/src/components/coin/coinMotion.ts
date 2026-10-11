export type CoinMotion = 'still' | 'tilt' | 'reveal';

export const COIN_REWARD_CUES = { launch: 220, impact: 1350, countEnd: 2300 } as const;
export const COIN_MOTION_DURATION = { still: 0, tilt: 720, reveal: 2750 } as const;

const rewardPoses = [
  { time: 0, height: 0, scale: 1, roll: 0 },
  { time: COIN_REWARD_CUES.launch, height: -0.04, scale: 0.92, roll: -0.08 },
  { time: 650, height: 0.22, scale: 1.12, roll: 0.12 },
  { time: COIN_REWARD_CUES.impact, height: -0.025, scale: 1.09, roll: -0.035 },
  { time: 1540, height: 0.06, scale: 1.03, roll: 0.02 },
  { time: 1820, height: 0, scale: 1, roll: 0 },
];

/** Absolute time keeps the same trajectory across frame rates and background pauses. */
export function sampleCoinMotion(motion: CoinMotion, elapsed: number) {
  const duration = COIN_MOTION_DURATION[motion];
  const time = Math.max(0, Math.min(duration, elapsed));
  const progress = duration === 0 ? 1 : time / duration;
  let height = 0;
  let angle = 0;
  let scale = 1;
  let roll = 0;
  if (motion === 'tilt' && progress < 1) {
    const pulse = Math.sin(Math.PI * progress) ** 2;
    height = pulse * 0.015;
    angle = pulse * Math.PI / 10;
  }
  if (motion === 'reveal') {
    const spin = Math.max(0, Math.min(1, (time - COIN_REWARD_CUES.launch) / (COIN_REWARD_CUES.impact - COIN_REWARD_CUES.launch)));
    angle = Math.PI * 2 * (spin ** 3 * (spin * (spin * 6 - 15) + 10));
    const next = rewardPoses.findIndex(pose => pose.time > time);
    if (next > 0) {
      const from = rewardPoses[next - 1];
      const to = rewardPoses[next];
      const phase = (time - from.time) / (to.time - from.time);
      const blend = phase * phase * (3 - 2 * phase);
      height = from.height + (to.height - from.height) * blend;
      scale = from.scale + (to.scale - from.scale) * blend;
      roll = from.roll + (to.roll - from.roll) * blend;
    }
  }
  return {
    height,
    angle,
    scale,
    roll,
    done: time >= duration,
  };
}
