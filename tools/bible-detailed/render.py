"""성경 세부 강해 HTML 생성기.
data/<책>/chN.py 의 DATA 딕셔너리와 같은 폴더의 book.json 설정을 읽어 HTML을 만든다.
인라인 문법: [[단어|분류|풀이]]  분류 = theo / greek / person / sin
"""
import html, re, sys, importlib.util, os

HERE = os.path.dirname(os.path.abspath(__file__))
CSS = open(os.path.join(HERE, 'style.css'), encoding='utf-8').read()
JS = open(os.path.join(HERE, 'script.js'), encoding='utf-8').read()
B = {}  # book.json 설정 (main에서 채움)

MARK = re.compile(r'\[\[([^|\]]+)\|(theo|greek|person|sin)(?:\|([^\]]*))?\]\]')

def mk(s):
    def rep(m):
        w, c, t = m.group(1), m.group(2), m.group(3)
        tip = f' data-tip="{html.escape(t, quote=True)}"' if t else ''
        return f'<mark class="hl-{c}"{tip}>{w}</mark>'
    return MARK.sub(rep, s)

def paras(ps):
    return ''.join(f'<p>{mk(p)}</p>' for p in ps)

def verse(v):
    key = ' key' if v.get('key') else ''
    out = [f'<article class="vc{key}" id="v{v["n"]}">',
           f'<div class="vh"><span class="vn">{v["n"]}</span><span class="vtitle">{v["title"]}</span></div>',
           f'<p class="vt">{mk(v["text"])}</p>']
    if v.get('lit'):
        out.append(f'<p class="lit"><b>직역</b> {v["lit"]}</p>')
    out.append(f'<div class="gloss">{paras(v["gloss"])}</div>')
    if v.get('notes'):
        lis = ''.join(f'<li>{mk(n)}</li>' for n in v['notes'])
        out.append(f'<details class="nt"><summary>원어 · 번역 노트</summary><div class="nb"><ul>{lis}</ul></div></details>')
    if v.get('xrefs'):
        lis = []
        for x in v['xrefs']:
            ref, text = x[0], x[1]
            ot = ' ot' if (len(x) > 2 and x[2]) else ''
            lis.append(f'<li><span class="ref{ot}">{ref}</span>{text}</li>')
        out.append(f'<details class="nt xref"><summary>함께 읽을 말씀</summary><div class="nb"><ul>{"".join(lis)}</ul></div></details>')
    if v.get('insight'):
        k, label = v['insight']
        out.append(f'<button class="insight-btn" data-insight="{k}">{label}</button>')
    out.append('</article>')
    return '\n'.join(out)

def table(t):
    head = ''.join(f'<th>{h}</th>' for h in t['head'])
    rows = ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>' for r in t['rows'])
    return f'<div class="tbl-wrap"><table class="tbl"><tr>{head}</tr>{rows}</table></div>'

def message(m):
    return (f'<div class="message-box"><div class="mlabel">TODAY\'S MESSAGE · 오늘의 메시지</div>'
            f'<h4>{m[0]}</h4>{paras(m[1])}</div>')

def pericope(i, p):
    out = [f'<div class="wrap pericope" id="p{i}">',
           f'<div class="pericope-head"><span class="range">{p["range"]}</span><span class="name">{p["name"]}</span></div>',
           f'<div class="pericope-intro">{paras(p["intro"])}</div>']
    for v in p['verses']:
        out.append(verse(v))
        if v.get('after_table'):
            out.append(table(v['after_table']))
    if p.get('table'):
        out.append(table(p['table']))
    if p.get('message'):
        out.append(message(p['message']))
    out.append('</div>')
    return '\n'.join(out)

def render(D):
    n = D['ch']
    title = D['title']
    nav = ['<a href="#intro">들어가며</a>']
    for i, p in enumerate(D['pericopes'], 1):
        nav.append(f'<a href="#p{i}">{p["nav"]}</a>')
    for s in D.get('sections', []):
        nav.append(f'<a href="#{s["id"]}">{s["nav"]}</a>')
    if D.get('glossary'):
        nav.append('<a href="#words">단어 사전</a>')
    nav.append('<button class="tog" id="toggleAll" type="button">노트 모두 펼치기</button>')

    cards = ''.join(f'<div class="icard"><span class="k">{k}</span><h4>{h}</h4><p>{mk(p)}</p></div>' for k, h, p in D.get('cards', []))
    intro = (f'<div class="wrap" id="intro"><span class="section-label">Introduction · 들어가며</span>'
             f'<h2 class="title">{n}장 들어가며</h2><div class="sub">{D["intro_sub"]}</div>'
             f'<div class="prose">{paras(D["intro"])}</div>'
             + (f'<div class="grid2">{cards}</div>' if cards else '')
             + (table(D['intro_table']) if D.get('intro_table') else '')
             + '</div>')

    guide = ''
    if D.get('trans'):
        rows = {'head': ['번역상 짚어 둘 곳', '무엇을 알아야 하나'], 'rows': D['trans']}
        guide = (f'<div class="wrap" id="guide" style="padding-top:0;"><span class="section-label">Reading Guide · 읽기 안내</span>'
                 f'<h2 class="title">이 장을 읽기 전에</h2><div class="sub">본문은 저작권이 만료된 『개역한글』입니다. 『개역개정』과 다른 표현은 노트에서 짚었습니다. 노트는 눌러서 펼치거나 위 메뉴의 "노트 모두 펼치기"로 한 번에 열 수 있습니다.</div>'
                 + table(rows) + '</div>')

    legend = ('<div class="wrap" id="legend" style="padding-top:0;"><div class="legend-box">'
              '<div class="lt">본문 하이라이트 — 버튼을 누르면 그 범주만 강조됩니다. 밑줄 친 단어를 누르면(데스크톱은 마우스를 올리면) 짧은 뜻이 뜹니다.</div>'
              '<div class="legend-row">'
              '<button class="legend-btn" data-cat="theo"><span class="legend-dot" style="background:var(--hl-theo)"></span>신학 핵심 개념</button>'
              '<button class="legend-btn" data-cat="greek"><span class="legend-dot" style="background:var(--hl-greek)"></span>원어·번역 주의</button>'
              '<button class="legend-btn" data-cat="person"><span class="legend-dot" style="background:var(--hl-person)"></span>인물 · 비유 요소</button>'
              '<button class="legend-btn" data-cat="sin"><span class="legend-dot" style="background:var(--hl-sin)"></span>죄의 작용</button>'
              '<button class="legend-reset" id="resetFilter">전체 보기</button></div></div></div>')

    peris = '\n'.join(pericope(i, p) for i, p in enumerate(D['pericopes'], 1))

    secs = []
    for s in D.get('sections', []):
        btn = f'<button class="insight-btn" data-insight="{s["insight"][0]}">{s["insight"][1]}</button>' if s.get('insight') else ''
        body = s.get('html', '')
        secs.append(f'<div class="wrap" id="{s["id"]}"><span class="section-label">{s["label"]}</span>'
                    f'<h2 class="title">{s["title"]}</h2><div class="sub">{s["sub"]}</div>{body}{btn}</div>')

    gl = ''
    if D.get('glossary'):
        items = ''.join(f'<div class="gi"><span class="w">{w}</span><span class="h">{h}</span><p>{p}</p></div>' for w, h, p in D['glossary'])
        gl = (f'<div class="wrap" id="words" style="padding-top:0;"><span class="section-label">Glossary · 단어 사전</span>'
              f'<h2 class="title">{n}장 어려운 단어 사전</h2><div class="sub">옛 한자어와 원어를 오늘의 말로 풀었습니다</div><div class="gl">{items}</div></div>')

    qs = ''
    if D.get('questions'):
        lis = ''.join(f'<li>{q}</li>' for q in D['questions'])
        qs = (f'<div class="wrap" id="share" style="padding-top:0;"><span class="section-label">For Reflection · 묵상과 나눔</span>'
              f'<h2 class="title">묵상과 나눔을 위한 질문</h2><ol class="qlist">{lis}</ol></div>')

    prev_l = f'<a class="cp prev" href="{n-1}장.html"><small>이전 장</small>{n-1}장</a>' if n > 1 else '<span class="cp"></span>'
    next_l = f'<a class="cp next" href="{n+1}장.html"><small>다음 장</small>{n+1}장</a>' if n < B['last'] else '<span class="cp"></span>'
    mid = (f'<a class="cp mid" href="{B["overview_href"]}"><small>전체 흐름</small>{B["overview_label"]}</a>'
           if B.get('overview_href') else '<span class="cp mid"></span>')
    chnav = f'<nav class="chnav">{prev_l}{mid}{next_l}</nav>'

    insights = {k: {'title': t, 'body': b} for k, (t, b) in D.get('insights', {}).items()}
    import json
    ins_js = 'const INSIGHTS = ' + json.dumps(insights, ensure_ascii=False) + ';\n'

    desc = f'{title} · {B['name']} {n}장 절별 세부 강해 · 기독교한국침례회 은혜교회'
    tv, tref = D['theme_verse']
    return f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{B['name']} 세부 강해 | {n}장 — {title.replace("<br>", " ")}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="은혜교회 — 말씀 코이노니아">
<meta property="og:title" content="말씀 코이노니아 — {B['name']} 세부 강해 {n}장">
<meta property="og:description" content="{html.escape(desc.replace("<br>", " "))}">
<meta property="og:image" content="{B['og']}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="{B['base']}{n}장.html">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="말씀 코이노니아 — {B['name']} 세부 강해 {n}장">
<meta name="twitter:description" content="{html.escape(desc.replace("<br>", " "))}">
<meta name="twitter:image" content="{B['og']}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;500;600;700;900&family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">
<style>
{CSS}
</style>
</head>
<body>

<header class="cover">
  <div class="cover-in">
    <div class="kicker">{B['name']} 세부 강해 · {B['en']}</div>
    <div class="ch-num">{n}</div>
    <h1>{title}</h1>
    <p class="deck">{D["deck"]}</p>
    <blockquote class="epigraph">{tv}<cite>{B['en'].upper()} {tref}</cite></blockquote>
    <div class="byline">기독교한국침례회 은혜교회 · 담임목사 박동준</div>
  </div>
</header>

<nav class="stickynav">{"".join(nav)}</nav>

{intro}
{guide}
{legend}
{peris}
{"".join(secs)}
{gl}
{qs}
<div class="wrap" style="padding-top:0; padding-bottom:0;">{chnav}</div>

<footer>
  <div class="fline">{B['name']} 세부 강해 · {n}장 · 본문 『개역한글』 · 원문 직역과 번역 노트는 {B.get('orig', '헬라어')} 원문을 바탕으로 풀이함</div>
  <div class="fline">기독교한국침례회 은혜교회 · 담임목사 박동준</div>
</footer>

<button class="toTop" id="toTop" aria-label="맨 위로">↑</button>
<div class="tip-bubble" id="tipBubble"></div>
<div class="modal-overlay" id="modalOverlay" role="dialog" aria-modal="true">
  <div class="modal-box">
    <div class="mtag">더 깊이</div>
    <h3 id="modalTitle"></h3>
    <div class="mbody" id="modalBody"></div>
    <button class="modal-close" id="modalClose">닫기</button>
  </div>
</div>
<script>
{ins_js}{JS}
</script>
</body>
</html>
'''

if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    import json
    B.update(json.load(open(os.path.join(os.path.dirname(os.path.abspath(src)), 'book.json'), encoding='utf-8')))
    spec = importlib.util.spec_from_file_location('chdata', src)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    D = m.DATA
    out = render(D)
    nv = sum(len(p['verses']) for p in D['pericopes'])
    nums = [v['n'] for p in D['pericopes'] for v in p['verses']]
    assert nums == list(range(1, nv + 1)), f'verse numbering problem: {nums}'
    leftover = re.findall(r'\[\[|\]\]', out)
    assert not leftover, 'unparsed mark syntax'
    open(dst, 'w', encoding='utf-8').write(out)
    print(f'{os.path.basename(dst)}: {nv} verses, {len(out)//1024} KB')
