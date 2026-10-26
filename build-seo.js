// 검색 사이트(네이버·다음·구글)가 자료실을 잘 찾아 읽도록 준비해 주는 스크립트입니다.
// 배포할 때마다 GitHub Actions가 build-list.js 바로 다음에 자동으로 실행해요.
// 저장소의 원본 파일은 바꾸지 않고, 배포되는 사본에만 적용됩니다.
//
// 하는 일
//  1) sitemap.xml  — 공개 자료 페이지 전체 주소 목록 (검색 사이트 제출용)
//  2) rss.xml      — 최근 올린 자료 50개 (네이버 서치어드바이저 제출용)
//  3) robots.txt   — 검색 로봇 안내문 + 담임목사자료실 수집 금지
//  4) 자료실(archive.html) — 자료 목록을 HTML에 미리 써 넣기
//     첫 화면(index.html)은 교회 홈페이지 — 검색용 대표 주소·소유 확인 코드만 넣음
//     (지금은 화면이 열린 뒤에 목록을 불러오기 때문에, 검색 로봇 눈에는 "불러오는 중..."만 보였어요)
//  5) 각 자료 페이지 — 대표 주소(canonical), 요약(description), 제목에 "은혜교회" 붙이기
//  6) 담임목사자료실(content/admin-*) 페이지 — 검색 결과에 절대 나오지 않도록 noindex
//
// 네이버·다음·구글 소유 확인 코드는 seo-config.json 에 넣으면 자동으로 반영됩니다.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SITE = 'https://sejonggrace.com';
const SITE_NAME = '은혜교회 자료실';
const CHURCH = '은혜교회';

let config = {};
try { config = JSON.parse(fs.readFileSync('seo-config.json', 'utf8')); } catch (e) { config = {}; }

const manifest = JSON.parse(fs.readFileSync('data/manifest.json', 'utf8'));
const isPrivateKey = (key) => key.startsWith('admin_');

// ---------- 도우미 ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const nfc = (s) => s.normalize('NFC');
const urlOf = (file) => SITE + '/' + nfc(file).split('/').map(encodeURIComponent).join('/');

function metaContent(html, attr, name) {
  const re = new RegExp('<meta[^>]+' + attr + '\\s*=\\s*["\']' + name.replace(':', '\\:') + '["\'][^>]*>', 'i');
  const m = html.match(re);
  if (!m) return null;
  const c = m[0].match(/content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i);
  const v = c && (c[1] || c[2]);
  return v && v.trim() ? decode(v.trim()) : null;
}

function bodyText(html) {
  const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, html])[1];
  return decode(body
    .replace(/<(script|style|noscript|svg|nav|header)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function injectHead(html, block) {
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + block);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + '\n<head>' + block + '</head>');
  return '<head>' + block + '</head>\n' + html;
}

// 파일별 마지막 수정일 (git 기록 기준, 한 번에 읽기)
const lastmod = {};
try {
  const log = execSync('git -c core.quotepath=off log --format=%x00%cI --name-only', { maxBuffer: 256 * 1024 * 1024 }).toString('utf8');
  let date = null;
  for (const line of log.split('\n')) {
    if (line.startsWith('\0')) { date = line.slice(1); continue; }
    const f = nfc(line.trim());
    if (f && date && !lastmod[f]) lastmod[f] = date;
  }
} catch (e) { /* git 기록이 없으면 날짜 없이 진행 */ }
const today = new Date().toISOString();

// ---------- 공개 자료 목록 모으기 ----------
const publicDocs = [];
const seen = new Set();
for (const [key, items] of Object.entries(manifest)) {
  if (isPrivateKey(key)) continue;
  for (const it of items) {
    const file = it.file || '';
    if (/^https?:\/\//i.test(file) || !/\.html?$/i.test(file)) continue;
    const f = nfc(file);
    if (seen.has(f) || !fs.existsSync(file)) continue;
    // 작성자가 일부러 검색 제외(noindex)해 둔 페이지는 목록에서 뺌
    if (/<meta[^>]+name\s*=\s*["']robots["'][^>]*noindex/i.test(fs.readFileSync(file, 'utf8'))) continue;
    seen.add(f);
    publicDocs.push({ file, title: it.title, date: lastmod[f] || today });
  }
}

// ---------- 각 자료 페이지 다듬기 ----------
let touched = 0;
for (const doc of publicDocs) {
  let html = fs.readFileSync(doc.file, 'utf8');
  const tags = [];

  if (!/<link[^>]+rel\s*=\s*["']canonical["']/i.test(html)) {
    tags.push('<link rel="canonical" href="' + urlOf(doc.file) + '">');
  }
  if (!metaContent(html, 'name', 'description')) {
    let desc = metaContent(html, 'property', 'og:description');
    if (!desc) desc = bodyText(html).slice(0, 150);
    if (desc) tags.push('<meta name="description" content="' + esc(desc) + '">');
  }
  if (tags.length) html = injectHead(html, '\n<!-- 검색 최적화 (배포 시 자동 추가) -->\n' + tags.join('\n') + '\n');

  // 제목에 교회 이름이 없으면 " | 은혜교회 자료실" 을 붙여 검색 결과에서 출처가 드러나게
  const tm = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (tm) {
    if (!tm[1].includes(CHURCH)) html = html.replace(tm[0], tm[0].replace('</title>', ' | ' + SITE_NAME + '</title>'));
  } else {
    html = injectHead(html, '\n<title>' + esc(doc.title) + ' | ' + SITE_NAME + '</title>\n');
  }

  fs.writeFileSync(doc.file, html);
  touched++;
}

// ---------- 담임목사자료실: 검색 금지 ----------
let hidden = 0;
for (const name of fs.readdirSync('content')) {
  if (!nfc(name).startsWith('admin-')) continue;
  (function walk(dir) {
    for (const n of fs.readdirSync(dir)) {
      const full = path.join(dir, n);
      if (fs.statSync(full).isDirectory()) { walk(full); continue; }
      if (!/\.html?$/i.test(n)) continue;
      const html = fs.readFileSync(full, 'utf8');
      if (/<meta[^>]+name\s*=\s*["']robots["'][^>]*noindex/i.test(html)) continue;
      fs.writeFileSync(full, injectHead(html, '\n<meta name="robots" content="noindex, nofollow">\n'));
      hidden++;
    }
  })(path.join('content', name));
}

// ---------- 첫 화면: 목록 미리 써 넣기 + 검색용 정보 ----------
// 자료실은 2026-10부터 첫 화면이 아니라 archive.html 하위 페이지입니다.
const ARCHIVE = 'archive.html';
let index = fs.readFileSync(ARCHIVE, 'utf8');
let prerendered = 0;
for (const [key, items] of Object.entries(manifest)) {
  if (isPrivateKey(key) || !items || !items.length) continue;
  const id = 'list-' + key;
  const re = new RegExp('(<ul class="doclist" id="' + id.replace(/[-]/g, '\\-') + '">)[\\s\\S]*?(</ul>)');
  if (!re.test(index)) continue;
  const lis = items.map((it) => {
    const isExternal = /^https?:\/\//i.test(it.file || '');
    const isHtml = /\.html?$/i.test(it.file || '');
    const openAttrs = isExternal ? ' target="_blank" rel="noopener"' : '';
    const downloadAttr = (it.file && !isHtml && !isExternal) ? ' download' : '';
    const isOwn = key === 'faith_philosophy' && /^[12]\./.test(it.title || '');
    return '<li class="' + (isOwn ? 'doclist__own' : '') + '"><a href="' + esc(it.file || '#') + '"' + openAttrs + downloadAttr + '>' +
      '<span class="tag">' + esc(it.tag || '') + '</span>' +
      '<span class="title">' + esc(it.title || '') + '</span>' +
      '<span class="meta">' + esc(it.meta || '') + '</span></a></li>';
  }).join('');
  index = index.replace(re, (m, a, b) => a + lis + b);
  index = index.replace('<span class="count" id="count-' + key + '"></span>', '<span class="count" id="count-' + key + '">(' + items.length + '건)</span>');
  prerendered++;
}

const homeDesc = config.description ||
  '기독교한국침례회 은혜교회 자료실 — 로마서·에베소서·사사기·요한계시록 강해, 책별·인물별 성경공부, 신앙 Q&A, 새가족·침례 교육, 목장·직분자 교육, 침례교회사, 예배학 자료를 누구나 무료로 읽을 수 있습니다.';
const keywords = config.keywords ||
  '은혜교회, 은혜교회 자료실, 기독교한국침례회, 침례교회, 성경공부, 성경공부 자료, 로마서 강해, 에베소서 강해, 사사기 강해, 요한계시록 강해, 새가족 양육, 침례 교육, 목장, 목자 훈련, 직분자 교육, 침례교회사, 예배학, 큐티, 묵상';

const ld = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Church',
      '@id': SITE + '/#church',
      name: '기독교한국침례회 ' + CHURCH,
      alternateName: [CHURCH, SITE_NAME],
      url: SITE + '/',
      logo: SITE + '/assets/favicon.png',
      image: SITE + '/assets/og-image.jpeg',
      sameAs: ['https://www.youtube.com/@sjgrace'].concat(config.sameAs || []),
    },
    {
      '@type': 'WebSite',
      '@id': SITE + '/#website',
      name: SITE_NAME,
      url: SITE + '/' + ARCHIVE,
      inLanguage: 'ko',
      publisher: { '@id': SITE + '/#church' },
    },
  ],
};
if (config.address) ld['@graph'][0].address = Object.assign({ '@type': 'PostalAddress', addressCountry: 'KR' }, config.address);

const verify = [];
if (config.naverVerification) verify.push('<meta name="naver-site-verification" content="' + esc(config.naverVerification) + '">');
if (config.googleVerification) verify.push('<meta name="google-site-verification" content="' + esc(config.googleVerification) + '">');

const homeTags = [
  '<link rel="canonical" href="' + SITE + '/' + ARCHIVE + '">',
  '<meta name="keywords" content="' + esc(keywords) + '">',
  '<meta name="robots" content="index, follow">',
  '<meta property="og:site_name" content="' + esc(SITE_NAME) + '">',
  '<meta property="og:locale" content="ko_KR">',
  '<link rel="alternate" type="application/rss+xml" title="' + esc(SITE_NAME) + ' 새 자료" href="' + SITE + '/rss.xml">',
  '<link rel="sitemap" type="application/xml" href="' + SITE + '/sitemap.xml">',
  '<script type="application/ld+json">' + JSON.stringify(ld) + '</script>',
];
index = index.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(homeDesc) + '">');
if (config.homeTitle) index = index.replace(/<title>[^<]*<\/title>/, '<title>' + esc(config.homeTitle) + '</title>');
index = injectHead(index, '\n<!-- 검색 최적화 (배포 시 자동 추가) -->\n' + homeTags.join('\n') + '\n');
fs.writeFileSync(ARCHIVE, index);

// ---------- 첫 화면(교회 홈페이지): 검색 사이트 소유 확인 코드 + 사이트 정보 ----------
// 교회 정보(Church)는 index.html 안에 직접 들어 있어서, 여기서는 WebSite 정보만 덧붙임
let home = fs.readFileSync('index.html', 'utf8');
const siteLd = { '@context': 'https://schema.org', '@type': 'WebSite', '@id': SITE + '/#home', name: CHURCH, url: SITE + '/', inLanguage: 'ko', publisher: { '@id': SITE + '/#church' } };
const homePageTags = [
  '<link rel="canonical" href="' + SITE + '/">',
  '<meta name="robots" content="index, follow">',
  '<meta property="og:site_name" content="' + esc(CHURCH) + '">',
  '<meta property="og:locale" content="ko_KR">',
  '<link rel="alternate" type="application/rss+xml" title="' + esc(SITE_NAME) + ' 새 자료" href="' + SITE + '/rss.xml">',
  ...verify,
  '<script type="application/ld+json">' + JSON.stringify(siteLd) + '</script>',
];
home = injectHead(home, '\n<!-- 검색 최적화 (배포 시 자동 추가) -->\n' + homePageTags.join('\n') + '\n');
fs.writeFileSync('index.html', home);

// ---------- sitemap.xml ----------
const archiveDate = publicDocs.reduce((a, d) => (d.date > a ? d.date : a), lastmod[ARCHIVE] || '');
const urls = [
  { loc: SITE + '/', date: lastmod['index.html'] || today, pr: '1.0', freq: 'weekly' },
  { loc: SITE + '/' + ARCHIVE, date: archiveDate || today, pr: '0.9', freq: 'daily' },
]
  .concat(publicDocs.map((d) => ({ loc: urlOf(d.file), date: d.date, pr: '0.7', freq: 'monthly' })));
fs.writeFileSync('sitemap.xml',
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) => '  <url><loc>' + esc(u.loc) + '</loc><lastmod>' + u.date + '</lastmod><changefreq>' + u.freq + '</changefreq><priority>' + u.pr + '</priority></url>').join('\n') +
  '\n</urlset>\n');

// ---------- rss.xml (최근 자료 50개) ----------
const rfc = (iso) => new Date(iso).toUTCString();
const recent = publicDocs.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 50);
const rssItems = recent.map((d) => {
  let desc = '';
  try { const h = fs.readFileSync(d.file, 'utf8'); desc = metaContent(h, 'name', 'description') || ''; } catch (e) {}
  return '  <item>\n    <title>' + esc(d.title) + '</title>\n    <link>' + esc(urlOf(d.file)) + '</link>\n    <guid isPermaLink="true">' + esc(urlOf(d.file)) + '</guid>\n    <description>' + esc(desc) + '</description>\n    <pubDate>' + rfc(d.date) + '</pubDate>\n  </item>';
}).join('\n');
fs.writeFileSync('rss.xml',
  '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n  <title>' + esc(SITE_NAME) + '</title>\n  <link>' + SITE + '/' + ARCHIVE + '</link>\n  <description>' + esc(homeDesc) + '</description>\n  <language>ko</language>\n  <lastBuildDate>' + rfc(today) + '</lastBuildDate>\n' + rssItems + '\n</channel>\n</rss>\n');

// ---------- robots.txt ----------
const robots = [
  'User-agent: *',
  'Allow: /',
  'Disallow: /admin/',
  'Disallow: /github/',
  'Disallow: /content/admin-',
  'Disallow: /content/bulletin/',
  'Disallow: /content/mokjang-sharing/',
  '',
  'Sitemap: ' + SITE + '/sitemap.xml',
];
if (config.daumRobots) robots.push('', config.daumRobots.trim());
fs.writeFileSync('robots.txt', robots.join('\n') + '\n');

console.log('검색 최적화 완료 — 공개 자료 ' + touched + '쪽, 자료실 목록 ' + prerendered + '칸 미리 채움, 비공개 noindex ' + hidden + '쪽, sitemap ' + urls.length + '개 주소');
