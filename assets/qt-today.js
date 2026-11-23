/* 365일 통독: 1월 1일 = 1일차. 오늘 회차 페이지로 연결 */
(function(){
  var now=new Date(), y=now.getFullYear();
  var doy=Math.floor((Date.UTC(y,now.getMonth(),now.getDate())-Date.UTC(y,0,1))/864e5)+1;
  var leap=(y%4===0&&y%100!==0)||y%400===0;
  if(leap&&doy>=60)doy-=1;           /* 윤년 2월 29일은 59일차를 한 번 더 */
  var day=Math.min(Math.max(doy,1),365);
  var url='/content/bible-by-book/qt/'+day+'.html';
  document.querySelectorAll('[data-qt-today]').forEach(function(a){a.setAttribute('href',url);});
  document.querySelectorAll('[data-qt-day]').forEach(function(s){s.textContent=day+'일차';});
})();
