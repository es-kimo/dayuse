import React from 'react';
import type { ChallengeDetail, ChallengeCalendarResponse, CalendarDailyRecordItem } from '../types';
import { Camera, Share2, MoreVertical, Check } from 'lucide-react';
import { Menu, MenuTrigger, MenuPopup, MenuItem } from './ui/Menu';
import { Button } from './dayu/ui';
import { ChallengeHeroCard } from './ChallengeHeroCard';
import { MyRecordCard } from './MyRecordCard';
import { HowToCertifyCard } from './HowToCertifyCard';
import { ParticipantsCard } from './ParticipantsCard';

import { SubPageHeader } from './layout/SubPageHeader';
import { BottomActionBar } from './layout/BottomActionBar';

interface ChallengeDetailViewBProps {
  challenge: ChallengeDetail;
  calendarData: ChallengeCalendarResponse | null;
  dDay: string;
  totalDurationDays: number;
  currentDayNumber: number;
  progressPercent: number;
  remainingDays: number;
  isTodayCompleted: boolean;
  streakCount: number;
  calendarMonthDays?: Array<{
    dayNumber: number;
    dateStr: string;
    status: 'BLANK' | 'DONE' | 'MISS' | 'WAIT_NOW' | 'FUTURE';
  }>;
  currentUserId?: number;
  onBack: () => void;
  onShare: () => void;
  onOpenCert: () => void;
  onAbortChallenge?: () => void;
  onDeleteChallenge?: () => void;
  onOpenMidJoin?: () => void;
  onRestartChallenge?: () => void;
}

export const ChallengeDetailViewB: React.FC<ChallengeDetailViewBProps> = ({
  challenge,
  calendarData,
  dDay,
  totalDurationDays,
  currentDayNumber,
  progressPercent,
  remainingDays,
  isTodayCompleted,
  streakCount,
  currentUserId,
  onBack,
  onShare,
  onOpenCert,
  onAbortChallenge,
  onDeleteChallenge,
  onOpenMidJoin,
  onRestartChallenge,
}) => {
  const myParticipant = calendarData?.participants.find((p) => p.userId === currentUserId);
  const myRecords: CalendarDailyRecordItem[] = myParticipant?.records || [];

  // 참여 불가 사유 혹은 하단 버튼 상태
  const renderBottomAction = () => {
    if (challenge.status === 'ABORTED') {
      return (
        <Button variant="ghost" size="lg" disabled className="w-full text-slate-400">
          중단된 챌린지예요
        </Button>
      );
    }

    if (challenge.status === 'ENDED') {
      return (
        <Button variant="ghost" size="lg" disabled className="w-full text-slate-400">
          종료된 챌린지예요
        </Button>
      );
    }

    if (challenge.status === 'NOT_STARTED') {
      return (
        <Button variant="ghost" size="lg" disabled className="w-full text-slate-400">
          챌린지 시작 전이에요
        </Button>
      );
    }

    if (!challenge.isParticipating) {
      return (
        <Button variant="ghost" size="lg" disabled className="w-full text-slate-400">
          참여 중인 챌린지가 아니에요
        </Button>
      );
    }

    if (isTodayCompleted) {
      return (
        <Button variant="ghost" size="lg" disabled className="w-full text-slate-400 gap-1.5">
          <Check className="w-5 h-5 text-emerald-500" />
          오늘 인증 완료
        </Button>
      );
    }

    return (
      <Button
        variant="primary"
        size="lg"
        onClick={onOpenCert}
        className="w-full text-base shadow-sm gap-2"
      >
        <Camera className="w-5 h-5" />
        오늘 인증하기
      </Button>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] text-[#1E293B]">
      {/* Top Header */}
      <SubPageHeader
        title="챌린지"
        onBack={onBack}
        rightAction={
          <>
            <button
              onClick={onShare}
              aria-label="공유"
              className="w-10 h-10 rounded-xl grid place-items-center text-slate-600 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
            >
              <Share2 className="w-5 h-5" />
            </button>
            {(challenge.isCreator || challenge.canAbort) && (
              <Menu>
                <MenuTrigger
                  className="w-10 h-10 rounded-xl grid place-items-center text-slate-600 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                  aria-label="더보기"
                >
                  <MoreVertical className="w-5 h-5" />
                </MenuTrigger>
                <MenuPopup sideOffset={6}>
                  {challenge.canAbort && onAbortChallenge && (
                    <MenuItem
                      onSelect={onAbortChallenge}
                      className="text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      챌린지 중단
                    </MenuItem>
                  )}
                  {challenge.isCreator && onDeleteChallenge && (
                    <MenuItem
                      onSelect={onDeleteChallenge}
                      className="text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      챌린지 삭제
                    </MenuItem>
                  )}
                  {onOpenMidJoin && (
                    <MenuItem onSelect={onOpenMidJoin} className="cursor-pointer">
                      중도 참여 코드
                    </MenuItem>
                  )}
                  {onRestartChallenge && (
                    <MenuItem onSelect={onRestartChallenge} className="cursor-pointer">
                      새 회차로 이어하기
                    </MenuItem>
                  )}
                </MenuPopup>
              </Menu>
            )}
          </>
        }
      />

      {/* Main Body */}
      <div className="w-full max-w-[390px] mx-auto pt-1.5 pb-28 flex flex-col gap-3.5">
        {/* 1. Challenge Hero Card */}
        <ChallengeHeroCard
          challenge={challenge}
          dDay={dDay}
          totalDurationDays={totalDurationDays}
          currentDayNumber={currentDayNumber}
          progressPercent={progressPercent}
          remainingDays={remainingDays}
          isTodayCompleted={isTodayCompleted}
        />

        {/* 2. My Record Card (StreakCalendar) */}
        <MyRecordCard
          challenge={challenge}
          myRecords={myRecords}
          streakCount={streakCount}
          currentDayNumber={currentDayNumber}
          isTodayCompleted={isTodayCompleted}
        />

        {/* 3. How to Certify Card */}
        <HowToCertifyCard challenge={challenge} />

        {/* 4. Participants Card */}
        <ParticipantsCard
          challenge={challenge}
          calendarData={calendarData}
          currentUserId={currentUserId}
          totalDurationDays={totalDurationDays}
        />
      </div>

      {/* Floating Bottom Action */}
      <BottomActionBar>
        {renderBottomAction()}
      </BottomActionBar>
    </div>
  );
};
