import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Crown, Link, Plus } from "./ScreenIcons";
import { groupsApi } from "../../api/groups";
import { challengesApi } from "../../api/challenges";
import { todayApi } from "../../api/today";
import type { GroupSummary, GroupDetail, ChallengeSummary, TodayAction } from "../../types";
import { Screen, ScreenAvatar, ScreenNav, screenAssets } from "./Screen";
import { AppHeader } from "../layout/AppHeader";

type Details = { group?: GroupDetail; challenges?: ChallengeSummary[] };

export function GroupsScreen({
  groups,
  loading,
  error,
  retry,
  inviteInput,
  setInviteInput,
  onJoin,
}: {
  groups: GroupSummary[];
  loading: boolean;
  error: string;
  retry: () => void;
  inviteInput: string;
  setInviteInput: (value: string) => void;
  onJoin: (e: FormEvent) => void;
}) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "host">("all");
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<Record<number, Details>>({});
  const [actions, setActions] = useState<TodayAction[] | null>(null);

  useEffect(() => {
    let active = true;
    void todayApi
      .getAllTodayActions()
      .then((data) => {
        if (active) setActions(data);
      })
      .catch(() => {});
    groups.forEach((group) => {
      void Promise.allSettled([groupsApi.getGroupDetail(group.id), challengesApi.getGroupChallenges(group.id)]).then(
        ([detail, challenges]) => {
          if (active)
            setDetails((prev) => ({
              ...prev,
              [group.id]: {
                group: detail.status === "fulfilled" ? detail.value : undefined,
                challenges: challenges.status === "fulfilled" ? challenges.value : undefined,
              },
            }));
        },
      );
    });
    return () => {
      active = false;
    };
  }, [groups]);

  const hostGroups = groups.filter((g) => g.role === "HOST");
  const pending = actions?.filter((a) => !a.isCompletedToday).length || 0;

  const joinForm = (
    <form onSubmit={onJoin} className="flex gap-2">
      <input
        className="flex-1 h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
        aria-label="초대 코드 또는 링크"
        placeholder="초대 코드 또는 링크"
        value={inviteInput}
        onChange={(e) => setInviteInput(e.target.value)}
      />
      <button
        className="h-11 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-sm transition cursor-pointer shrink-0"
        disabled={!inviteInput.trim()}
      >
        들어가기
      </button>
    </form>
  );

  const empty = !loading && !error && groups.length === 0;

  return (
    <Screen>
      <AppHeader
        variant="main"
        title="내 모임"
        rightAction={
          !empty ? (
            <button
              type="button"
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] transition cursor-pointer"
              onClick={() => navigate("/groups/new")}
            >
              <Plus className="w-4 h-4" />
              만들기
            </button>
          ) : undefined
        }
      />
      <main className={`flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3.5 pb-24 ${empty ? "justify-center px-6 py-10" : ""}`}>
        {loading ? (
          <p className="py-12 text-center text-xs text-slate-400" role="status">
            모임 목록을 불러오는 중...
          </p>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={retry} className="font-bold underline cursor-pointer">
              다시 시도
            </button>
          </div>
        ) : empty ? (
          <>
            <div className="flex flex-col items-center justify-center text-center gap-2">
              <img src={screenAssets.symbol} alt="" className="w-24 h-24 mb-1" />
              <h2 className="text-xl font-extrabold text-slate-800">아직 참여한 모임이 없어요</h2>
              <p className="text-xs text-slate-500">친구와 모임을 만들거나, 받은 초대 코드로 들어가 보세요</p>
            </div>
            <button
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-1.5 transition active:scale-[0.99] cursor-pointer mt-6"
              onClick={() => navigate("/groups/new")}
            >
              <Plus className="w-4 h-4" />
              모임 만들기
            </button>
            <div className="flex items-center gap-2.5 my-4 text-xs text-slate-400">
              <span className="flex-1 h-px bg-slate-200" />
              초대를 받았다면
              <span className="flex-1 h-px bg-slate-200" />
            </div>
            {joinForm}
          </>
        ) : (
          <>
            <div className="flex p-1 bg-slate-200/80 rounded-xl gap-1" role="group" aria-label="모임 필터">
              <button
                className={`flex-1 py-1.5 text-xs rounded-lg transition cursor-pointer ${
                  filter === "all"
                    ? "bg-white text-slate-900 font-bold shadow-xs"
                    : "text-slate-600 font-medium hover:text-slate-900"
                }`}
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
              >
                전체 {groups.length}
              </button>
              <button
                className={`flex-1 py-1.5 text-xs rounded-lg transition cursor-pointer ${
                  filter === "host"
                    ? "bg-white text-slate-900 font-bold shadow-xs"
                    : "text-slate-600 font-medium hover:text-slate-900"
                }`}
                aria-pressed={filter === "host"}
                onClick={() => setFilter("host")}
              >
                내가 만든 {hostGroups.length}
              </button>
            </div>
            {(filter === "all" ? groups : hostGroups).map((group) => {
              const data = details[group.id];
              const members = data?.group?.members || [];
              const own = actions?.filter((a) => a.groupId === group.id);
              const remaining = own?.filter((a) => !a.isCompletedToday).length;
              return (
                <div
                  key={group.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-slate-300 transition active:scale-[0.99] cursor-pointer flex flex-col gap-3"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/groups/${group.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/groups/${group.id}`);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 font-bold text-base flex items-center justify-center shrink-0">
                      {group.name.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-bold text-slate-800 flex items-center gap-1.5 truncate">
                        <span className="truncate">{group.name}</span>
                        {group.role === "HOST" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                            <Crown className="w-3 h-3" />
                            모임장
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        멤버 {group.memberCount}명
                        {data?.challenges &&
                          ` · 챌린지 ${data.challenges.filter((c) => c.status === "IN_PROGRESS").length}개`}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex -space-x-1.5">
                      {members.slice(0, group.memberCount > 4 ? 2 : 4).map((m) => (
                        <ScreenAvatar key={m.userId} image={m.profileImageUrl} className="w-7 h-7 text-[10px]" />
                      ))}
                      {group.memberCount > 4 && (
                        <div className="w-7 h-7 rounded-full bg-slate-400 text-white font-bold text-[10px] flex items-center justify-center border border-white">
                          +{group.memberCount - 2}
                        </div>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        remaining
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : own?.length
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {actions === null
                        ? "현황 불러오는 중"
                        : remaining
                          ? `오늘 ${remaining}개 남음`
                          : own?.length
                            ? "오늘 모두 완료"
                            : "참여 중 챌린지 없음"}
                    </span>
                  </div>
                </div>
              );
            })}
            {filter === "host" && !hostGroups.length && (
              <p className="text-xs text-slate-400 py-6 text-center">
                아직 직접 만든 모임이 없어요.
              </p>
            )}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <button
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                aria-controls="screen-join"
                className="w-full flex items-center gap-2.5 px-4 py-3.5 text-left text-sm font-bold text-slate-800 hover:bg-slate-50 transition cursor-pointer"
              >
                <Link className="w-4 h-4 text-slate-500" />
                <span className="flex-1">초대 코드로 들어가기</span>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-90" : ""}`} />
              </button>
              {expanded && (
                <div id="screen-join" className="px-4 pb-4 pt-1">
                  {joinForm}
                </div>
              )}
            </div>
          </>
        )}
      </main>
      <ScreenNav active="groups" pending={pending} />
    </Screen>
  );
}
