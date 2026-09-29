import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { DepositReportDetail, DepositReportStatus } from "../types";
import { settlementApi } from "../api/settlement";
import { groupsApi } from "../api/groups";
import { Screen } from "../components/screens/Screen";
import { Dayu } from "../components/dayu/DayuAvatar";
import { DayuAvatar } from "../components/brand/DayuAvatar";
import { Button as DayuButton, Card, Chip, Segmented, Notice } from "../components/dayu/ui";
import { SubPageHeader } from "../components/layout/SubPageHeader";
import { Button, FormField, Textarea, Modal, ModalTitle, ModalClose } from "../components/ui";
import { Loader2, Info, AlertTriangle, ChevronDown, X } from "lucide-react";

export const SettlementManagePage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DepositReportStatus>("WAITING_CONFIRMATION");
  const [reports, setReports] = useState<DepositReportDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState("");
  const [expandedReportIds, setExpandedReportIds] = useState<number[]>([]);

  // 모달 상태
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState("");
  const rejectReasonRef = useRef<HTMLTextAreaElement>(null);

  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
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
        alert("모임장만 정산 관리 페이지에 접근할 수 있습니다.");
        navigate(`/groups/${groupId}`);
      }
    } catch (err) {
      console.error("Failed to fetch group info:", err);
    }
  };

  const fetchReports = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const data = await settlementApi.getDepositReports(Number(groupId), activeTab);
      setReports(data);
    } catch (err) {
      console.error("Failed to fetch deposit reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedReportIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleConfirm = async (reportId: number) => {
    if (
      !window.confirm("실제 입금 내역을 확인하셨습니까?\n승인 완료 처리 시 연결된 미수행 기록이 정산 완료 처리됩니다.")
    ) {
      return;
    }

    try {
      await settlementApi.confirmDepositReport(reportId);
      alert("입금 확인이 완료되었습니다.");
      fetchReports();
    } catch (err: any) {
      console.error("Failed to confirm deposit report:", err);
      alert(err.response?.data?.message || "입금 승인 처리에 실패했습니다.");
    }
  };

  const handleOpenRejectModal = (reportId: number) => {
    setRejectTargetId(reportId);
    setRejectReason("");
    setRejectError("");
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTargetId) return;
    setRejectError("");

    if (!rejectReason.trim()) {
      setRejectError("반려 사유를 입력해 주세요.");
      rejectReasonRef.current?.focus();
      return;
    }

    setRejecting(true);
    try {
      await settlementApi.rejectDepositReport(rejectTargetId, { reason: rejectReason.trim() });
      alert("입금 신고가 반려되었습니다. 연결된 기록은 다시 미납으로 복구됩니다.");
      setRejectTargetId(null);
      fetchReports();
    } catch (err: any) {
      console.error("Failed to reject deposit report:", err);
      // 서버 오류 시 사용자 입력값 보존
      setRejectError(err.response?.data?.message || "입금 반려 처리에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setRejecting(false);
    }
  };

  const handleOpenCancelModal = (reportId: number) => {
    setCancelTargetId(reportId);
    setCancelReason("");
    setCancelError("");
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTargetId) return;
    setCancelError("");

    if (!cancelReason.trim()) {
      setCancelError("확인 취소 사유를 입력해 주세요.");
      cancelReasonRef.current?.focus();
      return;
    }

    setCancelling(true);
    try {
      await settlementApi.cancelConfirmation(cancelTargetId, { reason: cancelReason.trim() });
      alert("승인 확인이 취소되었습니다. 누적액에서 차감되고 연결된 기록들은 다시 미납으로 원복되었습니다.");
      setCancelTargetId(null);
      fetchReports();
    } catch (err: any) {
      console.error("Failed to cancel confirmation:", err);
      // 서버 오류 시 사용자 입력값 보존
      setCancelError(err.response?.data?.message || "확인 취소 처리에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Screen>
      {/* 상단 헤더 */}
      <SubPageHeader
        title="정산 및 입금 관리"
        onBack={() => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate(`/groups/${groupId}`);
          }
        }}
      />

      <main className="flex flex-1 flex-col gap-[14px] px-4 pt-1.5 pb-12">
        <Segmented
          label="입금 처리 상태"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "WAITING_CONFIRMATION", label: "확인 대기" },
            { value: "CONFIRMED", label: "확인 완료" },
            { value: "REJECTED", label: "반려 내역" },
          ]}
        />
        <Notice icon={<Info className="size-4" />}>
          {activeTab === "WAITING_CONFIRMATION"
            ? "계좌의 실제 입금 내역을 확인한 뒤 승인해 주세요."
            : activeTab === "CONFIRMED"
              ? "입금 확인이 끝난 내역이에요. 잘못 승인했다면 사유를 남기고 취소할 수 있어요."
              : "반려한 입금 신고와 사유를 확인할 수 있어요."}
        </Notice>

        {loading ? (
          <div role="status" className="flex items-center justify-center gap-2 py-16 text-[13px] text-slate-500">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            입금 내역을 불러오는 중이에요
          </div>
        ) : reports.length === 0 ? (
          <Card className="flex flex-col items-center px-5 py-10 text-center">
            <Dayu face="rest" size={64} />
            <h2 className="mt-4 text-[17px] font-extrabold tracking-[-0.02em] text-slate-800">
              {activeTab === "WAITING_CONFIRMATION"
                ? "확인할 입금 신고가 없어요"
                : activeTab === "CONFIRMED"
                  ? "아직 확인 완료한 내역이 없어요"
                  : "반려한 입금 신고가 없어요"}
            </h2>
            <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-slate-500">
              {activeTab === "WAITING_CONFIRMATION"
                ? "모임원이 입금을 신고하면 이곳에서 확인할 수 있어요."
                : "입금 신고를 처리하면 해당 내역이 이곳에 쌓여요."}
            </p>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between px-1 text-[13px] text-slate-500">
              <span>
                신고 내역 <b className="font-bold text-slate-800">{reports.length}건</b>
              </span>
              <span className="tabular-nums">
                합계 {reports.reduce((sum, report) => sum + report.totalAmount, 0).toLocaleString()}원
              </span>
            </div>
            {reports.map((report) => {
              const isExpanded = expandedReportIds.includes(report.id);
              return (
                <Card key={report.id} className="flex min-w-0 flex-col gap-3.5">
                  <div className="flex items-center gap-2.5">
                    <DayuAvatar profileImageUrl={report.userProfileImageUrl} size={36} alt={report.userNickname} />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[14.5px] font-bold text-slate-800">{report.userNickname}</h2>
                      <p className="truncate text-[12.5px] text-slate-500">입금자명 · {report.depositorName}</p>
                    </div>
                    <Chip
                      tone={activeTab === "WAITING_CONFIRMATION" ? "warn" : activeTab === "CONFIRMED" ? "ok" : "bad"}
                    >
                      {activeTab === "WAITING_CONFIRMATION"
                        ? "확인 대기"
                        : activeTab === "CONFIRMED"
                          ? "확인 완료"
                          : "반려"}
                    </Chip>
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 rounded-xl bg-slate-50 px-3.5 py-3">
                    <div>
                      <p className="text-[12px] text-slate-500">신고한 입금액</p>
                      <p className="mt-0.5 text-[24px] font-extrabold tracking-[-0.03em] tabular-nums text-slate-800">
                        {report.totalAmount.toLocaleString()}
                        <span className="ml-0.5 text-[15px] font-bold">원</span>
                      </p>
                    </div>
                    <span className="pb-1 text-[12px] text-slate-500">{report.depositDate} 입금</span>
                  </div>

                  {report.rejectReason && (
                    <div className="rounded-xl bg-red-50 p-3 text-[13px] text-red-700">
                      <p className="font-bold">반려 사유</p>
                      <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed">{report.rejectReason}</p>
                    </div>
                  )}
                  {report.cancelReason && (
                    <div className="rounded-xl bg-amber-50 p-3 text-[13px] text-amber-800">
                      <p className="font-bold">확인 취소 사유</p>
                      <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed">{report.cancelReason}</p>
                    </div>
                  )}

                  <div className="border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => toggleExpand(report.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`settlement-records-${report.id}`}
                      className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 text-[13px] font-semibold text-slate-600 hover:text-slate-800"
                    >
                      <span>포함된 미수행 기록 · {report.items.length}건</span>
                      <ChevronDown
                        className={`size-4 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                    <div id={`settlement-records-${report.id}`} hidden={!isExpanded}>
                      <div className="divide-y divide-slate-200 rounded-xl bg-slate-50 px-3">
                        {report.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                            <div className="min-w-0">
                              <p className="break-words text-[13px] font-semibold text-slate-700">
                                {item.challengeTitle}
                              </p>
                              <p className="mt-0.5 text-[12px] text-slate-500">{item.date}</p>
                            </div>
                            <span className="shrink-0 text-[13px] font-bold tabular-nums text-slate-800">
                              {item.penaltyAmount.toLocaleString()}원
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {activeTab === "WAITING_CONFIRMATION" && (
                    <div className="grid grid-cols-2 gap-2">
                      <DayuButton variant="line" onClick={() => handleOpenRejectModal(report.id)}>
                        반려
                      </DayuButton>
                      <DayuButton onClick={() => handleConfirm(report.id)}>입금 승인</DayuButton>
                    </div>
                  )}
                  {activeTab === "CONFIRMED" && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <p className="min-w-0 text-[12px] text-slate-500 break-words">
                        {report.processedByNickname} 모임장 승인
                        <br />
                        {report.processedAt?.slice(0, 10)}
                      </p>
                      <DayuButton
                        variant="danger"
                        className="shrink-0"
                        onClick={() => handleOpenCancelModal(report.id)}
                      >
                        승인 취소
                      </DayuButton>
                    </div>
                  )}
                </Card>
              );
            })}
          </>
        )}

        {/* 반려 사유 입력 모달 */}
        <Modal
          open={rejectTargetId !== null}
          onOpenChange={(next) => !next && setRejectTargetId(null)}
          layer="sheet"
          backdropClassName="bg-black/50"
          className="bg-white rounded-[26px] w-full max-w-app p-5 shadow-xl space-y-4"
        >
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <ModalTitle className="text-[18px] font-extrabold text-slate-800">입금 신고 반려</ModalTitle>
              <ModalClose
                aria-label="닫기"
                className="grid size-10 place-items-center text-slate-500 hover:text-slate-700 focus-ring rounded-xl"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </ModalClose>
            </div>

            <form onSubmit={handleRejectSubmit} noValidate className="space-y-3">
              <p className="text-[13px] leading-relaxed text-slate-500">
                반려 시 모임원에게 사유가 전달되며, 연결된 미수행 기록은 다시 미납으로 원복됩니다.
              </p>

              <FormField label="반려 사유" required error={rejectError} id="reject-reason-input">
                <Textarea
                  ref={rejectReasonRef}
                  id="reject-reason-input"
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (rejectError) setRejectError("");
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
                  className="rounded-xl min-h-11"
                  onClick={() => setRejectTargetId(null)}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="md"
                  fullWidth
                  className="rounded-xl min-h-11"
                  isLoading={rejecting}
                  loadingText="반려 처리 중..."
                >
                  반려 확정
                </Button>
              </div>
            </form>
          </>
        </Modal>

        {/* 승인 확인 취소 사유 모달 */}
        <Modal
          open={cancelTargetId !== null}
          onOpenChange={(next) => !next && setCancelTargetId(null)}
          layer="sheet"
          backdropClassName="bg-black/50"
          className="bg-white rounded-[26px] w-full max-w-app p-5 shadow-xl space-y-4"
        >
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <ModalTitle className="text-[18px] font-extrabold text-slate-800">입금 승인 취소</ModalTitle>
              <ModalClose
                aria-label="닫기"
                className="grid size-10 place-items-center text-slate-500 hover:text-slate-700 focus-ring rounded-xl"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </ModalClose>
            </div>

            <form onSubmit={handleCancelSubmit} noValidate className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[13px] leading-relaxed">
                  이미 승인된 건을 취소하면 <strong>모임 누적 확인액에서 즉시 차감</strong>되며, 포함된 기록들이{" "}
                  <strong>다시 미납 상태로 복귀</strong>합니다.
                </p>
              </div>

              <FormField label="취소 사유" required error={cancelError} id="cancel-reason-input">
                <Textarea
                  ref={cancelReasonRef}
                  id="cancel-reason-input"
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    if (cancelError) setCancelError("");
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
                  className="rounded-xl min-h-11"
                  onClick={() => setCancelTargetId(null)}
                >
                  닫기
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="md"
                  fullWidth
                  className="rounded-xl min-h-11"
                  isLoading={cancelling}
                  loadingText="취소 처리 중..."
                >
                  취소 확인
                </Button>
              </div>
            </form>
          </>
        </Modal>
      </main>
    </Screen>
  );
};
