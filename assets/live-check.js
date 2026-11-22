// "실시간 예배 / 라이브" 버튼 안내
// 유튜브 라이브(@sjgrace/live)로 가는 모든 링크에 자동 적용됩니다.
//
// 동작 방식
// 1) 버튼을 누르면 은혜교회 유튜브 채널이 "지금 실제로 생방송 중인지" 확인합니다.
//    - 생방송 중이면 → 그 방송 영상으로 바로 이동
//    - 중계가 없으면 → "지금은 방송시간이 아닙니다" 안내 창 (다시 보기 버튼 포함)
//    - 확인이 안 되면(인터넷 문제 등) → 유튜브 라이브 페이지로 이동할 수 있는 버튼 안내
// 2) 정해진 예배 시간(SCHEDULE) 근처에는 페이지를 열 때 미리 확인해 두어서
//    버튼을 누르면 기다림 없이 바로 방송으로 들어갑니다.
//
// 예배 시간을 바꾸거나 더하려면 아래 SCHEDULE만 고치면 됩니다.
//   day: 0=주일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토  /  시간은 24시간제 "HH:MM"
(function () {
  var SCHEDULE = [
    { day: 0, start: '10:30', end: '13:00', label: '주일 오전 11시' }
  ];
  var CHANNEL_ID = 'UC9eeeH1zEoFUlecGfQeFwQQ'; // 은혜교회 [GRACE CHURCH] @sjgrace
  var LIVE_URL = 'https://www.youtube.com/@sjgrace/live';
  var REPLAY_URL = 'https://www.youtube.com/@sjgrace/streams';
  var CACHE_KEY = 'grace-live-status';
  var CACHE_MS = 2 * 60 * 1000; // 2분 동안은 다시 확인하지 않음
  var TIMEOUT_MS = 8000;

  // ---------- 시간 ----------
  function koreaNow() {
    var d = new Date(Date.now() + 9 * 3600 * 1000); // UTC+9
    return { day: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
  }
  function toMin(hm) { var p = hm.split(':'); return +p[0] * 60 + +p[1]; }
  function nearServiceTime() {
    var n = koreaNow();
    return SCHEDULE.some(function (s) { return s.day === n.day && n.min >= toMin(s.start) && n.min <= toMin(s.end); });
  }

  // ---------- 상태 저장 ----------
  // status: 'live' | 'off' | 'unknown'
  var state = { status: null, videoId: null, at: 0 };
  try {
    var saved = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (saved && Date.now() - saved.at < CACHE_MS && saved.status !== 'unknown') state = saved;
  } catch (e) {}
  function setState(status, videoId) {
    state = { status: status, videoId: videoId || null, at: Date.now() };
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (e) {}
    document.documentElement.classList.toggle('grace-on-air', status === 'live');
  }
  function fresh() { return state.status && Date.now() - state.at < CACHE_MS; }
  function watchUrl() { return state.videoId ? 'https://www.youtube.com/watch?v=' + state.videoId : LIVE_URL; }
  if (fresh() && state.status === 'live') document.documentElement.classList.add('grace-on-air');

  // ---------- 유튜브 생방송 확인 ----------
  // 유튜브 공식 임베드(live_stream?channel=)를 화면 밖에 몰래 띄워서
  // 지금 송출 중인 영상이 있는지 읽어 옵니다. (API 키 필요 없음)
  var checking = null; // 진행 중인 확인 (콜백 목록)
  function loadYT(cb) {
    if (window.YT && window.YT.Player) return cb();
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { if (prev) try { prev(); } catch (e) {} cb(); };
    if (!document.getElementById('yt-iframe-api')) {
      var s = document.createElement('script');
      s.id = 'yt-iframe-api';
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = function () { cb(new Error('load')); };
      document.head.appendChild(s);
    }
  }
  function checkLive(cb) {
    if (fresh()) return cb(state.status);
    if (checking) { checking.push(cb); return; }
    checking = [cb];
    var done = false, frame, player, poll, timer;
    function finish(status, vid) {
      if (done) return; done = true;
      clearInterval(poll); clearTimeout(timer);
      setState(status, vid);
      setTimeout(function () {
        try { player && player.destroy(); } catch (e) {}
        if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
      }, 0);
      var list = checking; checking = null;
      list.forEach(function (f) { try { f(status); } catch (e) {} });
    }
    timer = setTimeout(function () { finish('unknown'); }, TIMEOUT_MS);
    loadYT(function (err) {
      if (err || done) return finish('unknown');
      frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.setAttribute('tabindex', '-1');
      frame.title = 'live check';
      frame.allow = 'autoplay; encrypted-media';
      frame.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:180px;border:0;opacity:0;pointer-events:none';
      frame.src = 'https://www.youtube.com/embed/live_stream?channel=' + CHANNEL_ID +
        '&enablejsapi=1&mute=1&autoplay=0&controls=0&origin=' + encodeURIComponent(location.origin);
      document.body.appendChild(frame);
      function inspect() {
        var d;
        try { d = player.getVideoData && player.getVideoData(); } catch (e) { return false; }
        if (!d || !d.video_id) return false;
        // isLive 값이 있으면 그대로 믿고, 없으면 길이가 0(=진행 중인 생방송)인지로 판단
        var live = typeof d.isLive === 'boolean' ? d.isLive
          : (function () { try { return player.getDuration() === 0; } catch (e) { return false; } })();
        finish(live ? 'live' : 'off', live ? d.video_id : null);
        return true;
      }
      try {
        player = new YT.Player(frame, {
          events: {
            onReady: function () {
              if (inspect()) return;
              // 영상 정보가 늦게 들어오는 경우를 위해 잠깐 더 지켜봄 → 끝까지 없으면 중계 없음
              var tries = 0;
              poll = setInterval(function () {
                if (inspect()) return;
                if (++tries >= 8) finish('off');
              }, 250);
            },
            onError: function () { finish('off'); } // 송출 중인 영상이 없으면 임베드가 오류를 냄
          }
        });
      } catch (e) { finish('unknown'); }
    });
  }

  // ---------- 안내 창 ----------
  var css =
    '.grace-on-air .live-dot{animation:graceLivePulse 1.4s ease-in-out infinite}' +
    '@keyframes graceLivePulse{0%,100%{box-shadow:0 0 0 0 rgba(229,72,77,.55)}50%{box-shadow:0 0 0 5px rgba(229,72,77,0)}}' +
    '#live-modal{position:fixed;inset:0;z-index:2147483600;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(15,27,61,.42)}' +
    '#live-modal.open{display:flex}' +
    '#live-modal .lm-box{width:100%;max-width:380px;border-radius:20px;background:#FFFFFF;padding:28px 24px 22px;text-align:center;box-shadow:0 24px 60px rgba(15,27,61,.25);font-family:Pretendard,"Noto Sans KR",system-ui,sans-serif;color:#0B3B5C}' +
    '#live-modal .lm-icon{width:56px;height:56px;margin:0 auto 14px;border-radius:50%;background:#E9F2F7;display:flex;align-items:center;justify-content:center}' +
    '#live-modal .lm-spin{width:26px;height:26px;border-radius:50%;border:3px solid #CFE3EE;border-top-color:#13789E;animation:graceSpin .8s linear infinite}' +
    '@keyframes graceSpin{to{transform:rotate(360deg)}}' +
    '#live-modal h2{margin:0 0 8px;font-size:20px;font-weight:800;letter-spacing:-.02em}' +
    '#live-modal p{margin:0 0 18px;font-size:14px;line-height:1.6;color:#3F4A60;word-break:keep-all}' +
    '#live-modal .lm-btns{display:flex;flex-direction:column;gap:8px}' +
    '#live-modal .lm-btns a,#live-modal .lm-btns button{display:flex;align-items:center;justify-content:center;min-height:46px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;cursor:pointer;font-family:inherit}' +
    '#live-modal .lm-main{background:#4FB3D9;color:#0B3B5C;border:0}' +
    '#live-modal .lm-live{background:#E5484D;color:#FFFFFF;border:0}' +
    '#live-modal .lm-sub{background:#FFFFFF;color:#13789E;border:1px solid #D6E4EE}' +
    '#live-modal .lm-close{background:transparent;color:#5B6478;border:0;min-height:40px}';
  (function () { var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st); })();

  var ICON_TV = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#13789E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"></rect><path d="M10.5 9.5v5l4-2.5z" fill="#13789E"></path></svg>';
  var ICON_LIVE = '<svg width="26" height="26" viewBox="0 0 24 24" fill="#E5484D"><circle cx="12" cy="12" r="5"></circle></svg>';
  var times = SCHEDULE.map(function (s) { return s.label; }).join(', ');
  var CLOSE = '<button type="button" class="lm-close">닫기</button>';
  function link(cls, href, text) { return '<a class="' + cls + '" href="' + href + '" target="_blank" rel="noopener">' + text + '</a>'; }

  var VIEWS = {
    checking: function () {
      return { icon: '<span class="lm-spin"></span>', title: '방송을 확인하고 있어요',
        text: '잠시만 기다려 주세요.', btns: CLOSE };
    },
    live: function () {
      return { icon: ICON_LIVE, title: '지금 실시간 예배 중입니다',
        text: '아래 버튼을 누르면 유튜브 생방송으로 바로 연결됩니다.',
        btns: link('lm-live', watchUrl(), '실시간 예배 보기') + CLOSE };
    },
    off: function () {
      return { icon: ICON_TV, title: '지금은 방송시간이 아닙니다',
        text: '실시간 예배는 ' + times + '에 시작해요.<br>지난 예배는 다시 보기로 함께하실 수 있어요.',
        btns: link('lm-main', REPLAY_URL, '지난 예배 다시 보기') + CLOSE };
    },
    unknown: function () {
      return { icon: ICON_TV, title: '방송 상태를 확인하지 못했어요',
        text: '실시간 예배는 ' + times + '에 시작해요.<br>유튜브에서 직접 확인해 주세요.',
        btns: link('lm-main', LIVE_URL, '유튜브에서 확인하기') + link('lm-sub', REPLAY_URL, '지난 예배 다시 보기') + CLOSE };
    }
  };

  var modal, lastFocus;
  function buildModal() {
    modal = document.createElement('div');
    modal.id = 'live-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'live-modal-title');
    modal.innerHTML = '<div class="lm-box" aria-live="polite"></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.closest('.lm-close') || e.target.closest('.lm-btns a')) close();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }
  function render(view) {
    var v = VIEWS[view]();
    modal.querySelector('.lm-box').innerHTML =
      '<div class="lm-icon" aria-hidden="true">' + v.icon + '</div>' +
      '<h2 id="live-modal-title">' + v.title + '</h2>' +
      '<p>' + v.text + '</p>' +
      '<div class="lm-btns">' + v.btns + '</div>';
    var f = modal.querySelector('.lm-btns a, .lm-close');
    if (f) f.focus();
  }
  function open(view) {
    if (!modal) buildModal();
    if (!modal.classList.contains('open')) lastFocus = document.activeElement;
    modal.classList.add('open');
    render(view);
  }
  function close() {
    if (!modal || !modal.classList.contains('open')) return;
    modal.classList.remove('open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // ---------- 버튼 연결 ----------
  function isLiveLink(a) {
    var h = (a.getAttribute('href') || '').replace(/[?#].*$/, '').replace(/\/$/, '');
    return h === LIVE_URL || h === 'https://youtube.com/@sjgrace/live' || h === 'https://m.youtube.com/@sjgrace/live';
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button > 0) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.closest('#live-modal') || !isLiveLink(a)) return;

    if (fresh() && state.status === 'live') {
      // 이미 생방송 확인됨 → 그 방송 영상으로 바로 이동
      a.href = watchUrl();
      setTimeout(function () { a.href = LIVE_URL; }, 0);
      return;
    }
    e.preventDefault();
    if (fresh()) return open(state.status);
    open('checking');
    checkLive(function (status) {
      if (modal && modal.classList.contains('open')) render(status);
    });
  }, true);

  // 예배 시간 근처에는 미리 확인해 두기 (버튼을 누르면 바로 들어가도록)
  function precheck() { if (nearServiceTime()) checkLive(function () {}); }
  if (document.readyState === 'complete') setTimeout(precheck, 800);
  else window.addEventListener('load', function () { setTimeout(precheck, 800); });
})();
