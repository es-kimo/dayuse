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
    <div className={`coin-reward group/reward text-center motion-reduce:[&_*]:animate-none! motion-reduce:[&_*::before]:animate-none! ${animate && presentation === 'animated' ? 'coin-reward--animated' : ''}`} data-animated={animate && presentation === 'animated' || undefined} style={{
      '--impact': `${COIN_REWARD_CUES.impact}ms`,
      '--count-end': `${COIN_REWARD_CUES.countEnd}ms`,
    } as CSSProperties}>
      <div className="coin-reward__stage relative isolate grid h-60 place-items-center [@media(max-height:650px)]:h-[180px]" aria-hidden="true">
        <div className="coin-reward__halo absolute -z-1 h-[200px] w-60 rounded-[50%] bg-[radial-gradient(ellipse,#fff3d6_0%,#fffbf0_42%,transparent_72%)] group-data-[animated]/reward:animate-[dayu-reward-glow_1000ms_var(--impact)_ease-out_both]" />
        <div className="coin-reward__ring absolute -z-1 size-[136px] rounded-full border-2 border-[#e8bc54] opacity-0 group-data-[animated]/reward:animate-[dayu-reward-ring_850ms_var(--impact)_cubic-bezier(.16,1,.3,1)_both] motion-reduce:hidden" />
        <div className="coin-reward__ring coin-reward__ring--echo absolute -z-1 size-[136px] rounded-full border border-[#f3d993] opacity-0 group-data-[animated]/reward:animate-[dayu-reward-ring_850ms_calc(var(--impact)+110ms)_cubic-bezier(.16,1,.3,1)_both] motion-reduce:hidden" />
        {animate && Array.from({ length: 8 }, (_, index) => (
          <span key={index} className="coin-reward__particle pointer-events-none absolute top-[calc(50%-10px)] left-[calc(50%-10px)] text-[20px] opacity-0 group-data-[animated]/reward:animate-[dayu-reward-scatter_1050ms_calc(var(--impact)+var(--scatter-delay))_cubic-bezier(.16,1,.3,1)_both] motion-reduce:hidden" style={{
            '--x': `${Math.cos(index * Math.PI / 4) * 105}px`,
            '--y': `${Math.sin(index * Math.PI / 4) * 68 - 8}px`,
            '--scatter-delay': `${index * 18}ms`,
            '--spin': `${index % 2 ? -150 : 150}deg`,
          } as CSSProperties}><DayuseCoin className="coin-reward__mini [filter:drop-shadow(0_2px_2px_#9d70152b)]" /></span>
        ))}
        <DayuseCoin variant="reward" motion={animate ? 'reveal' : 'still'} onReady={onReady} />
        <div className="coin-reward__shadow absolute bottom-[18%] -z-1 h-2 w-[68px] rounded-[50%] bg-[#b48b3420] blur-[5px]" />
      </div>
      <p className="coin-reward__amount text-[clamp(38px,12vw,54px)] leading-[1.15] font-black tracking-[-0.055em] text-[#1e293b] tabular-nums [overflow-wrap:anywhere] group-data-[animated]/reward:animate-[dayu-reward-stamp_450ms_var(--count-end)_cubic-bezier(.2,.8,.2,1)_both]" aria-label={`${amount.toLocaleString()} 코인 적립 완료`}>
        <span aria-hidden="true">+{displayAmount.toLocaleString()}<span className="coin-reward__unit text-[22px] tracking-[-0.03em]"> 코인</span></span>
      </p>
      <p className="mt-2 text-[14px] font-semibold text-slate-500">내 코인에 차곡차곡 담았어요</p>
    </div>
  );
}
