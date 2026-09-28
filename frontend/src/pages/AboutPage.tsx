import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DayuLogo } from '../components/brand/DayuLogo';
import { FAQ_ITEMS } from '../constants/landingContent';
import { ChevronDown, ArrowRight } from 'lucide-react';
import './AboutPage.css';

export const AboutPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/groups/new');
    } else {
      navigate('/login?returnTo=/groups/new');
    }
  };

  const handleMyGroups = () => {
    if (isAuthenticated) {
      navigate('/groups');
    } else {
      navigate('/login?returnTo=/groups');
    }
  };

  const handleScrollToGuide = (e: React.MouseEvent) => {
    e.preventDefault();
    const stepsEl = document.getElementById('steps');
    if (stepsEl) {
      stepsEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex((prev) => (prev === idx ? null : idx));
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
    const heroCtaGroup = heroCopy ? heroCopy.querySelector<HTMLElement>('.hero-cta-group') : null;
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

      const shrink = ease(seg(p, 0.14, 0.40));
      const leave = ease(seg(p, 0.62, 0.76));
      const ix = lerp(0, m ? 0.05 * vw : 0.09 * vw, shrink);
      const iy = lerp(0, m ? 0.14 * vh : 0.17 * vh, shrink);
      const rad = lerp(0, m ? 24 : 36, shrink);
      const lift = leave * vh * 0.9;

      if (morning) {
        morning.style.clipPath = `inset(${iy - lift}px ${ix}px ${iy + lift}px ${ix}px round ${rad}px)`;
        morning.style.opacity = String(1 - seg(p, 0.70, 0.76));
      }

      words.forEach((w) => {
        w.style.opacity = String(1 - seg(p, 0.12, 0.2));
        w.style.transform = `translateY(${-seg(p, 0.12, 0.2) * 30}px)`;
      });

      if (heroP) {
        heroP.style.opacity = String(1 - seg(p, 0.1, 0.18));
      }
      if (heroCtaGroup) {
        heroCtaGroup.style.opacity = String(1 - seg(p, 0.12, 0.22));
      }
      if (chips) {
        chips.style.opacity = String(1 - seg(p, 0.16, 0.26));
      }
      if (phLabel) {
        phLabel.style.opacity = String(1 - seg(p, 0.1, 0.2));
      }

      const cIn = out(seg(p, 0.30, 0.40));
      const cOut = seg(p, 0.58, 0.66);
      if (cardCopy) {
        cardCopy.style.opacity = String(cIn * (1 - cOut));
        cardCopy.style.filter = `blur(${(1 - cIn) * 8}px)`;
      }

      const rise = out(seg(p, 0.0, 0.18));
      const toRight = ease(seg(p, 0.66, 0.80));
      const shiftX = m ? 0 : lerp(0, -(vw * 0.02), toRight);
      const y = lerp(vh * 0.22, 0, rise);
      if (phone) {
        phone.style.transform = m
          ? `translate(50%, calc(-50% + ${y}px))`
          : `translate(${shiftX}px, calc(-50% + ${y}px))`;
      }

      const up = seg(p, 0.34, 0.38);
      const done = seg(p, 0.52, 0.56);
      if (scrCam) scrCam.style.opacity = String(1 - up);
      if (scrUp) scrUp.style.opacity = String(up * (1 - done));
      if (scrDone) scrDone.style.opacity = String(done);
      if (flash) flash.style.opacity = String(Math.sin(seg(p, 0.30, 0.35) * Math.PI) * 0.9);
      if (upCta) upCta.style.background = p > 0.47 && p < 0.53 ? '#1E40AF' : '';

      const filled = Math.round(lerp(1, 7, seg(p, 0.80, 0.96)));
      cells.forEach((c, i) => c.classList.toggle('on', i < filled));
      if (streakTxt) streakTxt.textContent = `${filled}일 연속`;

      const sIn = out(seg(p, 0.74, 0.82));
      if (steps) {
        steps.style.opacity = String(sIn);
        steps.style.transform = m ? `translateY(${(1 - sIn) * 20}px)` : `translateY(calc(-50% + ${(1 - sIn) * 30}px))`;
      }

      const active = p < 0.84 ? 0 : p < 0.9 ? 1 : 2;
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

    function frame() {
      if (!A || !B) return;
      const pa = progress(A);
      const pb = progress(B);
      const darkA = sceneA(pa);
      const darkB = sceneB(pb);
      const rA = A.getBoundingClientRect();
      const rB = B.getBoundingClientRect();
      const rO = startSection ? startSection.getBoundingClientRect() : { top: 9999 };

      const inA = rA.top <= 0 && rA.bottom > window.innerHeight * 0.5;
      const inB = rB.top <= 0 && rB.bottom > window.innerHeight * 0.5;
      const inO = rO.top < window.innerHeight * 0.5;

      const dark = (inA && darkA) || (inB && darkB) || inO;
      if (nav) nav.classList.toggle('on-dark', dark);
      if (rail) rail.classList.toggle('on-dark', dark);

      const idx = inO ? 3 : inB ? (pb < 0.8 ? 1 : 2) : 0;
      ticks.forEach((t, i) => t.classList.toggle('on', i === idx));
    }

    if (reduce) {
      sceneA(0.9);
      sceneB(1);
      return;
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
    };
  }, []);

  return (
    <div className="about-page">
      {/* 고정 상단 내비게이션 */}
      <header className="nav" id="aboutNav">
        <div className="logo-wrap cursor-pointer" onClick={() => navigate('/groups')}>
          <div className="logo-light">
            <DayuLogo variant="horizontal" theme="light" className="h-7 w-auto" />
          </div>
          <div className="logo-dark">
            <DayuLogo variant="horizontal" theme="mono-white" className="h-7 w-auto" />
          </div>
        </div>

        <nav className="nav-actions">
          <button type="button" onClick={handleMyGroups} className="btn btn-subtle">
            내 모임으로
          </button>
          <button type="button" onClick={handleStart} className="btn">
            시작하기
          </button>
        </nav>
      </header>

      {/* Progress rail */}
      <div className="rail" id="rail" aria-hidden="true">
        <i className="on"></i>
        <i></i>
        <i></i>
        <i></i>
      </div>

      <main>
        {/* Section 1 & 2 & 4: Scene A */}
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
                  <b>01</b>기상 06:30 <span>매일</span>
                </div>
                <div className="chip">
                  <b>02</b>운동 45분 <span>주 5회</span>
                </div>
                <div className="chip">
                  <b>03</b>알고리즘 1문제 <span>주 3회</span>
                </div>
              </div>

              <div className="ph-label" id="phLabel">
                사진 한 장 인증 · DAYUSE
              </div>

              <div className="heroCopy" id="heroCopy">
                <h1>
                  <span className="w">사진</span> <span className="w">한</span> <span className="w">장이면</span>
                  <br />
                  <span className="w">끝나는</span> <span className="w">인증.</span>
                </h1>
                <p>매일 긴 글 쓸 필요 없어요. 사진 한 장과 한 줄 소감이면 친구들과의 챌린지 기록이 쌓여요.</p>
                <div className="hero-cta-group">
                  <button type="button" onClick={handleStart} className="btn">
                    친구들과 시작하기
                  </button>
                  <button type="button" onClick={handleScrollToGuide} className="hero-guide-link">
                    어떻게 사용하는지 보기 &darr;
                  </button>
                </div>
              </div>
            </div>

            {/* Section 2: 카톡 인증 비교 및 기간/기록 조회 강조 */}
            <div className="cardCopy" id="cardCopy">
              <h2>
                카톡 방에 올리고
                <br />
                흘려보내지 마세요
              </h2>
              <p>
                한 달 뒤에도 우리 모임의 기록이 캘린더와 통계로 온전히 남아있어요. 잊혀지지 않는 성취를 만듭니다.
              </p>
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

                {/* 3. Done streak screen (실제 챌린지 캘린더 & 스트릭 통계 캡처) */}
                <div className="scr done" id="scrDone">
                  <img
                    src="/landing/assets/captures/04-challenge-calendar.webp"
                    alt="챌린지 캘린더 및 7일 연속 달성 스트릭"
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
              </div>
            </div>

            {/* Section 4: 3단계 가이드 스텝 */}
            <div className="steps" id="steps">
              <div className="eyebrow">HOW IT WORKS</div>
              <h2>
                매일 가볍게,
                <br />
                3단계로 끝나요
              </h2>
              <ol>
                <li className="on">
                  <b>01 모임 만들기</b>
                  <span>링크 하나로 친구들을 초대해요.</span>
                </li>
                <li>
                  <b>02 챌린지 정하기</b>
                  <span>각자 지킬 목표와 주기를 설정해요.</span>
                </li>
                <li>
                  <b>03 사진 한 장 인증</b>
                  <span>매일 정해진 시간에 가볍게 올려요.</span>
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* Section 3: Scene B ("목표는 각자, 꾸준함은 함께") */}
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

        {/* Section 5: 시작 전 궁금한 점 (FAQ 아코디언) */}
        <section className="faq-section" id="faq" aria-label="시작 전 궁금한 점">
          <div className="faq-inner">
            <div className="faq-header">
              <div className="faq-eyebrow">FAQ</div>
              <h2 className="faq-title">시작 전 궁금한 점</h2>
            </div>

            <div className="faq-list" role="region" aria-label="자주 묻는 질문 목록">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={item.question} className="faq-item">
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="faq-question"
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${idx}`}
                    >
                      <span>{item.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-blue-600' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div id={`faq-answer-${idx}`} className="faq-answer">
                        <p>{item.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 6: Outro (마지막 CTA) */}
        <section className="outro" id="start" aria-label="시작하기">
          <div className="inner">
            <div>
              <h2>
                오늘부터 친구와
                <br />
                하루 하나씩
              </h2>
              <p>모임을 만들고 초대 링크를 보내면 준비 끝이에요.</p>
              <button type="button" onClick={handleStart} className="btn btn-lg">
                <span>친구들과 시작하기</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div className="shareCard-wrap" aria-label="연속 기록 공유 카드">
              <img
                src="/landing/assets/captures/09-share-card.webp"
                alt="7일 연속 달성 인증 공유 카드"
                className="shareCard-img"
                loading="lazy"
              />
            </div>
          </div>

          <div className="water" aria-hidden="true">
            데이유즈
          </div>

          <footer className="foot">
            <span>목표는 각자, 꾸준함은 함께.</span>
            <span>&copy; {new Date().getFullYear()} dayuse.kr · All rights reserved.</span>
          </footer>
        </section>
      </main>
    </div>
  );
};
