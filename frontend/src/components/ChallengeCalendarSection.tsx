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
} from 'lucide-react';

interface ChallengeCalendarSectionProps {
  calendarData: ChallengeCalendarResponse | null;
  loading: boolean;
}

export const ChallengeCalendarSection: React.FC<ChallengeCalendarSectionProps> = ({
  calendarData,
  loading,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col items-center justify-center text-slate-400 gap-2 mb-4">
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
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs mb-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>수행 히스토리 달력</span>
        </div>
        <span className="text-[10px] text-slate-400">
          {calendarData.startDate} ~ {calendarData.endDate}
        </span>
      </div>

      {/* 상태 범례 (5대 상태 가이드) */}
      <div className="flex flex-wrap gap-1.5 text-[10px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
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
        <span className="inline-flex items-center gap-0.5 text-slate-400 font-medium">
          <CircleDot className="w-2.5 h-2.5" /> 예정
        </span>
      </div>

      {/* 참여자 선택 탭 (2명 이상일 때) */}
      {calendarData.participants.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {calendarData.participants.map((p) => {
            const isSelected = p.userId === activeParticipant.userId;
            return (
              <button
                key={p.userId}
                onClick={() => setSelectedUserId(p.userId)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.profileImageUrl ? (
                  <img
                    src={p.profileImageUrl}
                    alt={p.nickname}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-3.5 h-3.5" />
                )}
                <span>{p.nickname}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 선택된 참여자의 날짜별 기록 목록 */}
      <div className="space-y-2">
        {activeParticipant.records.map((record) => (
          <div
            key={record.id}
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 w-24">
                {record.date}
              </span>
              {record.imageUrl && (
                <img
                  src={record.imageUrl}
                  alt="인증 사진"
                  className="w-7 h-7 rounded-lg object-cover border border-slate-200"
                />
              )}
              {record.comment && (
                <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
                  {record.comment}
                </span>
              )}
            </div>
            <div>{renderStatusBadge(record)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
