import { useEffect, useState } from 'react';
import { DayuseCoin } from '../coin/DayuseCoin';
import './coinReward.css';

/** The amount is an already-granted reward, never an optimistic wallet balance. */
export function CoinReward({ amount, animate }: { amount: number; animate: boolean }) {
  const [displayAmount, setDisplayAmount] = useState(animate ? 0 : amount);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const start = performance.now();
    const finish = () => {
      cancelAnimationFrame(frame);
      setDisplayAmount(amount);
    };
    const tick = (now: number) => {
      const progress = Math.max(0, Math.min(1, (now - start - 1300) / 1700));
      setDisplayAmount(Math.round(amount * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    if (animate && !motion.matches) frame = requestAnimationFrame(tick);
    else finish();
    motion.addEventListener('change', finish);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener('change', finish);
    };
  }, [amount, animate]);

  return (
    <div className={`coin-reward ${animate ? 'coin-reward--animated' : ''}`}>
      <div className="coin-reward__stage" aria-hidden="true">
        <div className="coin-reward__halo" />
        <div className="coin-reward__ring" />
        <DayuseCoin variant="reward" motion={animate ? 'reveal' : 'still'} />
        <div className="coin-reward__shadow" />
      </div>
      <p className="coin-reward__amount" aria-label={`${amount.toLocaleString()} 코인 적립 완료`}>
        <span aria-hidden="true">+{displayAmount.toLocaleString()}<span className="coin-reward__unit"> 코인</span></span>
      </p>
      <p className="mt-2 text-[14px] font-semibold text-slate-500">내 코인에 차곡차곡 담았어요</p>
    </div>
  );
}
