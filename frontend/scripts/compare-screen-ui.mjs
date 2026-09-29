/** Compare screens 01–07 using the same fictional data as docs/screens. No backend required.
 * Run with the Vite dev server: node scripts/compare-screen-ui.mjs [output-directory]
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import * as mock from './mockData.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = process.argv[2] || '/tmp/dayuse-screen-comparison';
await fs.mkdir(output, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox'] });
try {
  const reference = await browser.newPage();
  await reference.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await reference.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  const files = (await fs.readdir(`${root}/docs/screens`)).filter(f => /^0[1-7]-.*html$/.test(f)).sort();
  const photos = {};
  const boxes = {};
  const selectors = ['.bar', '.body', '.center', '.hero', '.segc', '.card', '.tabs', '.sheet', '.dev', '.foot', '.hero .prog', '.hero b', '.cnt'];
  const measure = async page => page.evaluate(selectors => Object.fromEntries(selectors.map(selector => [selector, [...document.querySelectorAll(selector)].map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })])), selectors);
  for (const file of files) {
    await reference.goto(`file://${root}/docs/screens/${file}`);
    await reference.evaluate(() => document.fonts.ready);
    await reference.screenshot({ path: `${output}/${file.slice(0, 2)}-reference.png`, fullPage: true });
    boxes[file.slice(0, 2)] = { reference: await measure(reference) };
    if (file.startsWith('03')) photos.thumb = await (await reference.$('.thumb')).screenshot({ encoding: 'base64' });
    if (file.startsWith('07')) {
      const els = await reference.$$('.photo');
      photos.code = await els[0].screenshot({ encoding: 'base64' });
      photos.clock = await els[1].screenshot({ encoding: 'base64' });
    }
  }
  const group = structuredClone(mock.MOCK_GROUP_DETAIL);
  group.members.forEach((m, i) => m.profileImageUrl = ['dayu:blue', 'dayu:mint', 'dayu:orange', 'dayu:purple'][i]);
  const challenges = structuredClone(mock.MOCK_GROUP_CHALLENGES);
  const actions = structuredClone(mock.MOCK_TODAY_ACTIONS);
  actions[0].streakDays = 6; actions[1].streakDays = 12;
  actions[1].verificationCriteria = '시간이 보이는 시계나 알람 사진';
  actions[1].myVerification.imageUrl = `data:image/png;base64,${photos.thumb}`;
  const feed = structuredClone(mock.MOCK_GROUP_FEED);
  feed.items.forEach((f, i) => Object.assign(f, { userId: i + 2, authorNickname: ['김운동', '박기상'][i], authorProfileImageUrl: ['dayu:mint', 'dayu:orange'][i], challengeTitle: challenges[i].title, imageUrl: `data:image/png;base64,${i ? photos.clock : photos.code}`, targetDate: '2026-09-28', createdAt: i ? '2026-09-28T06:02:00' : '2026-09-28T18:15:00', comment: i ? '알람 한 번에 기상. 오늘도 성공' : 'DP 골드 한 문제 해결했습니다!', isMine: false }));
  const invite = { ...mock.MOCK_INVITE_INFO, members: group.members, challenges };
  const cases = [ ['01','/login'], ['02','/invite/SAMPLE'], ['03','/today'], ['04','/today'], ['05','/groups'], ['06','/groups'], ['07','/groups/1'] ];
  const errors = [];
  for (const [id, route] of cases) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    page.on('pageerror', e => errors.push(`${id}: ${e.message}`));
    await page.evaluateOnNewDocument(auth => {
      const RealDate = Date;
      window.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : ['2026-09-28T10:00:00Z'])); } static now() { return new RealDate('2026-09-28T10:00:00Z').getTime(); } };
      if (auth) localStorage.setItem('accessToken', 'screen-test');
    }, Number(id) >= 3);
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      if (!url.pathname.startsWith('/api/v1')) { void req.continue(); return; }
      const p = url.pathname.replace('/api/v1', '');
      let data = {};
      if (p === '/auth/me') data = mock.MOCK_USER;
      else if (p === '/groups') data = id === '06' ? [] : mock.MOCK_GROUPS_LIST;
      else if (/\/invites\//.test(p)) data = invite;
      else if (/\/challenges$/.test(p)) data = p.includes('/groups/2') ? [{ ...challenges[0], isParticipating: false }] : challenges;
      else if (/\/today$/.test(p)) data = actions;
      else if (/\/feed$/.test(p)) data = feed;
      else if (/\/status-summary$/.test(p)) data = { groupId: 1, uncheckedCount: 0, unpaidPenaltyAmount: 17000, verifiedUserIds: [2, 3, 4] };
      else if (/\/settlement-summary$/.test(p)) data = { groupId: 1, unpaidAmount: 17000, waitingAmount: 0, confirmedAmount: 0, myUnpaidAmount: 0, accountRegistered: false, account: null };
      else if (/\/unchecked-records$/.test(p)) data = [];
      else if (p === '/groups/1') data = group;
      else if (p === '/groups/2') data = { ...group, id: 2, members: group.members.slice(1), memberCount: 5 };
      void req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    await page.goto(`http://127.0.0.1:5173${route}`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    if (id === '04') { await page.locator('.task .btn').click(); await page.waitForSelector('[role="dialog"]'); await new Promise(r => setTimeout(r, 400)); }
    await page.screenshot({ path: `${output}/${id}-actual.png`, fullPage: true });
    boxes[id].actual = await measure(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${id}: horizontal overflow`);
    if (id === '05') {
      await page.locator('.card > button[aria-expanded]').click();
      await page.type('input', 'https://dayuse.test/invite/NEWCODE?source=test');
      await page.locator('#screen-join .btn').click();
      await page.waitForFunction(() => location.pathname === '/invite/NEWCODE');
    }
    if (id === '04') { assert.equal(await page.$eval('button[type="submit"]', el => el.disabled), true); await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('[role="dialog"]')); }
    await page.setViewport({ width: 320, height: 640 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${id}: 320px overflow`);
    await page.close();
  }
  const pixels = {};
  for (const [id] of cases) {
    const images = await Promise.all(['reference', 'actual'].map(async kind => `data:image/png;base64,${(await fs.readFile(`${output}/${id}-${kind}.png`)).toString('base64')}`));
    pixels[id] = await reference.evaluate(async images => {
      const decoded = await Promise.all(images.map(src => new Promise(resolve => { const image = new Image(); image.onload = () => resolve(image); image.src = src; })));
      const width = decoded[0].width, height = decoded[0].height;
      const buffers = decoded.map(image => { const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); return ctx.getImageData(0, 0, width, height).data; });
      let different = 0; let minX = width, minY = height, maxX = 0, maxY = 0; const rows = {}; 
      for (let i = 0; i < buffers[0].length; i += 4) if ([0, 1, 2, 3].some(c => Math.abs(buffers[0][i + c] - buffers[1][i + c]) > 16)) { different++; const x = i / 4 % width, y = Math.floor(i / 4 / width); minX = Math.min(minX,x); minY = Math.min(minY,y); maxX = Math.max(maxX,x); maxY = Math.max(maxY,y); rows[Math.floor(y/10)*10] = (rows[Math.floor(y/10)*10] || 0) + 1; }
      return { width, height, bounds: [minX,minY,maxX,maxY], rows, sameSize: decoded[1].width === width && decoded[1].height === height, differentPixels: different, differencePercent: +(different / (width * height) * 100).toFixed(4) };
    }, images);
  }
  await fs.writeFile(`${output}/pixels.json`, JSON.stringify(pixels, null, 2));
  console.log(pixels);
  await fs.writeFile(`${output}/geometry.json`, JSON.stringify(boxes, null, 2));
  assert.deepEqual(errors, []);
  console.log(`7 screens captured; navigation, modal dismissal, disabled submit and 320/390px overflow checks passed. ${output}`);
} finally { await browser.close(); }
