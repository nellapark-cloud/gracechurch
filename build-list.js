// 콘텐츠 폴더(content/*)에 있는 실제 파일들을 그대로 읽어서
// data/manifest.json 으로 만들어주는 스크립트입니다.
// 폴더에 파일을 넣기만 하면 자동으로 자료실 목록에 나타나요.
// Netlify가 아니라 GitHub Actions가 배포할 때마다 자동으로 실행합니다.

const fs = require('fs');
const path = require('path');

const categories = [
  { key: 'bible_by_book-old', dir: 'content/bible-by-book/old-testament' },
  { key: 'bible_by_book-new', dir: 'content/bible-by-book/new-testament' },
  { key: 'newcomers', dir: 'content/newcomers' },
  { key: 'mokjang', dir: 'content/mokjang' },
  { key: 'bulletin', dir: 'content/bulletin' },
  { key: 'mokjang_sharing', dir: 'content/mokjang-sharing' },
  { key: 'admin_forms', dir: 'content/admin-forms' },
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
      return {
        title: name,
        tag: ext,
        meta: '',
        file: dir + '/' + f,
      };
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
