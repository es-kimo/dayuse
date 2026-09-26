import React, { useState } from 'react';
import type {
  ChallengeCalendarResponse,
  CalendarDailyRecordItem,
} from '../types';
import {
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  XCircle,
  CircleDot,
  Loader2,
  User as UserIcon,
  Camera,
} from 'lucide-react';
import { getTodayKstString } from '../utils/date';
import { useGracePeriodTimer } from '../hooks/useGracePeriodTimer';

interface ChallengeCalendarSectionProps {
  calendarData: ChallengeCalendarResponse | null;
  loading: boolean;
  currentUserId?: number;
  onStartVerify?: (record: CalendarDailyRecordItem, isLate: boolean) => void;
}

interface CalendarRecordRowProps {
  record: CalendarDailyRecordItem;
  isMyRecord: boolean;
  todayStr: string;
  renderStatusBadge: (record: CalendarDailyRecordItem) => React.ReactNode;
  onStartVerify?: (record: CalendarDailyRecordItem, isLate: boolean) => void;
}

const CalendarRecordRow: React.FC<CalendarRecordRowProps> = ({
  record,
  isMyRecord,
  todayStr,
  renderStatusBadge,
  onStartVerify,
}) => {
  const isPast = record.date < todayStr;
  const isLocked = record.depositStatus !== 'UNPAID';
  const { isGracePeriod, formattedTime } = useGracePeriodTimer(record.date);

  const isNotParticipated = record.status === 'NOT_PARTICIPATED';

  // 당일 인증: 오늘 날짜이거나 상태가 WAITING인 경우 (참여 전 제외)
  const canVerifyToday =
    isMyRecord &&
    !isNotParticipated &&
    (record.status === 'WAITING' || (record.date === todayStr && record.status !== 'COMPLETED'));
  // 늦은 인증: 과거 날짜이면서 미확인(UNCHECKED) 상태 + 정산 미잠금인 경우에만 허용 (참여 전 제외)
  const canVerifyLate =
    isMyRecord &&
    isPast &&
    !isLocked &&
    !isNotParticipated &&
    record.status === 'UNCHECKED';
  const canVerify = canVerifyToday || canVerifyLate;
  const isLate = canVerifyLate;

  // 늦은 인증 버튼 텍스트
  const buttonLabel = isLate
    ? isGracePeriod
      ? '늦은인증 (정상)'
      : '늦은인증 (지각)'
    : '인증하기';

  return (
    <div className="flex items-center justify-between p-2.5 rounded-md bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition gap-2">
      {/* 좌측: 날짜 + (완료 시) 사진 및 코멘트 */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-semibold text-slate-700 shrink-0">
          {record.date}
        </span>
        {record.imageUrl && (
          <img
            src={record.imageUrl}
            alt="인증 사진"
            className="w-7 h-7 rounded-sm object-cover border border-slate-200 shrink-0"
          />
        )}
        {record.comment && (
          <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
            {record.comment}
          </span>
        )}
      </div>

      {/* 우측: 상태 뱃지(또는 유예 타이머) + 액션 버튼 */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* 유예 시간이 남은 미확인 기록인 경우 중복되는 '미확인' 뱃지 대신 '실시간 유예 타이머' 표시 */}
        {isPast && canVerifyLate && isGracePeriod ? (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
            <Clock className="w-2.5 h-2.5 text-amber-600" aria-hidden="true" />
            <span>{formattedTime} 남음</span>
          </span>
        ) : (
          renderStatusBadge(record)
        )}

        {canVerify && onStartVerify && (
          <button
            onClick={() => onStartVerify(record, isLate)}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition active:scale-[0.98] shadow-xs shrink-0 ${
              isLate
                ? isGracePeriod
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-slate-600 hover:bg-slate-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Camera className="w-3 h-3" />
            <span>{buttonLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export const ChallengeCalendarSection: React.FC<ChallengeCalendarSectionProps> = ({
  calendarData,
  loading,
  currentUserId,
  onStartVerify,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs flex flex-col items-center justify-center text-slate-400 gap-2 mb-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="text-xs">달력 데이터를 불러오는 중...</span>
      </div>
    );
  }

  if (!calendarData || calendarData.participants.length === 0) {
    return null;
  }

  const activeParticipant =
    calendarData.participants.find((p) => p.userId === selectedUserId) ||
    calendarData.participants[0];

  const renderStatusBadge = (record: CalendarDailyRecordItem) => {
    switch (record.status) {
      case 'COMPLETED':
        return (
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>완료</span>
            </span>
            {record.isLate && (
              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                지각
              </span>
            )}
          </div>
        );
      case 'WAITING':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>인증 대기</span>
          </span>
        );
      case 'UNCHECKED':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-slate-500" />
            <span>미확인</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-red-600" />
            <span>미수행 ({record.penaltyAmount.toLocaleString()}원)</span>
          </span>
        );
      case 'PLANNED':
        return (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 border border-slate-100 flex items-center gap-1">
            <CircleDot className="w-2.5 h-2.5 text-slate-400" />
            <span>예정</span>
          </span>
        );
      case 'NOT_PARTICIPATED':
        return (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200">
            참여 전
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs mb-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>수행 히스토리 달력</span>
        </div>
        <span className="text-[10px] text-slate-400">
          {calendarData.startDate} ~ {calendarData.endDate}
        </span>
      </div>

      {/* 상태 범례 (상태 가이드) */}
      <div className="flex flex-wrap gap-1.5 text-[10px] bg-slate-50 p-2.5 rounded-md border border-slate-100">
        <span className="font-semibold text-slate-600 mr-1">상태:</span>
        <span className="inline-flex items-center gap-0.5 text-emerald-700 font-medium">
          <CheckCircle2 className="w-3 h-3" /> 완료
        </span>
        <span className="inline-flex items-center gap-0.5 text-amber-700 font-medium">
          <Clock className="w-3 h-3" /> 인증대기
        </span>
        <span className="inline-flex items-center gap-0.5 text-slate-600 font-medium">
          <HelpCircle className="w-3 h-3" /> 미확인
        </span>
        <span className="inline-flex items-center gap-0.5 text-red-600 font-medium">
          <XCircle className="w-3 h-3" /> 미수행
        </span>
        <span className="inline-flex items-center gap-0.5 text-slate-400">
          <CircleDot className="w-2.5 h-2.5" /> 예정
        </span>
        <span className="inline-flex items-center gap-0.5 text-slate-400">
          참여 전
        </span>
      </div>

      {/* 참여자 선택 탭 (참여자가 여러 명일 경우) */}
      {calendarData.participants.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {calendarData.participants.map((p) => {
            const isSelected = p.userId === activeParticipant.userId;
            const isMe = currentUserId !== undefined && p.userId === currentUserId;
            return (
              <button
                key={p.userId}
                onClick={() => setSelectedUserId(p.userId)}
                className={`px-3 py-1.5 rounded-md font-medium shrink-0 flex items-center gap-1.5 transition ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.profileImageUrl ? (
                  <img
                    src={p.profileImageUrl}
                    alt={p.nickname}
                    className="w-3.5 h-3.5 rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-3.5 h-3.5" />
                )}
                <span>{p.nickname}{isMe ? ' (나)' : ''}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 선택된 참여자의 날짜별 기록 목록 */}
      <div className="space-y-2">
        {activeParticipant.records.map((record) => {
          const isMyRecord =
            currentUserId !== undefined && activeParticipant.userId === currentUserId;
          const todayStr = getTodayKstString();

          return (
            <CalendarRecordRow
              key={`${record.date}-${record.id}`}
              record={record}
              isMyRecord={isMyRecord}
              todayStr={todayStr}
              renderStatusBadge={renderStatusBadge}
              onStartVerify={onStartVerify}
            />
          );
        })}
      </div>
    </div>
  );
};
