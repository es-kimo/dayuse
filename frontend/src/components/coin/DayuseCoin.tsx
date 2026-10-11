import { useEffect, useRef } from 'react';
import coinFront from '../../../../brand/dayuse-coin/renders/coin-front.png';
import coinTilt from '../../../../brand/dayuse-coin/renders/coin-tilt.png';
import type { CoinMotion } from './coinMotion';
import type { CoinScene } from './coinScene';
import './dayuseCoin.css';

export function DayuseCoin({
  variant = 'icon', motion = 'still', trigger = 0, className = '',
}: {
  variant?: 'icon' | 'header' | 'reward';
  motion?: CoinMotion;
  trigger?: number;
  className?: string;
}) {
  const host = useRef<HTMLSpanElement>(null);
  const scene = useRef<CoinScene | null>(null);
  const latestMotion = useRef(motion);

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
      if (reduced.matches) return;
      void import('./coinScene').then(({ createCoinScene }) => {
        if (current !== generation) return;
        scene.current = createCoinScene(element, variant, latestMotion.current);
      }).catch((error: unknown) => {
        if (current === generation) console.error('데이유즈 코인 3D 로딩 실패. 정지 이미지로 표시합니다.', error);
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

  return (
    <span ref={host} className={`dayuse-coin dayuse-coin--${variant} ${className}`} aria-hidden="true">
      <img src={variant === 'reward' ? coinTilt : coinFront} alt="" draggable={false} />
    </span>
  );
}
