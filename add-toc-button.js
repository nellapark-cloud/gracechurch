// 모든 콘텐츠 페이지에 공통 "목차" 버튼 스크립트(/assets/back-home.js)를 넣어 주는 스크립트입니다.
// 배포할 때마다 GitHub Actions가 자동으로 실행해요.
// 이미 들어 있는 페이지는 그대로 두고, 빠진 페이지에만 한 줄 넣습니다.
// 저장소의 원본 파일은 바꾸지 않고, 배포되는 사본에만 적용돼요.
// 행정 서식·회의록(content/admin-*)은 문서가 아니라 서식이라 넣지 않습니다.

const fs = require('fs');
const path = require('path');

const TAG = '<script src="/assets/back-home.js"></script>';

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (dir === 'content' && name.normalize('NFC').startsWith('admin-')) continue;
      walk(full, out);
    } else if (/\.html?$/i.test(name)) out.push(full);
  }
  return out;
}

let changed = 0;
for (const file of walk('content', [])) {
  let html;
  try { html = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
  if (html.includes('/assets/back-home.js')) continue;
  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, TAG + '\n</body>');
  else html += '\n' + TAG + '\n';
  fs.writeFileSync(file, html);
  changed++;
}
console.log('목차 버튼 스크립트 추가: ' + changed + '개 페이지');
