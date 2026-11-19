// Build the approved Markdown copy into offline, dependency-free HTML.
const fs = require('node:fs');
const path = require('node:path');
const escape = text => text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function inline(text) {
  return text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g).map(token => {
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      if (!/^\.\.\/(wiki|raw)\//.test(link[2]) && link[2]!=='https://science.nasa.gov/') throw Error('Unexpected link: '+link[2]);
      return `<a href="${escape(link[2])}" target="_blank" rel="noopener">${escape(link[1])}</a>`;
    }
    if(token.startsWith('**')&&token.endsWith('**'))return `<strong>${escape(token.slice(2,-2))}</strong>`;
    return escape(token);
  }).join('');
}
function blocks(lines) {
  const result=[];
  for(let i=0;i<lines.length;) {
    const line=lines[i].trim();
    if(!line||line==='---'){i++;continue;}
    if(line.startsWith('|')) {
      const rows=[];
      while(i<lines.length&&lines[i].trim().startsWith('|'))rows.push(lines[i++].trim().split('|').slice(1,-1).map(s=>s.trim()));
      const [head,separator,...body]=rows;
      if(!separator||separator.some(s=>!/^:?-+:?$/.test(s)))throw Error('Invalid table');
      result.push(`<div class="table-wrap" tabindex="0" role="region" aria-label="比較資料表"><table><thead><tr>${head.map(s=>`<th scope="col">${inline(s)}</th>`).join('')}</tr></thead><tbody>${body.map(row=>`<tr>${row.map((s,j)=>j===0?`<th scope="row">${inline(s)}</th>`:`<td>${inline(s)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    const list=line.match(/^(- |\d+\. )/);
    if(list){const ordered=/^\d/.test(line),items=[];const regex=ordered?/^\d+\. /:/^- /;while(i<lines.length&&regex.test(lines[i].trim()))items.push(lines[i++].trim().replace(regex,''));const tag=ordered?'ol':'ul';result.push(`<${tag}>${items.map(s=>`<li>${inline(s)}</li>`).join('')}</${tag}>`);continue;}
    const paragraph=[];
    while(i<lines.length&&lines[i].trim()&&!lines[i].trim().startsWith('|')&&!/^(### |---$|- |\d+\. )/.test(lines[i].trim()))paragraph.push(lines[i++].trim());
    if(!paragraph.length)throw Error('Unsupported Markdown: '+line);
    result.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }
  return result.join('\n');
}
function parseCopy(text) {
  const chunks=text.replace(/^\uFEFF/,'').split(/^## 第 (\d+) 頁｜(.+)\r?$/m);
  const pages=[];
  for(let i=1;i<chunks.length;i+=3){
    const number=Number(chunks[i]),title=chunks[i+1].trim();
    const lines=chunks[i+2].split(/\r?\n/).filter(s=>s.trim()!=='---');
    while(lines.length&&!lines.at(-1).trim())lines.pop();
    let takeaway='';
    if(/^\*\*.+\*\*$/.test(lines.at(-1)||''))takeaway=lines.pop().slice(2,-2);
    const panels=[];let heading='',body=[];
    const flush=()=>{if(body.some(s=>s.trim())||heading){const html=blocks(body);panels.push({heading,html,wide:html.includes('<table>')});}body=[];};
    for(const line of lines){if(line.startsWith('### ')){flush();heading=line.slice(4);}else body.push(line);}
    flush();
    pages.push({number,title,takeaway,panels});
  }
  if(pages.length!==23||pages.some((p,i)=>p.number!==i+1))throw Error('Expected 23 consecutive approved pages');
  return pages;
}
function render(text){
  const pages=parseCopy(text);
  const slides=pages.map((p,i)=>{
    const isCover=i===0,isClosing=i===pages.length-1,isReference=p.title==='參考資料';
    const chapter=isCover?'新手入門教學':isClosing?'探索未完待續':isReference?'參考資料':i<6?'建立基本概念':i<15?'認識八大行星':i<19?'連結與比較':'理解與回顧';
    return `<section class="slide${isReference?' references':''}${isCover?' cover':''}${isClosing?' closing':''}" id="slide-${p.number}" aria-labelledby="title-${p.number}"${i?' hidden':''}>
<header class="slide-heading"><p class="eyebrow">太陽系入門 <span>／ ${chapter}</span></p><${i?'h2':'h1'} id="title-${p.number}">${escape(p.title)}</${i?'h2':'h1'}></header>
<div class="content-grid count-${p.panels.length}">${p.panels.map(panel=>`<section class="panel${panel.wide?' wide':''}">${panel.heading?`<h3>${escape(panel.heading)}</h3>`:''}${panel.heading==='參考答案與理由'?`<details><summary>展開參考答案與理由</summary>${panel.html}</details>`:panel.html}</section>`).join('\n')}</div>
${p.takeaway?`<p class="takeaway"><strong>${escape(p.takeaway)}</strong></p>`:''}
</section>`;
  }).join('\n');
  return `<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="以 Wiki 為知識來源的八大行星新手教學簡報，包含基本概念、環境比較與理解檢核。"><title>認識八大行星｜太陽系入門</title><link rel="stylesheet" href="style.css"><script src="app.js" defer></script></head>
<body>
<header class="topbar"><a class="brand" href="#1"><span aria-hidden="true">◎</span> 太陽系入門</a><div class="top-actions"><label class="sr-only" for="chapter">選擇簡報頁面</label><select id="chapter">${pages.map((p,i)=>`<option value="${i}">${p.number}. ${escape(p.title)}</option>`).join('')}</select><button id="fullscreen" type="button">全螢幕</button></div></header>
<main id="deck" tabindex="-1" aria-label="八大行星教學簡報">${slides}</main>
<noscript><style>.slide[hidden]{display:flex!important}body{height:auto}#deck{overflow:visible}</style><p>啟用 JavaScript 可使用左右切頁；目前可向下閱讀全部內容。</p></noscript>
<footer class="controls"><span class="hint">左右方向鍵切頁 <span>／ Home 首頁・End 末頁</span></span><nav aria-label="簡報切頁"><button id="previous" type="button" disabled>上一頁</button><output id="counter" aria-live="polite" aria-atomic="true">1 / ${pages.length}</output><button id="next" class="primary" type="button">下一頁</button></nav></footer>
<div class="progress" aria-hidden="true"><div id="progress-fill"></div></div>
</body></html>\n`;
}
if(require.main===module){const html=render(fs.readFileSync(path.join(__dirname,'copy.md'),'utf8'));fs.writeFileSync(path.join(__dirname,'index.html'),html,'utf8');console.log('Built slides from copy.md');}
module.exports={parseCopy,render};
