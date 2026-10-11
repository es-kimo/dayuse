import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shirt, AlertCircle, Plus, Minus, Clock, Check, ChevronRight } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { useBackNavigation } from '../hooks/useBackNavigation';
import { useAuth } from '../context/AuthContext';
import { DayuseCoin } from '../components/coin/DayuseCoin';
import { getMyCoinBalance, getMyCoinTransactions } from '../api/coin';
import type { CoinBalanceResponse, CoinTransactionResponse } from '../api/coin';
import { ProgressBar, Chip, Card, Button } from '../components/dayu/ui';

export const CoinPage: React.FC = () => {
  const navigate = useNavigate();
  const handleBack = useBackNavigation('/today');
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [wallet, setWallet] = useState<CoinBalanceResponse | null>(null);
  const [transactions, setTransactions] = useState<CoinTransactionResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login?redirect=/coins');
      return;
    }
    if (isAuthenticated) {
      void fetchCoinData();
    }
  }, [authLoading, isAuthenticated]);

  const fetchCoinData = async () => {
    setLoading(true);
    setError('');
    try {
      const [walletData, txPage] = await Promise.all([
        getMyCoinBalance(),
        getMyCoinTransactions(0, 30),
      ]);
      setWallet(walletData);
      setTransactions(txPage.content);
    } catch {
      setError('코인 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const available = wallet?.availableBalance ?? 0;
  const ready = !loading && !error && wallet !== null;

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-app flex-col bg-slate-50 font-sans text-slate-800">
      <AppHeader variant="sub" title="내 코인" onBack={handleBack} />

      <main className="flex flex-1 flex-col gap-[14px] px-4 pt-1 pb-12" aria-busy={loading}>
        <Card tone="hero">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-500">차곡차곡 모은 내 코인</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <DayuseCoin variant="reward" className="size-8 shrink-0" />
                <span className="break-all text-[32px] font-extrabold leading-tight tracking-tight tabular-nums">
                  {ready ? available.toLocaleString() : '—'}
                </span>
                <span className="text-[15px] font-bold text-slate-500">코인</span>
              </div>
            </div>
            <img src="/assets/brand/expressions/dayu-cheer-blue.svg" alt="" className="size-16 shrink-0" />
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-slate-600">
            하루하루 실천이 코인으로 쌓여요.<br />
            챌린지 인정 날짜마다 <strong className="font-bold text-blue-600">10코인</strong>을 모을 수 있어요.
          </p>
          {ready && wallet.heldBalance > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-white px-3 py-2.5 text-[12px] text-slate-600">
              <Clock className="mt-0.5 size-3.5 shrink-0" />
              <p><strong className="font-semibold">{wallet.heldBalance.toLocaleString()}코인 확인 중</strong><br />확인이 끝나면 보유 코인에 더해져요.</p>
            </div>
          )}
        </Card>

        {loading ? (
          <Card className="py-10 text-center text-[13px] text-slate-500" role="status">코인을 불러오는 중이에요...</Card>
        ) : error ? (
          <Card className="flex flex-col items-center gap-3 py-8 text-center" role="alert">
            <AlertCircle className="size-6 text-slate-400" />
            <p className="text-[14px] text-slate-600">코인 정보를 불러오지 못했어요.</p>
            <Button variant="line" size="sm" onClick={() => void fetchCoinData()}>다시 불러오기</Button>
          </Card>
        ) : (
          <>
            <Card>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[15px] font-bold">코인으로 만날 굿즈</h2>
                <Chip tone="gray">오픈 준비 중</Chip>
              </div>
              <p className="mt-1 text-[12.5px] text-slate-500">꾸준히 모아서 데이유 굿즈와 만나요.</p>
              <div className="mt-4 space-y-5">
                {[{ name: '데이유 티셔츠', goal: 3600 }, { name: '데이유 후디', goal: 7200 }].map(({ name, goal }) => {
                  const remaining = Math.max(0, goal - available);
                  return (
                    <div key={name}>
                      <div className="mb-2.5 flex items-center gap-2.5">
                        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
                          <Shirt className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[13px] font-bold">{name}</h3>
                          <p className="mt-0.5 text-[12px] text-slate-500">{goal.toLocaleString()}코인</p>
                        </div>
                        {remaining === 0 && <Chip tone="ok"><Check className="size-3" />목표 달성</Chip>}
                      </div>
                      <div aria-label={`${name} 목표 진행률`}>
                        <ProgressBar value={Math.max(0, Math.min(1, available / goal))} />
                      </div>
                      <p className="mt-2 text-[12px] text-slate-500">
                        {remaining > 0 ? <><strong className="font-semibold text-blue-600">{remaining.toLocaleString()}코인</strong> 더 모으면 목표 달성!</> : '목표를 채웠어요! 교환 오픈을 기다려 주세요.'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[15px] font-bold">코인 내역</h2>
                <span className="text-[12px] text-slate-400">최근 30건</span>
              </div>
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <DayuseCoin className="mb-3 size-10" />
                  <p className="text-[14px] font-bold text-slate-700">첫 코인을 모아볼까요?</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">오늘의 작은 실천부터 시작해 보세요.</p>
                  <Button variant="line" size="sm" className="mt-4" onClick={() => navigate('/today')}>
                    오늘의 챌린지 보기<ChevronRight className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="mt-2 divide-y divide-slate-100">
                  {transactions.map((tx) => {
                    const isHeld = tx.type === 'HOLD' || tx.status === 'HELD';
                    const isAdd = tx.type === 'GRANT' || tx.type === 'ADJUSTMENT_ADD' || tx.type === 'RELEASE';
                    const label = isHeld ? '확인 중' : tx.type === 'REJECT' ? '적립 취소' : isAdd ? '코인 적립' : '코인 차감';
                    return (
                      <div key={tx.id} className="flex items-start gap-2.5 py-3.5">
                        <div className={`grid size-8 shrink-0 place-items-center rounded-[11px] ${isHeld ? 'bg-amber-50 text-amber-700' : isAdd ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                          {isHeld ? <Clock className="size-4" /> : isAdd ? <Plus className="size-4" /> : <Minus className="size-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                            <p className="text-[13px] font-bold">{label}</p>
                            <span className={`text-[14px] font-bold tabular-nums ${isHeld ? 'text-amber-700' : isAdd ? 'text-blue-600' : 'text-slate-600'}`}>
                              {isHeld ? '' : isAdd ? '+' : '−'}{tx.amount.toLocaleString()} 코인
                            </span>
                          </div>
                          {tx.reason && <p className="mt-1 break-words text-[12px] leading-relaxed text-slate-600">{tx.reason}</p>}
                          <p className="mt-1 text-[11.5px] text-slate-400">{tx.targetDate} · 잔액 {tx.balanceAfter.toLocaleString()}코인</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
};
