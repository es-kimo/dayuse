import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Users, UserRound } from './ScreenIcons';
import { parseDayuColor, isHttpProfileImage } from '../../tokens/dayuColors';
import { screenAvatarPath } from './screenAvatarPath';
import './screens.css';

export const screenAssets = { logo: '/screens/edf2d55e7adf.svg', symbol: '/screens/73ea4daeed3e.svg', invite: '/screens/7fc9592c1e11.svg', hero: '/screens/683d1cd6b03a.svg' };
export function Screen({ children }: { children: ReactNode }) {
  return <div className="screen-ui screen-app">{children}</div>;
}
export function ScreenAvatar({ image, dim = false, children }: { image?: string | null; dim?: boolean; children?: ReactNode }) {
  const color = parseDayuColor(image);
  return <div className={`av dy ${dim ? 'dim' : ''}`} style={{ background: color.bg, color: color.color }}>
    {isHttpProfileImage(image) ? <img src={image!} alt="" /> : <svg viewBox="0 0 55.25 55.25" aria-hidden="true"><path fill="currentColor" fillRule="evenodd" transform="translate(-3 -3.25)" d={screenAvatarPath} /></svg>}{children}
  </div>;
}
export function ScreenNav({ active, pending = 0 }: { active: 'today' | 'groups' | 'me'; pending?: number }) {
  const navigate = useNavigate();
  return <nav className="tabs" aria-label="주요 메뉴">
    <button onClick={() => navigate('/today')} className={active === 'today' ? 'on' : ''} aria-current={active === 'today' ? 'page' : undefined}><CalendarCheck className="ic" />오늘{pending > 0 && <span className="badge">{pending}</span>}</button>
    <button onClick={() => navigate('/groups')} className={active === 'groups' ? 'on' : ''} aria-current={active === 'groups' ? 'page' : undefined}><Users className="ic" />모임</button>
    <button onClick={() => navigate('/profile')} className={active === 'me' ? 'on' : ''} aria-current={active === 'me' ? 'page' : undefined}><UserRound className="ic" />내 정보</button>
  </nav>;
}
