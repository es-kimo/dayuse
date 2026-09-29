import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Crown, Link, Plus } from "./ScreenIcons";
import { groupsApi } from "../../api/groups";
import { challengesApi } from "../../api/challenges";
import { todayApi } from "../../api/today";
import type { GroupSummary, GroupDetail, ChallengeSummary, TodayAction } from "../../types";
import { Screen, ScreenAvatar, ScreenNav, screenAssets } from "./Screen";
import { AppHeader } from "../layout/AppHeader";
import { Button, Card, Chip, GroupIcon, RowText, Segmented, TextField } from "../dayu/ui";

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
      <TextField
        aria-label="초대 코드 또는 링크"
        placeholder="초대 코드 또는 링크"
        value={inviteInput}
        onChange={(e) => setInviteInput(e.target.value)}
      />
      <Button variant="dark" className="shrink-0" disabled={!inviteInput.trim()}>
        들어가기
      </Button>
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
            <Button size="sm" onClick={() => navigate("/groups/new")}>
              <Plus className="size-4" />
              만들기
            </Button>
          ) : undefined
        }
      />
      <main
        className={`flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto pb-24 ${
          empty ? "justify-center px-6 pt-6 pb-10" : "px-4 pt-1"
        }`}
      >
        {loading ? (
          <p className="py-12 text-center text-[13px] text-slate-500" role="status">
            모임 목록을 불러오는 중...
          </p>
        ) : error ? (
          <div className="flex items-center justify-between rounded-[18px] border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
            <span>{error}</span>
            <button onClick={retry} className="cursor-pointer font-bold underline">
              다시 시도
            </button>
          </div>
        ) : empty ? (
          <>
            <div className="flex flex-col items-center text-center">
              <img src={screenAssets.symbol} alt="" className="size-24" />
              <h2 className="mt-3.5 text-[20px] leading-[30px] font-extrabold text-slate-800">
                아직 참여한 모임이 없어요
              </h2>
              <p className="mt-2 text-[14px] text-slate-500">친구와 모임을 만들거나, 받은 초대 코드로 들어가 보세요</p>
            </div>
            <Button size="lg" className="mt-[38px] w-full" onClick={() => navigate("/groups/new")}>
              <Plus className="size-4" />
              모임 만들기
            </Button>
            <div className="mt-8 mb-[26px] flex items-center gap-2.5 text-[12px] text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              초대를 받았다면
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            {joinForm}
          </>
        ) : (
          <>
            <Segmented
              label="모임 필터"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: `전체 ${groups.length}` },
                { value: "host", label: `내가 만든 ${hostGroups.length}` },
              ]}
            />
            {(filter === "all" ? groups : hostGroups).map((group) => {
              const data = details[group.id];
              const members = data?.group?.members || [];
              const own = actions?.filter((a) => a.groupId === group.id);
              const remaining = own?.filter((a) => !a.isCompletedToday).length;
              const inProgress = data?.challenges?.filter((c) => c.status === "IN_PROGRESS").length;
              return (
                <Card
                  key={group.id}
                  className="flex cursor-pointer flex-col gap-3 transition-colors hover:border-slate-300"
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
                    <GroupIcon>{group.name.slice(0, 1)}</GroupIcon>
                    <RowText
                      title={
                        <span className="flex items-center gap-1.5">
                          <span className="truncate">{group.name}</span>
                          {group.role === "HOST" && (
                            <Chip tone="host" className="shrink-0">
                              <Crown className="size-3.5" />
                              모임장
                            </Chip>
                          )}
                        </span>
                      }
                      desc={`멤버 ${group.memberCount}명${inProgress === undefined ? "" : ` · 챌린지 ${inProgress}개`}`}
                    />
                    <ChevronRight className="size-[22px] shrink-0 text-slate-400" />
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-[13px]">
                    <div className="flex -space-x-2">
                      {members.slice(0, group.memberCount > 4 ? 2 : 4).map((m) => (
                        <ScreenAvatar key={m.userId} image={m.profileImageUrl} className="size-[30px] border-2 text-[10px]" />
                      ))}
                      {group.memberCount > 4 && (
                        <div className="grid size-[30px] place-items-center rounded-full border-2 border-white bg-slate-400 text-[11px] font-extrabold text-white">
                          +{group.memberCount - 2}
                        </div>
                      )}
                    </div>
                    <Chip tone={remaining ? "warn" : own?.length ? "ok" : "gray"}>
                      {actions === null
                        ? "현황 불러오는 중"
                        : remaining
                          ? `오늘 ${remaining}개 남음`
                          : own?.length
                            ? "오늘 모두 완료"
                            : "참여 중 챌린지 없음"}
                    </Chip>
                  </div>
                </Card>
              );
            })}
            {filter === "host" && !hostGroups.length && (
              <p className="py-6 text-center text-[13px] text-slate-500">아직 직접 만든 모임이 없어요.</p>
            )}
            <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
              <button
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                aria-controls="screen-join"
                className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3.5 text-left text-[14.5px] font-bold text-slate-800 transition-colors hover:bg-slate-50"
              >
                <Link className="size-4 text-slate-500" />
                <span className="flex-1">초대 코드로 들어가기</span>
                <ChevronRight className={`size-4 text-slate-400 transition-transform ${expanded ? "rotate-90" : ""}`} />
              </button>
              {expanded && (
                <div id="screen-join" className="px-4 pt-1 pb-4">
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
