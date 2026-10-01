import React from 'react';
import type { ChallengeDetail, ChallengeCalendarResponse, CalendarDailyRecordItem } from '../types';
import { Camera, Share2, MoreVertical, Check, Coins, RotateCcw, Edit3 } from 'lucide-react';
import { Menu, MenuTrigger, MenuPopup, MenuItem } from './ui/Menu';
import { Button } from './dayu/ui';
import { ChallengeHeroCard } from './ChallengeHeroCard';
import { MyRecordCard } from './MyRecordCard';
import { HowToCertifyCard } from './HowToCertifyCard';
import { ParticipantsCard } from './ParticipantsCard';
import { RedayActionCard, type RedayActionItem } from './RedayActionCard';
import { pickRedayUsableRecords } from '../utils/reday';
import { getTodayKstString } from '../utils/date';

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
  onEditChallenge?: () => void;
  onOpenMidJoin?: () => void;
  onRestartChallenge?: () => void;
  /** 주 N회·리데이 미허용 챌린지에서는 false. 리데이 안내 카드를 렌더하지 않는다. */
  redayUiEnabled?: boolean;
  onStartReday?: (recordId: number) => void;
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
  onEditChallenge,
  onOpenMidJoin,
  onRestartChallenge,
  redayUiEnabled = false,
  onStartReday,
}) => {
  const myParticipant = calendarData?.participants.find((p) => p.userId === currentUserId);
  const myRecords: CalendarDailyRecordItem[] = myParticipant?.records || [];

  // 이 챌린지 안에서 지금 리데이를 쓸 수 있는 내 기록. 챌린지명은 화면 상단에 이미 있어 넣지 않는다.
  const redayItems: RedayActionItem[] = pickRedayUsableRecords(myRecords).map((record) => ({
    recordId: record.id,
    targetDate: record.date,
    penaltyAmount: record.penaltyAmount,
    redayDeadline: record.redayDeadline,
  }));

  // 참여 불가 사유 혹은 하단 버튼 상태
  const renderBottomAction = () => {
    if (challenge.status === 'ABORTED') {
      if (onRestartChallenge) {
        return (
          <Button variant="line" size="lg" onClick={onRestartChallenge} className="w-full gap-2">
            <RotateCcw className="size-4" />
            이 챌린지 다시 시작하기
          </Button>
        );
      }
      return (
        <Button variant="ghost" size="lg" disabled className="w-full text-slate-400">
          중단된 챌린지예요
        </Button>
      );
    }

    if (challenge.status === 'ENDED') {
      if (onRestartChallenge) {
        return (
          <Button variant="line" size="lg" onClick={onRestartChallenge} className="w-full gap-2">
            <RotateCcw className="size-4" />
            이 챌린지 다시 시작하기
          </Button>
        );
      }
      return (
        <Button variant="ghost" size="lg" disabled className="w-full text-slate-400">
          종료된 챌린지예요
        </Button>
      );
    }

    // 1. 참여 가능한 상태 (신규 참여 또는 중도 참여)
    if (challenge.canJoin) {
      const todayStr = getTodayKstString();
      const joinLabel = (() => {
        if (challenge.status === 'NOT_STARTED') return '챌린지 참여하기';
        if (challenge.endDate === todayStr) return '오늘 하루 참여하기';
        const diffDays = Math.max(
          1,
          Math.round(
            (new Date(challenge.endDate).getTime() - new Date(todayStr).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1
        );
        return `남은 ${diffDays}일 참여하기`;
      })();

      return (
        <Button
          variant="primary"
          size="lg"
          onClick={onOpenMidJoin}
          className="w-full gap-2"
        >
          <Coins className="size-4" />
          {joinLabel}
        </Button>
      );
    }

    // 2. 이미 참여 중인 경우
    if (challenge.isParticipating) {
      if (challenge.status === 'NOT_STARTED') {
        return (
          <Button variant="ghost" size="lg" disabled className="w-full text-slate-400">
            챌린지 시작 전이에요
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
    }

    // 3. 참여 중이지 않고 참여도 불가능한 경우
    if (challenge.status === 'NOT_STARTED') {
      return (
        <Button variant="ghost" size="lg" disabled className="w-full text-slate-400">
          챌린지 시작 전이에요
        </Button>
      );
    }

    return (
      <Button variant="ghost" size="lg" disabled className="w-full text-slate-400">
        참여 중인 챌린지가 아니에요
      </Button>
    );
  };

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-800">
      {/* Top Header */}
      <SubPageHeader
        title="챌린지"
        onBack={onBack}
        rightAction={
          <>
            <HeaderIconButton onClick={onShare} aria-label="공유">
              <Share2 className="size-[22px]" />
            </HeaderIconButton>
            {(challenge.isCreator || challenge.canAbort || onRestartChallenge) && (
              <Menu>
                <MenuTrigger
                  className="grid size-10 cursor-pointer place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100"
                  aria-label="더보기"
                >
                  <MoreVertical className="size-[22px]" />
                </MenuTrigger>
                <MenuPopup sideOffset={6}>
                  {challenge.isCreator && onEditChallenge && (
                    <MenuItem
                      onSelect={onEditChallenge}
                      className="cursor-pointer"
                    >
                      <Edit3 className="size-4 mr-2" />
                      챌린지 수정
                    </MenuItem>
                  )}
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
                  {onRestartChallenge && (
                    <MenuItem onSelect={onRestartChallenge} className="cursor-pointer">
                      <RotateCcw className="size-4 mr-2" />
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
      <div className="mx-auto flex w-full max-w-app flex-col gap-[14px] px-4 pt-1.5 pb-action-bar">
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

        {/* 2-1. 리데이 사용 안내 (기한 안에 쓸 수 있는 지각 기록이 있을 때만) */}
        {onStartReday && redayUiEnabled && (
          <RedayActionCard items={redayItems} onStartReday={(item) => onStartReday(item.recordId)} />
        )}

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
