// 자료실의 모든 콘텐츠 페이지에 공통으로 들어가는 "목차" 버튼입니다.
// - 페이지 안에 따로 있던 떠 있는 버튼들(처음으로, 맨 위로, 자료실로, 글씨 크기 등)은 숨기고
//   오른쪽 아래에 "목차" 버튼 하나만 남깁니다.
// - 페이지에 목차가 있으면 그 목차로 이동하고, 목차가 없으면 소제목으로 목차 창을 만들어 보여 줍니다.
// - 배포할 때 add-toc-button.js 가 이 스크립트를 모든 콘텐츠 페이지에 자동으로 넣어 줍니다.
// 버튼 모양이나 동작을 바꾸고 싶으면 이 파일 하나만 고치면 전체에 반영돼요.

(function () {
  if (window.__gcTocButton) return;
  window.__gcTocButton = true;

  var NAV_WORDS = /처음|맨\s*위|위로|자료실|목차|홈|뒤로|돌아가|이전 화면|top|home|back|contents|índice|indice|inicio|arriba|volver|目次|目录|上へ|戻る|ホーム|トップ|返回|顶部|首页|글씨|text|texto|文字|字体/i;
  var ICON_ONLY = /^[\s↑⌃⬆≡☰←⇧▲^📑📖🏠＋+−\-AaＡ가あ字]*$/;
  var CLOSE_WORDS = /닫기|close|cerrar|閉じる|关闭|✕|×/i;

  function lang() {
    var l = (document.documentElement.getAttribute('lang') || '').toLowerCase();
    if (l.indexOf('en') === 0) return ['Contents', 'Go to contents'];
    if (l.indexOf('ja') === 0) return ['目次', '目次へ'];
    if (l.indexOf('zh') === 0) return ['目录', '前往目录'];
    if (l.indexOf('es') === 0) return ['Índice', 'Ir al índice'];
    return ['목차', '목차 가기'];
  }

  function hide(el) {
    el.style.setProperty('display', 'none', 'important');
    el.setAttribute('data-gc-hidden', '');
  }

  function label(el) {
    return ((el.textContent || '') + ' ' + (el.getAttribute('title') || '') + ' ' + (el.getAttribute('aria-label') || '')).replace(/\s+/g, ' ').trim();
  }

  function isNavControl(el) {
    var t = label(el);
    if (CLOSE_WORDS.test(t)) return false;
    var text = (el.textContent || '').replace(/\s+/g, '');
    return NAV_WORDS.test(t) || (text.length <= 3 && ICON_ONLY.test(text));
  }

  // 페이지에 원래 있던 떠 있는 버튼들 숨기기
  function hideOtherButtons() {
    var all = document.body ? document.body.getElementsByTagName('*') : [];
    var fixed = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.id === 'gc-toc-btn' || el.closest('#gc-toc-btn, #gc-toc-sheet')) continue;
      if (getComputedStyle(el).position === 'fixed') fixed.push(el);
    }
    fixed.forEach(function (box) {
      if (box.hasAttribute('data-gc-hidden')) return;
      var parent = box.parentElement;
      while (parent && parent !== document.body) {
        if (getComputedStyle(parent).position === 'fixed') return; // 바깥 상자에서 처리
        parent = parent.parentElement;
      }
      var controls = box.matches('a, button, [onclick], [role="button"]')
        ? [box]
        : Array.prototype.slice.call(box.querySelectorAll('a, button, [onclick], [role="button"]'));
      if (!controls.length) return; // 버튼이 아닌 것(배경, 진행 막대 등)은 그대로
      if (CLOSE_WORDS.test(label(box))) return; // 창(모달)은 그대로
      var navs = controls.filter(isNavControl);
      if (!navs.length) return;
      // 상자 안 글자가 모두 버튼 글자라면 상자째 숨기고, 아니면 버튼만 숨김
      var boxText = (box.textContent || '').replace(/\s+/g, '');
      var ctlText = controls.map(function (c) { return (c.textContent || '').replace(/\s+/g, ''); }).join('');
      if (navs.length === controls.length && boxText.length <= ctlText.length) hide(box);
      else navs.forEach(hide);
    });
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return (r.width > 0 || r.height > 0) && getComputedStyle(el).visibility !== 'hidden';
  }

  // 페이지 안의 목차 찾기
  function findToc() {
    var sel = ['#toc', '#TOC', '#contents', '#table-of-contents', 'nav.toc', '.toc', '[id^="toc"]', '[class*="toc-list"]', '[class*="toc-wrap"]', '[class*="toc-box"]', 'nav[class*="toc"]', 'section[class*="toc"]', 'div[class*="toc"]'];
    for (var i = 0; i < sel.length; i++) {
      var list = document.querySelectorAll(sel[i]);
      for (var j = 0; j < list.length; j++) {
        var el = list[j];
        if (el.closest('#gc-toc-sheet')) continue;
        if (getComputedStyle(el).position === 'fixed') continue;
        if (!visible(el)) continue;
        if (el.querySelectorAll('a, li, button').length < 2) continue;
        return el;
      }
    }
    var heads = document.querySelectorAll('h1, h2, h3, h4, .toc-title, .section-label');
    for (var k = 0; k < heads.length; k++) {
      var t = (heads[k].textContent || '').replace(/\s+/g, '').toLowerCase();
      if (/^(목차|contents|tableofcontents|目次|目录|índice|indice)$/.test(t) && visible(heads[k])) return heads[k];
    }
    return null;
  }

  function headText(h) {
    return (h.innerText || h.textContent || '').replace(/\s+/g, ' ').trim();
  }

  // 목차가 없는 페이지는 소제목으로 목차 만들기
  function collectHeadings() {
    var pick = function (q) {
      return Array.prototype.filter.call(document.querySelectorAll(q), function (h) {
        if (h.closest('#gc-toc-sheet, header nav, footer')) return false;
        if (h.closest('[data-gc-hidden]')) return false;
        var t = headText(h);
        return t && t.length < 90 && visible(h);
      });
    };
    var hs = pick('h2');
    if (hs.length < 2) hs = pick('h2, h3');
    if (hs.length < 2) hs = pick('h2, h3, h4');
    if (hs.length < 2) hs = pick('[class*="part-title"], [class*="section-title"], [class*="chapter-title"], .pericope-head, .card-title');
    return hs;
  }

  function goTo(el) {
    var top = el.getBoundingClientRect().top + window.pageYOffset - 16;
    // 위에 고정된 머리띠가 있으면 그만큼 더 띄움
    var bar = 0;
    Array.prototype.forEach.call(document.querySelectorAll('header, nav, .topbar, .header'), function (h) {
      var cs = getComputedStyle(h);
      if ((cs.position === 'fixed' || cs.position === 'sticky') && h.getBoundingClientRect().top <= 1 && !h.hasAttribute('data-gc-hidden')) {
        bar = Math.max(bar, h.getBoundingClientRect().height);
      }
    });
    window.scrollTo({ top: Math.max(0, top - bar), behavior: 'smooth' });
  }

  var css = '' +
    '#gc-toc-btn,#gc-toc-sheet,#gc-toc-sheet *{all:revert;box-sizing:border-box}' +
    '#gc-toc-btn{position:fixed;margin:0;min-width:0;min-height:0;width:auto;height:auto;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:2147483000;' +
    'display:inline-flex;align-items:center;gap:7px;padding:11px 17px;border:0;border-radius:999px;cursor:pointer;' +
    'background:#1c2b4a;color:#f6f2e9;font:500 14px/1 "Pretendard","Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif;' +
    'letter-spacing:-0.01em;box-shadow:0 6px 18px rgba(16,26,48,.28);-webkit-tap-highlight-color:transparent;transition:transform .2s ease,background .2s ease}' +
    '#gc-toc-btn:hover{background:#b8935a;transform:translateY(-2px)}' +
    '#gc-toc-btn svg{width:16px;height:16px;flex:none}' +
    '#gc-toc-dim{position:fixed;inset:0;background:rgba(10,16,30,.38);z-index:2147483001;opacity:0;transition:opacity .2s ease}' +
    '#gc-toc-sheet{position:fixed;left:0;right:0;bottom:0;z-index:2147483002;max-height:72vh;overflow:auto;-webkit-overflow-scrolling:touch;' +
    'background:#fff;color:#1c2b4a;border-radius:18px 18px 0 0;padding:10px 0 calc(14px + env(safe-area-inset-bottom,0px));' +
    'box-shadow:0 -10px 30px rgba(16,26,48,.18);transform:translateY(100%);transition:transform .25s ease;' +
    'font:15px/1.45 "Pretendard","Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif}' +
    '@media (min-width:700px){#gc-toc-sheet{left:auto;right:16px;bottom:72px;width:360px;border-radius:16px;max-height:70vh}}' +
    '#gc-toc-sheet.open{transform:none}#gc-toc-dim.open{opacity:1}' +
    '#gc-toc-sheet .gc-grip{width:36px;height:4px;border-radius:2px;background:#d9d4c8;margin:2px auto 10px}' +
    '#gc-toc-sheet .gc-h{font-weight:700;font-size:13px;letter-spacing:.04em;color:#8a7a5c;padding:0 22px 8px}' +
    '#gc-toc-sheet button{display:block;width:100%;min-height:0;height:auto;margin:0;text-align:left;border:0;border-radius:0;box-shadow:none;background:none;color:inherit;font:inherit;line-height:1.45;padding:11px 22px;cursor:pointer;text-transform:none;letter-spacing:normal}' +
    '#gc-toc-sheet button.sub{padding-left:38px;font-size:14px;color:#4a556b}' +
    '#gc-toc-sheet button:hover,#gc-toc-sheet button:focus-visible{background:#f4f0e6;outline:none}' +
    '@media print{#gc-toc-btn,#gc-toc-dim,#gc-toc-sheet{display:none!important}}';

  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>';

  var sheet, dim;
  function closeSheet() {
    if (!sheet) return;
    sheet.classList.remove('open'); dim.classList.remove('open');
    var s = sheet, d = dim; sheet = dim = null;
    setTimeout(function () { s.remove(); d.remove(); }, 260);
  }

  function openSheet(heads) {
    var words = lang();
    dim = document.createElement('div'); dim.id = 'gc-toc-dim';
    sheet = document.createElement('div'); sheet.id = 'gc-toc-sheet';
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', words[0]);
    sheet.innerHTML = '<div class="gc-grip"></div><div class="gc-h"></div>';
    sheet.querySelector('.gc-h').textContent = words[0];
    var firstLevel = heads[0].tagName;
    heads.forEach(function (h) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = headText(h);
      if (h.tagName !== firstLevel && h.tagName > firstLevel) b.className = 'sub';
      b.addEventListener('click', function () { closeSheet(); setTimeout(function () { goTo(h); }, 120); });
      sheet.appendChild(b);
    });
    dim.addEventListener('click', closeSheet);
    document.body.appendChild(dim); document.body.appendChild(sheet);
    requestAnimationFrame(function () { dim.classList.add('open'); sheet.classList.add('open'); });
  }

  function addButton() {
    if (document.getElementById('gc-toc-btn')) return;
    if (!findToc() && collectHeadings().length < 2) return; // 이동할 곳이 없는 페이지는 버튼 없음
    var words = lang();
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var b = document.createElement('button');
    b.id = 'gc-toc-btn'; b.type = 'button';
    b.setAttribute('aria-label', words[1]); b.title = words[1];
    b.innerHTML = ICON + '<span></span>';
    b.querySelector('span').textContent = words[0];
    b.addEventListener('click', function () {
      if (sheet) { closeSheet(); return; }
      var toc = findToc();
      if (toc) { goTo(toc); return; }
      var hs = collectHeadings();
      if (hs.length) openSheet(hs);
    });
    document.body.appendChild(b);
  }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

  // 페이지 안의 목차 링크(#로 시작하는 링크)를 눌러도 방문 기록이 쌓이지 않게 합니다.
  // 이렇게 해야 글을 읽다가 뒤로가기를 한 번만 눌러도 자료실의 클릭했던 자리로 돌아가요.
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.target || a.closest('#gc-toc-sheet')) return;
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    try { id = decodeURIComponent(id); } catch (err) {}
    var el = document.getElementById(id) || document.getElementsByName(id)[0];
    if (!el) return;
    e.preventDefault();
    var d = el.closest('details');
    while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); }
    goTo(el);
  });

  function run() { hideOtherButtons(); addButton(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  // 스크롤해야 나타나거나 늦게 만들어지는 버튼도 숨기기
  window.addEventListener('load', hideOtherButtons);
  setTimeout(hideOtherButtons, 1200);
  var tick = 0;
  window.addEventListener('scroll', function () { if (tick++ < 3) hideOtherButtons(); }, { passive: true });

  // 오른쪽 클릭(우클릭) 메뉴 막기 — 완전한 보호는 아니고, 가벼운 방지 장치예요.
  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
  });
})();
