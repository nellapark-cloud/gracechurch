// 링크 미리보기(OG) 기본값을 채워 주는 스크립트입니다.
// 배포할 때마다 GitHub Actions가 자동으로 실행해요.
// 미리보기 태그(og:image 등)가 없는 HTML 페이지에만 기본 이미지와 제목을 넣고,
// 이미 직접 넣어 둔 페이지는 그대로 둡니다.
// 저장소의 원본 파일은 바꾸지 않고, 배포되는 사본에만 적용돼요.

const fs = require('fs');
const path = require('path');

const SITE = 'https://sejonggrace.com';
const DEFAULT_IMAGE = SITE + '/assets/og-image.jpeg';
const DEFAULT_IMAGE_W = 1600;
const DEFAULT_IMAGE_H = 1067;
const SITE_NAME = '은혜교회 — 말씀 코이노니아';
const DEFAULT_DESC = '기독교한국침례회 은혜교회 자료실';
const SKIP_DIRS = new Set(['.git', '.github', 'github', 'node_modules', 'admin']);

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.html?$/i.test(name)) out.push(full);
  }
  return out;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function decodeEntities(s) {
  return s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function has(html, attr, name) {
  const re = new RegExp('<meta[^>]+' + attr + '\\s*=\\s*["\']' + name.replace(':', '\\:') + '["\']', 'i');
  return re.test(html);
}

function pageTitle(html, file) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (m && m[1].trim()) return decodeEntities(m[1].replace(/\s+/g, ' ').trim());
  return path.basename(file).replace(/\.html?$/i, '').normalize('NFC');
}

function pageDesc(html) {
  const m = html.match(/<meta[^>]+name\s*=\s*["']description["'][^>]*>/i);
  if (m) {
    const c = m[0].match(/content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i);
    const v = c && (c[1] || c[2]);
    if (v && v.trim()) return decodeEntities(v.trim());
  }
  return DEFAULT_DESC;
}

function pageUrl(file) {
  const rel = path.relative('.', file).split(path.sep).map(p => encodeURIComponent(p.normalize('NFC'))).join('/');
  return SITE + '/' + rel;
}

const files = walk('.', []);
let changed = 0;

for (const file of files) {
  let html;
  try { html = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
  if (has(html, 'property', 'og:image')) continue;

  const title = pageTitle(html, file);
  const desc = pageDesc(html);
  const tags = [];
  if (!has(html, 'property', 'og:type')) tags.push('<meta property="og:type" content="website">');
  if (!has(html, 'property', 'og:site_name')) tags.push('<meta property="og:site_name" content="' + esc(SITE_NAME) + '">');
  if (!has(html, 'property', 'og:title')) tags.push('<meta property="og:title" content="' + esc(title) + '">');
  if (!has(html, 'property', 'og:description')) tags.push('<meta property="og:description" content="' + esc(desc) + '">');
  tags.push('<meta property="og:image" content="' + DEFAULT_IMAGE + '">');
  tags.push('<meta property="og:image:width" content="' + DEFAULT_IMAGE_W + '">');
  tags.push('<meta property="og:image:height" content="' + DEFAULT_IMAGE_H + '">');
  if (!has(html, 'property', 'og:url')) tags.push('<meta property="og:url" content="' + pageUrl(file) + '">');
  if (!has(html, 'name', 'twitter:card')) tags.push('<meta name="twitter:card" content="summary_large_image">');
  if (!has(html, 'name', 'twitter:image')) tags.push('<meta name="twitter:image" content="' + DEFAULT_IMAGE + '">');

  const block = '\n<!-- 기본 링크 미리보기 (배포 시 자동 추가) -->\n' + tags.join('\n') + '\n';
  let out;
  if (/<head[^>]*>/i.test(html)) out = html.replace(/<head[^>]*>/i, m => m + block);
  else if (/<html[^>]*>/i.test(html)) out = html.replace(/<html[^>]*>/i, m => m + '\n<head>' + block + '</head>');
  else out = '<head>' + block + '</head>\n' + html;

  fs.writeFileSync(file, out);
  changed++;
}

console.log('기본 미리보기를 넣은 페이지: ' + changed + '개 / 전체 HTML ' + files.length + '개');
