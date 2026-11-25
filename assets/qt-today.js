/* 365일 통독: 1월 1일 = 1일차. 올해(2026)는 교회 진도가 하루 앞서 +1회차.
   365회차를 마친 뒤 새해 전까지는 '완주' 안내 페이지로 연결 */
(function(){
  var now=new Date(), y=now.getFullYear();
  var doy=Math.floor((Date.UTC(y,now.getMonth(),now.getDate())-Date.UTC(y,0,1))/864e5)+1;
  var leap=(y%4===0&&y%100!==0)||y%400===0;
  if(leap&&doy>=60)doy-=1;           /* 윤년 2월 29일은 59일차를 한 번 더 */
  var OFFSET=(y===2026)?1:0;         /* 2026-11-24 = 329회차 */
  var day=Math.max(doy,1)+OFFSET;
  var done=day>365;
  var url=done?'/qt-finished.html':'/content/bible-by-book/qt/'+day+'.html';
  document.querySelectorAll('[data-qt-today]').forEach(function(a){a.setAttribute('href',url);});
  document.querySelectorAll('[data-qt-day]').forEach(function(s){s.textContent=done?'올해 완주! 1월 1일 새 출발':'오늘 '+day+'일차';});
})();
