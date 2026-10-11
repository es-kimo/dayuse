import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { DayuseCoin } from '../coin/DayuseCoin';
import { COIN_REWARD_CUES } from '../coin/coinMotion';
import './coinReward.css';

/** The amount is an already-granted reward, never an optimistic wallet balance. */
export function CoinReward({ amount, animate }: { amount: number; animate: boolean }) {
  const [displayAmount, setDisplayAmount] = useState(animate ? 0 : amount);
  const [presentation, setPresentation] = useState<'loading' | 'animated' | 'static'>(animate ? 'loading' : 'static');
  const onReady = useCallback((available: boolean) => {
    setPresentation(animate && available ? 'animated' : 'static');
  }, [animate]);
  useEffect(() => {
    if (animate && presentation === 'loading') return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const start = performance.now();
    const finish = () => {
      cancelAnimationFrame(frame);
      setDisplayAmount(amount);
    };
    const tick = (now: number) => {
      const progress = Math.max(0, Math.min(1, (now - start - COIN_REWARD_CUES.impact) / (COIN_REWARD_CUES.countEnd - COIN_REWARD_CUES.impact)));
      setDisplayAmount(Math.round(amount * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    if (animate && presentation === 'animated' && !motion.matches) frame = requestAnimationFrame(tick);
    else finish();
    motion.addEventListener('change', finish);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener('change', finish);
    };
  }, [amount, animate, presentation]);

  return (
    <div className={`coin-reward ${animate && presentation === 'animated' ? 'coin-reward--animated' : ''}`} style={{
      '--impact': `${COIN_REWARD_CUES.impact}ms`,
      '--count-end': `${COIN_REWARD_CUES.countEnd}ms`,
    } as CSSProperties}>
      <div className="coin-reward__stage" aria-hidden="true">
        <div className="coin-reward__halo" />
        <div className="coin-reward__ring" />
        <div className="coin-reward__ring coin-reward__ring--echo" />
        {animate && Array.from({ length: 8 }, (_, index) => (
          <span key={index} className="coin-reward__particle" style={{
            '--x': `${Math.cos(index * Math.PI / 4) * 105}px`,
            '--y': `${Math.sin(index * Math.PI / 4) * 68 - 8}px`,
            '--scatter-delay': `${index * 18}ms`,
            '--spin': `${index % 2 ? -150 : 150}deg`,
          } as CSSProperties}><DayuseCoin className="coin-reward__mini" /></span>
        ))}
        <DayuseCoin variant="reward" motion={animate ? 'reveal' : 'still'} onReady={onReady} />
        <div className="coin-reward__shadow" />
      </div>
      <p className="coin-reward__amount" aria-label={`${amount.toLocaleString()} 코인 적립 완료`}>
        <span aria-hidden="true">+{displayAmount.toLocaleString()}<span className="coin-reward__unit"> 코인</span></span>
      </p>
      <p className="mt-2 text-[14px] font-semibold text-slate-500">내 코인에 차곡차곡 담았어요</p>
    </div>
  );
}
