import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SettlementSummary, GroupAccountPayload } from '../types';
import { settlementApi } from '../api/settlement';
import {
  CreditCard,
  Copy,
  Check,
  AlertCircle,
  Settings,
  ChevronRight,
  Send,
  Loader2,
  X,
  Wallet,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface GroupSettlementCardProps {
  groupId: number;
  isHost: boolean;
  summary: SettlementSummary | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenDepositModal: () => void;
}

export const GroupSettlementCard: React.FC<GroupSettlementCardProps> = ({
  groupId,
  isHost,
  summary,
  loading,
  onRefresh,
  onOpenDepositModal,
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  const account = summary?.account;

  const handleCopyAccount = () => {
    if (!account) return;
    const textToCopy = `${account.bankName} ${account.accountNumber} ${account.accountHolder}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenEditAccount = () => {
    setBankName(account?.bankName || '');
    setAccountNumber(account?.accountNumber || '');
    setAccountHolder(account?.accountHolder || '');
    setIsEditingAccount(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      alert('모든 계좌 정보를 입력해 주세요.');
      return;
    }

    setSavingAccount(true);
    try {
      const payload: GroupAccountPayload = {
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim(),
      };
      await settlementApi.updateGroupAccount(groupId, payload);
      setIsEditingAccount(false);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to update group account:', err);
      alert(err.response?.data?.message || '계좌 정보 저장에 실패했습니다.');
    } finally {
      setSavingAccount(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-4">
      {/* 상단 타이틀 & 모임장 관리 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800">모임 정산 & 계좌</h3>
            <p className="text-[10px] text-slate-400">미수행 벌금 입금 신고 및 누적 정산 현황</p>
          </div>
        </div>

        {isHost && (
          <button
            onClick={() => navigate(`/groups/${groupId}/settlements`)}
            className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md flex items-center gap-1 transition"
          >
            <span>정산 관리</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 모임 계좌 바텀 카드 */}
      {loading ? (
        <div className="h-14 bg-slate-50 animate-pulse rounded-md" />
      ) : account ? (
        <div className="bg-slate-50 border border-slate-200/80 rounded-md p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-800">{account.bankName}</span>
              <span className="text-xs font-medium text-slate-600 truncate">{account.accountNumber}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              예금주: <span className="text-slate-600 font-medium">{account.accountHolder}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopyAccount}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '복사됨' : '복사'}</span>
            </button>

            {isHost && (
              <button
                onClick={handleOpenEditAccount}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/50 transition"
                title="계좌 수정"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-warning-bg border border-warning-border rounded-md p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warning-icon shrink-0" />
            <div className="text-caption text-warning">
              {isHost
                ? '멤버들이 입금할 계좌를 먼저 등록해 주세요'
                : '모임장이 아직 정산 계좌를 등록하지 않았어요'}
            </div>
          </div>
          {isHost && (
            <button
              onClick={handleOpenEditAccount}
              className="px-2.5 py-1 bg-warning hover:bg-amber-800 active:bg-amber-900 text-white text-[11px] font-semibold rounded-md shrink-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning"
            >
              계좌 등록하기
            </button>
          )}
        </div>
      )}

      {/* 정산 3대 지표 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-50 border border-slate-100 rounded-md p-2.5 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <Wallet className="w-3 h-3 text-red-500" />
            <span>미납 금액</span>
          </div>
          <div className="text-sm font-bold text-red-600 mt-1">
            {loading ? '...' : `${(summary?.unpaidAmount || 0).toLocaleString()}원`}
          </div>
          {summary && summary.myUnpaidAmount > 0 && (
            <div className="text-[9px] text-red-400 mt-0.5 truncate">
              (내 미납: {summary.myUnpaidAmount.toLocaleString()}원)
            </div>
          )}
        </div>

        <div className="bg-sunken border border-line rounded-md p-2.5 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-caption text-ink-muted font-medium">
            <Clock className="w-3 h-3 text-warning-icon" />
            <span>확인 대기</span>
          </div>
          <div className="text-sm font-bold text-warning mt-1">
            {loading ? '...' : `${(summary?.waitingAmount || 0).toLocaleString()}원`}
          </div>
        </div>

        <div className="bg-sunken border border-line rounded-md p-2.5 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-caption text-ink-muted font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-success-icon" />
            <span>누적 확인 완료</span>
          </div>
          <div className="text-sm font-bold text-success mt-1">
            {loading ? '...' : `${(summary?.confirmedAmount || 0).toLocaleString()}원`}
          </div>
        </div>
      </div>

      {/* 액션 버튼: 입금 신고하기 */}
      <button
        onClick={onOpenDepositModal}
        disabled={!summary?.accountRegistered}
        className={`w-full h-btn-md py-2.5 px-4 rounded-md text-body-sm font-semibold flex items-center justify-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-muted ${
          summary?.accountRegistered
            ? 'bg-primary hover:bg-primary-hover active:bg-primary-active text-white shadow-xs active:scale-[0.99]'
            : 'bg-line text-ink-disabled cursor-not-allowed'
        }`}
      >
        <Send className="w-3.5 h-3.5" />
        <span>{summary?.accountRegistered ? '미수행 금액 입금 신고하기' : '계좌 등록 후 입금 신고 가능'}</span>
      </button>

      {/* 모임장 계좌 등록/수정 모달 */}
      {isEditingAccount && (
        <div className="fixed inset-0 z-sheet bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">
                {account ? '모임 계좌 정보 수정' : '모임 계좌 신규 등록'}
              </h3>
              <button
                onClick={() => setIsEditingAccount(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">은행명</label>
                <input
                  type="text"
                  placeholder="예: 카카오뱅크, 토스뱅크, 신한은행"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  maxLength={50}
                  className="w-full text-base px-3 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">계좌번호</label>
                <input
                  type="text"
                  placeholder="예: 3333-01-1234567 (하이픈 포함 가능)"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  maxLength={50}
                  className="w-full text-base px-3 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">예금주</label>
                <input
                  type="text"
                  placeholder="예: 홍길동"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  maxLength={50}
                  className="w-full text-base px-3 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingAccount(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={savingAccount}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md flex items-center justify-center gap-1 transition"
                >
                  {savingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>저장하기</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
