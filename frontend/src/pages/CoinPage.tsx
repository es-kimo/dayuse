import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shirt, Sparkles, AlertCircle, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2 } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { useBackNavigation } from '../hooks/useBackNavigation';
import { useAuth } from '../context/AuthContext';
import { DayuseCoin } from '../components/coin/DayuseCoin';
import { getMyCoinBalance, getMyCoinTransactions } from '../api/coin';
import type { CoinBalanceResponse, CoinTransactionResponse } from '../api/coin';
import { ProgressBar, Chip } from '../components/dayu/ui';

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
  const tshirtProgress = Math.min(100, Math.round((available / 3600) * 100));
  const hoodieProgress = Math.min(100, Math.round((available / 7200) * 100));

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-app flex-col bg-slate-50 font-sans text-slate-800">
      <AppHeader
        variant="sub"
        title="내 코인"
        onBack={handleBack}
      />

      <main className="flex flex-1 flex-col gap-4 px-4 pt-2 pb-12">
        {/* 잔액 요약 카드 */}
        <div className="relative overflow-hidden rounded-[22px] border border-amber-200/80 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-6 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold tracking-wide text-amber-100">
              보유 코인 잔액
            </span>
            <Chip tone="warn" className="bg-amber-400/30 text-white border-none font-bold">
              적립 전용
            </Chip>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <DayuseCoin variant="reward" motion="tilt" className="size-12 drop-shadow-md" />
            <div className="min-w-0">
              <span className="text-[32px] font-extrabold tracking-tight tabular-nums">
                {available.toLocaleString()}
              </span>
              <span className="ml-1 text-[20px] font-bold text-amber-100">코인</span>
            </div>
          </div>

          {wallet && wallet.heldBalance > 0 && (
            <div className="mt-4 flex items-center gap-1.5 rounded-xl bg-amber-800/40 px-3 py-2 text-[12px] text-amber-100">
              <Clock className="size-3.5 shrink-0" />
              <span>보류 중인 코인: {wallet.heldBalance.toLocaleString()} 코인 (관리자 확인 후 가용 전환)</span>
            </div>
          )}

          <p className="mt-4 text-[12px] text-amber-100/90 leading-relaxed">
            성실히 실천한 챌린지 인정 날짜당 10코인이 적립됩니다.
          </p>
        </div>

        {/* 굿즈 목표액 달성 현황 (PRD 5.3.6) */}
        <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Shirt className="size-4 text-blue-600" />
            <h3 className="text-[15px] font-bold text-slate-800">굿즈 교환 목표</h3>
          </div>

          <div className="space-y-4">
            {/* 티셔츠 */}
            <div>
              <div className="flex items-center justify-between text-[13px] mb-1.5">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  데이유 티셔츠
                  {available >= 3600 && <CheckCircle2 className="size-3.5 text-emerald-600" />}
                </span>
                <span className="font-bold text-slate-500 tabular-nums">
                  {available.toLocaleString()} / 3,600 코인 ({tshirtProgress}%)
                </span>
              </div>
              <ProgressBar value={tshirtProgress} />
            </div>

            {/* 후디 */}
            <div>
              <div className="flex items-center justify-between text-[13px] mb-1.5">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  데이유 후디
                  {available >= 7200 && <CheckCircle2 className="size-3.5 text-emerald-600" />}
                </span>
                <span className="font-bold text-slate-500 tabular-nums">
                  {available.toLocaleString()} / 7,200 코인 ({hoodieProgress}%)
                </span>
              </div>
              <ProgressBar value={hoodieProgress} />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-[11.5px] text-slate-400">
            <Sparkles className="size-3.5 text-amber-500" />
            <span>굿즈 교환 스토어는 추후 오픈될 예정입니다.</span>
          </div>
        </div>

        {/* 거래 원장 내역 */}
        <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-[15px] font-bold text-slate-800 mb-3">적립 및 변동 내역</h3>

          {loading ? (
            <p className="py-8 text-center text-[13px] text-slate-400">내역을 불러오는 중...</p>
          ) : error ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 text-[13px] text-red-700">
              <span className="flex items-center gap-1.5"><AlertCircle className="size-4" />{error}</span>
              <button onClick={() => void fetchCoinData()} className="font-bold underline cursor-pointer">다시 시도</button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-[13px] space-y-1">
              <p>아직 적립된 코인이 없어요.</p>
              <p className="text-[12px] text-slate-400">챌린지를 완주하고 인정 날짜당 10코인을 받아보세요!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.map((tx) => {
                const isAdd = tx.type === 'GRANT' || tx.type === 'ADJUSTMENT_ADD' || tx.type === 'RELEASE';
                const isSub = tx.type === 'ADJUSTMENT_SUB' || tx.type === 'REJECT';
                const isHeld = tx.type === 'HOLD' || tx.status === 'HELD';

                return (
                  <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                        isHeld ? 'bg-amber-100 text-amber-700' :
                        isAdd ? 'bg-emerald-100 text-emerald-700' :
                        isSub ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isAdd ? <ArrowUpRight className="size-4" /> :
                         isSub ? <ArrowDownLeft className="size-4" /> :
                         <Clock className="size-4" />}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[13.5px] font-bold text-slate-800 truncate">
                          {tx.reason || (isAdd ? '코인 적립' : '코인 차감')}
                        </span>
                        <span className="block text-[11.5px] text-slate-400">
                          {tx.targetDate} · 잔액 {tx.balanceAfter.toLocaleString()}코인
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[14px] font-extrabold tabular-nums ${
                        isHeld ? 'text-amber-600' :
                        isAdd ? 'text-emerald-600' :
                        isSub ? 'text-rose-600' : 'text-slate-600'
                      }`}>
                        {isAdd ? `+${tx.amount}` : isSub ? `-${tx.amount}` : `${tx.amount}`} C
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
