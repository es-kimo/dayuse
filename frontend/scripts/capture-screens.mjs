import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import * as mock from './mockData.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const outputDir = path.resolve(frontendRoot, 'public/landing/assets/captures');

function getChromePath() {
  const possiblePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Google Chrome 실행 파일을 찾을 수 없습니다.');
}

const SCREENS = [
  {
    id: '01-groups-empty',
    title: '모임 목록 (빈 상태)',
    caption: '아직 모임이 없을 때 새 모임 생성 및 코드 입장 안내',
    route: '/groups',
    requiresAuth: true,
    emptyGroups: true,
  },
  {
    id: '02-groups-list',
    title: '내 모임 목록',
    caption: '참여 중인 모임 목록과 방장 표시 및 챌린지 현황',
    route: '/groups',
    requiresAuth: true,
  },
  {
    id: '03-group-feed',
    title: '모임 인증 피드 (홈 탭)',
    caption: '친구들의 일일 챌린지 인증 사진과 한마디 피드 타임라인',
    route: '/groups/5',
    requiresAuth: true,
    isPrimary: true,
    fullHeight: true,
  },
  {
    id: '03b-group-challenges',
    title: '모임 챌린지 탭',
    caption: '모임 내 진행 중인 챌린지 목록과 필터 및 개설 옵션',
    route: '/groups/5?tab=challenges',
    requiresAuth: true,
    isPrimary: true,
  },
  {
    id: '03c-group-members',
    title: '모임 멤버 탭',
    caption: '참여 멤버 목록, 방장 권한 표시 및 모임 초대 링크 관리',
    route: '/groups/5?tab=members',
    requiresAuth: true,
    isPrimary: true,
  },
  {
    id: '04-challenge-calendar',
    title: '챌린지 캘린더 및 스트릭 기록',
    caption: '7일 연속 달성 스트릭과 참가자별 수행률 통계',
    route: '/challenges/1',
    requiresAuth: true,
    isPrimary: true,
  },
  {
    id: '05-today-actions',
    title: '오늘의 챌린지 액션',
    caption: '오늘 인증할 챌린지 카드와 즉시 사진 인증 액션',
    route: '/today',
    requiresAuth: true,
    isPrimary: true,
  },
  {
    id: '06-group-new',
    title: '새 모임 개설 폼',
    caption: '모임 이름과 설명 설정 후 즉시 친구 초대 링크 발급',
    route: '/groups/new',
    requiresAuth: true,
    isPrimary: true,
  },
  {
    id: '07-challenge-new',
    title: '챌린지 개설 폼',
    caption: '수행 요일 및 인증 기준 지정, 0원 벌금 정책 지원',
    route: '/groups/5/challenges/new',
    requiresAuth: true,
    isPrimary: true,
  },
  {
    id: '08-verification-modal',
    title: '사진 인증 작성 모달',
    caption: '인증 사진 프리뷰와 한마디 작성으로 3초 만에 인증 완료',
    route: '/today',
    requiresAuth: true,
    isPrimary: true,
    isModal: true,
    action: async (page) => {
      // 오늘 할 일 페이지에서 '인증하기' 버튼 클릭
      await page.waitForSelector('button', { timeout: 5000 });
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const verifyBtn = buttons.find((b) => b.textContent && b.textContent.includes('인증하기'));
        if (verifyBtn) {
          verifyBtn.click();
        }
      });
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 600));
    },
  },
  {
    id: '08b-modal-unchecked-sheet',
    title: '미확인 인증 기록 검토 바텀시트',
    caption: '전일 미인증 및 유예 시간 대상 기록을 확인하고 인증/소명 지원',
    route: '/groups/5',
    requiresAuth: true,
    isPrimary: true,
    isModal: true,
    action: async (page) => {
      // 미확인 기록 버튼 탐색 및 클릭 (GroupSettlementCard의 '미확인 기록' 또는 상태 배너의 '정리하기')
      await page.waitForSelector('button', { timeout: 5000 });
      const found = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find((b) => {
          const t = b.textContent || '';
          return (
            t.includes('미확인 기록') ||
            t.includes('지난 기록 확인') ||
            t.includes('정리하기') ||
            t.includes('검토')
          );
        });
        if (btn) {
          btn.scrollIntoView({ behavior: 'instant', block: 'center' });
          btn.click();
          return true;
        }
        return false;
      });
      if (!found) {
        console.warn('    ⚠️ [08b] 미확인 기록 확인 버튼을 찾지 못했습니다.');
      }
      await page.waitForSelector('[role="dialog"]', { timeout: 4000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 600));
    },
  },
  {
    id: '08c-modal-comments-sheet',
    title: '피드 댓글 소통 바텀시트',
    caption: '친구들의 인증 사진에 댓글과 응원의 메시지를 남기는 소통 공간',
    route: '/groups/5',
    requiresAuth: true,
    isPrimary: true,
    isModal: true,
    action: async (page) => {
      // 피드 카드의 '댓글' 버튼 클릭
      await page.waitForSelector('button', { timeout: 5000 });
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find((b) => b.textContent && b.textContent.includes('댓글'));
        if (btn) {
          btn.scrollIntoView({ behavior: 'instant', block: 'center' });
          btn.click();
        }
      });
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 600));
    },
  },
  {
    id: '08d-modal-deposit-report',
    title: '미수행 벌금 입금 신고 모달',
    caption: '미납 벌금 내역 선택 및 모임 계좌로 입금 후 확인 요청',
    route: '/groups/5',
    requiresAuth: true,
    isPrimary: true,
    isModal: true,
    action: async (page) => {
      // 정산 카드의 '입금 신고' 버튼 클릭
      await page.waitForSelector('button', { timeout: 5000 });
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find((b) => b.textContent && b.textContent.includes('입금 신고'));
        if (btn) {
          btn.scrollIntoView({ behavior: 'instant', block: 'center' });
          btn.click();
        }
      });
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 600));
    },
  },
  {
    id: '08e-modal-abort-challenge',
    title: '챌린지 중도 포기 확인 모달',
    caption: '챌린지 포기 시 누적 페널티 및 주의사항 확인 팝업',
    route: '/challenges/1',
    requiresAuth: true,
    isPrimary: true,
    isModal: true,
    action: async (page) => {
      // 1. 우측 상단 더보기 버튼 클릭
      await page.waitForSelector('button[aria-label="더보기"]', { timeout: 5000 });
      await page.click('button[aria-label="더보기"]');
      await new Promise((r) => setTimeout(r, 400));

      // 2. 열린 메뉴의 '챌린지 중단' [role="menuitem"] 위치 계산 후 마우스 클릭
      const itemRect = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
        const abortItem = items.find((el) => {
          const t = el.textContent || '';
          return t.includes('중단') || t.includes('포기');
        });
        if (abortItem) {
          const r = abortItem.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }
        return null;
      });

      if (itemRect) {
        await page.mouse.click(itemRect.x, itemRect.y);
      } else {
        await page.evaluate(() => {
          const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
          const abortItem = items.find((el) => (el.textContent || '').includes('중단'));
          if (abortItem) abortItem.click();
        });
      }
      await page.waitForSelector('[role="dialog"]', { timeout: 4000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 600));
    },
  },
  {
    id: '09-share-card',
    title: '연속 기록 공유 카드',
    caption: '7일 연속 달성 인증 내역을 외부 SNS 및 친구에게 공유',
    route: '/shares/sample-share-token',
    requiresAuth: false,
  },
  {
    id: '10-invite-landing',
    title: '모임 초대 수락 랜딩',
    caption: '초대장 확인 및 모임 내 진행 중인 챌린지 사전 파악',
    route: '/invite/SAMPLE',
    requiresAuth: false,
  },
  {
    id: '11-login',
    title: '간편 로그인',
    caption: '카카오 계정으로 간편하게 시작하는 로그인 화면',
    route: '/login',
    requiresAuth: false,
  },
  {
    id: '12-profile',
    title: '내 프로필 및 활동 통계',
    caption: '누적 인증 횟수 및 최대 연속 달성 일수 요약',
    route: '/profile',
    requiresAuth: true,
  },
  {
    id: '13-notification-settings',
    title: '미인증 웹 푸시 알림 설정',
    caption: '매일 저녁 미완료 챌린지 리마인더 시간 및 수신 설정',
    route: '/settings/notifications',
    requiresAuth: true,
    isPrimary: false,
    action: async (page) => {
      await page.waitForSelector('select', { timeout: 5000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 300));
    },
  },
  {
    id: '14-settlement-manage',
    title: '모임장 정산 및 입금 관리',
    caption: '멤버들의 벌금 입금 신고 내역 확인, 승인 및 반려 관리',
    route: '/groups/6/settlements',
    requiresAuth: true,
    isPrimary: true,
    action: async (page) => {
      await page.waitForSelector('main', { timeout: 5000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 400));
    },
  },
];

async function captureAll(baseUrl = 'http://localhost:5173') {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const chromePath = getChromePath();
  console.log(`[1/4] Google Chrome 실행: ${chromePath}`);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars'],
  });

  try {
    await browser.defaultBrowserContext().overridePermissions(baseUrl, ['notifications']);
  } catch {
    // 권한 오버라이드 지원 안 되는 환경 대비 fallback
  }

  const page = await browser.newPage();

  // 실제 모바일 뷰포트 (iPhone 14/15/16 표준 390x844, 2x Retina)
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  page.on('pageerror', (err) => {
    console.error('    [브라우저 에러]:', err.message);
  });

  // API 요청 인터셉션 활성화 (실제 서비스 컴포넌트에 가명 데이터 주입)
  await page.setRequestInterception(true);

  let currentEmptyGroups = false;

  page.on('request', (req) => {
    const url = req.url();
    const method = req.method();

    if (!url.includes('/api/v1')) {
      req.continue();
      return;
    }

    const respondJson = (data, status = 200) => {
      req.respond({
        status,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });
    };

    // 1. 내 정보
    if (url.endsWith('/auth/me')) {
      respondJson(mock.MOCK_USER);
    }
    // 2. 그룹 목록
    else if (url.endsWith('/groups') && method === 'GET') {
      respondJson(currentEmptyGroups ? mock.MOCK_GROUPS_EMPTY : mock.MOCK_GROUPS_LIST);
    }
    // 3. 그룹 상세 관련 (1번, 5번 등 모든 모임 ID 지원)
    else if (/\/groups\/\d+\/challenges/.test(url) && method === 'GET') {
      respondJson(mock.MOCK_GROUP_CHALLENGES);
    } else if (/\/groups\/\d+\/feed/.test(url) && method === 'GET') {
      respondJson(mock.MOCK_GROUP_FEED);
    } else if (/\/groups\/\d+\/status-summary/.test(url) && method === 'GET') {
      respondJson(mock.MOCK_GROUP_STATUS_SUMMARY);
    } else if (/\/groups\/\d+\/unchecked-records/.test(url) && method === 'GET') {
      respondJson(mock.MOCK_UNCHECKED_RECORDS);
    } else if (/\/groups\/\d+\/settlement/.test(url) && method === 'GET') {
      respondJson(mock.MOCK_SETTLEMENT_SUMMARY);
    } else if (/\/groups\/\d+\/unpaid-records/.test(url) && method === 'GET') {
      respondJson(mock.MOCK_UNPAID_RECORDS);
    } else if (/\/groups\/\d+\/deposit-reports/.test(url) && method === 'GET') {
      const parsedUrl = new URL(url);
      const status = parsedUrl.searchParams.get('status');
      if (status) {
        respondJson(mock.MOCK_DEPOSIT_REPORTS.filter((r) => r.status === status));
      } else {
        respondJson(mock.MOCK_DEPOSIT_REPORTS);
      }
    } else if (/\/groups\/\d+\/account/.test(url)) {
      respondJson(mock.MOCK_SETTLEMENT_SUMMARY.account);
    } else if (/\/groups\/\d+\/today/.test(url)) {
      respondJson(mock.MOCK_TODAY_ACTIONS);
    } else if (/\/groups\/\d+(\?|$)/.test(url) && method === 'GET') {
      respondJson(mock.MOCK_GROUP_DETAIL);
    }
    // 4. 챌린지 상세
    else if (/\/challenges\/\d+\/calendar/.test(url)) {
      respondJson(mock.MOCK_CHALLENGE_CALENDAR);
    } else if (/\/challenges\/\d+(\?|$)/.test(url) && method === 'GET') {
      respondJson(mock.MOCK_CHALLENGE_DETAIL);
    }
    // 4-1. 댓글 관련
    else if (/\/verifications\/\d+\/comments/.test(url) && method === 'GET') {
      respondJson(mock.MOCK_COMMENTS);
    }
    // 5. 오늘 할 일
    else if (url.includes('/today') && method === 'GET') {
      respondJson(mock.MOCK_TODAY_ACTIONS);
    }
    // 6. 초대 정보
    else if (url.includes('/invites/') || url.includes('/invite')) {
      respondJson(mock.MOCK_INVITE_INFO);
    }
    // 7. 공유 카드 정보
    else if (url.includes('/shares/')) {
      respondJson(mock.MOCK_SHARE_CARD);
    }
    // 8. 알림 설정 정보
    else if (url.includes('/notifications/settings') && method === 'GET') {
      respondJson(mock.MOCK_NOTIFICATION_SETTINGS);
    }
    // 9. 기타 API
    else {
      respondJson({});
    }
  });

  console.log(`[2/4] 총 ${SCREENS.length}개 실제 서비스 화면 캡처 시작 (${baseUrl})`);
  const metaList = [];

  for (const screen of SCREENS) {
    currentEmptyGroups = !!screen.emptyGroups;
    const targetUrl = `${baseUrl}${screen.route}`;
    console.log(`  📸 실제 화면 캡처: ${screen.id} -> ${screen.route}`);

    try {
      if (screen.requiresAuth) {
        await page.evaluateOnNewDocument(() => {
          localStorage.setItem('accessToken', 'mock-access-token');
          localStorage.setItem('refreshToken', 'mock-refresh-token');

          // 웹 푸시 ServiceWorker & PushManager 모의 주입 (블로킹 방지 및 정상 구독 상태 재현)
          if ('serviceWorker' in navigator) {
            const mockSub = {
              endpoint: 'https://fcm.googleapis.com/fcm/send/mock-device-endpoint',
              getKey: (name) => {
                if (name === 'p256dh') return new Uint8Array([1, 2, 3]).buffer;
                if (name === 'auth') return new Uint8Array([4, 5, 6]).buffer;
                return null;
              },
            };
            const mockRegistration = {
              active: true,
              scope: '/',
              pushManager: {
                getSubscription: () => Promise.resolve(mockSub),
                subscribe: () => Promise.resolve(mockSub),
              },
            };
            Object.defineProperty(navigator, 'serviceWorker', {
              value: {
                register: () => Promise.resolve(mockRegistration),
                getRegistration: () => Promise.resolve(mockRegistration),
                ready: Promise.resolve(mockRegistration),
                addEventListener: () => {},
                removeEventListener: () => {},
              },
              configurable: true,
            });
          }
        });
      } else {
        await page.evaluateOnNewDocument(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        });
      }

      await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise((r) => setTimeout(r, 600));

      if (screen.action) {
        await screen.action(page);
        await new Promise((r) => setTimeout(r, 400));
      }

      // 모달/바텀시트가 열려 있는지 감지하거나 screen.isModal인 경우 전체 뷰포트(390x844) 캡처
      const hasModalOpen = !!screen.isModal || (await page.$('[role="dialog"]')) !== null;
      let rawPngBuffer;

      if (hasModalOpen) {
        // Base UI의 Portal로 인해 모달은 .max-w-app 바깥(body 직하단)에 렌더링되므로 전체 뷰포트를 캡처
        rawPngBuffer = await page.screenshot({ type: 'png' });
      } else {
        // .screen-ui 구조인 경우 내부 스크롤 컨테이너를 해제하여 전체 높이(Full Height)로 확장
        await page.evaluate(() => {
          const screenUi = document.querySelector('.screen-ui');
          const screenBody = document.querySelector('.screen-ui .body');
          if (screenUi) {
            screenUi.style.position = 'relative';
            screenUi.style.height = 'auto';
            screenUi.style.minHeight = '100vh';
          }
          if (screenBody) {
            screenBody.style.overflow = 'visible';
            screenBody.style.height = 'auto';
            screenBody.style.flex = 'none';
          }
        });
        await new Promise((r) => setTimeout(r, 200));

        const appContainer = (await page.$('.screen-ui')) || (await page.$('.max-w-app'));
        rawPngBuffer = appContainer
          ? await appContainer.screenshot({ type: 'png' })
          : await page.screenshot({ type: 'png' });
      }

      const pngPath = path.join(outputDir, `${screen.id}.png`);
      const webpPath = path.join(outputDir, `${screen.id}.webp`);

      const sharpImg = sharp(rawPngBuffer);
      const imgMeta = await sharpImg.metadata();

      await sharpImg.png({ compressionLevel: 8 }).toFile(pngPath);
      await sharp(rawPngBuffer).webp({ quality: 90, effort: 4 }).toFile(webpPath);

      const aspectWidth = imgMeta.width || 780;
      const aspectHeight = imgMeta.height || 1688;
      const aspectRatio = `${aspectWidth}/${aspectHeight}`;

      metaList.push({
        id: screen.id,
        title: screen.title,
        caption: screen.caption,
        isPrimary: !!screen.isPrimary,
        pngFile: `${screen.id}.png`,
        webpFile: `${screen.id}.webp`,
        assetPath: `/landing/assets/captures/${screen.id}.webp`,
        width: aspectWidth,
        height: aspectHeight,
        aspectRatio,
        capturedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`  ❌ 캡처 실패 [${screen.id}]:`, err.message);
    }
  }

  await browser.close();

  const metaPath = path.join(outputDir, 'captures-meta.json');
  fs.writeFileSync(metaPath, JSON.stringify({ captures: metaList }, null, 2), 'utf-8');
  console.log(`[3/4] 실제 화면 캡처 완료! 메타데이터: ${metaPath}`);
}

const port = process.env.PORT || '5173';
captureAll(`http://localhost:${port}`).catch((err) => {
  console.error('캡처 실행 중 치명적 오류:', err);
  process.exit(1);
});
