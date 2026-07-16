// 콘텐츠 폴더(content/*)의 마크다운 파일들을 읽어서
// data/manifest.json 으로 만들어주는 스크립트입니다.
// Netlify가 배포할 때마다 자동으로 실행돼요. 별도 npm 패키지가 필요 없습니다.

const fs = require('fs');
const path = require('path');

const categories = [
  { key: 'sermons', dir: 'content/sermons' },
  { key: 'bible_study', dir: 'content/bible-study' },
  { key: 'shepherd_training', dir: 'content/shepherd-training' },
  { key: 'radio', dir: 'content/radio' },
];

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  match[1].split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    val = val.replace(/^["']|["']$/g, '');
    data[key] = val;
  });
  return data;
}

const manifest = {};

categories.forEach(({ key, dir }) => {
  const full = path.join(__dirname, dir);
  let files = [];
  try {
    files = fs.readdirSync(full).filter((f) => f.endsWith('.md'));
  } catch (e) {
    files = [];
  }
  const items = files.map((f) => {
    const raw = fs.readFileSync(path.join(full, f), 'utf8');
    const fm = parseFrontmatter(raw);
    return {
      title: fm.title || f.replace('.md', ''),
      tag: fm.tag || '',
      meta: fm.meta || '',
      date: fm.date || '',
      file: fm.file || '',
    };
  });
  items.sort((a, b) => (a.date < b.date ? 1 : -1));
  manifest[key] = items;
});

fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
fs.writeFileSync(
  path.join(__dirname, 'data', 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log('manifest.json 생성 완료:', manifest);
