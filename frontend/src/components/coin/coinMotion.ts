export type CoinMotion = 'still' | 'tilt' | 'reveal';

export const COIN_MOTION_DURATION = { still: 0, tilt: 720, reveal: 2200 } as const;

/** Absolute time keeps the same trajectory across frame rates and background pauses. */
export function sampleCoinMotion(motion: CoinMotion, elapsed: number) {
  const duration = COIN_MOTION_DURATION[motion];
  const time = Math.max(0, Math.min(duration, elapsed));
  const progress = duration === 0 ? 1 : time / duration;
  const ease = progress ** 3 * (progress * (progress * 6 - 15) + 10);
  let height = 0;
  let angle = 0;
  if (motion === 'tilt' && progress < 1) {
    const pulse = Math.sin(Math.PI * progress) ** 2;
    height = pulse * 0.015;
    angle = pulse * Math.PI / 10;
  }
  if (motion === 'reveal' && progress < 1) {
    height = 0.18 * (1 - ease);
    angle = -0.9 * (1 - ease);
  }
  return {
    height,
    angle,
    done: time >= duration,
  };
}
