import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('dist/index.html not found. Run vite build first.');
  process.exit(1);
}

const html = fs.readFileSync(indexHtmlPath, 'utf-8');

// /about 페이지용 정적 HTML 생성: 전용 랜딩 OG 이미지 및 canonical URL 주입
const aboutHtml = html
  .replace(
    /<meta property="og:url" content="https:\/\/dayuse\.kr" \/>/,
    '<meta property="og:url" content="https://dayuse.kr/about" />\n    <link rel="canonical" href="https://dayuse.kr/about" />'
  )
  .replace(
    /<meta property="og:image" content="https:\/\/dayuse\.kr\/assets\/brand\/og-default\.png" \/>/,
    '<meta property="og:image" content="https://dayuse.kr/assets/brand/og-landing.png" />'
  )
  .replace(
    /<meta name="twitter:image" content="https:\/\/dayuse\.kr\/assets\/brand\/og-default\.png" \/>/,
    '<meta name="twitter:image" content="https://dayuse.kr/assets/brand/og-landing.png" />'
  );

// 1. dist/about/index.html (디렉터리 라우팅 /about/ 및 /about)
const aboutDir = path.join(distDir, 'about');
if (!fs.existsSync(aboutDir)) {
  fs.mkdirSync(aboutDir, { recursive: true });
}
fs.writeFileSync(path.join(aboutDir, 'index.html'), aboutHtml, 'utf-8');

// 2. dist/about.html (Clean URL /about 지원)
fs.writeFileSync(path.join(distDir, 'about.html'), aboutHtml, 'utf-8');

console.log('Successfully generated static HTML for /about (dist/about/index.html & dist/about.html)');
