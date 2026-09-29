import React, { useEffect, useState } from 'react';
import type { UnpaidRecordItem, GroupAccount } from '../types';
import { settlementApi } from '../api/settlement';
import { BottomSheet, BottomSheetTitle, BottomSheetDescription, BottomSheetClose } from './ui/BottomSheet';
import { useAuth } from '../context/AuthContext';
import { getTodayKstString } from '../utils/date';
import {
  X,
  CreditCard,
  Copy,
  Check,
  Calendar,
  User,
  Loader2,
  AlertCircle,
  CheckSquare,
  Square,
  Coins,
} from 'lucide-react';

interface DepositReportModalProps {
  groupId: number;
  isOpen: boolean;
  account: GroupAccount | null | undefined;
  onClose: () => void;
  onSuccess: () => void;
}

export const DepositReportModal: React.FC<DepositReportModalProps> = ({
  groupId,
  isOpen,
  account,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<UnpaidRecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedRecordIds, setSelectedRecordIds] = useState<number[]>([]);
  const [depositorName, setDepositorName] = useState('');
  const [depositDate, setDepositDate] = useState(getTodayKstString());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUnpaidRecords();
      setDepositorName(user?.nickname || '');
      setDepositDate(getTodayKstString());
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    } else {
      setSelectedRecordIds([]);
    }
  }, [isOpen, groupId]);

  const fetchUnpaidRecords = async () => {
    setLoading(true);
    try {
      const data = await settlementApi.getUnpaidRecords(groupId);
      setRecords(data);
      // 기본적으로 전체 선택
      setSelectedRecordIds(data.map((r) => r.id));
    } catch (err) {
      console.error('Failed to fetch unpaid records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRecord = (id: number) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    if (selectedRecordIds.length === records.length) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(records.map((r) => r.id));
    }
  };

  const handleCopyAccount = () => {
    if (!account) return;
    const textToCopy = `${account.bankName} ${account.accountNumber} ${account.accountHolder}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedRecords = records.filter((r) => selectedRecordIds.includes(r.id));
  const totalAmount = selectedRecords.reduce((sum, r) => sum + r.penaltyAmount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      alert('모임 계좌가 등록되지 않아 입금 신고를 진행할 수 없습니다.');
      return;
    }
    if (selectedRecordIds.length === 0) {
      alert('입금할 미수행 기록을 1개 이상 선택해 주세요.');
      return;
    }
    if (!depositorName.trim()) {
      alert('입금자명을 입력해 주세요.');
      return;
    }
    if (!depositDate) {
      alert('실제 입금일을 선택해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const dailyRecordIds = selectedRecords.filter((r) => !r.isPeriod).map((r) => r.id);
      const periodSettlementIds = selectedRecords.filter((r) => r.isPeriod).map((r) => r.periodSettlementId ?? r.id);

      await settlementApi.createDepositReport(groupId, {
        depositorName: depositorName.trim(),
        depositDate,
        totalAmount,
        dailyRecordIds,
        periodSettlementIds,
      });
      alert('입금 신고가 정상적으로 제출되었습니다. 모임장의 확인 대기 상태로 전환됩니다.');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to submit deposit report:', err);
      alert(err.response?.data?.message || '입금 신고 제출에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * isOpen으로 조기 return하지 않는다. 닫히는 순간 null을 반환하면
   * 이탈 전환이 시작되기 전에 노드가 사라진다. 닫힌 동안 내용을 렌더하지 않는 것은
   * Modal(Base UI Portal)이 처리한다.
   */
  return (
    <BottomSheet
      open={isOpen}
      onOpenChange={(next) => !next && onClose()}
      backdropClassName="bg-black/50 backdrop-blur-xs"
      className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90dvh] flex flex-col shadow-xl overflow-hidden"
    >
      {/* 헤더 */}
      <div className="p-4 border-b border-slate-100 flex items-start justify-between shrink-0">
        <div>
          <BottomSheetTitle className="text-lg font-extrabold text-slate-800">벌금 입금 신고</BottomSheetTitle>
          <BottomSheetDescription className="text-xs text-slate-500 mt-0.5">
            모임 계좌로 보낸 뒤, 어떤 기록을 냈는지 알려 주세요.
          </BottomSheetDescription>
        </div>
        <BottomSheetClose asChild>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg transition shrink-0"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </BottomSheetClose>
      </div>

      {/* 바디 스크롤 영역 */}
      <div className="p-4 overflow-y-auto overscroll-contain space-y-4 flex-1">
        {/* 모임 계좌 안내 카드 */}
        {account ? (
          <div className="bg-blue-50/70 border border-blue-200/60 rounded-xl p-3.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] text-blue-600 font-bold mb-0.5">
                모임 계좌
              </div>
              <div className="text-sm font-bold text-slate-900 tabular-nums">
                {account.bankName} {account.accountNumber}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                예금주 <span className="font-semibold text-slate-700">{account.accountHolder}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyAccount}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 shadow-2xs'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '복사됨' : '복사'}</span>
            </button>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>모임 계좌가 아직 등록되지 않아 입금 신고를 진행할 수 없습니다.</span>
          </div>
        )}

        {/* 낸 기록 체크리스트 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800">
              낸 기록 <span className="font-normal text-slate-400">{selectedRecordIds.length}/{records.length}</span>
            </label>
            {records.length > 0 && (
              <button
                type="button"
                onClick={handleToggleAll}
                className="text-[11px] text-blue-600 font-semibold hover:underline"
              >
                {selectedRecordIds.length === records.length ? '전체 해제' : '전체 선택'}
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl">
              <Coins className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-800">미납된 벌금이 없습니다.</p>
              <p className="text-[11px] text-slate-500 mt-1">성실하게 챌린지를 완주하고 계시네요! 🎉</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto overscroll-contain pr-1">
              {records.map((record) => {
                const isChecked = selectedRecordIds.includes(record.id);
                return (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => handleToggleRecord(record.id)}
                    className={`w-full min-h-[48px] p-3 rounded-xl border text-left flex items-center justify-between transition select-none ${
                      isChecked
                        ? 'bg-blue-50/50 border-blue-300 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs sm:text-sm font-bold truncate flex items-center gap-1">
                        {record.isPeriod && (
                          <span className="text-[9px] bg-purple-50 text-purple-700 px-1 py-0.5 rounded font-semibold shrink-0">
                            주간구간
                          </span>
                        )}
                        <span className="truncate">{record.challengeTitle}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {record.isPeriod
                          ? `${record.periodIndex}구간 (${record.startDate} ~ ${record.endDate}) · ${record.missedCount}회 미달`
                          : `${record.date} 못 한 날`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">
                        {record.penaltyAmount.toLocaleString()}원
                      </span>
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 폼 필드: 입금자명 + 입금일 (2열 그리드) */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              입금자명
            </label>
            <input
              type="text"
              value={depositorName}
              onChange={(e) => setDepositorName(e.target.value)}
              placeholder="통장에 찍힌 이름"
              className="w-full text-xs sm:text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              입금일
            </label>
            <input
              type="date"
              value={depositDate}
              onChange={(e) => setDepositDate(e.target.value)}
              className="w-full text-xs sm:text-sm px-2.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 focus:bg-white"
              required
            />
          </div>
        </div>
      </div>

      {/* 풋터 제출 버튼 */}
      <div className="p-4 border-t border-slate-100 shrink-0">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !account || selectedRecordIds.length === 0 || !depositorName.trim()}
          className={`w-full min-h-[48px] py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition ${
            account && selectedRecordIds.length > 0 && depositorName.trim() && !submitting
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>
            {totalAmount > 0 ? `${totalAmount.toLocaleString()}원 입금했어요` : '입금 신고하기'}
          </span>
        </button>
      </div>
    </BottomSheet>
  );
};
