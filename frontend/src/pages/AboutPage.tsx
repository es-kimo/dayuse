import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DayuLogo } from '../components/brand/DayuLogo';
import {
  trackLandingView,
  trackHeroCtaClick,
  trackFooterCtaClick,
  trackMyGroupClick,
} from '../utils/analytics';
import { AboutPageMobile } from './AboutPageMobile';
import './AboutPage.css';

/**
 * PC판과 모바일판은 섹션 구성과 스크롤 타임라인이 완전히 다르다.
 * 미디어 쿼리로 한 마크업을 덮는 대신 폭 기준으로 컴포넌트를 갈라 쓴다.
 * 760px은 PC 프로토타입이 쓰던 경계값이다.
 */
const MOBILE_QUERY = '(max-width: 760px)';

const useMobileLayout = () => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
};

export const AboutPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobileLayout();

  useEffect(() => {
    trackLandingView();
  }, []);

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/groups/new');
    } else {
      navigate('/login?returnTo=/groups/new');
    }
  };

  const handleHeroStart = () => {
    trackHeroCtaClick();
    handleStart();
  };

  const handleFooterStart = () => {
    trackFooterCtaClick();
    handleStart();
  };

  const handleMyGroup = () => {
    trackMyGroupClick();
    if (isAuthenticated) {
      navigate('/groups');
    } else {
      navigate('/login?returnTo=/groups');
    }
  };

  useEffect(() => {
    const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const out = (t: number) => 1 - Math.pow(1 - t, 3);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const reduce =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;
    const A = document.getElementById('sceneA');
    const B = document.getElementById('sceneB');
    const startSection = document.getElementById('start');
    if (!A || !B) return;

    const morning = document.getElementById('morning');
    const heroCopy = document.getElementById('heroCopy');
    const words = heroCopy ? heroCopy.querySelectorAll<HTMLElement>('.w') : [];
    const heroP = heroCopy ? heroCopy.querySelector<HTMLElement>('p') : null;
    const chips = document.getElementById('chips');
    const cardCopy = document.getElementById('cardCopy');
    const phLabel = document.getElementById('phLabel');
    const phone = document.getElementById('phone');
    const steps = document.getElementById('steps');
    const lis = steps ? steps.querySelectorAll<HTMLElement>('li') : [];
    const scrCam = document.getElementById('scrCam');
    const scrUp = document.getElementById('scrUp');
    const scrDone = document.getElementById('scrDone');
    const flash = document.getElementById('flash');
    const upCta = document.getElementById('upCta');
    const streak = document.getElementById('streak');
    const cells = streak ? streak.querySelectorAll<HTMLElement>('i') : [];
    const streakTxt = document.getElementById('streakTxt');

    const wa = document.getElementById('wa');
    const wb = document.getElementById('wb');
    const gap = document.getElementById('gap');
    const dayuWrap = document.getElementById('dayuWrap');
    const body = document.getElementById('body');
    const armG = document.getElementById('armG');
    const face = document.getElementById('face');
    const flood = document.getElementById('flood');
    const together = document.getElementById('togetherCopy');

    const scrToday = document.getElementById('scrToday');
    const scrWeek = document.getElementById('scrWeek');

    const K = document.getElementById('kw');
    const BG = document.querySelector<HTMLElement>('.blueGap');
    const C = document.getElementById('cheer');
    const G = document.getElementById('gather');
    const fx1 = document.getElementById('fx1');
    const fx2 = document.getElementById('fx2');
    const pane1 = document.getElementById('pane1');
    const pane2 = document.getElementById('pane2');
    const bub1 = document.getElementById('bub1');
    const bub2 = document.getElementById('bub2');
    const bars = pane2 ? pane2.querySelectorAll<HTMLElement>('.bar i') : [];
    const wordsEl = document.getElementById('words');
    const gWords = wordsEl ? Array.from(wordsEl.children) as HTMLElement[] : [];
    const gh = document.getElementById('gh');
    const invite = document.getElementById('invite');
    const copyBtn = document.getElementById('copyBtn');
    const toast = document.getElementById('toast');

    const nav = document.getElementById('aboutNav');
    const rail = document.getElementById('rail');
    const ticks = rail ? rail.querySelectorAll<HTMLElement>('i') : [];

    const mobile = () => window.innerWidth <= 760;

    function progress(el: HTMLElement) {
      const r = el.getBoundingClientRect();
      const len = el.offsetHeight - window.innerHeight;
      return len <= 0 ? 1 : clamp(-r.top / len);
    }

    function sceneA(p: number) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const m = mobile();

      const shrink = ease(seg(p, 0.08, 0.28));
      const leave = ease(seg(p, 0.44, 0.54));
      const ix = lerp(0, m ? 0.05 * vw : 0.09 * vw, shrink);
      const iy = lerp(0, m ? 0.14 * vh : 0.17 * vh, shrink);
      const rad = lerp(0, m ? 24 : 36, shrink);
      const lift = leave * vh * 0.9;

      if (morning) {
        morning.style.clipPath = `inset(${iy - lift}px ${ix}px ${iy + lift}px ${ix}px round ${rad}px)`;
        morning.style.opacity = String(1 - seg(p, 0.50, 0.54));
      }

      words.forEach((w) => {
        w.style.opacity = String(1 - seg(p, 0.07, 0.13));
        w.style.transform = `translateY(${-seg(p, 0.07, 0.13) * 30}px)`;
      });

      if (heroP) heroP.style.opacity = String(1 - seg(p, 0.06, 0.11));
      if (chips) chips.style.opacity = String(1 - seg(p, 0.1, 0.17));
      if (phLabel) phLabel.style.opacity = String(1 - seg(p, 0.06, 0.12));

      const cIn = out(seg(p, 0.20, 0.27));
      const cOut = seg(p, 0.42, 0.47);
      if (cardCopy) {
        cardCopy.style.opacity = String(cIn * (1 - cOut));
        cardCopy.style.filter = `blur(${(1 - cIn) * 8}px)`;
      }

      // phone
      const rise = out(seg(p, 0, 0.12));
      const toRight = ease(seg(p, 0.48, 0.58));
      const shiftX = m ? 0 : lerp(0, -(vw * 0.02), toRight);
      const y = lerp(vh * 0.22, 0, rise);
      if (phone) {
        phone.style.transform = m
          ? `translate(50%, calc(-50% + ${y}px))`
          : `translate(${shiftX}px, calc(-50% + ${y}px))`;
      }

      // screens: camera -> upload -> done (hero) ... then today -> upload -> week (steps)
      const active = p < 0.66 ? 0 : p < 0.80 ? 1 : 2;
      const up = seg(p, 0.23, 0.26);
      const done = seg(p, 0.36, 0.39);
      const today = seg(p, 0.55, 0.58);
      const upAgain = seg(p, 0.66, 0.68);
      const week = seg(p, 0.80, 0.82);
      const showUp = Math.max(up * (1 - done), upAgain * (1 - week));
      if (scrCam) scrCam.style.opacity = String(1 - up);
      if (scrUp) scrUp.style.opacity = String(showUp);
      if (scrDone) scrDone.style.opacity = String(done * (1 - today));
      if (scrToday) scrToday.style.opacity = String(today * (1 - upAgain));
      if (scrWeek) scrWeek.style.opacity = String(week);
      if (flash) flash.style.opacity = String(Math.sin(seg(p, 0.20, 0.24) * Math.PI) * 0.9);
      if (upCta) upCta.style.background = (p > 0.32 && p < 0.36) || (p > 0.76 && p < 0.80) ? '#1E40AF' : '';

      const filled = Math.round(lerp(1, 7, seg(p, 0.39, 0.46)));
      cells.forEach((c, i) => c.classList.toggle('on', i < filled));
      if (streakTxt) streakTxt.textContent = `${filled}일 연속`;

      // steps list
      const sIn = out(seg(p, 0.54, 0.60));
      if (steps) {
        steps.style.opacity = String(sIn);
        steps.style.transform = m ? `translateY(${(1 - sIn) * 20}px)` : `translateY(calc(-50% + ${(1 - sIn) * 30}px))`;
      }
      lis.forEach((li, i) => li.classList.toggle('on', sIn > 0.5 && i === active));

      return shrink < 0.6 && leave < 0.9;
    }

    function sceneB(p: number) {
      if (!dayuWrap) return false;
      const S = dayuWrap.offsetWidth;
      const k = S / 64;
      const grow = ease(seg(p, 0.04, 0.30));
      const form = ease(seg(p, 0.30, 0.52));
      const faceIn = seg(p, 0.52, 0.60);
      const zoom = ease(seg(p, 0.66, 0.84));

      const ang = lerp(0, 7.85, form);
      if (armG) {
        armG.setAttribute(
          'transform',
          `rotate(${ang} 45.5 30.25) translate(45.5 30.25) scale(1 ${Math.max(grow, 0.001)}) translate(-45.5 -30.25)`
        );
      }
      if (body) {
        body.setAttribute('r', String(lerp(0, 19.5, form)));
      }
      if (face) {
        face.setAttribute('opacity', String(faceIn * (1 - seg(p, 0.64, 0.70))));
      }

      const armCenterOffset = (32 - 45.5) * k;
      const x = lerp(armCenterOffset, 0, form);
      const sc = lerp(1, 16, zoom);
      dayuWrap.style.transform = `translate(calc(-50% + ${x}px), -50%) scale(${sc})`;
      dayuWrap.style.transformOrigin = `${(27 / 64) * 100}% ${(39 / 64) * 100}%`;

      const g = lerp(0, 10.5 * k + 24, grow) + lerp(0, (46 - 10.5) * k * 1.05, form);
      if (gap) gap.style.width = `${g}px`;
      const fade = seg(p, 0.46, 0.62);
      [wa, wb].forEach((w) => {
        if (w) {
          w.style.opacity = String(1 - fade);
          w.style.filter = `blur(${fade * 10}px)`;
        }
      });
      if (flood) flood.style.opacity = String(seg(p, 0.72, 0.80));
      const tIn = out(seg(p, 0.86, 0.95));
      if (together) {
        together.style.opacity = String(tIn);
        together.style.transform = `translateY(${(1 - tIn) * 24}px)`;
      }

      return p > 0.84;
    }

    function cheer(p: number) {
      const a = seg(p, 0.02, 0.10);
      const sw = seg(p, 0.52, 0.58);
      if (fx1) {
        fx1.style.opacity = String(a * (1 - sw));
        fx1.style.transform = `translateY(${(1 - a) * 16 - sw * 16}px)`;
      }
      if (fx2) {
        fx2.style.opacity = String(sw);
        fx2.style.transform = `translateY(${(1 - sw) * 16}px)`;
      }
      if (pane1) {
        pane1.style.opacity = String(a * (1 - sw));
        pane1.style.transform = `scale(${lerp(0.96, 1, a)})`;
      }
      if (pane2) {
        pane2.style.opacity = String(sw);
        pane2.style.transform = `scale(${lerp(0.96, 1, sw)})`;
      }
      [bub1, bub2].forEach((bub, i) => {
        if (!bub) return;
        const t = out(seg(p, 0.16 + i * 0.12, 0.24 + i * 0.12));
        bub.style.opacity = String(t);
        bub.style.transform = `translateY(${(1 - t) * 14}px)`;
      });
      bars.forEach((bar, i) => {
        const w = Number(bar.dataset.w ?? 0);
        bar.style.width = `${w * out(seg(p, 0.60 + i * 0.05, 0.78 + i * 0.05))}%`;
      });
      return p > 0 && p < 1;
    }

    const spots: [number, number][] = [
      [-0.40, -0.30], [0.32, -0.34], [-0.10, -0.40], [0.40, -0.10], [-0.44, -0.04],
      [0.04, -0.26], [-0.30, 0.18], [0.30, 0.20], [-0.14, 0.32], [0.18, 0.36],
      [-0.42, 0.36], [0.44, 0.34], [-0.24, -0.18], [0.22, -0.02],
    ];

    function gather(p: number) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const g = ease(seg(p, 0.05, 0.42));
      gWords.forEach((w, i) => {
        const [sx, sy] = spots[i % spots.length];
        const drift = Math.sin(p * 6 + i) * 8 * (1 - g);
        w.style.transform = `translate(-50%, -50%) translate(${sx * vw * (1 - g)}px, ${sy * vh * 0.9 * (1 - g) + drift}px) scale(${lerp(1, 0.6, g)})`;
        w.style.opacity = String((0.35 + (0.4 * ((i * 37) % 10)) / 10) * (1 - seg(p, 0.32, 0.44)));
        w.style.filter = `blur(${(i % 3) * 1.2 * (1 - g)}px)`;
      });

      const hIn = out(seg(p, 0.30, 0.46));
      const up = ease(seg(p, 0.5, 0.66));
      if (gh) {
        gh.style.opacity = String(hIn);
        gh.style.filter = `blur(${(1 - hIn) * 10}px)`;
        gh.style.transform = `translateY(calc(-50% - ${up * vh * 0.12}px))`;
      }
      const iIn = out(seg(p, 0.56, 0.72));
      if (invite) {
        invite.style.opacity = String(iIn);
        invite.style.transform = `translateY(${(1 - iIn) * 60 - up * vh * 0.06}px)`;
      }
      if (copyBtn) copyBtn.style.background = p > 0.78 && p < 0.82 ? '#1E40AF' : '';
      if (toast) toast.classList.toggle('on', p > 0.8);
    }

    function frame() {
      if (!A || !B) return;
      const pa = progress(A);
      const pb = progress(B);
      const darkA = sceneA(pa);
      const darkB = sceneB(pb);
      if (C) cheer(progress(C));
      if (G) gather(progress(G));

      const vh = window.innerHeight;
      const hit = (el: Element | null) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.top <= 40 && r.bottom > 40;
      };
      const dark = (hit(A) && darkA) || (hit(B) && darkB) || hit(BG) || hit(C) || hit(startSection);
      if (nav) nav.classList.toggle('on-dark', dark);
      if (rail) rail.classList.toggle('on-dark', dark);

      const mid = (el: Element | null) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.top < vh * 0.5 && r.bottom > vh * 0.5;
      };
      const idx = mid(startSection) ? 5 : mid(G) ? 4 : mid(C) || mid(BG) ? 3 : mid(B) ? 2 : mid(K) ? 1 : 0;
      ticks.forEach((t, i) => t.classList.toggle('on', i === idx));
    }

    // 단어 단위 blur-in + 진입 시 reveal
    document.querySelectorAll<HTMLElement>('.about-page [data-split]').forEach((h) => {
      if (h.dataset.splitDone) return;
      h.dataset.splitDone = '1';
      const text = h.textContent ?? '';
      h.innerHTML = text
        .split(' ')
        .map((w, i) => `<span class="bw" style="transition-delay:${i * 0.1}s">${w}</span>`)
        .join(' ');
    });

    const kchips = K ? K.querySelectorAll<HTMLElement>('.kchip') : [];
    let kTimer: ReturnType<typeof setInterval> | null = null;
    const onReveal = (el: Element) => {
      el.classList.add('in');
      if (el === K && !kTimer) {
        let k = 0;
        kTimer = setInterval(() => {
          kchips.forEach((c, i) => c.classList.toggle('hot', i === k % 3));
          k += 1;
        }, 1100);
      }
    };
    const rvs = document.querySelectorAll('.about-page .rv-on');
    let io: IntersectionObserver | null = null;
    if (reduce || !('IntersectionObserver' in window)) {
      rvs.forEach(onReveal);
    } else {
      io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (e.isIntersecting) {
              onReveal(e.target);
              io?.unobserve(e.target);
            }
          }),
        { rootMargin: '0px 0px -20% 0px', threshold: 0.01 }
      );
      rvs.forEach((el) => io?.observe(el));
    }

    if (reduce) {
      sceneA(0.9);
      sceneB(1);
      cheer(0.3);
      gather(1);
      return () => {
        if (kTimer) clearInterval(kTimer);
        io?.disconnect();
      };
    }

    let ticking = false;
    const req = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          frame();
        });
      }
    };

    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req);
    frame();

    return () => {
      window.removeEventListener('scroll', req);
      window.removeEventListener('resize', req);
      if (kTimer) clearInterval(kTimer);
      io?.disconnect();
    };
  }, []);

  if (isMobile) return <AboutPageMobile />;

  return (
    <div className="about-page">
      {/* 고정 상단 내비게이션 */}
      <header className="nav" id="aboutNav">
        <div className="logo-wrap cursor-pointer" onClick={handleMyGroup} role="button" tabIndex={0} aria-label="내 모임으로 이동">
          <div className="logo-light">
            <DayuLogo variant="horizontal" theme="light" className="h-7 w-auto" />
          </div>
          <div className="logo-dark">
            <DayuLogo variant="horizontal" theme="mono-white" className="h-7 w-auto" />
          </div>
        </div>

        <div className="nav-actions">
          <button type="button" onClick={handleMyGroup} className="btn-secondary">
            내 모임으로
          </button>
          <button type="button" onClick={handleHeroStart} className="btn">
            시작하기
          </button>
        </div>
      </header>

      {/* Progress rail */}
      <div className="rail" id="rail" aria-hidden="true">
        <i></i>
        <i></i>
        <i></i>
        <i></i>
        <i></i>
        <i></i>
      </div>

      <main>
        {/* Scene A */}
        <section className="scene" id="sceneA" aria-label="사진 한 장이면 끝나는 인증">
          <div className="stage">
            {/* Morning card backdrop */}
            <div className="morning" id="morning">
              <div className="sky">
                <div className="sun"></div>
                <div className="sun2"></div>
                <div className="clock">06:30</div>
              </div>

              <div className="chips" id="chips">
                <div className="chip">
                  <b>류</b>매일 1알고리즘 <span>코딩</span>
                </div>
                <div className="chip">
                  <b>김</b>주 3회 헬스장 <span>운동</span>
                </div>
                <div className="chip">
                  <b>박</b>6시 기상 <span>습관</span>
                </div>
              </div>

              <div className="ph-label" id="phLabel">
                사진 한 장 인증 · DAYUSE
              </div>

              <div className="heroCopy" id="heroCopy">
                <h1>
                  <span className="w">목표는</span> <span className="w">각자,</span>
                  <br />
                  <span className="w">꾸준함은</span> <span className="w">함께.</span>
                </h1>
                <p>친구들과 각자의 챌린지를 인증하고 기록해요.</p>
              </div>
            </div>

            {/* 카드 카피 */}
            <div className="cardCopy" id="cardCopy">
              <h2>
                사진 한 장이면
                <br />
                끝나는 인증
              </h2>
              <p>찍고, 한마디 남기고, 올리면 끝. 친구들에게 바로 보여요.</p>
            </div>

            {/* Mobile Phone Mockup */}
            <div className="phone" id="phone">
              <div className="screen">
                <div className="notch"></div>
                <div className="flash" id="flash"></div>

                {/* 1. Camera viewfinder & Today actions capture */}
                <div className="scr cam" id="scrCam">
                  <img
                    src="/landing/assets/captures/05-today-actions.webp"
                    alt="오늘의 챌린지 액션 화면"
                    className="scr-img"
                    loading="lazy"
                  />
                  <div className="cam-overlay">
                    <div className="camTop">인증 사진 촬영</div>
                    <div className="corners"></div>
                    <div className="shutter"></div>
                  </div>
                </div>

                {/* 2. Upload verification screen (실제 사진 인증 모달 캡처) */}
                <div className="scr up" id="scrUp">
                  <img
                    src="/landing/assets/captures/08-verification-modal.webp"
                    alt="사진 인증 작성 모달"
                    className="scr-img"
                    loading="lazy"
                  />
                  <div id="upCta" style={{ display: 'none' }}></div>
                </div>

                {/* 3. 인증 완료 후 연속 기록 (스텝 0) */}
                <div className="scr done" id="scrDone">
                  <img
                    src="/landing/assets/captures/09-share-card.webp"
                    alt="7일 연속 달성 기록"
                    className="scr-img"
                    loading="lazy"
                  />
                  <div id="streakTxt" style={{ display: 'none' }}></div>
                  <div id="streak" style={{ display: 'none' }}>
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                  </div>
                </div>

                {/* 4. 오늘 할 일 목록 (스텝 1) */}
                <div className="scr" id="scrToday">
                  <img
                    src="/landing/assets/captures/05-today-actions.webp"
                    alt="참여 중인 모임의 오늘 남은 인증 목록"
                    className="scr-img"
                    loading="lazy"
                  />
                </div>

                {/* 5. 이번 주 기록 (스텝 3) */}
                <div className="scr" id="scrWeek">
                  <img
                    src="/landing/assets/captures/04-challenge-calendar.webp"
                    alt="참가자별 이번 주 인증 기록"
                    className="scr-img"
                    loading="lazy"
                  />
                </div>

                <div className="samp">예시 화면</div>
              </div>
            </div>

            {/* 3단계 가이드 스텝 */}
            <div className="steps" id="steps">
              <div className="eyebrow">오늘의 인증</div>
              <h2>
                매일 하는 일은
                <br />
                가볍게
              </h2>
              <ol>
                <li>
                  <b>참여 중인 모든 인증을 한 화면에서</b>
                  <span>모임이 여러 개여도 괜찮아요. 오늘 남은 인증만 모아서 보여드려요.</span>
                </li>
                <li>
                  <b>찍거나, 캡처를 붙여 넣거나</b>
                  <span>카메라로 바로 찍어도, 앱 화면을 캡처해도 돼요. 인증 기준이 함께 보여서 헷갈리지 않아요.</span>
                </li>
                <li>
                  <b>하루하루 칸이 채워지는 걸 친구와 함께 봐요</b>
                  <span>연속 기록이 한눈에 보여서, 오늘 하루를 비우기가 아까워져요.</span>
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* 목표가 달라도 한 모임에서 */}
        <section className="kw rv-on" id="kw" aria-labelledby="kwH">
          <h2 id="kwH">
            <span className="kchip">코딩</span>
            <span className="kchip">운동</span>
            <span className="kchip">기상</span>
            <br />
            <span data-split="">목표가 달라도 한 모임에서</span>
          </h2>

          <div className="cards3">
            <div className="pcard rise">
              <div className="top">
                <div className="av" style={{ background: '#2563EB' }}>류</div>
                <div>
                  <b>류</b>
                  <small>코딩</small>
                </div>
              </div>
              <h4>
                매일 1알고리즘
                <br />
                문제 풀기
              </h4>
              <div className="pic" style={{ background: '#EFF6FF' }}>
                <i className="l" style={{ width: '60%', background: '#BFDBFE' }}></i>
                <i className="l" style={{ width: '84%', background: '#BFDBFE' }}></i>
                <i className="l" style={{ width: '40%', background: '#BFDBFE' }}></i>
              </div>
              <div className="meta">매일 · 제출 성공 화면</div>
            </div>

            <div className="pcard rise">
              <div className="top">
                <div className="av" style={{ background: '#0891B2' }}>김</div>
                <div>
                  <b>김</b>
                  <small>운동</small>
                </div>
              </div>
              <h4>
                주 3회
                <br />
                헬스장 가기
              </h4>
              <div
                className="pic"
                style={{ background: '#ECFEFF', flexDirection: 'row', alignItems: 'flex-end', gap: '8px' }}
              >
                <i style={{ flex: 1, height: '40%', borderRadius: '5px', background: '#A5F3FC' }}></i>
                <i style={{ flex: 1, height: '70%', borderRadius: '5px', background: '#A5F3FC' }}></i>
                <i style={{ flex: 1, height: '55%', borderRadius: '5px', background: '#A5F3FC' }}></i>
                <i style={{ flex: 1, height: '90%', borderRadius: '5px', background: '#22D3EE' }}></i>
              </div>
              <div className="meta">주 3회 · 운동 기록 캡처</div>
            </div>

            <div className="pcard rise">
              <div className="top">
                <div className="av" style={{ background: '#475569' }}>박</div>
                <div>
                  <b>박</b>
                  <small>습관</small>
                </div>
              </div>
              <h4>
                6시에
                <br />
                일어나기
              </h4>
              <div className="pic" style={{ background: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ font: '800 52px/1 var(--font)', letterSpacing: '-0.04em', color: '#475569' }}>06:00</span>
              </div>
              <div className="meta">매일 · 시계가 보이는 사진</div>
            </div>
          </div>

          <p className="kwnote">모임에 들어왔다고 모든 챌린지를 할 필요는 없어요.</p>
        </section>

        {/* Scene B */}
        <section className="scene" id="sceneB" aria-label="목표는 각자, 꾸준함은 함께">
          <div className="stage">
            <div className="phrase" id="phrase">
              <span className="a" id="wa">
                목표는 각자
              </span>
              <span className="gap" id="gap"></span>
              <span className="b" id="wb">
                꾸준함은 함께
              </span>
            </div>

            <div className="dayuWrap" id="dayuWrap">
              <svg viewBox="0 0 64 64" aria-hidden="true">
                <g id="dayuAll">
                  <circle id="body" cx="27" cy="39" r="0" fill="#2563EB" />
                  <g id="armG">
                    <rect id="arm" x="40.25" y="3.05" width="10.5" height="54.4" rx="5.25" fill="#2563EB" />
                  </g>
                  <g id="face" opacity="0">
                    <ellipse cx="21.5" cy="35.5" rx="2.9" ry="4.1" fill="#fff" />
                    <ellipse cx="32.5" cy="35.5" rx="2.9" ry="4.1" fill="#fff" />
                    <path
                      d="M31.53 43.61 A5 5 0 0 1 22.47 43.61"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                  </g>
                </g>
              </svg>
            </div>

            <div className="flood" id="flood"></div>

            <div className="togetherCopy" id="togetherCopy">
              <h2>
                함께라서
                <br />
                꾸준해져요
              </h2>
              <p>목표는 각자 정하고, 인증은 서로 보면서. 친구의 오늘이 내일의 나를 움직여요.</p>
            </div>
          </div>
        </section>

        <div className="blueGap" aria-hidden="true"></div>

        {/* 서로의 오늘 (dark sheet) */}
        <section className="scene" id="cheer" aria-labelledby="cheerH">
          <div className="stage">
            <div className="cheerL">
              <div className="eyebrow">서로의 오늘</div>
              <h2 id="cheerH">
                친구의 인증에
                <br />
                한마디 얹어요
              </h2>
              <div className="fx">
                <div id="fx1">
                  <span className="tag">응원</span>
                  <h3>인증마다 짧은 응원을</h3>
                  <p>카톡방처럼 묻히지 않아요. 누가 언제 무엇을 했는지 인증 옆에 남아요.</p>
                </div>
                <div id="fx2">
                  <span className="tag">모임 피드</span>
                  <h3>모임의 오늘이 한눈에</h3>
                  <p>각자 다른 챌린지라도, 서로 어디쯤 왔는지 한 화면에서 보여요.</p>
                </div>
              </div>
            </div>

            <div
              className="cheerR"
              role="img"
              aria-label="예시 화면: 인증 글에 친구들이 응원을 남기는 화면과 모임 전체의 진행 상황 화면"
            >
              <span className="samp">예시 화면</span>

              <div className="pane" id="pane1">
                <div className="dk post">
                  <div className="ph">
                    <div className="av" style={{ background: '#2563EB' }}>류</div>
                    <div>
                      <b>류</b>
                      <small>오전 7:40 · 매일 1알고리즘</small>
                    </div>
                  </div>
                  <div className="img">
                    <i className="l" style={{ width: '62%' }}></i>
                    <i className="l" style={{ width: '88%' }}></i>
                    <i className="l" style={{ width: '46%' }}></i>
                  </div>
                  <div className="bub" id="bub1">
                    <div className="av" style={{ background: '#0891B2' }}>김</div>
                    <p>출근 전에 벌써? 대단하다</p>
                  </div>
                  <div className="bub me" id="bub2">
                    <div className="av" style={{ background: '#475569' }}>박</div>
                    <p>나도 지금 일어났어, 인증 간다</p>
                  </div>
                </div>
              </div>

              <div className="pane" id="pane2">
                <div className="dk grp">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <b style={{ fontSize: '16px' }}>퇴근 후 챌린지</b>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>오늘 2/3 인증</span>
                  </div>
                  <div className="row">
                    <div className="av" style={{ background: '#2563EB' }}>류</div>
                    <div className="t">
                      <b>매일 1알고리즘</b>
                      <small>7일 연속</small>
                      <div className="bar">
                        <i data-w="100"></i>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="av" style={{ background: '#0891B2' }}>김</div>
                    <div className="t">
                      <b>주 3회 헬스장</b>
                      <small>이번 주 2/3</small>
                      <div className="bar">
                        <i data-w="66"></i>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="av" style={{ background: '#475569' }}>박</div>
                    <div className="t">
                      <b>6시 기상</b>
                      <small>오늘 아직</small>
                      <div className="bar">
                        <i data-w="40"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 흩어진 단어가 모여 한 줄로 */}
        <section className="scene" id="gather" aria-label="초대 링크 하나면 준비 끝">
          <div className="stage">
            <div className="words" id="words" aria-hidden="true">
              <span>오늘</span>
              <span>인증</span>
              <span>7일 연속</span>
              <span>응원</span>
              <span>사진 한 장</span>
              <span>기록</span>
              <span>코딩</span>
              <span>운동</span>
              <span>6시 기상</span>
              <span>한마디</span>
              <span>친구</span>
              <span>모임</span>
              <span>캡처</span>
              <span>하루 하나</span>
            </div>

            <div className="gh" id="gh">
              <h2>
                초대 링크 하나면
                <br />
                준비 끝
              </h2>
            </div>

            <div className="invite" id="invite" role="img" aria-label="예시 화면: 모임 초대 링크를 복사하는 카드">
              <span className="samp">예시 화면</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  className="av"
                  style={{ background: '#2563EB', width: '44px', height: '44px', borderRadius: '14px', fontSize: '14px' }}
                >
                  퇴
                </div>
                <div>
                  <b style={{ fontSize: '17px' }}>퇴근 후 챌린지</b>
                  <div style={{ fontSize: '13px', color: 'var(--ink-3)' }}>멤버 3명 · 챌린지 3개</div>
                </div>
              </div>
              <div className="lnk">
                <span>dayuse.kr/invite/…</span>
                <b id="copyBtn">링크 복사</b>
              </div>
              <div className="toast" id="toast">초대 링크를 복사했어요</div>
            </div>
          </div>
        </section>

        {/* Outro (마지막 CTA) */}
        <section className="outro" id="start" aria-label="시작하기">
          <div className="inner">
            <div>
              <h2>
                오늘부터 친구와
                <br />
                하루 하나씩
              </h2>
              <p>모임을 만들고 초대 링크를 보내면 준비 끝이에요.</p>
              <button
                type="button"
                onClick={handleFooterStart}
                className="btn btn-lg"
                data-track="start_click"
                data-position="final"
              >
                데이유즈 시작하기
              </button>
            </div>

            <div>
              <div className="shareCard-wrap" aria-label="연속 기록 공유 카드">
                <img
                  src="/landing/assets/captures/09-share-card.webp"
                  alt="7일 연속 달성 인증 공유 카드"
                  className="shareCard-img"
                  width={780}
                  height={1688}
                  loading="lazy"
                />
              </div>
              <div className="shareCap">연속 기록은 공유 카드로 자랑할 수 있어요 · 예시</div>
            </div>
          </div>

          <div className="water" aria-hidden="true">
            데이유즈
          </div>

          <footer className="foot">
            <span>목표는 각자, 꾸준함은 함께.</span>
            <nav className="links" aria-label="바닥글 링크">
              <Link to="/contact">문의하기</Link>
              <Link to="/guide">서비스 안내</Link>
              <Link to="/terms">이용약관</Link>
              <Link to="/privacy">개인정보처리방침</Link>
            </nav>
          </footer>
        </section>
      </main>
    </div>
  );
};
