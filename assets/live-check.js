// "실시간 예배" 버튼 안내
// 유튜브 라이브(@sjgrace/live)로 가는 모든 링크에 적용됩니다.
// - 방송 시간(한국 시간 기준)이면 바로 유튜브 라이브로 이동
// - 방송 시간이 아니면 "지금은 방송시간이 아닙니다" 안내 창을 띄움
// 방송 시간을 바꾸거나 더하려면 아래 SCHEDULE만 고치면 됩니다.
//   day: 0=주일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토  /  시간은 24시간제 "HH:MM"
(function () {
  var SCHEDULE = [
    { day: 0, start: '10:50', end: '12:30', name: '주일예배', label: '주일 오전 11시' }
  ];
  var LIVE_URL = 'https://www.youtube.com/@sjgrace/live';
  var REPLAY_URL = 'https://www.youtube.com/@sjgrace/streams';

  function koreaNow() {
    var d = new Date(Date.now() + 9 * 3600 * 1000); // UTC+9
    return { day: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
  }
  function toMin(hm) { var p = hm.split(':'); return +p[0] * 60 + +p[1]; }
  function isOnAir() {
    var n = koreaNow();
    return SCHEDULE.some(function (s) { return s.day === n.day && n.min >= toMin(s.start) && n.min <= toMin(s.end); });
  }

  var css =
    '#live-modal{position:fixed;inset:0;z-index:2147483600;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(15,27,61,.42)}' +
    '#live-modal.open{display:flex}' +
    '#live-modal .lm-box{width:100%;max-width:380px;border-radius:20px;background:#FFFFFF;padding:28px 24px 22px;text-align:center;box-shadow:0 24px 60px rgba(15,27,61,.25);font-family:Pretendard,"Noto Sans KR",system-ui,sans-serif;color:#0F1B3D}' +
    '#live-modal .lm-icon{width:56px;height:56px;margin:0 auto 14px;border-radius:50%;background:#E6F4FD;display:flex;align-items:center;justify-content:center}' +
    '#live-modal h2{margin:0 0 8px;font-size:20px;font-weight:800;letter-spacing:-.02em}' +
    '#live-modal p{margin:0 0 18px;font-size:14px;line-height:1.6;color:#3B4868;word-break:keep-all}' +
    '#live-modal .lm-btns{display:flex;flex-direction:column;gap:8px}' +
    '#live-modal .lm-btns a,#live-modal .lm-btns button{display:flex;align-items:center;justify-content:center;min-height:46px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;cursor:pointer;font-family:inherit}' +
    '#live-modal .lm-main{background:#7CC4F2;color:#0F2A4A;border:0}' +
    '#live-modal .lm-sub{background:#FFFFFF;color:#1F7AB8;border:1px solid #D3E8F6}' +
    '#live-modal .lm-close{background:transparent;color:#5A6788;border:0;min-height:40px}';

  var modal;
  function buildModal() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var times = SCHEDULE.map(function (s) { return s.label; }).join(', ');
    modal = document.createElement('div');
    modal.id = 'live-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'live-modal-title');
    modal.innerHTML =
      '<div class="lm-box">' +
        '<div class="lm-icon" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3A9AD9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"></rect><path d="M10.5 9.5v5l4-2.5z" fill="#3A9AD9"></path></svg></div>' +
        '<h2 id="live-modal-title">지금은 방송시간이 아닙니다</h2>' +
        '<p>실시간 예배는 ' + times + '에 시작해요.<br>지난 예배는 다시 보기로 함께하실 수 있어요.</p>' +
        '<div class="lm-btns">' +
          '<a class="lm-main" href="' + REPLAY_URL + '" target="_blank" rel="noopener">지난 예배 다시 보기</a>' +
          '<a class="lm-sub" href="' + LIVE_URL + '" target="_blank" rel="noopener">그래도 유튜브에서 확인하기</a>' +
          '<button type="button" class="lm-close">닫기</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    modal.querySelector('.lm-close').addEventListener('click', close);
    modal.querySelectorAll('.lm-btns a').forEach(function (a) { a.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }
  var lastFocus;
  function open() {
    if (!modal) buildModal();
    lastFocus = document.activeElement;
    modal.classList.add('open');
    modal.querySelector('.lm-main').focus();
  }
  function close() {
    if (!modal) return;
    modal.classList.remove('open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.closest('#live-modal')) return;
    if (a.getAttribute('href').replace(/\/$/, '') !== LIVE_URL) return;
    if (isOnAir()) return; // 방송 중이면 원래대로 라이브로 이동
    e.preventDefault();
    open();
  });
})();
