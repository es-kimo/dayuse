export type CoinMotion = 'still' | 'flip' | 'toss';

export const COIN_MOTION_DURATION = { still: 0, flip: 850, toss: 1650 } as const;

/** Absolute time keeps the same trajectory across frame rates and background pauses. */
export function sampleCoinMotion(motion: CoinMotion, elapsed: number) {
  const duration = COIN_MOTION_DURATION[motion];
  const time = Math.max(0, Math.min(duration, elapsed));
  const progress = duration === 0 ? 1 : time / duration;
  const ease = 1 - (1 - progress) ** 3;
  let height = 0;
  if (motion === 'flip') height = Math.sin(Math.PI * progress) * 0.09;
  if (motion === 'toss') {
    if (time < 800) height = 0.72 * 4 * (time / 800) * (1 - time / 800);
    else if (time < 1080) height = 0.16 * Math.sin(Math.PI * (time - 800) / 280);
    else if (time < 1260) height = 0.05 * Math.sin(Math.PI * (time - 1080) / 180);
  }
  return {
    height,
    angle: ease * Math.PI * (motion === 'toss' ? 6 : motion === 'flip' ? 2 : 0),
    settle: motion === 'toss' ? Math.max(0, (time - 1080) / (duration - 1080)) : 1,
    done: time >= duration,
  };
}
