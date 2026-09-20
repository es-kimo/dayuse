import React, { useEffect, useState } from 'react';
import type { UnpaidRecordItem, GroupAccount } from '../types';
import { settlementApi } from '../api/settlement';
import { useAuth } from '../context/AuthContext';
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
  const [depositDate, setDepositDate] = useState(new Date().toISOString().slice(0, 10));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUnpaidRecords();
      setDepositorName(user?.nickname || '');
      setDepositDate(new Date().toISOString().slice(0, 10));
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
      await settlementApi.createDepositReport(groupId, {
        depositorName: depositorName.trim(),
        depositDate,
        totalAmount,
        dailyRecordIds: selectedRecordIds,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* 헤더 */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-800">미수행 금액 입금 신고</h2>
            <p className="text-[11px] text-slate-400">계좌로 입금 후 미수행 기록을 선택해 신고해 주세요.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 바디 스크롤 영역 */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* 입금 계좌 안내 카드 */}
          {account ? (
            <div className="bg-blue-50/60 border border-blue-200/60 rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 mb-0.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>입금할 모임 계좌</span>
                </div>
                <div className="text-xs font-bold text-slate-800">
                  {account.bankName} {account.accountNumber}
                </div>
                <div className="text-[11px] text-slate-500">
                  예금주: <span className="font-medium text-slate-700">{account.accountHolder}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyAccount}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 shrink-0 transition ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50'
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

          {/* 미납 기록 다중 선택 체크리스트 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                정산할 미수행 기록 선택 ({selectedRecordIds.length}/{records.length})
              </span>
              {records.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className="text-[11px] text-blue-600 font-medium hover:underline flex items-center gap-1"
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
                <Coins className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                <p className="text-xs text-slate-500 font-medium">정산할 미수행 기록이 없습니다.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">미납된 벌금이 없거나 이미 모두 확인 대기 중입니다.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {records.map((record) => {
                  const isChecked = selectedRecordIds.includes(record.id);
                  return (
                    <div
                      key={record.id}
                      onClick={() => handleToggleRecord(record.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-blue-50/50 border-blue-300 text-slate-800'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{record.challengeTitle}</div>
                          <div className="text-[10px] text-slate-400">{record.date}</div>
                        </div>
                      </div>

                      <div className="text-xs font-bold text-red-600 shrink-0">
                        {record.penaltyAmount.toLocaleString()}원
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 폼 필드: 입금자명, 실제 입금일, 신고 총액 */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>실제 입금자명</span>
              </label>
              <input
                type="text"
                value={depositorName}
                onChange={(e) => setDepositorName(e.target.value)}
                placeholder="통장에 표시된 입금자명 (예: 홍길동)"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>실제 입금일</span>
              </label>
              <input
                type="date"
                value={depositDate}
                onChange={(e) => setDepositDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
                required
              />
            </div>

            {/* 실시간 합계 확인 카드 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-700">신고 총액 (자동 계산)</span>
                <p className="text-[10px] text-slate-400">선택한 기록 {selectedRecordIds.length}건 합계</p>
              </div>
              <div className="text-base font-extrabold text-blue-600">
                {totalAmount.toLocaleString()}원
              </div>
            </div>
          </div>
        </div>

        {/* 풋터 버튼 */}
        <div className="p-4 border-t border-slate-100 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !account || selectedRecordIds.length === 0}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition ${
              account && selectedRecordIds.length > 0 && !submitting
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>입금 신고 완료</span>
          </button>
        </div>
      </div>
    </div>
  );
};
