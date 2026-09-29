import type { ReactNode } from "react";
import { CalendarCheck, Camera, Check, UserPlus, Users } from "./ScreenIcons";
import type { GroupDetail, TodayAction } from "../../types";
import { Screen, ScreenAvatar } from "./Screen";
import { AppHeader } from "../layout/AppHeader";

export function GroupHomeScreen({
  group,
  challengeCount,
  tab = "home",
  actions,
  loading,
  verifiedUserIds,
  copied,
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
          <button
            type="button"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
            aria-label="친구 초대"
            onClick={onInvite}
          >
            {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <UserPlus className="w-5 h-5" />}
          </button>
        }
      />
      <nav className="flex border-b border-slate-200 bg-white sticky top-14 z-20" aria-label="모임 메뉴">
        <button
          className={`flex-1 py-3 text-sm font-semibold text-center transition border-b-2 cursor-pointer flex items-center justify-center gap-1 ${
            tab === "home"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
          aria-current={tab === "home" ? "page" : undefined}
          onClick={() => onTab("home")}
        >
          홈
        </button>
        <button
          className={`flex-1 py-3 text-sm font-semibold text-center transition border-b-2 cursor-pointer flex items-center justify-center gap-1 ${
            tab === "challenges"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
          aria-current={tab === "challenges" ? "page" : undefined}
          onClick={() => onTab("challenges")}
        >
          <span>챌린지</span>
          <small className="px-1.5 py-0.2 rounded-full text-[11px] bg-slate-100 text-slate-600 font-bold">
            {challengeCount}
          </small>
        </button>
        <button
          className={`flex-1 py-3 text-sm font-semibold text-center transition border-b-2 cursor-pointer flex items-center justify-center gap-1 ${
            tab === "members"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
          aria-current={tab === "members" ? "page" : undefined}
          onClick={() => onTab("members")}
        >
          <span>멤버</span>
          <small className="px-1.5 py-0.2 rounded-full text-[11px] bg-slate-100 text-slate-600 font-bold">
            {group.members.length}
          </small>
        </button>
      </nav>
      <main className="flex-1 overflow-y-auto px-4 py-3.5 flex flex-col gap-3.5 pb-24">
        {tab === "home" && (
          <>
            <div className="flex items-center justify-between mt-1">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-blue-600" />내 오늘 할 일
              </h3>
              <span className="text-xs font-medium text-slate-500">
                {actions.filter((a) => a.isCompletedToday).length} / {actions.length} 완료
              </span>
            </div>
            {loading ? (
              <p className="py-6 text-center text-xs text-slate-400" role="status">
                오늘 할 일을 불러오는 중...
              </p>
            ) : !actions.length ? (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 text-center">
                <p className="text-xs text-slate-400">오늘 수행할 챌린지가 없어요.</p>
              </div>
            ) : (
              actions.map((action) => (
                <div
                  key={action.challengeId}
                  className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[15px] font-bold text-slate-800 leading-snug">{action.challengeTitle}</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          action.isCompletedToday
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {action.isCompletedToday && <Check className="w-3 h-3" />}
                        {action.isCompletedToday ? "완료" : "인증 대기"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 truncate">
                      {action.verificationCriteria}
                    </div>
                  </div>
                  {action.isCompletedToday ? (
                    action.myVerification?.imageUrl && (
                      <button
                        className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-100 cursor-pointer"
                        onClick={() => onImage(action.myVerification!.imageUrl)}
                        aria-label="사진 확대 보기"
                      >
                        <img src={action.myVerification.imageUrl} alt="인증 사진" className="w-full h-full object-cover" />
                      </button>
                    )
                  ) : (
                    <button
                      className="h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer shrink-0"
                      onClick={() => onVerify(action)}
                      disabled={!action.canVerify}
                    >
                      <Camera className="w-4 h-4" />
                      인증하기
                    </button>
                  )}
                </div>
              ))
            )}
            <div className="flex items-center justify-between mt-2">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                오늘 누가 했을까
              </h3>
              <span className="text-xs font-medium text-slate-500">{verifiedUserIds.size}명 인증</span>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
              <div className="grid grid-cols-4 gap-3 text-center">
                {group.members.map((member) => (
                  <div className="flex flex-col items-center gap-1.5" key={member.userId}>
                    <div className="relative">
                      <ScreenAvatar image={member.profileImageUrl} dim={!verifiedUserIds.has(member.userId)} className="w-11 h-11" />
                      {verifiedUserIds.has(member.userId) && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-700 truncate max-w-full">
                      {member.nickname}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {children}
      </main>
    </Screen>
  );
}
