import { useEffect, useRef } from 'react';
import coinFront from '../../../../brand/dayuse-coin/renders/coin-front.png';
import type { CoinMotion } from './coinMotion';
import type { CoinScene } from './coinScene';

export function DayuseCoin({
  variant = 'icon', motion = 'still', trigger = 0, className = '', onReady,
}: {
  variant?: 'icon' | 'header' | 'reward';
  motion?: CoinMotion;
  trigger?: number;
  className?: string;
  onReady?: (available: boolean) => void;
}) {
  const host = useRef<HTMLSpanElement>(null);
  const scene = useRef<CoinScene | null>(null);
  const latestMotion = useRef(motion);
  const readyCallback = useRef(onReady);

  useEffect(() => { readyCallback.current = onReady; }, [onReady]);

  useEffect(() => {
    latestMotion.current = motion;
    scene.current?.play(motion);
  }, [motion, trigger]);

  useEffect(() => {
    if (variant === 'icon') return;
    const element = host.current!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let generation = 0;
    const configure = () => {
      const current = ++generation;
      scene.current?.dispose();
      scene.current = null;
      if (reduced.matches) {
        readyCallback.current?.(false);
        return;
      }
      void import('./coinScene').then(({ createCoinScene }) => {
        if (current !== generation) return;
        scene.current = createCoinScene(element, variant, latestMotion.current, available => readyCallback.current?.(available));
      }).catch((error: unknown) => {
        if (current === generation) {
          console.error('데이유즈 코인 3D 로딩 실패. 정지 이미지로 표시합니다.', error);
          readyCallback.current?.(false);
        }
      });
    };
    configure();
    reduced.addEventListener('change', configure);
    return () => {
      generation++;
      reduced.removeEventListener('change', configure);
      scene.current?.dispose();
      scene.current = null;
    };
  }, [variant]);

  const sizeClass = variant === 'reward' ? 'h-full w-[220px]' : variant === 'header' ? 'size-[26px]' : 'size-[1em]';
  const imageClass = variant === 'reward'
    ? 'top-1/2 left-1/2 h-[58.82%] w-[64.18%] [transform:translate(-50%,-50%)_scale(1.38)]'
    : `inset-0 size-full ${variant === 'header' ? '[transform:scale(1.19)]' : '[transform:scale(1.38)]'}`;

  return (
    <span ref={host} className={`dayuse-coin dayuse-coin--${variant} group/coin pointer-events-none relative inline-block shrink-0 align-middle ${sizeClass} [&>canvas]:absolute [&>canvas]:inset-0 [&>canvas]:block [&>canvas]:size-full [&>canvas]:opacity-0 [&>canvas]:transition-opacity [&>canvas]:duration-[240ms] [&>canvas]:ease-[ease] [&[data-ready]>canvas]:opacity-100 motion-reduce:[&>canvas]:transition-none ${className}`} aria-hidden="true">
      <img className={`absolute block object-contain transition-opacity duration-[240ms] ease-[ease] group-data-[ready]/coin:opacity-0 motion-reduce:transition-none ${imageClass}`} src={coinFront} alt="" draggable={false} />
    </span>
  );
}
