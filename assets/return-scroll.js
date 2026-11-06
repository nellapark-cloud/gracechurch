// 뒤로가기 위치 기억
// 어떤 페이지에서 링크를 눌러 다른 페이지로 갔다가 '뒤로'를 누르면,
// 방금 눌렀던 그 링크가 있던 자리로 돌아옵니다.
// - 픽셀 위치뿐 아니라 눌렀던 링크 주소도 저장해서, 목록이 늦게 그려지거나
//   글꼴·이미지 때문에 높이가 조금 바뀌어도 정확히 그 항목을 찾아갑니다.
// - 접혀 있던 목록(details)과 관(room)도 그때 상태대로 다시 펼칩니다.
(function () {
  if (window.__returnScrollLoaded) return;
  window.__returnScrollLoaded = true;

  var KEY = 'returnScroll:' + location.pathname + location.search;
  var store;
  try { store = window.sessionStorage; store.getItem('x'); } catch (e) { return; }

  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}

  // ── 저장 ─────────────────────────────────────────
  var savedByClick = false;

  function save(link) {
    try {
      var state = { y: window.scrollY || window.pageYOffset || 0 };
      state.open = Array.prototype.map.call(document.querySelectorAll('details'), function (d) { return d.open; });
      if (link) {
        state.href = link.getAttribute('href');
        // 같은 주소의 링크가 여러 개(상단 메뉴·본문 카드 등)일 수 있어 몇 번째인지도 기억
        var same = document.querySelectorAll('a[href]');
        var k = 0;
        for (var i = 0; i < same.length; i++) {
          if (same[i] === link) { state.idx = k; break; }
          if (same[i].getAttribute('href') === state.href) k++;
        }
        state.top = link.getBoundingClientRect().top;
        var room = link.closest && link.closest('.room');
        if (room && room.id) state.room = room.id;
      }
      store.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (!h || h.charAt(0) === '#' || /^(javascript|mailto|tel|sms):/i.test(h)) return;
    if (a.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey) return;
    save(a);
    savedByClick = true;
  }, true);

  // 링크가 아닌 방법(주소창 이동 등)으로 떠날 때도 위치만은 남겨둠
  window.addEventListener('pagehide', function () {
    if (!savedByClick) save(null);
    savedByClick = false;
  });

  // ── 복원 ─────────────────────────────────────────
  var navType = '';
  try {
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    navType = nav ? nav.type : (performance.navigation && performance.navigation.type === 2 ? 'back_forward' : (performance.navigation && performance.navigation.type === 1 ? 'reload' : ''));
  } catch (e) {}
  if (navType !== 'back_forward' && navType !== 'reload') return;

  var raw = store.getItem(KEY);
  if (!raw) return;
  var state;
  try { state = JSON.parse(raw); } catch (e) { return; }
  if (navType === 'reload') state.href = null; // 새로고침은 위치만

  var stopped = false;
  var openApplied = false;
  var highlighted = false;

  function jumpTo(y) {
    var html = document.documentElement;
    var prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, Math.max(0, y));
    html.style.scrollBehavior = prev;
  }

  function findLink(href) {
    if (!href) return null;
    var links = document.querySelectorAll('a[href]');
    var matches = [];
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute('href') === href) matches.push(links[i]);
    }
    if (!matches.length) return null;
    if (typeof state.idx === 'number' && matches[state.idx]) return matches[state.idx];
    for (var j = 0; j < matches.length; j++) if (matches[j].offsetParent !== null) return matches[j];
    return matches[0];
  }

  function applyOpenFlags() {
    if (openApplied || !state.open) return;
    var ds = document.querySelectorAll('details');
    if (!ds.length) return;
    openApplied = true;
    if (ds.length !== state.open.length) return; // 목록 구성이 달라졌으면 건드리지 않음
    for (var i = 0; i < ds.length; i++) ds[i].open = !!state.open[i];
  }

  function place() {
    if (stopped) return;
    applyOpenFlags();
    var link = findLink(state.href);
    if (link) {
      var room = link.closest && link.closest('.room');
      if (room && room.id && window.__openRoom) { try { window.__openRoom(room.id); } catch (e) {} }
      var d = link.closest && link.closest('details');
      while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); }
      var top = link.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);
      var offset = typeof state.top === 'number'
        ? Math.min(Math.max(state.top, 0), window.innerHeight - 60)
        : window.innerHeight / 3;
      jumpTo(top - offset);
      if (!highlighted) {
        highlighted = true;
        link.classList.add('is-returned');
        setTimeout(function () { link.classList.remove('is-returned'); }, 1600);
      }
    } else {
      jumpTo(state.y || 0);
    }
  }

  // 사용자가 직접 스크롤을 시작하면 더 이상 끌어당기지 않음
  function stop() { stopped = true; if (mo) mo.disconnect(); }
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (t) {
    window.addEventListener(t, stop, { passive: true, once: true });
  });

  // 목록이 나중에 그려지는 페이지(자료실 등)를 위해 화면이 바뀔 때마다 다시 맞춤
  var mo = null, pending = false;
  function schedule() {
    if (pending || stopped) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; place(); });
  }

  function start() {
    place();
    if (window.MutationObserver && document.body) {
      mo = new MutationObserver(schedule);
      mo.observe(document.body, { childList: true, subtree: true });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    if (document.readyState !== 'complete') window.addEventListener('load', schedule, { once: true });
    setTimeout(stop, 4000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
