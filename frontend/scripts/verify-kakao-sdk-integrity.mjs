#!/usr/bin/env node
/**
 * src/utils/kakao.ts에 박아둔 SRI 해시가 실제 CDN 배포본과 일치하는지 확인한다.
 *
 * 해시가 어긋나면 브라우저가 SDK 스크립트를 차단하고, 카카오톡 공유가 조용히 전부 실패한다.
 * SDK 버전을 올릴 때 반드시 실행한다.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/utils/kakao.ts', import.meta.url), 'utf8');

const version = source.match(/KAKAO_SDK_VERSION = '([^']+)'/)?.[1];
const expected = source.match(/KAKAO_SDK_INTEGRITY = '([^']+)'/)?.[1];

if (!version || !expected) {
  console.error('kakao.ts에서 KAKAO_SDK_VERSION 또는 KAKAO_SDK_INTEGRITY를 찾지 못했습니다.');
  process.exit(1);
}

const url = `https://t1.kakaocdn.net/kakao_js_sdk/${version}/kakao.min.js`;
const res = await fetch(url);

if (!res.ok) {
  console.error(`SDK를 받지 못했습니다: ${res.status} ${url}`);
  process.exit(1);
}

const body = Buffer.from(await res.arrayBuffer());
const actual = `sha384-${createHash('sha384').update(body).digest('base64')}`;

if (actual === expected) {
  console.log(`OK  ${url}`);
  console.log(`    ${actual}`);
  process.exit(0);
}

console.error(`무결성 해시가 다릅니다: ${url}`);
console.error(`  kakao.ts: ${expected}`);
console.error(`  실제값  : ${actual}`);
process.exit(1);
