'use strict';
const deck=document.getElementById('deck');
const sections=[...deck.querySelectorAll('.slide')];
const select=document.getElementById('chapter');
const previous=document.getElementById('previous');
const next=document.getElementById('next');
let current=0;
function show(index,focus=false){
  current=Math.max(0,Math.min(sections.length-1,index));
  sections.forEach((section,i)=>{section.hidden=i!==current;});
  previous.disabled=current===0;
  next.disabled=current===sections.length-1;
  select.value=String(current);
  document.getElementById('counter').textContent=`${current+1} / ${sections.length}`;
  document.getElementById('progress-fill').style.width=`${100*(current+1)/sections.length}%`;
  history.replaceState(null,'',`#${current+1}`);
  if(focus){deck.scrollTop=0;deck.focus({preventScroll:true});}
}
function fromHash(){const page=Number(location.hash.slice(1));show(Number.isInteger(page)&&page>0?page-1:0);}
previous.addEventListener('click',()=>show(current-1,true));
next.addEventListener('click',()=>show(current+1,true));
select.addEventListener('change',()=>show(Number(select.value),true));
document.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)||event.target.isContentEditable)return;
  const destination={ArrowLeft:current-1,ArrowRight:current+1,Home:0,End:sections.length-1}[event.key];
  if(destination!==undefined){event.preventDefault();show(destination,true);}
});
window.addEventListener('hashchange',fromHash);
const fullscreen=document.getElementById('fullscreen');
if(!document.fullscreenEnabled)fullscreen.hidden=true;
fullscreen.addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
  catch{fullscreen.hidden=true;}
});
fromHash();
