import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Crown, Link, Plus } from './ScreenIcons';
import { groupsApi } from '../../api/groups';
import { challengesApi } from '../../api/challenges';
import { todayApi } from '../../api/today';
import type { GroupSummary, GroupDetail, ChallengeSummary, TodayAction } from '../../types';
import { Screen, ScreenAvatar, ScreenNav, screenAssets } from './Screen';
import { AppHeader } from '../layout/AppHeader';

type Details = { group?: GroupDetail; challenges?: ChallengeSummary[] };
export function GroupsScreen({ groups, loading, error, retry, inviteInput, setInviteInput, onJoin }: {
  groups: GroupSummary[]; loading: boolean; error: string; retry: () => void;
  inviteInput: string; setInviteInput: (value: string) => void; onJoin: (e: FormEvent) => void;
}) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'host'>('all');
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<Record<number, Details>>({});
  const [actions, setActions] = useState<TodayAction[] | null>(null);
  useEffect(() => {
    let active = true;
    void todayApi.getAllTodayActions().then(data => { if (active) setActions(data); }).catch(() => {});
    groups.forEach(group => {
      void Promise.allSettled([groupsApi.getGroupDetail(group.id), challengesApi.getGroupChallenges(group.id)]).then(([detail, challenges]) => {
        if (active) setDetails(prev => ({ ...prev, [group.id]: { group: detail.status === 'fulfilled' ? detail.value : undefined, challenges: challenges.status === 'fulfilled' ? challenges.value : undefined } }));
      });
    });
    return () => { active = false; };
  }, [groups]);
  const hostGroups = groups.filter(g => g.role === 'HOST');
  const pending = actions?.filter(a => !a.isCompletedToday).length || 0;
  const joinForm = <form onSubmit={onJoin} style={{ display: 'flex', gap: 8 }}><input className="inp" aria-label="초대 코드 또는 링크" placeholder="초대 코드 또는 링크" value={inviteInput} onChange={e => setInviteInput(e.target.value)} /><button className="btn dark" disabled={!inviteInput.trim()}>들어가기</button></form>;
  const empty = !loading && !error && groups.length === 0;
  return <Screen>
    <AppHeader
      variant="main"
      title="내 모임"
      rightAction={
        !empty ? (
          <button
            type="button"
            className="btn sm flex items-center gap-1.5 h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13.5px] transition cursor-pointer"
            onClick={() => navigate('/groups/new')}
          >
            <Plus className="ic s" />
            만들기
          </button>
        ) : undefined
      }
    />
    <main className="body" style={empty ? { justifyContent: 'center', padding: '24px 24px 40px' } : undefined}>
      {loading ? <p className="screen-loading" role="status">모임 목록을 불러오는 중...</p> : error ? <div className="notice"><span>{error}</span><button onClick={retry}>다시 시도</button></div> : empty ? <>
        <div className="center" style={{ gap: 8 }}><img src={screenAssets.symbol} alt="" style={{ width: 96, height: 96, marginBottom: 6 }} /><h2 style={{ fontSize: 20, fontWeight: 800 }}>아직 참여한 모임이 없어요</h2><p className="sub">친구와 모임을 만들거나, 받은 초대 코드로 들어가 보세요</p></div>
        <button className="btn lg w100" onClick={() => navigate('/groups/new')} style={{ marginTop: 24 }}><Plus className="ic s" />모임 만들기</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 12px', color: 'var(--ink4)', fontSize: 12 }}><span style={{ flex: 1, height: 1, background: 'var(--line)' }} />초대를 받았다면<span style={{ flex: 1, height: 1, background: 'var(--line)' }} /></div>
        {joinForm}
      </> : <>
        <div className="segc" role="group" aria-label="모임 필터"><button className={filter === 'all' ? 'on' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>전체 {groups.length}</button><button className={filter === 'host' ? 'on' : ''} aria-pressed={filter === 'host'} onClick={() => setFilter('host')}>내가 만든 {hostGroups.length}</button></div>
        {(filter === 'all' ? groups : hostGroups).map(group => {
          const data = details[group.id];
          const members = data?.group?.members || [];
          const own = actions?.filter(a => a.groupId === group.id);
          const remaining = own?.filter(a => !a.isCompletedToday).length;
          return <div key={group.id} className="card tap" role="button" tabIndex={0} onClick={() => navigate(`/groups/${group.id}`)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/groups/${group.id}`); } }}>
            <div className="row"><div className="gi">{group.name.slice(0, 1)}</div><div className="grow"><div className="t1" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{group.name}{group.role === 'HOST' && <span className="chip host"><Crown className="ic xs" />모임장</span>}</div><div className="t2">멤버 {group.memberCount}명{data?.challenges && ` · 챌린지 ${data.challenges.filter(c => c.status === 'IN_PROGRESS').length}개`}</div></div><ChevronRight className="ic chev" /></div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div className="stack">{members.slice(0, group.memberCount > 4 ? 2 : 4).map(m => <ScreenAvatar key={m.userId} image={m.profileImageUrl} />)}{group.memberCount > 4 && <div className="av" style={{ background: '#94A3B8' }}>+{group.memberCount - 2}</div>}</div><span className={`chip ${remaining ? 'warn' : own?.length ? 'ok' : 'gray'}`}>{actions === null ? '현황 불러오는 중' : remaining ? `오늘 ${remaining}개 남음` : own?.length ? '오늘 모두 완료' : '참여 중 챌린지 없음'}</span></div>
          </div>;
        })}
        {filter === 'host' && !hostGroups.length && <p className="sub" style={{ padding: 24, textAlign: 'center' }}>아직 직접 만든 모임이 없어요.</p>}
        <div className="card" style={{ padding: 0 }}><button onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls="screen-join" style={{ width: '100%', border: 0, background: 'transparent', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', textAlign: 'left', fontSize: 14.5, fontWeight: 700 }}><Link className="ic s" /><span className="grow">초대 코드로 들어가기</span><ChevronRight className="ic s chev" /></button><div id="screen-join" hidden={!expanded} style={{ padding: '0 16px 16px' }}>{joinForm}</div></div>
      </>}
    </main><ScreenNav active="groups" pending={pending} />
  </Screen>;
}
