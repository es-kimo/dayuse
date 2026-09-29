import type { ReactNode } from "react";
import { CalendarCheck, Camera, Check, UserPlus, Users } from "./ScreenIcons";
import type { GroupDetail, TodayAction } from "../../types";
import { Screen, ScreenAvatar } from "./Screen";
import { AppHeader, HeaderIconButton } from "../layout/AppHeader";
import { Button, Card, Chip, PageTabs, SectionHead } from "../dayu/ui";

export function GroupHomeScreen({
  group,
  challengeCount,
  tab = "home",
  actions,
  loading,
  verifiedUserIds,
  copied,
  uncheckedSlot,
  onBack,
  onInvite,
  onTab,
  onVerify,
  onImage,
  children,
}: {
  group: GroupDetail;
  challengeCount: number;
  tab?: "home" | "challenges" | "members";
  actions: TodayAction[];
  loading: boolean;
  verifiedUserIds: Set<number>;
  copied: boolean;
  /** 오늘 할 일과 "오늘 누가 했을까" 사이에 들어가는 자리(미확인 지난 기록 안내) */
  uncheckedSlot?: ReactNode;
  onBack: () => void;
  onInvite: () => void;
  onTab: (tab: "home" | "challenges" | "members") => void;
  onVerify: (action: TodayAction) => void;
  onImage: (src: string) => void;
  children: ReactNode;
}) {
  return (
    <Screen>
      <AppHeader
        variant="sub"
        onBack={onBack}
        title={group.name}
        rightAction={
          <HeaderIconButton aria-label="친구 초대" onClick={onInvite}>
            {copied ? <Check className="size-[22px] text-emerald-700" /> : <UserPlus className="size-[22px]" />}
          </HeaderIconButton>
        }
      />
      <PageTabs
        label="모임 메뉴"
        value={tab}
        onChange={onTab}
        options={[
          { value: "home", label: "홈" },
          { value: "challenges", label: "챌린지", count: challengeCount },
          { value: "members", label: "멤버", count: group.members.length },
        ]}
      />
      <main className="flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto px-4 pt-5 pb-[calc(3rem+env(safe-area-inset-bottom,0px))]">
        {tab === "home" && (
          <>
            <SectionHead
              icon={<CalendarCheck className="size-4 text-blue-600" />}
              title="내 오늘 할 일"
              right={`${actions.filter((a) => a.isCompletedToday).length} / ${actions.length} 완료`}
            />
            {loading ? (
              <p className="py-6 text-center text-[13px] text-slate-500" role="status">
                오늘 할 일을 불러오는 중...
              </p>
            ) : !actions.length ? (
              <Card className="text-center">
                <p className="text-[13px] text-slate-500">오늘 수행할 챌린지가 없어요.</p>
              </Card>
            ) : (
              actions.map((action) => (
                <Card
                  key={action.challengeId}
                  tone={action.isCompletedToday ? "done" : "default"}
                  className="flex items-center gap-3 px-[15px] py-[15px]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[15.5px] font-bold tracking-[-0.01em] text-slate-800">
                        {action.challengeTitle}
                      </span>
                      <Chip tone={action.isCompletedToday ? "ok" : "warn"}>
                        {action.isCompletedToday && <Check className="size-3.5" />}
                        {action.isCompletedToday ? "완료" : "인증 대기"}
                      </Chip>
                    </div>
                    <div className="truncate text-[13px] text-slate-500">{action.verificationCriteria}</div>
                  </div>
                  {action.isCompletedToday ? (
                    action.myVerification?.imageUrl && (
                      <button
                        className="size-[52px] shrink-0 cursor-pointer overflow-hidden rounded-xl"
                        onClick={() => onImage(action.myVerification!.imageUrl)}
                        aria-label="사진 확대 보기"
                      >
                        <img src={action.myVerification.imageUrl} alt="인증 사진" className="size-full object-cover" />
                      </button>
                    )
                  ) : (
                    <Button
                      size="sm"
                      className="shrink-0"
                      onClick={() => onVerify(action)}
                      disabled={!action.canVerify}
                    >
                      <Camera className="size-4" />
                      인증하기
                    </Button>
                  )}
                </Card>
              ))
            )}

            {uncheckedSlot}

            <SectionHead
              icon={<Users className="size-4 text-blue-600" />}
              title="오늘 누가 했을까"
              right={`${verifiedUserIds.size}명 인증`}
            />
            <Card className="px-[15px] py-[15px]">
              <div className="flex flex-wrap gap-2">
                {group.members.map((member) => {
                  const done = verifiedUserIds.has(member.userId);
                  return (
                    <div className="flex w-14 flex-col items-center gap-1" key={member.userId}>
                      <div className="relative">
                        <ScreenAvatar image={member.profileImageUrl} dim={!done} className="size-11" />
                        {done && (
                          <span className="absolute -right-0.5 -bottom-0.5 grid size-[18px] place-items-center rounded-full border-2 border-white bg-emerald-700 text-white">
                            <Check className="size-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <span className="max-w-full truncate text-[11.5px] text-slate-600">{member.nickname}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}
        {children}
      </main>
    </Screen>
  );
}
