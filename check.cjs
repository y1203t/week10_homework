// No dependencies. These checks do not claim visual browser verification.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {render,parseCopy}=require('./build.cjs');
const copy=fs.readFileSync(path.join(__dirname,'copy.md'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const pages=parseCopy(copy);
assert.equal(html,render(copy),'Generated HTML differs from the approved copy; run node slides/build.cjs');
assert.equal(pages.length,23);
assert(html.includes('class="slide cover"'));
assert(html.includes('class="slide closing"'));
assert.equal(pages.at(-2).title,'參考資料');
const articles=[...html.matchAll(/<section class="slide(?: references)?"[\s\S]*?<\/section>\s*(?=<section class="slide|<\/main>)/g)];
// Check source placement using parsed page content rather than nested-section regexes.
for(const page of pages.filter((p,i)=>i!==pages.length-2)){assert(!page.panels.some(p=>p.html.includes('<a ')),'References appeared before final page');assert(page.takeaway,'Missing bold conclusion');}
assert(pages.at(-2).panels.some(p=>p.html.includes('https://science.nasa.gov/')));
assert(!/\.pdf|\.md|\.\.\/raw\/|\.\.\/wiki\//i.test(html));
const normalize=s=>s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/\s+/g,'');
const renderedText=normalize(html);
let contentLines=0;
const content=copy.slice(copy.indexOf('\n## '));
for(const raw of content.split(/\r?\n/)){
  let line=raw.trim();if(!line||line==='---'||/^\|[-|:]+$/.test(line)||/^## /.test(line))continue;
  const fragments=line.startsWith('|')?line.split('|').slice(1,-1):[line];
  for(let fragment of fragments){fragment=fragment.replace(/^### /,'').replace(/^- /,'').replace(/^\d+\. /,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/\*\*/g,'');assert(renderedText.includes(fragment.replace(/\s+/g,'')),'Copy text missing: '+fragment);contentLines++;}
}
let links=0;for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){const target=match[1];if(target.startsWith('#'))continue;if(/^https?:/.test(target)){assert.equal(target,'https://science.nasa.gov/');continue;}assert(fs.existsSync(path.resolve(__dirname,decodeURIComponent(target.split('#')[0])))),'Missing target: '+target;links++;}
const elements=new Map(),sections=pages.map(()=>({hidden:false}));
function el(id){if(!elements.has(id))elements.set(id,{style:{},value:'',textContent:'',listeners:{},scrollTop:100,focus(){},querySelectorAll(){return sections;},addEventListener(n,f){this.listeners[n]=f;}});return elements.get(id);}
const context={document:{getElementById:el,fullscreenEnabled:false,addEventListener(n,f){el('document').listeners[n]=f;}},window:{addEventListener(n,f){el('window').listeners[n]=f;}},location:{hash:''},history:{replaceState(a,b,h){context.location.hash=h;}}};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'app.js'),'utf8'),context);
const key=k=>el('document').listeners.keydown({key:k,target:{tagName:'BODY'},preventDefault(){}});
assert(el('previous').disabled);assert.equal(el('counter').textContent,'1 / 23');el('next').listeners.click();assert.equal(context.location.hash,'#2');assert.equal(el('deck').scrollTop,0);
key('ArrowLeft');assert.equal(context.location.hash,'#1');key('End');assert(el('next').disabled);key('ArrowRight');assert.equal(context.location.hash,'#23');key('Home');assert.equal(context.location.hash,'#1');
el('chapter').value='18';el('chapter').listeners.change();assert.equal(context.location.hash,'#19');
for(const [hash,want] of [['#6','#6'],['#999','#23'],['#bad','#1']]){context.location.hash=hash;el('window').listeners.hashchange();assert.equal(context.location.hash,want);}
for(let i=0;i<23;i++){vm.runInContext(`show(${i})`,context);assert.equal(sections.filter(s=>!s.hidden).length,1);assert.equal(el('counter').textContent,`${i+1} / 23`);}
assert.equal((html.match(/<details>/g)||[]).length,1);
console.log(JSON.stringify({result:'PASS',pages:23,approvedContentFragments:contentLines,referencePlacement:'penultimate page only',localLinks:links,navigation:'buttons, arrows, Home/End, selector, hash, boundaries, scroll reset',answerDisclosure:true,limitation:'Logic and generated-content checks; actual browser layout not verified'},null,2));

