import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { DepositReportDetail, DepositReportStatus } from '../types';
import { settlementApi } from '../api/settlement';
import { groupsApi } from '../api/groups';
import { MobileLayout } from '../components/MobileLayout';
import { Button, FormField, Textarea } from '../components/ui';
import {
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  User as UserIcon,
  Calendar,
} from 'lucide-react';

export const SettlementManagePage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DepositReportStatus>('WAITING_CONFIRMATION');
  const [reports, setReports] = useState<DepositReportDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('');
  const [expandedReportIds, setExpandedReportIds] = useState<number[]>([]);

  // 모달 상태
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState('');
  const rejectReasonRef = useRef<HTMLTextAreaElement>(null);

  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const cancelReasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (groupId) {
      fetchGroupInfo();
      fetchReports();
    }
  }, [groupId, activeTab]);

  const fetchGroupInfo = async () => {
    if (!groupId) return;
    try {
      const data = await groupsApi.getGroupDetail(Number(groupId));
      setGroupName(data.name);
      if (!data.isHost) {
        alert('모임장만 정산 관리 페이지에 접근할 수 있습니다.');
        navigate(`/groups/${groupId}`);
      }
    } catch (err) {
      console.error('Failed to fetch group info:', err);
    }
  };

  const fetchReports = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const data = await settlementApi.getDepositReports(Number(groupId), activeTab);
      setReports(data);
    } catch (err) {
      console.error('Failed to fetch deposit reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedReportIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirm = async (reportId: number) => {
    if (!window.confirm('실제 입금 내역을 확인하셨습니까?\n승인 완료 처리 시 연결된 미수행 기록이 정산 완료 처리됩니다.')) {
      return;
    }

    try {
      await settlementApi.confirmDepositReport(reportId);
      alert('입금 확인이 완료되었습니다.');
      fetchReports();
    } catch (err: any) {
      console.error('Failed to confirm deposit report:', err);
      alert(err.response?.data?.message || '입금 승인 처리에 실패했습니다.');
    }
  };

  const handleOpenRejectModal = (reportId: number) => {
    setRejectTargetId(reportId);
    setRejectReason('');
    setRejectError('');
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTargetId) return;
    setRejectError('');

    if (!rejectReason.trim()) {
      setRejectError('반려 사유를 입력해 주세요.');
      rejectReasonRef.current?.focus();
      return;
    }

    setRejecting(true);
    try {
      await settlementApi.rejectDepositReport(rejectTargetId, { reason: rejectReason.trim() });
      alert('입금 신고가 반려되었습니다. 연결된 기록은 다시 미납으로 복구됩니다.');
      setRejectTargetId(null);
      fetchReports();
    } catch (err: any) {
      console.error('Failed to reject deposit report:', err);
      // 서버 오류 시 사용자 입력값 보존
      setRejectError(err.response?.data?.message || '입금 반려 처리에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setRejecting(false);
    }
  };

  const handleOpenCancelModal = (reportId: number) => {
    setCancelTargetId(reportId);
    setCancelReason('');
    setCancelError('');
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTargetId) return;
    setCancelError('');

    if (!cancelReason.trim()) {
      setCancelError('확인 취소 사유를 입력해 주세요.');
      cancelReasonRef.current?.focus();
      return;
    }

    setCancelling(true);
    try {
      await settlementApi.cancelConfirmation(cancelTargetId, { reason: cancelReason.trim() });
      alert('승인 확인이 취소되었습니다. 누적액에서 차감되고 연결된 기록들은 다시 미납으로 원복되었습니다.');
      setCancelTargetId(null);
      fetchReports();
    } catch (err: any) {
      console.error('Failed to cancel confirmation:', err);
      // 서버 오류 시 사용자 입력값 보존
      setCancelError(err.response?.data?.message || '확인 취소 처리에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <MobileLayout>
      {/* 상단 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate(`/groups/${groupId}`);
            }
          }}
          className="p-1 -ml-1 text-slate-500 hover:text-slate-800 rounded-md"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-slate-800 truncate">정산 및 입금 관리</h1>
          <p className="text-[10px] text-slate-400 truncate">{groupName || '모임 정산 대시보드'}</p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-slate-200 mb-4">
        <button
          onClick={() => setActiveTab('WAITING_CONFIRMATION')}
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === 'WAITING_CONFIRMATION'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>확인 대기</span>
        </button>
        <button
          onClick={() => setActiveTab('CONFIRMED')}
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === 'CONFIRMED'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>확인 완료</span>
        </button>
        <button
          onClick={() => setActiveTab('REJECTED')}
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === 'REJECTED'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>반려 내역</span>
        </button>
      </div>

      {/* 목록 본문 */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white border border-dashed border-slate-200 rounded-lg text-center my-6">
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mb-3">
            {activeTab === 'WAITING_CONFIRMATION' && <Clock className="w-6 h-6" />}
            {activeTab === 'CONFIRMED' && <CheckCircle2 className="w-6 h-6" />}
            {activeTab === 'REJECTED' && <XCircle className="w-6 h-6" />}
          </div>
          <h3 className="text-xs font-bold text-slate-700 mb-1">
            {activeTab === 'WAITING_CONFIRMATION' && '대기 중인 입금 신고가 없습니다.'}
            {activeTab === 'CONFIRMED' && '확인 완료된 정산 내역이 없습니다.'}
            {activeTab === 'REJECTED' && '반려된 입금 내역이 없습니다.'}
          </h3>
          <p className="text-[11px] text-slate-400 max-w-xs">
            {activeTab === 'WAITING_CONFIRMATION'
              ? '모임원들이 미수행 벌금을 입금 신고하면 이곳에 나타납니다.'
              : '입금 관리 내역이 쌓이면 이곳에서 확인하실 수 있습니다.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 pb-8">
          {reports.map((report) => {
            const isExpanded = expandedReportIds.includes(report.id);
            return (
              <div
                key={report.id}
                className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3"
              >
                {/* 상단 프로필 및 금액 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {report.userProfileImageUrl ? (
                      <img
                        src={report.userProfileImageUrl}
                        alt={report.userNickname}
                        className="w-8 h-8 rounded-full object-cover border border-slate-100"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-800">{report.userNickname}</div>
                      <div className="text-[10px] text-slate-400">
                        입금자명: <span className="text-slate-700 font-medium">{report.depositorName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-extrabold text-blue-600">
                      {report.totalAmount.toLocaleString()}원
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                      <Calendar className="w-3 h-3" />
                      <span>{report.depositDate} 입금</span>
                    </div>
                  </div>
                </div>

                {/* 반려 사유 or 확인 취소 사유 안내 */}
                {report.rejectReason && (
                  <div className="bg-red-50 border border-red-200/80 rounded-md p-2.5 text-xs text-red-700 space-y-0.5">
                    <div className="font-bold flex items-center gap-1 text-[11px]">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>반려 사유</span>
                    </div>
                    <p className="text-[11px] text-red-600 pl-4">{report.rejectReason}</p>
                  </div>
                )}

                {report.cancelReason && (
                  <div className="bg-amber-50 border border-amber-200/80 rounded-md p-2.5 text-xs text-amber-800 space-y-0.5">
                    <div className="font-bold flex items-center gap-1 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>확인 취소 사유</span>
                    </div>
                    <p className="text-[11px] text-amber-700 pl-4">{report.cancelReason}</p>
                  </div>
                )}

                {/* 포함된 미납 기록 아코디언 토글 */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => toggleExpand(report.id)}
                    className="w-full flex items-center justify-between text-[11px] text-slate-500 hover:text-slate-700 font-medium py-1"
                  >
                    <span>포함된 미수행 기록 ({report.items.length}건)</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-1 bg-slate-50 rounded-md p-2.5">
                      {report.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100 last:border-none"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-slate-700 block truncate">{item.challengeTitle}</span>
                            <span className="text-[10px] text-slate-400">{item.date}</span>
                          </div>
                          <span className="text-red-600 font-semibold shrink-0">
                            {item.penaltyAmount.toLocaleString()}원
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 액션 버튼들 */}
                {activeTab === 'WAITING_CONFIRMATION' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleOpenRejectModal(report.id)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition"
                    >
                      반려
                    </button>
                    <button
                      onClick={() => handleConfirm(report.id)}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs transition"
                    >
                      입금 승인
                    </button>
                  </div>
                )}

                {activeTab === 'CONFIRMED' && (
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {report.processedByNickname} 모임장 승인 ({report.processedAt?.slice(0, 10)})
                    </span>
                    <button
                      onClick={() => handleOpenCancelModal(report.id)}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-semibold rounded-md transition"
                    >
                      승인 취소
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 반려 사유 입력 모달 */}
      {rejectTargetId && (
        <div className="fixed inset-0 z-sheet bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">입금 신고 반려</h3>
              <button
                onClick={() => setRejectTargetId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} noValidate className="space-y-3">
              <p className="text-xs text-slate-500">
                반려 시 모임원에게 사유가 전달되며, 연결된 미수행 기록은 다시 미납으로 원복됩니다.
              </p>

              <FormField label="반려 사유" required error={rejectError} id="reject-reason-input">
                <Textarea
                  ref={rejectReasonRef}
                  id="reject-reason-input"
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (rejectError) setRejectError('');
                  }}
                  placeholder="예: 계좌 입금 내역이 확인되지 않습니다."
                  rows={3}
                  error={rejectError}
                  required
                  className="resize-none"
                />
              </FormField>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => setRejectTargetId(null)}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="md"
                  fullWidth
                  isLoading={rejecting}
                  loadingText="반려 처리 중..."
                >
                  반려 확정
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 승인 확인 취소 사유 모달 */}
      {cancelTargetId && (
        <div className="fixed inset-0 z-sheet bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">승인 확인 취소 (롤백)</h3>
              <button
                type="button"
                onClick={() => setCancelTargetId(null)}
                aria-label="닫기"
                className="text-slate-400 hover:text-slate-600 focus-ring rounded-md p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} noValidate className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  ⚠️ 이미 승인된 건을 취소하면 <strong>모임 누적 확인액에서 즉시 차감</strong>되며, 포함된 기록들이 <strong>다시 미납 상태로 복귀</strong>합니다.
                </p>
              </div>

              <FormField label="취소 사유" required error={cancelError} id="cancel-reason-input">
                <Textarea
                  ref={cancelReasonRef}
                  id="cancel-reason-input"
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    if (cancelError) setCancelError('');
                  }}
                  placeholder="예: 입금자명 오인으로 인한 실수 승인 취소"
                  rows={3}
                  error={cancelError}
                  required
                  className="resize-none"
                />
              </FormField>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => setCancelTargetId(null)}
                >
                  닫기
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="md"
                  fullWidth
                  isLoading={cancelling}
                  loadingText="취소 처리 중..."
                >
                  취소 확인
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MobileLayout>
  );
};
