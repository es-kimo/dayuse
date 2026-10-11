import { useEffect, useRef, useState } from 'react';
import { DayuseCoin } from '../coin/DayuseCoin';
import { getMyCoinBalance } from '../../api/coin';
import { useAuth } from '../../context/AuthContext';
import './coinBalanceBadge.css';

/** Key the wallet by user so an account switch never exposes the previous balance. */
export function CoinBalanceBadge() {
  const { user } = useAuth();
  return user ? <WalletBalance key={user.id} /> : null;
}

function WalletBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [bump, setBump] = useState(0);
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    let active = true;
    let request = 0;
    let previous: number | null = null;
    const refresh = async () => {
      const current = ++request;
      try {
        const wallet = await getMyCoinBalance();
        if (!active || current !== request) return;
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

  const label = unavailable ? '코인 잔액을 확인하지 못했어요. 눌러서 다시 확인'
    : balance === null ? '보유 코인 불러오는 중' : `사용 가능한 코인 ${balance.toLocaleString()}개. 눌러서 새로고침`;
  const amount = balance === null ? '···' : balance < 10_000 ? balance.toLocaleString()
    : new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 }).format(balance);

  return (
    <button type="button" className="coin-wallet focus-ring" aria-label={label} title={label}
      onClick={() => { setBump((value) => value + 1); refreshRef.current(); }}>
      <span className={`coin-wallet__content ${bump ? 'coin-wallet__content--bump' : ''}`}>
        <DayuseCoin variant="header" motion={bump ? 'flip' : 'still'} trigger={bump} />
        <span key={bump} aria-hidden="true" className="coin-wallet__amount">{unavailable ? '—' : amount}</span>
      </span>
    </button>
  );
}
