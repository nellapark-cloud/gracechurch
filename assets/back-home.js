// 자료실의 모든 콘텐츠 페이지에 공통으로 넣는 "처음으로" 버튼입니다.
// 각 html 파일에 이 스크립트 한 줄만 추가하면 자동으로 버튼이 뜹니다.
// 버튼 디자인이나 이동 경로를 바꾸고 싶으면 이 파일 하나만 고치면 전체에 반영돼요.

(function () {
  var a = document.createElement('a');
  a.href = '/gracechurch/';
  a.textContent = '← 자료실로';
  a.setAttribute('aria-label', '자료실 첫 페이지로 돌아가기');
  a.style.cssText = [
    'position:fixed',
    'left:1.1rem',
    'bottom:1.1rem',
    'z-index:9999',
    'background:#1c2b4a',
    'color:#f6f2e9',
    'padding:0.65rem 1.2rem',
    'border-radius:999px',
    'font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif',
    'font-size:0.85rem',
    'font-weight:500',
    'text-decoration:none',
    'box-shadow:0 6px 16px rgba(16,26,48,0.35)',
    'transition:background .2s ease, transform .2s ease'
  ].join(';');
  a.addEventListener('mouseenter', function () {
    a.style.background = '#b8935a';
    a.style.transform = 'translateY(-2px)';
  });
  a.addEventListener('mouseleave', function () {
    a.style.background = '#1c2b4a';
    a.style.transform = 'none';
  });
  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(a);
  });
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    document.body.appendChild(a);
  }
})();
