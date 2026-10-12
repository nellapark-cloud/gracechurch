# 성경 세부 강해 생성 도구

sejonggrace.com의 "로마서 세부 강해"(절별 상세 강해) 페이지를 만든 도구입니다.
같은 디자인·형식으로 다른 책(예: 요한계시록)의 세부 강해를 만들 때 그대로 씁니다.
사이트 목록에는 나타나지 않습니다(build-list.js는 content/ 폴더만 읽음).

## 구성
- `render.py` — `data/<책>/chN.py`의 `DATA`와 `book.json`을 읽어 HTML 한 장을 만듦
- `style.css`, `script.js` — 페이지에 그대로 들어가는 디자인과 동작(툴팁, ‘더 깊이’ 모달 등)
- `pub.sh <책> <N>` — 생성 → 390px 모바일 점검 → 커밋 → main에 푸시
- `data/romans/` — 로마서 1–16장 원본 데이터 (7장은 손으로 만든 페이지라 데이터 파일이 없음)

## 새 책 시작하기 (예: 요한계시록)
1. `data/revelation/book.json`을 만든다 (`data/romans/book.json` 참고)
   - `name` 요한계시록, `en` Revelation, `last` 22, `orig` 헬라어
   - `out_dir` content/bible-by-book/new-testament/revelation-detailed
   - `base` 위 폴더의 사이트 주소, `og` 1200×630 미리보기 이미지 주소
   - `overview_href`/`overview_label` — 전체 흐름 페이지가 없으면 두 항목을 빼면 됨
2. `build-list.js`의 categories에 새 폴더를 추가하고, `index.html`에 목록 블록(`list-<key>`, `count-<key>`)을 추가한다 (romans_detailed 참고)
3. `data/revelation/ch1.py`부터 작성 → `tools/bible-detailed/pub.sh revelation 1`

## DATA 형식 (data/romans/ch10.py, ch11.py가 가장 좋은 예시)
- `ch, title, deck, theme_verse(본문, 장절), intro_sub, intro[]`
- `cards[(라벨, 제목, 설명)]`, `trans[(구절 표현, 설명)]` — 번역 노트
- `pericopes[]` — 단락: `nav, range, name, intro[], verses[], message(제목, [문단])`
  - verse: `n, title, key(핵심절), text, lit(원문 직역), gloss[], notes[], xrefs[(장절, 본문, 구약이면 True)], insight(키, 버튼 문구)`
  - `text` 안의 강조: `[[단어|분류|풀이]]` — 분류는 theo / greek / person / sin
- `sections[]` — 표 등 특별 섹션: `id, nav, label, title, sub, html`
- `insights{키: (제목, HTML)}` — ‘더 깊이’ 모달
- `glossary[(단어, 한자·절, 풀이)]`, `questions[]`
- 절 번호는 1부터 빠짐없이 이어져야 함 (없는 절은 `text: '(없음)'`으로, 16장 24절 참고)

## 작성 원칙
- 본문은 『개역한글』. 어투는 편안하고 부드럽게, 깊이는 로마서 10–16장 수준
- ‘세례’ 대신 ‘침례’ (세례와 침례를 비교하는 문맥만 예외) — pub.sh가 자동 경고
- 옛 화폐·단위는 오늘날 가치(원화 등)를 함께 적음
- 커밋 작성자: nellapark-cloud / nellapark@gmail.com
