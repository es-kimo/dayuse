import React, { useEffect, useState } from 'react';
import type { UnpaidRecordItem, GroupAccount } from '../types';
import { settlementApi } from '../api/settlement';
import { BottomSheet, BottomSheetTitle, BottomSheetDescription, BottomSheetClose } from './ui/BottomSheet';
import { Button, Card, Field, SheetGrab, TextField } from './dayu/ui';
import { useAuth } from '../context/AuthContext';
import { getTodayKstString } from '../utils/date';
import {
  X,
  Copy,
  Check,
  Loader2,
  AlertCircle,
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
    >
      {/* 손잡이 · 헤더 */}
      <div className="flex shrink-0 flex-col gap-3.5 px-5 pt-2.5">
        <SheetGrab />
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <BottomSheetTitle className="text-[19px] font-extrabold text-slate-800">벌금 입금 신고</BottomSheetTitle>
            <BottomSheetDescription className="text-[13px] text-slate-500">
              모임 계좌로 보낸 뒤, 어떤 기록을 냈는지 알려 주세요.
            </BottomSheetDescription>
          </div>
          <BottomSheetClose
            onClick={onClose}
            className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="size-[22px]" />
          </BottomSheetClose>
        </div>
      </div>

      {/* 바디 스크롤 영역 */}
      <div className="flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-5 py-3.5">
        {/* 모임 계좌 안내 카드 */}
        {account ? (
          <Card tone="hero" className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-blue-600">모임 계좌</div>
              <div className="text-[15.5px] font-bold tabular-nums text-slate-800">
                {account.bankName} {account.accountNumber}
              </div>
              <div className="text-[13px] text-slate-500">예금주 {account.accountHolder}</div>
            </div>

            <Button type="button" variant="line" size="sm" className="shrink-0" onClick={handleCopyAccount}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? '복사됨' : '복사'}
            </Button>
          </Card>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
            <AlertCircle className="size-4 shrink-0" />
            <span>모임 계좌가 아직 등록되지 않아 입금 신고를 진행할 수 없습니다.</span>
          </div>
        )}

        {/* 낸 기록 체크리스트 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[14px] font-bold text-slate-800">
              낸 기록 <span className="font-normal text-slate-500">{selectedRecordIds.length}/{records.length}</span>
            </label>
            {records.length > 0 && (
              <button
                type="button"
                onClick={handleToggleAll}
                className="cursor-pointer text-[12.5px] font-bold text-slate-500 transition-colors hover:text-slate-800"
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
            <div className="rounded-[14px] border border-dashed border-slate-300 p-6 text-center">
              <Coins className="mx-auto mb-1.5 size-7 text-emerald-700" />
              <p className="text-[14px] font-bold text-slate-800">미납된 벌금이 없어요</p>
              <p className="mt-1 text-[13px] text-slate-500">성실하게 챌린지를 완주하고 계시네요!</p>
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
                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[14px] border-[1.5px] px-3 py-2.5 text-left transition-colors select-none ${
                      isChecked ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 truncate text-[14.5px] font-bold text-slate-800">
                        {record.isPeriod && (
                          <span className="shrink-0 rounded-[5px] bg-purple-50 px-1 py-0.5 text-[11px] font-bold text-purple-700">
                            주간구간
                          </span>
                        )}
                        <span className="truncate">{record.challengeTitle}</span>
                      </div>
                      <div className="text-[13px] text-slate-500">
                        {record.isPeriod
                          ? `${record.periodIndex}구간 (${record.startDate} ~ ${record.endDate}) · ${record.missedCount}회 미달`
                          : `${record.date} 못 한 날`}
                      </div>
                    </div>

                    <b className="shrink-0 text-[14.5px] font-bold tabular-nums text-slate-800">
                      {record.penaltyAmount.toLocaleString()}원
                    </b>
                    <span
                      aria-hidden
                      className={`grid size-[22px] shrink-0 place-items-center rounded-[7px] border-[1.5px] ${
                        isChecked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {isChecked && <Check className="size-3.5 stroke-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 폼 필드: 입금자명 + 입금일 (2열 그리드) */}
        <div className="grid grid-cols-2 gap-2">
          <Field label="입금자명" htmlFor="deposit-name">
            <TextField
              id="deposit-name"
              type="text"
              value={depositorName}
              onChange={(e) => setDepositorName(e.target.value)}
              placeholder="통장에 찍힌 이름"
              required
            />
          </Field>

          <Field label="입금일" htmlFor="deposit-date">
            <TextField
              id="deposit-date"
              type="date"
              value={depositDate}
              onChange={(e) => setDepositDate(e.target.value)}
              required
            />
          </Field>
        </div>
      </div>

      {/* 풋터 제출 버튼 */}
      <div className="shrink-0 border-t border-slate-200 px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={submitting || !account || selectedRecordIds.length === 0 || !depositorName.trim()}
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {totalAmount > 0 ? `${totalAmount.toLocaleString()}원 입금했어요` : '입금 신고하기'}
        </Button>
      </div>
    </BottomSheet>
  );
};
