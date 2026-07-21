// 콘텐츠 폴더(content/*)에 있는 실제 파일들을 그대로 읽어서
// data/manifest.json 으로 만들어주는 스크립트입니다.
// 폴더에 파일을 넣기만 하면 자동으로 자료실 목록에 나타나요.
// Netlify가 아니라 GitHub Actions가 배포할 때마다 자동으로 실행합니다.

const fs = require('fs');
const path = require('path');

const categories = [
  { key: 'faith_philosophy', dir: 'content/faith-philosophy' },
  { key: 'bible_by_book-old', dir: 'content/bible-by-book/old-testament' },
  { key: 'bible_by_book-new', dir: 'content/bible-by-book/new-testament' },
  { key: 'newcomers', dir: 'content/newcomers' },
  { key: 'baptism_training', dir: 'content/baptism-training' },
  { key: 'mokjang', dir: 'content/mokjang' },
  { key: 'bulletin', dir: 'content/bulletin' },
  { key: 'mokjang_sharing', dir: 'content/mokjang-sharing' },
  { key: 'baptist_history', dir: 'content/baptist-history' },
  { key: 'admin_forms', dir: 'content/admin-forms' },
  { key: 'officer_training', dir: 'content/servant-leaders' },
];

function listDocs(dir) {
  const full = path.join(__dirname, dir);
  let files = [];
  try {
    files = fs.readdirSync(full).filter((f) => {
      if (f.startsWith('.')) return false;
      if (f.toLowerCase().startsWith('example')) return false;
      const stat = fs.statSync(path.join(full, f));
      return stat.isFile();
    });
  } catch (e) {
    files = [];
  }
  return files
    .map((f) => {
      const ext = path.extname(f).replace('.', '').toUpperCase();
      const name = path.basename(f, path.extname(f));
      let file = dir + '/' + f;
      let tag = ext;
      if (ext === 'TXT' || ext === 'MD') {
        try {
          const content = fs.readFileSync(path.join(full, f), 'utf8').trim();
          if (/^https?:\/\//i.test(content)) {
            file = content;
            tag = /youtube\.com|youtu\.be/i.test(content) ? '유튜브' : '링크';
          }
        } catch (e) {
          // 파일을 못 읽으면 그냥 파일 자체를 링크로 둠
        }
      }
      return { title: name, tag, meta: '', file };
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'ko'));
}

const manifest = {};
categories.forEach(({ key, dir }) => {
  manifest[key] = listDocs(dir);
});

fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
fs.writeFileSync(
  path.join(__dirname, 'data', 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log('manifest.json 생성 완료:', manifest);
