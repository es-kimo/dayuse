import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const outputDir = path.resolve(frontendRoot, 'public/landing/assets/captures');

// Chrome 실행 파일 경로 탐색
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
  throw new Error('Google Chrome 실행 파일을 찾을 수 없습니다. Chrome이 설치되어 있는지 확인하세요.');
}

// 캡처 대상 화면 정의
const SCREENS = [
  {
    id: '01-groups-empty',
    title: '모임 목록 (빈 상태)',
    caption: '아직 모임이 없을 때 새 모임 생성 및 코드 입장 안내',
    category: 'group',
  },
  {
    id: '02-groups-list',
    title: '내 모임 목록',
    caption: '참여 중인 모임 목록과 방장 표시 및 챌린지 현황',
    category: 'group',
  },
  {
    id: '03-group-feed',
    title: '모임 인증 피드 (대표 UI)',
    caption: '친구들의 일일 챌린지 인증 사진과 한마디 피드 타임라인',
    category: 'feed',
    isPrimary: true, // 랜딩 대표 캡처
  },
  {
    id: '04-challenge-calendar',
    title: '챌린지 캘린더 및 스트릭 기록',
    caption: '7일 연속 달성 스트릭과 참가자별 수행률 통계',
    category: 'record',
    isPrimary: true,
  },
  {
    id: '05-today-actions',
    title: '오늘의 챌린지 액션',
    caption: '오늘 인증할 챌린지 카드와 즉시 사진 인증 액션',
    category: 'today',
    isPrimary: true,
  },
  {
    id: '06-group-new',
    title: '새 모임 개설 폼',
    caption: '모임 이름과 설명 설정 후 즉시 친구 초대 링크 발급',
    category: 'group',
    isPrimary: true,
  },
  {
    id: '07-challenge-new',
    title: '챌린지 개설 폼',
    caption: '수행 요일 및 인증 기준 지정, 0원 벌금 정책 지원',
    category: 'challenge',
    isPrimary: true,
  },
  {
    id: '08-verification-modal',
    title: '사진 인증 작성 모달',
    caption: '인증 사진 프리뷰와 한마디 작성으로 3초 만에 인증 완료',
    category: 'verification',
    isPrimary: true,
  },
  {
    id: '09-share-card',
    title: '연속 기록 공유 카드',
    caption: '7일 연속 달성 인증 내역을 외부 SNS 및 친구에게 공유',
    category: 'share',
  },
  {
    id: '10-invite-landing',
    title: '모임 초대 수락 랜딩',
    caption: '초대장 확인 및 모임 내 진행 중인 챌린지 사전 파악',
    category: 'invite',
  },
  {
    id: '11-login',
    title: '간편 로그인',
    caption: '카카오 계정으로 간편하게 시작하는 로그인 화면',
    category: 'auth',
  },
  {
    id: '12-profile',
    title: '내 프로필 및 활동 통계',
    caption: '누적 인증 횟수 및 최대 연속 달성 일수 요약',
    category: 'profile',
  },
];

async function captureAll(baseUrl = 'http://localhost:5173') {
  console.log(`[1/4] 출력 디렉토리 확인: ${outputDir}`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const chromePath = getChromePath();
  console.log(`[2/4] Google Chrome 실행: ${chromePath}`);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars'],
  });

  const page = await browser.newPage();
  // iPhone 14/15/16 표준 뷰포트 (390 x 844, 2x Retina)
  await page.setViewport({
    width: 480,
    height: 960,
    deviceScaleFactor: 2,
  });

  console.log(`[3/4] 총 ${SCREENS.length}개 화면 캡처 시작 (${baseUrl}/__capture)`);
  const metaList = [];

  for (const screen of SCREENS) {
    const targetUrl = `${baseUrl}/__capture?screen=${screen.id}`;
    console.log(`  📸 캡처 중: ${screen.id} (${screen.title})`);

    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 15000 });
      // 폰 프레임 요소 대기
      await page.waitForSelector('#capture-target', { timeout: 5000 });
      // 폰트 및 이미지 로딩을 위한 잠시 대기
      await new Promise((r) => setTimeout(r, 600));

      const element = await page.$('#capture-target');
      if (!element) {
        console.warn(`  ⚠️ 요소를 찾지 못해 전체 뷰포트로 대체합니다: ${screen.id}`);
      }

      const rawPngBuffer = element
        ? await element.screenshot({ type: 'png' })
        : await page.screenshot({ type: 'png' });

      // sharp 처리
      const pngPath = path.join(outputDir, `${screen.id}.png`);
      const webpPath = path.join(outputDir, `${screen.id}.webp`);

      const sharpImg = sharp(rawPngBuffer);
      const imgMeta = await sharpImg.metadata();

      // PNG 저장 (최적화)
      await sharpImg.png({ compressionLevel: 8 }).toFile(pngPath);

      // WebP 저장 (고품질 경량화)
      await sharp(rawPngBuffer).webp({ quality: 90, effort: 4 }).toFile(webpPath);

      const aspectWidth = imgMeta.width || 780;
      const aspectHeight = imgMeta.height || 1688;
      const aspectRatio = `${aspectWidth}/${aspectHeight}`;

      metaList.push({
        id: screen.id,
        title: screen.title,
        caption: screen.caption,
        category: screen.category,
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

  // 메타데이터 json 저장
  const metaPath = path.join(outputDir, 'captures-meta.json');
  fs.writeFileSync(metaPath, JSON.stringify({ captures: metaList }, null, 2), 'utf-8');
  console.log(`[4/4] 캡처 완료! 메타데이터 저장됨: ${metaPath}`);
  console.log(`✨ 총 ${metaList.length}개 화면 에셋 준비 완료.`);
}

// 스크립트 단독 실행 시
const port = process.env.PORT || '5173';
captureAll(`http://localhost:${port}`).catch((err) => {
  console.error('캡처 실행 중 치명적 오류 발생:', err);
  process.exit(1);
});
