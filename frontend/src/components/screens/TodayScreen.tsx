import { Clock, Bell, Camera, Check, CheckCircle2 } from './ScreenIcons';
import { useNavigate } from 'react-router-dom';
import type { TodayAction } from '../../types';
import { Screen, ScreenNav, screenAssets } from './Screen';

export function TodayScreen({ actions, loading, error, retry, onVerify, onImage }: {
  actions: TodayAction[]; loading: boolean; error: string; retry: () => void;
  onVerify: (action: TodayAction) => void; onImage: (src: string, alt: string) => void;
}) {
  const navigate = useNavigate();
  const pending = actions.filter(a => !a.isCompletedToday);
  const completed = actions.filter(a => a.isCompletedToday);
  return <Screen>
    <header className="bar"><img className="logo" src={screenAssets.symbol} alt="데이유즈" style={{ height: 28 }} /><h1 className="t" style={{ paddingLeft: 6 }}>오늘</h1><button className="ib" onClick={() => navigate('/settings/notifications')} aria-label="알림 설정"><Bell className="ic" /></button></header>
    <main className="body">
      <div><p className="sub">{new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Seoul' })}</p></div>
      {loading ? <p className="screen-loading" role="status">오늘 할 일을 불러오는 중...</p> : error ? <div className="notice"><span>{error}</span><button onClick={retry}>다시 시도</button></div> : !actions.length ? <div className="center" style={{ padding: '60px 0', gap: 14 }}><img src={screenAssets.symbol} alt="" width="96" height="96" /><h2 className="t1">오늘은 인증할 챌린지가 없어요</h2><button className="btn" onClick={() => navigate('/groups')}>모임 둘러보기</button></div> : <>
        <div className={`hero ${pending.length ? '' : 'done'}`}>
          <img src={screenAssets.hero} alt="" /><div className="grow"><h2>{pending.length ? `인증할 챌린지가 ${pending.length}개 남았어요` : '오늘 할 일을 모두 마쳤어요!'}</h2><p>{pending.length ? '자정 전에 사진 한 장이면 끝나요.' : '내일도 함께 꾸준히 이어가요.'}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}><div className="prog grow" style={{ background: '#fff' }}><i style={{ width: `${completed.length / actions.length * 100}%` }} /></div><b style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>{completed.length}/{actions.length}</b></div>
          </div>
        </div>
        {!!pending.length && <div className="sec"><h3 style={{ color: 'var(--warn)' }}><Clock className="ic s" />인증 대기 <span style={{ color: 'inherit' }}>{pending.length}</span></h3></div>}
        {pending.map(action => <div key={action.challengeId} className="card task">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><span className="chip blue">{action.groupName}</span>{!!action.streakDays && <span className="t2" style={{ fontWeight: 700, color: 'var(--blue)' }}>{action.streakDays}일째 이어가는 중</span>}</div>
          <div className="t1" style={{ fontSize: 17 }}>{action.challengeTitle}</div><div className="crit"><b>인증 기준</b> {action.verificationCriteria}</div>
          <button className="btn w100" onClick={() => onVerify(action)} disabled={!action.canVerify}><Camera className="ic s" />사진 찍고 인증하기</button>
        </div>)}
        {!!completed.length && <div className="sec"><h3 style={{ color: 'var(--ok)' }}><CheckCircle2 className="ic s" />완료 <span style={{ color: 'inherit' }}>{completed.length}</span></h3></div>}
        {completed.map(action => <div key={action.challengeId} className="card task done"><div className="row">
          {action.myVerification?.imageUrl && <button className="thumb" onClick={() => onImage(action.myVerification!.imageUrl, action.challengeTitle)} aria-label="사진 확대 보기"><img src={action.myVerification.imageUrl} alt="인증 사진" /></button>}
          <div className="grow"><div className="t2">{action.groupName}</div><div className="t1">{action.challengeTitle}</div>{action.myVerification?.comment && <div className="t2" style={{ color: 'var(--ink2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>"{action.myVerification.comment}"</div>}</div>
          <span className="chip ok"><Check className="ic xs" />{action.streakDays ? `${action.streakDays}일 연속` : '완료'}</span>
        </div></div>)}
      </>}
    </main><ScreenNav active="today" pending={pending.length} />
  </Screen>;
}
