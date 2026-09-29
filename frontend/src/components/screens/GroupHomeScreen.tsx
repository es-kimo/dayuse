import type { ReactNode } from 'react';
import { ArrowLeft, CalendarCheck, Camera, Check, UserPlus, Users } from './ScreenIcons';
import type { GroupDetail, TodayAction } from '../../types';
import { Screen, ScreenAvatar } from './Screen';
export function GroupHomeScreen({ group, challengeCount, actions, loading, verifiedUserIds, copied, onBack, onInvite, onTab, onVerify, onImage, children }: {
  group: GroupDetail; challengeCount: number; actions: TodayAction[]; loading: boolean; verifiedUserIds: Set<number>; copied: boolean;
  onBack: () => void; onInvite: () => void; onTab: (tab: 'home' | 'challenges' | 'members') => void; onVerify: (action: TodayAction) => void; onImage: (src: string) => void; children: ReactNode;
}) {
  return <Screen>
    <header className="bar"><button className="ib" onClick={onBack} aria-label="뒤로"><ArrowLeft className="ic" /></button><h1 className="t">{group.name}</h1><button className="ib" aria-label="친구 초대" onClick={onInvite}>{copied ? <Check className="ic" /> : <UserPlus className="ic" />}</button></header>
    <nav className="ptabs" aria-label="모임 메뉴"><button className="on" aria-current="page" onClick={() => onTab('home')}>홈</button><button onClick={() => onTab('challenges')}>챌린지<small>{challengeCount}</small></button><button onClick={() => onTab('members')}>멤버<small>{group.members.length}</small></button></nav>
    <main className="body" style={{ paddingTop: 14 }}>
      <div className="sec"><h3><CalendarCheck className="ic s" />내 오늘 할 일</h3><span>{actions.filter(a => a.isCompletedToday).length} / {actions.length} 완료</span></div>
      {loading ? <p className="sub" role="status">오늘 할 일을 불러오는 중...</p> : !actions.length ? <div className="card"><p className="sub">오늘 수행할 챌린지가 없어요.</p></div> : actions.map(action => <div key={action.challengeId} className={`card ${action.isCompletedToday ? 'task done' : ''}`} style={{ padding: 14 }}><div className="row"><div className="grow"><div className="t1" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>{action.challengeTitle}<span className={`chip ${action.isCompletedToday ? 'ok' : 'warn'}`}>{action.isCompletedToday && <Check className="ic xs" />}{action.isCompletedToday ? '완료' : '인증 대기'}</span></div><div className="t2" style={{ marginTop: 2 }}>{action.verificationCriteria}</div></div>{action.isCompletedToday ? action.myVerification?.imageUrl && <button className="thumb" onClick={() => onImage(action.myVerification!.imageUrl)} aria-label="사진 확대 보기"><img src={action.myVerification.imageUrl} alt="인증 사진" /></button> : <button className="btn sm" onClick={() => onVerify(action)} disabled={!action.canVerify}><Camera className="ic s" />인증하기</button>}</div></div>)}
      <div className="sec"><h3><Users className="ic s" />오늘 누가 했을까</h3><span>{verifiedUserIds.size}명 인증</span></div>
      <div className="card" style={{ padding: 14 }}><div className="who">{group.members.map(member => <div className="m" key={member.userId}><ScreenAvatar image={member.profileImageUrl} dim={!verifiedUserIds.has(member.userId)}>{verifiedUserIds.has(member.userId) && <span className="ck"><Check className="ic" /></span>}</ScreenAvatar>{member.nickname}</div>)}</div></div>
      {children}
    </main>
  </Screen>;
}
