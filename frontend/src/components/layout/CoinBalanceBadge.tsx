import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DayuseCoin } from '../coin/DayuseCoin';
import { RedayTicket } from '../brand/RedayTicket';
import { getMyCoinBalance } from '../../api/coin';
import { redayApi } from '../../api/reday';
import { useAuth } from '../../context/AuthContext';
import './coinBalanceBadge.css';

/** Key the wallet by user so an account switch never exposes the previous balance. */
export function CoinBalanceBadge() {
  const { user } = useAuth();
  return user ? <WalletBalance key={user.id} /> : null;
}

function WalletBalance() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number | null>(null);
  const [tickets, setTickets] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [bump, setBump] = useState(0);
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    let active = true;
    let request = 0;
    let previous: number | null = null;
    const refresh = async () => {
      const current = ++request;
      // 티켓 잔액은 보조 정보라 실패해도 코인 표시에 영향을 주지 않는다.
      const ticketRequest = redayApi.getTicketBalance().then((value) => value.availableCount, () => null);
      try {
        const wallet = await getMyCoinBalance();
        const ticketCount = await ticketRequest;
        if (!active || current !== request) return;
        if (ticketCount !== null) setTickets(ticketCount);
        setBalance(wallet.availableBalance);
        setUnavailable(false);
        if (previous !== null && previous !== wallet.availableBalance) setBump((value) => value + 1);
        previous = wallet.availableBalance;
      } catch {
        if (active && current === request) setUnavailable(true);
      }
    };
    const refreshVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    refreshRef.current = refresh;
    void refresh();
    window.addEventListener('focus', refreshVisible);
    window.addEventListener('dayu:coin-balance-changed', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    const interval = window.setInterval(refreshVisible, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshVisible);
      window.removeEventListener('dayu:coin-balance-changed', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
    };
  }, []);

  const label = unavailable ? '코인 잔액을 확인하지 못했어요. 내 보상에서 다시 확인'
    : balance === null ? '보유 코인 불러오는 중' : `사용 가능한 코인 ${balance.toLocaleString()}개${tickets === null ? '' : `, 리데이 티켓 ${tickets}장`}. 내 보상 보기`;
  const amount = balance === null ? '···' : balance < 10_000 ? balance.toLocaleString()
    : new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 }).format(balance);

  return (
    <button type="button" className="coin-wallet focus-ring inline-flex h-9 min-w-16 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-0 transition-[background] duration-180 ease-[ease] hover:bg-slate-50 active:bg-slate-100 motion-reduce:transition-none motion-reduce:[&_*]:animate-none! motion-reduce:[&_*]:transition-none!" aria-label={label} title={label}
      onClick={() => { setBump((value) => value + 1); refreshRef.current(); navigate('/rewards'); }}>
      <span className="coin-wallet__content inline-flex items-center gap-0.5">
        <DayuseCoin variant="header" motion={bump ? 'tilt' : 'still'} trigger={bump} />
        <span key={amount} aria-hidden="true" className="coin-wallet__amount min-w-[3ch] animate-[dayu-wallet-update_220ms_ease-out] text-right text-sm leading-none font-bold tracking-[-0.02em] whitespace-nowrap text-[#475569] tabular-nums">{unavailable ? '—' : amount}</span>
        {tickets !== null && (
          <>
            <i aria-hidden="true" className="mx-1.5 h-3.5 w-px bg-slate-900/20" />
            <RedayTicket size={24} />
            <span aria-hidden="true" className="min-w-[1ch] text-right text-sm leading-none font-bold tracking-[-0.02em] text-[#475569] tabular-nums">{tickets}</span>
          </>
        )}
      </span>
    </button>
  );
}
