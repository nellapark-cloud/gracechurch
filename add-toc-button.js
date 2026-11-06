// 모든 콘텐츠 페이지에 공통 "목차" 버튼 스크립트(/assets/back-home.js)를 넣어 주는 스크립트입니다.
// 배포할 때마다 GitHub Actions가 자동으로 실행해요.
// 이미 들어 있는 페이지는 그대로 두고, 빠진 페이지에만 한 줄 넣습니다.
// 저장소의 원본 파일은 바꾸지 않고, 배포되는 사본에만 적용돼요.
// 행정 서식·회의록(content/admin-*)은 문서가 아니라 서식이라 넣지 않습니다.

const fs = require('fs');
const path = require('path');

const TAG = '<script src="/assets/back-home.js"></script>';
// 뒤로가기 했을 때 눌렀던 자리로 돌아오게 하는 스크립트
const RS_TAG = '<script src="/assets/return-scroll.js"></script>';

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
  let add = '';
  if (!html.includes('/assets/back-home.js')) add += TAG + '\n';
  if (!html.includes('/assets/return-scroll.js')) add += RS_TAG + '\n';
  if (!add) continue;
  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, add + '</body>');
  else html += '\n' + add;
  fs.writeFileSync(file, html);
  changed++;
}
console.log('목차 버튼 스크립트 추가: ' + changed + '개 페이지');
