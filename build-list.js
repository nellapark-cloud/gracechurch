// 콘텐츠 폴더(content/*)에 있는 실제 파일들을 그대로 읽어서
// data/manifest.json 으로 만들어주는 스크립트입니다.
// 폴더에 파일을 넣기만 하면 자동으로 자료실 목록에 나타나요.
// Netlify가 아니라 GitHub Actions가 배포할 때마다 자동으로 실행합니다.

const fs = require('fs');
const path = require('path');

const categories = [
  { key: 'faith_philosophy', dir: 'content/faith-philosophy' },
  { key: 'history_philosophy', dir: 'content/history-philosophy' },
  { key: 'common_questions', dir: 'content/common-questions' },
  { key: 'meeting_blessing', dir: 'content/meeting-blessing' },
  { key: 'bible_by_book-old', dir: 'content/bible-by-book/old-testament' },
  { key: 'bible_by_book-new', dir: 'content/bible-by-book/new-testament' },
  { key: 'romans_chapters', dir: 'content/bible-by-book/new-testament/romans-chapters' },
  { key: 'ephesians_chapters', dir: 'content/bible-by-book/new-testament/ephesians-chapters' },
  { key: 'bible_by_person', dir: 'content/bible-by-book/bible-by-person' },
  { key: 'bible_qt', dir: 'content/bible-by-book/qt' },
  { key: 'newcomers', dir: 'content/newcomers', pin: ['함께 걷는 믿음의 첫걸음'] },
  { key: 'baptism_training', dir: 'content/baptism-training' },
  { key: 'mokjang', dir: 'content/mokjang' },
  { key: 'bulletin', dir: 'content/bulletin' },
  { key: 'mokjang_sharing', dir: 'content/mokjang-sharing' },
  { key: 'baptist_history', dir: 'content/baptist-history' },
  { key: 'admin_sermons', dir: 'content/admin-sermons' },
  { key: 'admin_personal', dir: 'content/admin-personal' },
  { key: 'admin_forms', dir: 'content/admin-forms' },
  { key: 'admin_minutes', dir: 'content/admin-minutes' },
  { key: 'officer_training', dir: 'content/servant-leaders' },
  { key: 'bible_study', dir: 'content/bible-study' },
  { key: 'bible_study_meditation', dir: 'content/bible-study/극동방송 칼럼' },
];

function langPriority(rawName) {
  const name = rawName.normalize('NFC');
  // 한국어 -> 영어 -> 스페인어 -> 일본어 -> 중국어 순서로 정렬하기 위한 우선순위
  if (/[\uac00-\ud7a3]/.test(name)) return 0;                                    // 한국어
  if (/[ñÑ¿¡áéíóúÁÉÍÓÚü]/.test(name)) return 2;                                 // 스페인어(특수문자)
  if (/\b(del|bendici[oó]n|encuentro)\b/i.test(name)) return 2;                  // 스페인어(단어)
  if (/[\u3040-\u30ff]/.test(name)) return 3;                                    // 일본어
  if (/[\u4e00-\u9fff]/.test(name)) return 4;                                    // 중국어
  if (/[A-Za-z]/.test(name)) return 1;                                           // 영어
  return 5;
}

function naturalCompare(a, b) {
  // 제목 맨 앞의 숫자를 기준으로 정렬 (1, 2, 3 ... 10, 11, 12 순서가 되도록)
  const numA = parseInt(a.match(/^\d+/), 10);
  const numB = parseInt(b.match(/^\d+/), 10);
  if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
  return a.localeCompare(b, 'ko');
}

function listDocs(dir, withFlags, pin) {
  const full = path.join(__dirname, dir);
  let files = [];
  try {
    files = fs.readdirSync(full).filter((f) => {
      if (f.startsWith('.')) return false;
      if (f.toLowerCase().startsWith('example')) return false;
      if (/^readme(\.[a-z0-9]+)?$/i.test(f)) return false; // README 파일은 항상 목록에서 제외
      const stat = fs.statSync(path.join(full, f));
      return stat.isFile();
    });
  } catch (e) {
    files = [];
  }
  const items = files.map((f) => {
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
    return {
      title: name,
      tag,
      meta: '',
      file,
      _priority: withFlags ? langPriority(name) : null,
    };
  });

  if (withFlags) {
    items.sort((a, b) => a._priority - b._priority);
  } else {
    items.sort((a, b) => naturalCompare(a.title, b.title));
  }
  items.forEach((it) => { delete it._priority; });

  if (pin && pin.length) {
    // 지정한 제목의 자료를 목록 맨 앞으로 고정 노출 (macOS는 파일명을 NFD로
    // 저장하므로 비교 전에 NFC로 정규화)
    const normalizedPin = pin.map((p) => p.normalize('NFC'));
    items.sort((a, b) => {
      const pa = normalizedPin.indexOf(a.title.normalize('NFC'));
      const pb = normalizedPin.indexOf(b.title.normalize('NFC'));
      if (pa === -1 && pb === -1) return 0;
      if (pa === -1) return 1;
      if (pb === -1) return -1;
      return pa - pb;
    });
  }

  return items;
}

const manifest = {};
categories.forEach(({ key, dir, pin }) => {
  manifest[key] = listDocs(dir, key === 'meeting_blessing', pin);
});

fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
fs.writeFileSync(
  path.join(__dirname, 'data', 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log('manifest.json 생성 완료:', manifest);
