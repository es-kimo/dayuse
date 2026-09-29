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
import { HeaderIconButton } from './layout/AppHeader';
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
          <Check className="size-5 text-emerald-700" />
          오늘 인증 완료
        </Button>
      );
    }

    return (
      <Button
        variant="primary"
        size="lg"
        onClick={onOpenCert}
        className="w-full gap-2"
      >
        <Camera className="size-4" />
        오늘 인증하기
      </Button>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      {/* Top Header */}
      <SubPageHeader
        title="챌린지"
        onBack={onBack}
        rightAction={
          <>
            <HeaderIconButton onClick={onShare} aria-label="공유">
              <Share2 className="size-[22px]" />
            </HeaderIconButton>
            {(challenge.isCreator || challenge.canAbort) && (
              <Menu>
                <MenuTrigger
                  className="grid size-10 cursor-pointer place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100"
                  aria-label="더보기"
                >
                  <MoreVertical className="size-[22px]" />
                </MenuTrigger>
                <MenuPopup sideOffset={6}>
                  {challenge.canAbort && onAbortChallenge && (
                    <MenuItem
                      onSelect={onAbortChallenge}
                      className="cursor-pointer text-red-700 hover:bg-red-50"
                    >
                      챌린지 중단
                    </MenuItem>
                  )}
                  {challenge.isCreator && onDeleteChallenge && (
                    <MenuItem
                      onSelect={onDeleteChallenge}
                      className="cursor-pointer text-red-700 hover:bg-red-50"
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
      <div className="mx-auto flex w-full max-w-app flex-col gap-[14px] px-4 pt-1.5 pb-28">
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
