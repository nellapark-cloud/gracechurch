#!/bin/bash
# 사용법: tools/bible-detailed/pub.sh <책폴더> <장번호>
#   예)  tools/bible-detailed/pub.sh romans 11
# data/<책>/ch<N>.py → book.json의 out_dir/<N>장.html 생성 → 390px 모바일 점검 → 커밋 → 푸시
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
R="$(cd "$HERE/../.." && pwd)"
BOOK=$1; N=$2
SRC="$HERE/data/$BOOK/ch$N.py"
OUT_DIR=$(python3 -c "import json;print(json.load(open('$HERE/data/$BOOK/book.json',encoding='utf-8'))['out_dir'])")
NAME=$(python3 -c "import json;print(json.load(open('$HERE/data/$BOOK/book.json',encoding='utf-8'))['name'])")
D="$R/$OUT_DIR"; mkdir -p "$D"
if grep -q "세례" "$SRC"; then echo "⚠ '세례' 표기가 있습니다 (비교 문맥이 아니면 '침례'로):"; grep -n -o ".\{20\}세례.\{20\}" "$SRC"; fi
python3 "$HERE/render.py" "$SRC" "$D/${N}장.html"
python3 - "$D/${N}장.html" <<'PY'
import sys, playwright.sync_api as p
f=sys.argv[1]
with p.sync_playwright() as pw:
  b=pw.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); e=[]
  pg.on('pageerror',lambda x:e.append(str(x)))
  pg.goto('file://'+f); pg.wait_for_timeout(900)
  w=pg.evaluate('document.documentElement.scrollWidth')
  n=pg.evaluate("document.querySelectorAll('.insight-btn').length")
  ok=True
  for i in range(n):
    pg.evaluate(f"document.querySelectorAll('.insight-btn')[{i}].click()")
    if not pg.locator('#modalTitle').inner_text(): ok=False
    pg.evaluate("document.getElementById('modalOverlay').classList.remove('open')")
  print('errors',e,'width',w,'insights',n,'ok',ok)
  assert not e and w<=390 and ok
  b.close()
PY
cd "$R"
git add "$D" "$HERE/data/$BOOK"
git -c user.name="nellapark-cloud" -c user.email="nellapark@gmail.com" commit -q -m "${NAME} 세부 강해 ${N}장 추가"
git fetch -q origin main && git rebase -q origin/main && git push -q origin HEAD:main
git log --oneline -1
