import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DayuLogo } from '../components/brand/DayuLogo';
import {
  trackLandingView,
  trackHeroCtaClick,
  trackFooterCtaClick,
  trackMyGroupClick,
} from '../utils/analytics';
import './AboutPageMobile.css';

/**
 * 모바일 전용 공개 소개 페이지.
 *
 * PC판(AboutPage)과 섹션 구성·스크롤 타임라인이 달라서 미디어 쿼리로 덮지 않고
 * 별도 컴포넌트로 둔다. 프로토타입 mobile 0.2를 그대로 옮긴 것이다.
 */
export const AboutPageMobile: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

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
    const $ = (id: string) => document.getElementById(id);

    const reduce =
      typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

    const app = document.querySelector<HTMLElement>('.about-mobile .app');
    const H = $('hero');
    const K = $('kw');
    const Bi = $('birth');
    const G = $('gather');
    if (!app || !H || !K || !Bi || !G) return;

    // 제목을 단어 단위로 쪼개 blur-in
    document.querySelectorAll<HTMLElement>('.about-mobile [data-split]').forEach((h) => {
      if (h.dataset.splitDone) return;
      h.dataset.splitDone = '1';
      let i = 0;
      h.innerHTML = h.innerHTML
        .split(/(<br>)/)
        .map((part) =>
          part === '<br>'
            ? part
            : part
                .split(' ')
                .filter(Boolean)
                .map((w) => `<span class="bw" style="transition-delay:${(i++) * 0.09}s">${w}</span>`)
                .join(' ')
        )
        .join('');
    });

    // 진입 시 reveal + 목업 안쪽 작은 연출
    const typing = $('typing');
    const timers: ReturnType<typeof setTimeout>[] = [];
    const onReveal = (el: Element) => {
      el.classList.add('in');

      const flip = el.querySelector<HTMLElement>('[data-flip]');
      if (flip) {
        timers.push(
          setTimeout(() => {
            flip.classList.add('ok');
            flip.textContent = '완료';
          }, 1400)
        );
      }

      if (typing && el.contains(typing) && !typing.dataset.done) {
        typing.dataset.done = '1';
        const text = typing.dataset.text ?? '';
        const span = typing.querySelector('span');
        let n = 0;
        const step = () => {
          if (!span) return;
          n += 1;
          span.textContent = text.slice(0, n);
          if (n < text.length) timers.push(setTimeout(step, 70));
        };
        timers.push(setTimeout(step, 900));
      }

      el.querySelectorAll<HTMLElement>('.wk[data-fill]').forEach((r, ri) => {
        const f = r.dataset.fill ?? '';
        r.querySelectorAll<HTMLElement>('.c').forEach((c, i) => {
          timers.push(setTimeout(() => c.classList.add(f[i] === '1' ? 'on' : 'miss'), 700 + ri * 260 + i * 110));
        });
      });

      el.querySelectorAll<HTMLElement>('.bar i').forEach((b) => {
        b.style.width = b.dataset.w ?? '0';
      });
    };

    const rvs = document.querySelectorAll('.about-mobile .rv-on');
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
        { rootMargin: '0px 0px -18% 0px', threshold: 0.01 }
      );
      rvs.forEach((el) => io?.observe(el));
    }

    // 고정(핀) 씬
    const c1 = $('c1');
    const c1in = $('c1in');
    const c2 = $('c2');
    const c2copy = $('c2copy');
    const hint = $('hint');
    const pHero = $('pHero');
    const sCam = $('sCam');
    const sUp = $('sUp');
    const sDone = $('sDone');
    const flash = $('flash');
    const upCta = $('upCta');
    const streak = $('streak');
    const cells = streak ? streak.querySelectorAll<HTMLElement>('i') : [];
    const streakTxt = $('streakTxt');

    const kwh = $('kwh');
    const kchips = kwh ? kwh.querySelectorAll<HTMLElement>('.kchip') : [];
    const track = $('track');
    const kwnote = $('kwnote');

    const wa = $('wa');
    const wb = $('wb');
    const gap = $('gap');
    const dayuWrap = $('dayuWrap');
    const body = $('body');
    const armG = $('armG');
    const face = $('face');
    const flood = $('flood');
    const together = $('together');

    const wordsEl = $('words');
    const words = wordsEl ? (Array.from(wordsEl.children) as HTMLElement[]) : [];
    const gh = $('gh');
    const invite = $('invite');
    const copyBtn = $('copyBtn');
    const toast = $('toast');
    const nav = $('mobileNav');
    const blueGap = document.querySelector<HTMLElement>('.about-mobile .blueGap');
    const cheerSection = $('cheer');
    const startSection = $('start');

    function progress(el: HTMLElement) {
      const r = el.getBoundingClientRect();
      const len = el.offsetHeight - window.innerHeight;
      return len <= 0 ? 1 : clamp(-r.top / len);
    }

    function hero(p: number) {
      if (!c1) return;
      const h1 = c1.offsetHeight;
      const top1 = c1.offsetTop;
      const shrink = ease(seg(p, 0.04, 0.40));
      const cut = h1 * shrink;

      c1.style.clipPath = `inset(0 0 ${cut}px 0 round 28px)`;
      if (c1in) c1in.style.transform = `translateY(${-cut * 0.35}px)`;
      if (hint) hint.style.opacity = String(1 - seg(p, 0, 0.05));

      // 카드 2는 카드 1의 아래 모서리를 따라 올라와 내비 아래에 멈춘다
      const y2 = top1 + (h1 - cut) + lerp(12, 0, shrink);
      if (c2) c2.style.transform = `translateY(${y2}px)`;

      const cIn = out(seg(p, 0.30, 0.44));
      if (c2copy) {
        c2copy.style.opacity = String(cIn);
        c2copy.style.filter = `blur(${(1 - cIn) * 8}px)`;
        c2copy.style.transform = `translateY(${(1 - cIn) * 14}px)`;
      }

      if (pHero) pHero.style.transform = `translateX(-50%) translateY(${lerp(60, 0, out(seg(p, 0.1, 0.5)))}px)`;

      const up = seg(p, 0.50, 0.53);
      const done = seg(p, 0.68, 0.71);
      if (sCam) sCam.style.opacity = String(1 - up);
      if (sUp) sUp.style.opacity = String(up * (1 - done));
      if (sDone) sDone.style.opacity = String(done);
      if (flash) flash.style.opacity = String(Math.sin(seg(p, 0.45, 0.50) * Math.PI) * 0.9);
      if (upCta) upCta.style.background = p > 0.62 && p < 0.68 ? '#1E40AF' : '';

      const filled = Math.round(lerp(1, 7, seg(p, 0.74, 0.94)));
      cells.forEach((c, i) => c.classList.toggle('on', i < filled));
      if (streakTxt) streakTxt.textContent = `${filled}일 연속`;
    }

    function kw(p: number) {
      const hot = Math.floor(seg(p, 0.05, 0.55) * 3.999);
      kchips.forEach((c, i) => c.classList.toggle('hot', i === hot && p < 0.62));
      if (track && app) {
        const span = track.scrollWidth - app.clientWidth;
        track.style.transform = `translateX(${-span * ease(seg(p, 0.12, 0.88))}px)`;
      }
      if (kwnote) kwnote.style.opacity = String(seg(p, 0.7, 0.85));
    }

    function birth(p: number) {
      if (!dayuWrap) return false;
      const S = dayuWrap.offsetWidth;
      const k = S / 64;
      const grow = ease(seg(p, 0.04, 0.30));
      const form = ease(seg(p, 0.30, 0.52));
      const faceIn = seg(p, 0.52, 0.60);
      const zoom = ease(seg(p, 0.64, 0.84));

      const ang = lerp(0, 7.85, form);
      if (armG) {
        armG.setAttribute(
          'transform',
          `rotate(${ang} 45.5 30.25) translate(45.5 30.25) scale(1 ${Math.max(grow, 0.001)}) translate(-45.5 -30.25)`
        );
      }
      if (body) body.setAttribute('r', String(lerp(0, 19.5, form)));
      if (face) face.setAttribute('opacity', String(faceIn * (1 - seg(p, 0.62, 0.68))));

      const x = lerp((32 - 45.5) * k, 0, form);
      dayuWrap.style.transform = `translate(calc(-50% + ${x}px), -50%) scale(${lerp(1, 16, zoom)})`;
      dayuWrap.style.transformOrigin = `${(27 / 64) * 100}% ${(39 / 64) * 100}%`;

      if (gap) gap.style.width = `${lerp(0, 10.5 * k + 18, grow) + lerp(0, (46 - 10.5) * k * 1.05, form)}px`;

      const fade = seg(p, 0.34, 0.50);
      [wa, wb].forEach((w) => {
        if (!w) return;
        w.style.opacity = String(1 - fade);
        w.style.filter = `blur(${fade * 10}px)`;
      });

      if (flood) flood.style.opacity = String(seg(p, 0.70, 0.78));
      const tIn = out(seg(p, 0.84, 0.94));
      if (together) {
        together.style.opacity = String(tIn);
        together.style.transform = `translateY(${(1 - tIn) * 20}px)`;
      }

      return p > 0.76;
    }

    // 흩어진 단어의 고정 좌표
    const spots: [number, number][] = [
      [-0.36, -0.30], [0.30, -0.34], [-0.08, -0.44], [0.38, -0.12], [-0.40, -0.06], [0.02, -0.22],
      [-0.30, 0.16], [0.34, 0.14], [-0.12, 0.30], [0.20, 0.34], [-0.42, 0.36], [0.40, 0.40],
    ];

    function gather(p: number) {
      const vw = app ? app.clientWidth : window.innerWidth;
      const vh = window.innerHeight;
      const g = ease(seg(p, 0.05, 0.42));

      words.forEach((w, i) => {
        const [sx, sy] = spots[i % spots.length];
        const drift = Math.sin(p * 6 + i) * 6 * (1 - g);
        w.style.transform = `translate(-50%, -50%) translate(${sx * vw * (1 - g)}px, ${sy * vh * 0.8 * (1 - g) + drift}px) scale(${lerp(1, 0.6, g)})`;
        w.style.opacity = String((0.35 + (0.4 * ((i * 37) % 10)) / 10) * (1 - seg(p, 0.32, 0.44)));
        w.style.filter = `blur(${(i % 3) * 1.2 * (1 - g)}px)`;
      });

      const hIn = out(seg(p, 0.30, 0.46));
      if (gh) {
        gh.style.opacity = String(hIn);
        gh.style.filter = `blur(${(1 - hIn) * 10}px)`;
        gh.style.transform = `translateY(calc(-50% + ${lerp(0, -vh * 0.12, ease(seg(p, 0.5, 0.66)))}px))`;
      }

      const iIn = out(seg(p, 0.56, 0.72));
      if (invite) {
        invite.style.opacity = String(iIn);
        invite.style.transform = `translateY(${(1 - iIn) * 60 - ease(seg(p, 0.5, 0.66)) * vh * 0.08}px)`;
      }

      if (copyBtn) copyBtn.style.background = p > 0.78 && p < 0.82 ? '#1E40AF' : '';
      if (toast) toast.classList.toggle('on', p > 0.8);
    }

    const inView = (el: Element | null) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.top <= 60 && r.bottom > 60;
    };

    function frame() {
      if (!H || !K || !Bi || !G) return;
      hero(progress(H));
      kw(progress(K));
      const blueB = birth(progress(Bi));
      gather(progress(G));

      let mode = '';
      if (inView(H)) mode = '';
      else if (inView(Bi) && blueB) mode = 'blue';
      else if (inView(blueGap)) mode = 'blue';
      else if (inView(cheerSection)) mode = 'dark';
      else if (inView(startSection)) mode = 'blue';

      if (nav) {
        nav.classList.toggle('dark', mode === 'dark');
        nav.classList.toggle('blue', mode === 'blue');
      }
    }

    const cleanup = () => {
      timers.forEach(clearTimeout);
      io?.disconnect();
    };

    if (reduce) {
      hero(1);
      kw(1);
      birth(1);
      gather(1);
      return cleanup;
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
      cleanup();
    };
  }, []);

  return (
    <div className="about-mobile">
      <div className="app">
        <header className="nav" id="mobileNav">
          <button
            type="button"
            className="logo-btn"
            aria-label="내 모임으로 이동"
            onClick={handleMyGroup}
          >
            <span className="logo-light">
              <DayuLogo variant="horizontal" theme="light" className="h-6 w-auto" />
            </span>
            <span className="logo-dark">
              <DayuLogo variant="horizontal" theme="mono-white" className="h-6 w-auto" />
            </span>
          </button>
          <div className="nav-actions">
            <button type="button" onClick={handleMyGroup} className="btn-secondary">
              내 모임으로
            </button>
            <button type="button" onClick={handleHeroStart} className="btn">
              시작하기
            </button>
          </div>
        </header>

        <main>
          {/* 1. Hero */}
          <section className="scene" id="hero" aria-label="목표는 각자, 꾸준함은 함께">
            <div className="stage">
              <div className="mcard" id="c1">
                <div className="inner" id="c1in">
                  <div className="sun"></div>
                  <div className="sun2"></div>
                  <div className="clock">06:30</div>
                  <div className="phl">실사 영상 자리 · 친구들의 아침 루프</div>

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

                  <div className="heroCopy" id="heroCopy">
                    <p>친구들과 각자의 챌린지를 인증하고 기록해요</p>
                    <h1>
                      목표는 각자,
                      <br />
                      꾸준함은 함께.
                    </h1>
                  </div>

                  <div className="scrollHint" id="hint"></div>
                </div>
              </div>

              <div className="mcard" id="c2">
                <div className="phl">실사 사진 자리 · 휴대폰을 든 손</div>
                <div className="c2copy" id="c2copy">
                  <h2>
                    사진 한 장이면
                    <br />
                    끝나는 인증
                  </h2>
                  <p>
                    찍고, 한마디 남기고, 올리면 끝.
                    <br />
                    친구들에게 바로 보여요.
                  </p>
                </div>

                <div
                  className="phone"
                  id="pHero"
                  role="img"
                  aria-label="예시 화면: 카메라로 인증 사진을 찍고 올리면 연속 기록이 채워지는 과정"
                >
                  <div className="screen">
                    <div className="notch"></div>

                    <div className="scr cam" id="sCam" style={{ opacity: 1 }}>
                      <div className="camTop">매일 1알고리즘 문제 풀기</div>
                      <div className="viewfinder">
                        <div className="shot">
                          <i className="l" style={{ width: '62%' }}></i>
                          <i className="l" style={{ width: '88%' }}></i>
                          <i className="l" style={{ width: '74%' }}></i>
                          <i className="l" style={{ width: '40%' }}></i>
                          <div className="ok">
                            <i>✓</i>제출 성공
                          </div>
                        </div>
                      </div>
                      <div className="shutter"></div>
                      <div className="flash" id="flash"></div>
                    </div>

                    <div className="scr" id="sUp">
                      <h4>오늘 사진 인증</h4>
                      <div className="sub">매일 1알고리즘 문제 풀기</div>
                      <div className="criteria">
                        <b>인증 기준</b> 제출 성공 화면 캡처 또는 커밋 내역
                      </div>
                      <div className="thumb">
                        <i className="l" style={{ width: '60%' }}></i>
                        <i className="l" style={{ width: '86%' }}></i>
                        <i className="l" style={{ width: '70%' }}></i>
                      </div>
                      <div className="memo">오늘은 DP 문제 하나 풀었어요</div>
                      <div className="cta" id="upCta">인증 완료하기</div>
                    </div>

                    <div className="scr done" id="sDone">
                      <DayuLogo variant="symbol" theme="light" className="w-2/5 h-auto" />
                      <h4>오늘 인증을 모두 마쳤어요!</h4>
                      <div className="sub" id="streakTxt">1일 연속</div>
                      <div className="streak" id="streak">
                        <i></i>
                        <i></i>
                        <i></i>
                        <i></i>
                        <i></i>
                        <i></i>
                        <i></i>
                      </div>
                      <div className="days">
                        <span>월</span>
                        <span>화</span>
                        <span>수</span>
                        <span>목</span>
                        <span>금</span>
                        <span>토</span>
                        <span>일</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Daily */}
          <section id="daily" aria-labelledby="dailyH">
            <div className="chap rv-on">
              <div className="eyebrow">오늘의 인증</div>
              <h2 id="dailyH" data-split="">
                매일 하는 일은
                <br />
                가볍게
              </h2>
            </div>

            <div className="feat rv-on">
              <div className="vis">
                <span className="samp">예시 화면</span>
                <div className="mk">
                  <div className="mh it">
                    <b>오늘 할 일</b>
                    <span>9월 28일 월요일</span>
                  </div>
                  <div className="row it">
                    <div className="av" style={{ background: '#2563EB' }}>코</div>
                    <div className="t">
                      <b>매일 1알고리즘 문제 풀기</b>
                      <small>퇴근 후 챌린지</small>
                    </div>
                    <span className="st" data-flip="">인증하기</span>
                  </div>
                  <div className="row it">
                    <div className="av" style={{ background: '#0891B2' }}>영</div>
                    <div className="t">
                      <b>영어 단어 20개</b>
                      <small>퇴근 후 챌린지</small>
                    </div>
                    <span className="st ok">완료</span>
                  </div>
                  <div className="row it">
                    <div className="av" style={{ background: '#475569' }}>기</div>
                    <div className="t">
                      <b>6시 기상 인증</b>
                      <small>아침 모임</small>
                    </div>
                    <span className="st ok">완료</span>
                  </div>
                </div>
              </div>
              <div className="ftxt">
                <h3>
                  참여 중인 모든 인증을
                  <br />한 화면에서
                </h3>
                <p>모임이 여러 개여도 괜찮아요. 오늘 남은 인증만 모아서 보여드려요.</p>
              </div>
            </div>

            <div className="feat rv-on">
              <div className="vis slate">
                <span className="samp">예시 화면</span>
                <div className="mk">
                  <div className="mh it">
                    <b>오늘 사진 인증</b>
                    <span>매일 1알고리즘</span>
                  </div>
                  <div className="it" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div
                      style={{
                        aspectRatio: '1',
                        borderRadius: '12px',
                        background: '#E2E8F0',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px',
                      }}
                    >
                      <i className="l" style={{ width: '70%' }}></i>
                      <i className="l" style={{ width: '90%' }}></i>
                      <i className="l" style={{ width: '55%' }}></i>
                      <span style={{ marginTop: 'auto', font: '700 10px/1 var(--font)', color: 'var(--ok)' }}>
                        ✓ 제출 성공
                      </span>
                    </div>
                    <div
                      style={{
                        aspectRatio: '1',
                        borderRadius: '12px',
                        border: '1.5px dashed #CBD5E1',
                        display: 'grid',
                        placeItems: 'center',
                        textAlign: 'center',
                        fontSize: '11px',
                        color: 'var(--ink-3)',
                        lineHeight: 1.4,
                      }}
                    >
                      캡처 붙여넣기
                      <br />
                      또는 촬영
                    </div>
                  </div>
                  <div className="criteria it">
                    <b>인증 기준</b> 제출 성공 화면 캡처 또는 커밋 내역
                  </div>
                  <div className="typing it" id="typing" data-text="오늘은 DP 문제 하나 풀었어요">
                    <span></span>
                    <i className="caret"></i>
                  </div>
                </div>
              </div>
              <div className="ftxt">
                <h3>찍거나, 캡처를 붙여 넣거나</h3>
                <p>카메라로 바로 찍어도, 앱 화면을 캡처해도 돼요. 인증 기준이 함께 보여서 헷갈리지 않아요.</p>
              </div>
            </div>

            <div className="feat rv-on">
              <div className="vis">
                <span className="samp">예시 화면</span>
                <div className="mk" id="weekMk">
                  <div className="mh it">
                    <b>이번 주 기록</b>
                    <span>퇴근 후 챌린지</span>
                  </div>
                  <div className="wk it">
                    <span></span>
                    <span className="hd">월</span>
                    <span className="hd">화</span>
                    <span className="hd">수</span>
                    <span className="hd">목</span>
                    <span className="hd">금</span>
                    <span className="hd">토</span>
                    <span className="hd">일</span>
                    <span></span>
                  </div>
                  <div className="wk it" data-fill="1111111">
                    <div className="av" style={{ background: '#2563EB' }}>류</div>
                    <i className="c"></i>
                    <i className="c"></i>
                    <i className="c"></i>
                    <i className="c"></i>
                    <i className="c"></i>
                    <i className="c"></i>
                    <i className="c"></i>
                    <span className="n">7일</span>
                  </div>
                  <div className="wk it" data-fill="1101110">
                    <div className="av" style={{ background: '#0891B2' }}>김</div>
                    <i className="c"></i>
                    <i className="c"></i>
                    <i className="c"></i>
                    <i className="c"></i>
                    <i className="c"></i>
                    <i className="c"></i>
                    <i className="c"></i>
                    <span className="n">5일</span>
                  </div>
                </div>
              </div>
              <div className="ftxt">
                <h3>
                  하루하루 칸이 채워지는 걸
                  <br />
                  친구와 함께 봐요
                </h3>
                <p>연속 기록이 한눈에 보여서, 오늘 하루를 비우기가 아까워져요.</p>
              </div>
            </div>
          </section>

          {/* 3. 키워드 + 가로 카드 */}
          <section className="scene" id="kw" aria-label="목표가 달라도 한 모임에서">
            <div className="stage">
              <div className="kwh" id="kwh">
                <h2>
                  <span className="kchip">코딩</span>
                  <span className="kchip">운동</span>
                  <span className="kchip">기상</span>
                  <br />
                  목표가 달라도
                  <br />한 모임에서
                </h2>
              </div>

              <div className="track" id="track">
                <div className="pcard">
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

                <div className="pcard">
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
                    style={{ background: '#ECFEFF', flexDirection: 'row', alignItems: 'flex-end', gap: '6px' }}
                  >
                    <i style={{ flex: 1, height: '40%', borderRadius: '4px', background: '#A5F3FC' }}></i>
                    <i style={{ flex: 1, height: '70%', borderRadius: '4px', background: '#A5F3FC' }}></i>
                    <i style={{ flex: 1, height: '55%', borderRadius: '4px', background: '#A5F3FC' }}></i>
                    <i style={{ flex: 1, height: '90%', borderRadius: '4px', background: '#22D3EE' }}></i>
                  </div>
                  <div className="meta">주 3회 · 운동 기록 캡처</div>
                </div>

                <div className="pcard">
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
                    <span style={{ font: '800 40px/1 var(--font)', letterSpacing: '-0.04em', color: '#475569' }}>
                      06:00
                    </span>
                  </div>
                  <div className="meta">매일 · 시계가 보이는 사진</div>
                </div>
              </div>

              <p className="kwnote" id="kwnote">모임에 들어왔다고 모든 챌린지를 할 필요는 없어요.</p>
            </div>
          </section>

          {/* 4. 각자 | 함께 -> 데이유 */}
          <section className="scene" id="birth" aria-label="목표는 각자, 꾸준함은 함께">
            <div className="stage">
              <div className="phrase" aria-hidden="true">
                <span className="a" id="wa">목표는 각자</span>
                <span className="gap" id="gap"></span>
                <span className="b" id="wb">꾸준함은 함께</span>
              </div>

              <div className="dayuWrap" id="dayuWrap" aria-hidden="true">
                <svg viewBox="0 0 64 64">
                  <circle id="body" cx="27" cy="39" r="0" fill="#2563EB" />
                  <g id="armG">
                    <rect x="40.25" y="3.05" width="10.5" height="54.4" rx="5.25" fill="#2563EB" />
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
                </svg>
              </div>

              <div className="flood" id="flood"></div>

              <div className="together" id="together">
                <h2>
                  함께라서
                  <br />
                  꾸준해져요
                </h2>
                <p>
                  목표는 각자 정하고, 인증은 서로 보면서.
                  <br />
                  친구의 오늘이 내일의 나를 움직여요.
                </p>
              </div>
            </div>
          </section>

          <div className="blueGap" aria-hidden="true"></div>

          {/* 5. 어두운 시트 */}
          <section className="sheet" id="cheer" aria-labelledby="cheerH">
            <div className="chap rv-on">
              <div className="eyebrow">서로의 오늘</div>
              <h2 id="cheerH" data-split="">
                친구의 인증에
                <br />
                한마디 얹어요
              </h2>
            </div>

            <div className="feat rv-on">
              <div className="vis">
                <span className="samp">예시 화면</span>
                <div className="dk post">
                  <div className="ph it">
                    <div className="av" style={{ background: '#2563EB' }}>류</div>
                    <div>
                      <b>류</b>
                      <small>오전 7:40 · 매일 1알고리즘</small>
                    </div>
                  </div>
                  <div className="img it">
                    <i className="l" style={{ width: '62%' }}></i>
                    <i className="l" style={{ width: '88%' }}></i>
                    <i className="l" style={{ width: '46%' }}></i>
                  </div>
                  <div className="bub it">
                    <div className="av" style={{ background: '#0891B2' }}>김</div>
                    <p>출근 전에 벌써? 대단하다</p>
                  </div>
                  <div className="bub me it">
                    <div className="av" style={{ background: '#475569' }}>박</div>
                    <p>나도 지금 일어났어, 인증 간다</p>
                  </div>
                </div>
              </div>
              <div className="ftxt">
                <h3>인증마다 짧은 응원을</h3>
                <p>카톡방처럼 묻히지 않아요. 누가 언제 무엇을 했는지 인증 옆에 남아요.</p>
              </div>
            </div>

            <div className="feat rv-on">
              <div className="vis">
                <span className="samp">예시 화면</span>
                <div className="dk grp">
                  <div
                    className="mh it"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
                  >
                    <b style={{ fontSize: '15px' }}>퇴근 후 챌린지</b>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>오늘 2/3 인증</span>
                  </div>
                  <div className="row it">
                    <div className="av" style={{ background: '#2563EB' }}>류</div>
                    <div className="t">
                      <b>매일 1알고리즘</b>
                      <small>7일 연속</small>
                      <div className="bar" style={{ marginTop: '6px' }}>
                        <i data-w="100%"></i>
                      </div>
                    </div>
                  </div>
                  <div className="row it">
                    <div className="av" style={{ background: '#0891B2' }}>김</div>
                    <div className="t">
                      <b>주 3회 헬스장</b>
                      <small>이번 주 2/3</small>
                      <div className="bar" style={{ marginTop: '6px' }}>
                        <i data-w="66%"></i>
                      </div>
                    </div>
                  </div>
                  <div className="row it">
                    <div className="av" style={{ background: '#475569' }}>박</div>
                    <div className="t">
                      <b>6시 기상</b>
                      <small>오늘 아직</small>
                      <div className="bar" style={{ marginTop: '6px' }}>
                        <i data-w="40%"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="ftxt">
                <h3>모임의 오늘이 한눈에</h3>
                <p>각자 다른 챌린지라도, 서로 어디쯤 왔는지 한 화면에서 보여요.</p>
              </div>
            </div>
          </section>

          {/* 6. 단어가 모인다 */}
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
              </div>

              <div className="gh" id="gh">
                <h2>
                  초대 링크 하나면
                  <br />
                  준비 끝
                </h2>
              </div>

              <div className="invite" id="invite" role="img" aria-label="예시 화면: 모임 초대 링크를 복사하는 카드">
                <span className="samp" style={{ top: '12px', right: '12px' }}>예시 화면</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    className="av"
                    style={{ background: '#2563EB', width: '40px', height: '40px', borderRadius: '12px' }}
                  >
                    퇴
                  </div>
                  <div>
                    <b style={{ fontSize: '16px' }}>퇴근 후 챌린지</b>
                    <div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>멤버 3명 · 챌린지 3개</div>
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

          {/* 7. Outro */}
          <section className="outro" id="start" aria-labelledby="startH">
            <h2 id="startH">
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

            <div className="shareCard" role="img" aria-label="공유 카드 예시: 7일 연속 인증">
              <div className="top">
                <DayuLogo variant="horizontal" theme="mono-white" className="h-5 w-auto" />
                <span>dayuse.kr</span>
              </div>
              <div className="face">
                <DayuLogo variant="symbol" theme="light" className="w-14 h-14" />
              </div>
              <div className="big">
                <b>7</b>
                <span>일 연속</span>
              </div>
              <div className="streak">
                <i className="on"></i>
                <i className="on"></i>
                <i className="on"></i>
                <i className="on"></i>
                <i className="on"></i>
                <i className="on"></i>
                <i className="on"></i>
              </div>
              <div className="who">
                <small>매일 1알고리즘 문제 풀기</small>
                <b>류기현</b>
              </div>
            </div>
            <div className="shareCap">연속 기록은 공유 카드로 자랑할 수 있어요 · 예시</div>

            <div className="foot">
              <nav className="links" aria-label="바닥글 링크">
                <Link to="/contact">문의하기</Link>
                <Link to="/guide">서비스 안내</Link>
                <Link to="/terms">이용약관</Link>
                <Link to="/privacy">개인정보처리방침</Link>
              </nav>
              <small>목표는 각자, 꾸준함은 함께.</small>
              <div className="water" aria-hidden="true">데이유즈</div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
