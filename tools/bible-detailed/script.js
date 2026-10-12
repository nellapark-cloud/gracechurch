/* modal */
const overlay = document.getElementById('modalOverlay');
document.querySelectorAll('.insight-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const d = INSIGHTS[btn.dataset.insight]; if(!d) return;
    document.getElementById('modalTitle').textContent = d.title;
    document.getElementById('modalBody').innerHTML = d.body;
    overlay.classList.add('open');
    overlay.querySelector('.modal-box').scrollTop = 0;
  });
});
function closeModal(){ overlay.classList.remove('open'); }
document.getElementById('modalClose').addEventListener('click', closeModal);
overlay.addEventListener('click', e=>{ if(e.target === overlay) closeModal(); });
document.addEventListener('keydown', e=>{ if(e.key === 'Escape') closeModal(); });

/* legend filter */
const legendBtns = document.querySelectorAll('.legend-btn');
function clearFilter(){
  legendBtns.forEach(b=>b.classList.remove('active'));
  document.body.classList.remove('filter-active');
  document.querySelectorAll('mark.filter-on').forEach(m=>m.classList.remove('filter-on'));
}
legendBtns.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const was = btn.classList.contains('active');
    clearFilter(); if(was) return;
    btn.classList.add('active');
    document.body.classList.add('filter-active');
    document.querySelectorAll('mark.hl-'+btn.dataset.cat).forEach(m=>m.classList.add('filter-on'));
  });
});
document.getElementById('resetFilter').addEventListener('click', clearFilter);

/* tooltips */
const tip = document.getElementById('tipBubble');
let tipFor = null;
function showTip(m){
  const t = m.dataset.tip; if(!t) return;
  tip.textContent = t; tip.classList.add('show'); tipFor = m;
  const r = m.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = r.left + r.width/2 - tw/2; x = Math.max(8, Math.min(x, window.innerWidth - tw - 8));
  let y = r.top - th - 8; if(y < 8) y = r.bottom + 8;
  tip.style.left = x+'px'; tip.style.top = y+'px';
}
function hideTip(){ tip.classList.remove('show'); tipFor = null; }
document.querySelectorAll('mark[data-tip]').forEach(m=>{
  m.addEventListener('mouseenter', ()=>showTip(m));
  m.addEventListener('mouseleave', hideTip);
  m.addEventListener('click', e=>{ e.stopPropagation(); tipFor === m ? hideTip() : showTip(m); });
});
document.addEventListener('click', hideTip);
window.addEventListener('scroll', hideTip, {passive:true});

/* expand all notes */
const tog = document.getElementById('toggleAll');
tog.addEventListener('click', ()=>{
  const all = document.querySelectorAll('details.nt');
  const open = tog.dataset.open !== '1';
  all.forEach(d=>d.open = open);
  tog.dataset.open = open ? '1' : '0';
  tog.textContent = open ? '노트 모두 접기' : '노트 모두 펼치기';
});

/* to top */
const toTop = document.getElementById('toTop');
window.addEventListener('scroll', ()=>toTop.classList.toggle('show', window.scrollY > 800), {passive:true});
toTop.addEventListener('click', ()=>window.scrollTo({top:0, behavior:'smooth'}));
