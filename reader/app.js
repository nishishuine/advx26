/* ═══════════════════════════════════════════════════════
   百年孤独 · AI 阅读伴侣 — 主逻辑（分页版）
   解析 .bookpack → 左右翻页阅读器 + 按页防剧透
   ═══════════════════════════════════════════════════════ */
(function(){
"use strict";

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const SENT_RE=/[^。！？!?；;：:…」”』\n]+[。！？!?；;：:…」”』\n]*/g;
const PAGE_GAP=56;
let SPAN=0;

let zip=null,manifest,book,theme,aliasMap;
let chars=[],charById={},graph={nodes:[],edges:[]};
let chapterCache={},chapterCharMap={},coverURL="";
let collisionSet=new Set();

const S={
  tab:"read",chapter:1,page:0,totalPages:1,
  threshold:{chapter:1,page:0},
  spoilerAll:false,origMode:"always",dark:false,
  graphMode:"read",graphNet:null,graphFullConfirmed:false,
  timelineFull:false,
  sentences:[],pageChars:[],pageSents:[],appearedChars:new Set(),
  tts:{playing:false,idx:0,rate:1,voice:null},
  paginating:false
};

const PACK_FILE=(()=>{
  try{const q=new URLSearchParams(location.search).get("pack");
    if(q&&/^(upload:)?[^/\\?%*|"<>]+\.bookpack$/i.test(q))return q;
  }catch(e){}
  return "百年孤独.bookpack";
})();
const PKEY=PACK_FILE==="百年孤独.bookpack"?"rc-buddy-cien-anos-v2":("rc-buddy-"+PACK_FILE.replace(/\.bookpack$/i,""));
function savePrefs(){
  try{localStorage.setItem(PKEY,JSON.stringify({
    chapter:S.chapter,threshold:S.threshold,origMode:S.origMode,dark:S.dark,
    ttsRate:S.tts.rate
  }));}catch(e){}
}
function loadPrefs(){
  try{const p=JSON.parse(localStorage.getItem(PKEY)||"{}");
    if(p.chapter)S.chapter=p.chapter;
    if(p.threshold){S.threshold=p.threshold;}
    else if(typeof p.thresholdOld==="number"){S.threshold={chapter:p.thresholdOld,page:9999};}
    if(p.origMode)S.origMode=p.origMode;
    if(p.dark)S.dark=p.dark;
    if(p.ttsRate)S.tts.rate=p.ttsRate;
  }catch(e){}
}

/* ── boot ── */
document.addEventListener("DOMContentLoaded",async()=>{
  loadPrefs();applyTheme();bindUI();
  try{
    const disp=PACK_FILE.replace(/^upload:/i,"").replace(/\.bookpack$/i,"");
    $("#bootText").textContent=`正在打开《${disp}》书包…`;
    if(PACK_FILE.startsWith("upload:")){
      if(typeof PackStore==="undefined")throw 0;
      const buf=await PackStore.get(PACK_FILE.slice(7));
      if(!buf)throw 0;
      await loadPack(buf);
    }else{
      const res=await fetch(encodeURI(PACK_FILE));
      if(!res.ok)throw 0;
      await loadPack(await res.arrayBuffer());
    }
  }catch(e){
    if(typeof EMBEDDED_PACK==="string"&&EMBEDDED_PACK.length>100){
      try{
        const bin=atob(EMBEDDED_PACK);
        const buf=new Uint8Array(bin.length);
        for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
        await loadPack(buf.buffer);
      }catch(e2){showBootError(`未能加载书包「${PACK_FILE}」——请通过本地服务打开本页（在 reader/ 目录运行 python3 -m http.server 8765 后访问 localhost:8765），或直接拖入 .bookpack 文件`);enableDrop();}
    }else{showBootError(`未能加载书包「${PACK_FILE}」——请通过本地服务打开本页（在 reader/ 目录运行 python3 -m http.server 8765 后访问 localhost:8765），或直接拖入 .bookpack 文件`);enableDrop();}
  }
});
function showBootError(msg){$("#bootText").textContent=msg;$(".boot-spinner").style.display="none";}

/* ═══════ load pack ═══════ */
async function loadPack(buf){
  try{
    zip=await JSZip.loadAsync(buf);
    const rd=async n=>JSON.parse(await zip.file(n).async("string"));
    manifest=await rd("manifest.json");book=await rd("book.json");
    theme=await rd("theme.json");aliasMap=await rd("alias_mapping.json");
    chars=(await rd("characters.json")).characters;graph=await rd("graph.json");
    charById={};chars.forEach(c=>{charById[c.id]=c;if(!c.portraitURL)c.portraitURL="";});
    for(const c of chars){
      const f=zip.file(c.portrait);
      if(f){const b=await f.async("blob");const ext=c.portrait.split('.').pop()||'svg';const mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',svg:'image/svg+xml',webp:'image/webp'}[ext]||'image/png';c.portraitURL=URL.createObjectURL(new Blob([b],{type:mime}));}
    }
    const coverPath=book.cover||"cover.svg";const cf=zip.file(coverPath)||zip.file("cover.svg");
    if(cf){const b=await cf.async("blob");const ext=coverPath.split('.').pop();const mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',svg:'image/svg+xml',webp:'image/webp'}[ext]||'image/jpeg';coverURL=URL.createObjectURL(new Blob([b],{type:mime}));}
    computeCollisions();
    S.chapter=Math.min(Math.max(S.chapter,1),book.total_chapters);
    S.threshold.chapter=Math.min(Math.max(S.threshold.chapter,1),book.total_chapters);
    // preload all chapters + compute char maps
    for(let ch=1;ch<=book.total_chapters;ch++){
      const data=await loadChapter(ch);
      const ids=new Set();const re=/\[\[c:(c\d{2})\]\]/g;let m;
      data.paragraphs.forEach(p=>{re.lastIndex=0;while((m=re.exec(p)))ids.add(m[1]);});
      chapterCharMap[ch]=ids;
    }
    $("#bootOverlay").hidden=true;showWelcome();
  }catch(err){console.error(err);showBootError("书包解析失败："+(err&&err.message||err));enableDrop();}
}

function computeCollisions(){collisionSet=new Set();} // badges disabled per user request

/* ═══════ welcome ═══════ */
function showWelcome(){
  $("#welcomeCover").src=coverURL;
  $("#welcomeTitle").textContent=book.title;
  $("#welcomeAuthor").textContent=book.author;
  $("#welcomeStats").innerHTML=`<div><b>${book.total_chapters}</b><span>章</span></div><div><b>${chars.length}</b><span>角色</span></div><div><b>${graph.edges.length}</b><span>关系</span></div>`;
  const v=manifest.integrity&&manifest.integrity.text_verified;
  $("#welcomeIntegrity").textContent=v?"正文标注已通过保真校验":"注意：正文标注未校验";
  $("#welcomeIntegrity").style.color=v?"var(--ok)":"var(--danger)";
  $("#welcomeOverlay").hidden=false;
  $("#btnStart").onclick=()=>{$("#welcomeOverlay").hidden=true;enterApp();};
  $("#fileInput").onchange=async e=>{
    const f=e.target.files[0];if(!f)return;
    $("#welcomeOverlay").hidden=true;$("#bootOverlay").hidden=false;
    $(".boot-spinner").style.display="block";
    $("#bootText").textContent="正在打开《"+f.name.replace(/\.bookpack$/,"")+"》…";
    chapterCache={};S.graphNet=null;
    await loadPack(await f.arrayBuffer());
  };
}

function enterApp(){
  $("#topbar").hidden=false;$("#main").hidden=false;
  $("#tbCover").src=coverURL;$("#tbTitle").textContent=book.title;$("#tbSub").textContent=book.author;
  buildChapterSelect();buildTOC();buildFamilyChips();
  renderAll();bindGlobal();
}

/* ═══════ UI bind ═══════ */
function bindUI(){
  $("#tbTabs").addEventListener("click",e=>{const b=e.target.closest(".tb-tab");if(b)switchTab(b.dataset.tab);});
  $("#btnTheme").onclick=()=>{S.dark=!S.dark;applyTheme();savePrefs();};
  $("#btnSettings").onclick=openSettings;
  $("#settingsClose").onclick=()=>$("#settingsModal").hidden=true;
  $("#btnResetProgress").onclick=()=>{
    S.chapter=1;S.page=0;S.threshold={chapter:1,page:0};savePrefs();
    renderProgress();buildTOC();renderChapter();
    toast("已重置到第 1 章");$("#settingsModal").hidden=true;
  };
  $("#setOrigName").onchange=e=>{S.origMode=e.target.value;savePrefs();renderChapter();};
  $("#btnPrevPage").onclick=()=>prevPage();
  $("#btnNextPage").onclick=()=>nextPage();
  $("#btnTTS").onclick=toggleTTS;
  $("#ttsPlayPause").onclick=toggleTTS;
  // 不使用结束按钮，暂停即可
  $("#ttsRates").addEventListener("click",e=>{
    const b=e.target.closest("button");if(!b)return;
    S.tts.rate=+b.dataset.rate;
    $$("#ttsRates button").forEach(x=>x.classList.toggle("on",x===b));
    savePrefs();
  });
  // 应用已保存的语速
  $$("#ttsRates button").forEach(b=>{if(+b.dataset.rate===S.tts.rate)b.classList.add("on");});
  $("#graphModeSeg").addEventListener("click",e=>{const b=e.target.closest(".seg-btn");if(b)setGraphMode(b.dataset.gmode);});
  $("#btnRelayout").onclick=()=>{if(S.graphNet){S.graphNet.setOptions({physics:true});setTimeout(()=>S.graphNet.setOptions({physics:false}),2500);}};
  $("#btnExportGraph").onclick=exportGraphPNG;
  $("#charSearch").oninput=renderChars;
  $("#charSpoilerAll").onchange=e=>{S.spoilerAll=e.target.checked;renderChars();};
  $("#btnFullTimeline").onclick=()=>{
    S.timelineFull=!S.timelineFull;
    $("#btnFullTimeline").textContent=S.timelineFull?"🔒 回到已读范围":"📖 查看全书时间线";
    renderTimeline();
  };
  $("#askSend").onclick=sendAsk;
  $("#askInput").addEventListener("keydown",e=>{if(e.key==="Enter")sendAsk();});
  $("#charModal").addEventListener("click",e=>{if(e.target.id==="charModal")closeCharCard();});
  $("#confirmModal").addEventListener("click",e=>{if(e.target.id==="confirmModal")cancelConfirm();});
  $("#settingsModal").addEventListener("click",e=>{if(e.target.id==="settingsModal")e.target.hidden=true;});
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){closeCharCard();cancelConfirm();}
    if(S.tab==="read"&&!e.target.matches("input,select,textarea")){
      if(e.key==="ArrowLeft")prevPage();
      if(e.key==="ArrowRight")nextPage();
    }
  });
}

function bindGlobal(){
  $("#chapterContent").addEventListener("click",e=>{const s=e.target.closest(".ch");if(s)openCharCard(s.dataset.cid);});
  $("#chapterContent").addEventListener("mouseover",e=>{const s=e.target.closest(".ch");if(s)showHover(s,e);});
  $("#chapterContent").addEventListener("mouseout",e=>{if(e.target.closest(".ch"))hideHover();});
  $("#legendList").addEventListener("click",e=>{const l=e.target.closest(".legend-item");if(l)openCharCard(l.dataset.cid);});
  $("#tocList").addEventListener("click",e=>{const t=e.target.closest(".toc-item");if(t)gotoChapter(+t.dataset.ch);});
  $("#charsGrid").addEventListener("click",e=>{const t=e.target.closest(".char-tile");if(t)openCharCard(t.dataset.cid);});
  // click on page edges to turn
  $("#readerPages").addEventListener("click",e=>{
    const rect=$("#readerPages").getBoundingClientRect();
    const x=e.clientX-rect.left;
    if(x<rect.width*0.25)prevPage();
    else if(x>rect.width*0.75)nextPage();
  });
  // resize
  let rt=null;
  window.addEventListener("resize",()=>{
    clearTimeout(rt);rt=setTimeout(()=>{
      if(S.tab==="read"&&S.totalPages>1){
        const old=S.page;initPagination();goToPage(Math.min(old,S.totalPages-1),false);
      }
    },250);
  });
  enableDrop();
}

let dropBound=false;
function enableDrop(){
  if(dropBound)return;dropBound=true;
  window.addEventListener("dragover",e=>{e.preventDefault();});
  window.addEventListener("drop",async e=>{
    e.preventDefault();
    const f=[...(e.dataTransfer?.files||[])].find(x=>/\.bookpack$|\.zip$/i.test(x.name));
    if(!f)return;
    $("#bootOverlay").hidden=false;$(".boot-spinner").style.display="block";
    $("#bootText").textContent="正在打开《"+f.name.replace(/\.(bookpack|zip)$/i,"")+"》…";
    chapterCache={};S.graphNet=null;
    await loadPack(await f.arrayBuffer());
  });
}

function applyTheme(){document.body.dataset.theme=S.dark?"dark":"light";$("#btnTheme").textContent=S.dark?"☀️":"🌙";}

/* ═══════ tabs ═══════ */
function switchTab(tab){
  S.tab=tab;
  $$(".tb-tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  $$(".panel").forEach(p=>p.classList.toggle("active",p.id==="panel-"+tab));
  if(tab==="graph"){if(!S.graphNet||S.graphDirty)renderGraph();S.graphDirty=false;}
  if(tab==="chars")renderChars();
  if(tab==="timeline")renderTimeline();
  if(tab==="ask")renderAskIntro();
}
function renderAll(){renderProgress();renderChapter();}

function renderProgress(){
  $("#tbProgress").innerHTML=`读到：<b>第 ${S.chapter} 章</b>·第 ${S.page+1} 页<span> · 防剧透至此</span>`;
  const ss=$("#setProgressText"),st=$("#setThresholdText");
  if(ss)ss.textContent=`第 ${S.chapter} 章 第 ${S.page+1} 页`;
  if(st)st.textContent=`第 ${S.threshold.chapter} 章第 ${(S.threshold.page||0)+1} 页`;
}

/* ═══════ chapter select / toc ═══════ */
function buildChapterSelect(){
  const sel=$("#chapterSelect");if(!sel)return;sel.innerHTML="";
  book.chapters.forEach(ch=>{const o=document.createElement("option");o.value=ch.index;o.textContent=ch.title;sel.appendChild(o);});
  sel.value=S.chapter;
}
function buildTOC(){
  const c=$("#tocList");c.innerHTML="";
  book.chapters.forEach(ch=>{
    const d=document.createElement("div");
    d.className="toc-item"+(ch.index===S.chapter?" cur":"");
    d.dataset.ch=ch.index;
    d.innerHTML=`<span class="toc-no">${ch.index}</span><span>${ch.title}</span>`+
      (ch.index<S.chapter?`<span class="toc-read">✓</span>`:"");
    c.appendChild(d);
  });
}

/* ═══════ chapter loading ═══════ */
async function loadChapter(idx){
  if(chapterCache[idx])return chapterCache[idx];
  const ch=book.chapters[idx-1];
  const data=JSON.parse(await zip.file(ch.file).async("string"));
  chapterCache[idx]=data;return data;
}

function prevChapter(){if(S.chapter>1)gotoChapter(S.chapter-1,"last");}
function nextChapter(){if(S.chapter<book.total_chapters)gotoChapter(S.chapter+1);}

async function gotoChapter(idx,target){
  idx=Math.min(Math.max(idx,1),book.total_chapters);
  if(idx===S.chapter&&target!=="last")return;
  stopTTS();
  S.chapter=idx;S.page=0;
  savePrefs();
  const sel=$("#chapterSelect");if(sel)sel.value=idx;
  buildTOC();renderProgress();
  await renderChapter();
  if(target==="last")goToPage(S.totalPages-1,false);
  else advanceThreshold();
}

/* ═══════ render chapter + pagination ═══════ */
async function renderChapter(){
  const ch=await loadChapter(S.chapter);
  $("#chapterTitle").textContent=ch.title;
  $("#chapterMeta").textContent=`第 ${ch.index} 章 · 约 ${ch.paragraphs.length} 段`;
  const shownOrig=new Set();
  const ctx={sid:0,sentences:[]};
  let html="";
  ch.paragraphs.forEach(p=>{html+=`<p>${renderPara(p,shownOrig,ctx)}</p>`;});
  S.sentences=ctx.sentences;
  // Disable transition before changing content to avoid rollback animation
  const content=$("#chapterContent");
  content.style.transition="none";
  content.innerHTML=html;
  content.style.transform="none";
  // Force layout, then restore transition
  void content.offsetHeight;
  content.style.transition="";
  // wait for layout
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  initPagination();
  goToPage(0,false);
  updatePageButtons();
}

function initPagination(){
  const pages=$("#readerPages"),content=$("#chapterContent");
  const pw=pages.clientWidth-12;  // 减12px留右边距，防右边缘裁字
  if(pw<=0)return;
  SPAN=pw+PAGE_GAP;
  content.style.columnWidth=pw+"px";
  content.style.columnGap=PAGE_GAP+"px";
  content.style.transform="none";
  const totalW=content.scrollWidth;
  S.totalPages=Math.max(1,Math.round((totalW+PAGE_GAP)/SPAN));
  computePageMapping();
  $("#pageIndicator").innerHTML=`<b>1</b> / ${S.totalPages}`;
}

function computePageMapping(){
  S.pageChars=[];S.pageSents=[];
  const container=$("#readerPages");
  const cRect=container.getBoundingClientRect();
  const content=$("#chapterContent");
  const oldT=content.style.transform;
  content.style.transform="none";
  const walk=el=>{
    if(el.nodeType!==1)return;
    if(el.classList){
      if(el.classList.contains("ch")){
        const r=el.getBoundingClientRect();
        const left=r.left-cRect.left;
        const pg=Math.max(0,Math.min(S.totalPages-1,Math.floor((left+SPAN*0.5)/SPAN)));
        if(!S.pageChars[pg])S.pageChars[pg]=new Set();
        S.pageChars[pg].add(el.dataset.cid);
      }
      if(el.classList.contains("sent")&&el.dataset.sid!==undefined){
        const r=el.getBoundingClientRect();
        const left=r.left-cRect.left;
        const pg=Math.max(0,Math.min(S.totalPages-1,Math.floor((left+SPAN*0.5)/SPAN)));
        if(!S.pageSents[pg])S.pageSents[pg]=[];
        S.pageSents[pg].push(+el.dataset.sid);
      }
    }
    if(el.childNodes)el.childNodes.forEach(walk);
  };
  walk(content);
  content.style.transform=oldT;
}

function goToPage(idx,advance){
  idx=Math.max(0,Math.min(idx,S.totalPages-1));
  S.page=idx;
  $("#chapterContent").style.transform=`translateX(${-idx*SPAN}px)`;
  $("#pageIndicator").innerHTML=`<b>${idx+1}</b> / ${S.totalPages}`;
  updateAppearedChars();renderLegend();updatePageButtons();
  if(advance!==false)advanceThreshold();
}

function advanceThreshold(){
  const cur=S.chapter*100000+S.page;
  const thr=(S.threshold.chapter||1)*100000+(S.threshold.page||0);
  if(cur>thr){S.threshold={chapter:S.chapter,page:S.page};savePrefs();renderProgress();}
}

function updatePageButtons(){
  $("#btnPrevPage").disabled=S.chapter<=1&&S.page<=0;
  $("#btnNextPage").disabled=S.chapter>=book.total_chapters&&S.page>=S.totalPages-1;
}

function nextPage(){
  if(S.page<S.totalPages-1)goToPage(S.page+1);
  else if(S.chapter<book.total_chapters)nextChapter();
}
function prevPage(){
  if(S.page>0)goToPage(S.page-1,false);
  else if(S.chapter>1)prevChapter();
}

function updateAppearedChars(){
  const set=new Set();
  for(let ch=1;ch<S.chapter;ch++){if(chapterCharMap[ch])chapterCharMap[ch].forEach(id=>set.add(id));}
  for(let p=0;p<=S.page;p++){if(S.pageChars[p])S.pageChars[p].forEach(id=>set.add(id));}
  // Also include threshold if we're behind it
  for(let ch=1;ch<=S.threshold.chapter;ch++){if(ch<S.chapter&&chapterCharMap[ch])chapterCharMap[ch].forEach(id=>set.add(id));}
  S.appearedChars=set;
  S.graphDirty=true;
}

/* ═══════ paragraph rendering ═══════ */
let aliasRegex=null;
function buildAliasRegex(){
  const names=Object.keys(aliasMap).filter(n=>n.length>=2)
    .sort((a,b)=>b.length-a.length)
    .map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  if(!names.length)return null;
  return new RegExp("("+names.join("|")+")","g");
}
function cleanFootnotes(s){return s;} // footnotes preserved per user request
function aliasSplit(text){
  text=cleanFootnotes(text);
  if(!aliasRegex)aliasRegex=buildAliasRegex();
  if(!aliasRegex)return[{t:"text",s:text}];
  const result=[];let last=0;let m;
  aliasRegex.lastIndex=0;
  while((m=aliasRegex.exec(text))){
    if(m.index>last)result.push({t:"text",s:text.slice(last,m.index)});
    result.push({t:"char",cid:aliasMap[m[0]],s:m[0]});
    last=m.index+m[0].length;
  }
  if(last<text.length)result.push({t:"text",s:text.slice(last)});
  return result;
}
function enrichAtoms(atoms){
  const result=[];
  for(const a of atoms){
    if(a.t==="char"){result.push(a);continue;}
    result.push(...aliasSplit(a.s));
  }
  return result;
}
function parsePara(text){
  const out=[];let last=0;const re=/\[\[c:(c\d{2})\]\]([\s\S]*?)\[\[\/\]\]/g;let m;
  while((m=re.exec(text))){
    if(m.index>last)out.push({t:"text",s:text.slice(last,m.index)});
    out.push({t:"char",cid:m[1],s:m[2]});last=m.index+m[0].length;
  }
  if(last<text.length)out.push({t:"text",s:text.slice(last)});
  return out;
}
function renderPara(text,shownOrig,ctx){
  let atoms=parsePara(text);
  atoms=enrichAtoms(atoms); // alias fallback for untagged mentions
  let buf="",sid=ctx.sid;ctx.html="";
  const flush=()=>{
    if(buf){
      const tmp=document.createElement("div");tmp.innerHTML=buf;
      ctx.sentences.push({sid:sid,text:tmp.textContent});
      ctx.html+=`<span class="sent" data-sid="${sid}">${buf}</span>`;buf="";
    }
  };
  for(const a of atoms){
    if(a.t==="char"){buf+=charSpanHTML(a,shownOrig);continue;}
    const parts=a.s.match(SENT_RE)||[a.s];
    for(const part of parts){
      if(!part)continue;
      buf+=esc(part);
      if(/[。！？!?；;：:…」”』\n]$/.test(part)){flush();sid++;}
    }
  }
  flush();ctx.sid=sid;return ctx.html;
}
function charSpanHTML(a,shownOrig){
  const c=charById[a.cid];if(!c)return esc(a.s);
  let orig="";
  if(c.original_name&&book.source_language!==book.language){
    const show=S.origMode==="always"||(S.origMode==="first"&&!shownOrig.has(c.id));
    if(show){orig=`<span class="orig">（${esc(c.original_name)}）</span>`;shownOrig.add(c.id);}
  }
  const badge=collisionSet.has(c.id)&&c.badge?`<sup class="bdg">${c.badge}</sup>`:"";
  return `<span class="ch" data-cid="${c.id}" style="--cc:${c.color}">${esc(a.s)}${badge}${orig}</span>`;
}

/* ═══════ legend (appeared chars) ═══════ */
function renderLegend(){
  const list=[...S.appearedChars].map(id=>charById[id]).filter(Boolean)
    .sort((a,b)=>(a.first_chapter-b.first_chapter)||(a.name>b.name?1:-1));
  $("#legendCount").textContent=`(${list.length})`;
  $("#legendList").innerHTML=list.map(c=>
    `<div class="legend-item" data-cid="${c.id}" style="--cc:${c.color}">
      <span class="legend-dot" style="background:${c.color};--cc:${c.color}"></span>
      <span class="legend-name">${esc(c.short_name||c.name)}</span>
      ${collisionSet.has(c.id)&&c.badge?`<span class="legend-badge">${c.badge}</span>`:""}
    </div>`).join("");
}

/* ═══════ hover card ═══════ */
let hoverTimer=null;
function showHover(span, evt){
  clearTimeout(hoverTimer);
  hoverTimer=setTimeout(()=>{
    const c=charById[span.dataset.cid];if(!c)return;
    const appeared=S.appearedChars.has(c.id);
    $("#hoverCard").innerHTML=`
      <div class="hc-top" style="--cc:${c.color}">
        <img src="${c.portraitURL}" alt="">
        <div><div class="hc-name">${esc(c.name)}${collisionSet.has(c.id)&&c.badge?` <span class="cc-badge">${c.badge}</span>`:""}</div>
        <div class="hc-orig">${esc(c.original_name||"")}</div></div>
      </div>
      <div class="hc-id">${appeared?esc(c.identity||""):"该角色尚未在你读到的位置出场"}</div>
      <div class="hc-hint">${appeared?"点击查看详情":"继续阅读即可认识 TA"}</div>`;
    const hc=$("#hoverCard");hc.hidden=false;
    // Position relative to mouse cursor (more reliable than span rect in multi-column layout)
    let x=evt.clientX,y=evt.clientY-16;
    if(x+270>window.innerWidth)x=window.innerWidth-280;
    if(y+hc.offsetHeight>window.innerHeight)y=evt.clientY+16;
    hc.style.left=Math.max(8,x)+"px";hc.style.top=Math.max(8,y)+"px";
  },220);
}
function hideHover(){clearTimeout(hoverTimer);$("#hoverCard").hidden=true;}

/* ═══════ character card ═══════ */
function openCharCard(cid){
  const c=charById[cid];if(!c)return;hideHover();
  const appeared=S.appearedChars.has(c.id);
  // events: only from chapters strictly before current
  const pastEvents=(c.key_events||[]).filter(e=>e.chapter<S.chapter);
  const currentEvents=(c.key_events||[]).filter(e=>e.chapter===S.chapter);
  const futureEvents=(c.key_events||[]).filter(e=>e.chapter>S.chapter);
  // relations: from chapters < current, or current chapter if both appeared
  const visRels=(c.relations||[]).filter(r=>{
    const minCh=Math.min(...(r.based_on_chapters||[99]));
    if(minCh<S.chapter)return true;
    if(minCh===S.chapter&&appeared&&S.appearedChars.has(r.target_id))return true;
    return false;
  });

  let relsHTML=visRels.length?visRels.map(r=>{
    const t=charById[r.target_id];if(!t)return"";
    const orig=t.original_name?`<span class="cc-rel-orig">${esc(t.original_name)}</span>`:"";
    return `<div class="cc-rel" data-jump="${t.id}">
      <img src="${t.portraitURL}" alt="">
      <span class="cc-rel-name">${esc(t.name)}${orig}</span>
      <span class="cc-rel-label">${esc(r.label||r.type)} · ${esc(r.type)}</span></div>`;
  }).join(""):`<div class="cc-hidden-note">截至当前进度，尚无已出场的关系</div>`;

  let eventsHTML=pastEvents.length?pastEvents.map(e=>
    `<div class="cc-event"><span class="cc-event-ch">第${e.chapter}章</span><span>${esc(e.event)}</span></div>`
  ).join(""):`<div class="cc-hidden-note">前几章暂无该角色的事迹记录</div>`;
  if(currentEvents.length)eventsHTML+=`<div class="cc-hidden-note">本章还有 ${currentEvents.length} 段事迹，读完本章后可见</div>`;
  if(futureEvents.length)eventsHTML+=`<div class="cc-hidden-note">后续章节还有 ${futureEvents.length} 段事迹…</div>`;

  // Full versions (for "查看完整介绍")
  const allEvents=c.key_events||[];
  let fullEventsHTML=allEvents.length?allEvents.map(e=>
    `<div class="cc-event"><span class="cc-event-ch">第${e.chapter}章</span><span>${esc(e.event)}</span></div>`
  ).join(""):`<div class="cc-hidden-note">暂无事迹记录</div>`;
  const allRels=c.relations||[];
  let fullRelsHTML=allRels.length?allRels.map(r=>{
    const t=charById[r.target_id];if(!t)return"";
    const orig=t.original_name?`<span class="cc-rel-orig">${esc(t.original_name)}</span>`:"";
    return `<div class="cc-rel" data-jump="${t.id}">
      <img src="${t.portraitURL}" alt="">
      <span class="cc-rel-name">${esc(t.name)}${orig}</span>
      <span class="cc-rel-label">${esc(r.label||r.type)} · ${esc(r.type)}</span></div>`;
  }).join(""):"";

  $("#charCard").style.setProperty("--cc",c.color);
  $("#charCard").innerHTML=`
    <button class="cc-close">×</button>
    <div class="cc-head" style="--cc:${c.color}">
      <img class="cc-portrait" src="${c.portraitURL}" alt="">
      <div class="cc-nameblock">
        <div class="cc-name">${esc(c.name)}</div>
        <div class="cc-orig">${esc(c.original_name||"")}</div>
        <div class="cc-tags">
          <span class="cc-tag family">${esc(c.family||"")}</span>
          <span class="cc-tag">第 ${c.first_chapter} 章登场</span>
          ${!appeared?`<span class="cc-tag" style="color:var(--danger);border-color:var(--danger)">⚠️ 尚未出场</span>`:""}
        </div>
      </div>
    </div>
    <div class="cc-body">
      <div class="cc-section"><div class="cc-section-title" id="ccEventsTitle">已读章节的事迹（第 1–${S.chapter-1} 章）</div>
        <div class="cc-events" id="ccEvents">${eventsHTML}</div></div>
      <div class="cc-section"><div class="cc-section-title" id="ccRelsTitle">人物关系（已读范围）</div>
        <div class="cc-rels" id="ccRels">${relsHTML}</div></div>
      <div class="cc-spoiler" id="ccSpoiler" hidden>
        <div class="cc-spoiler-title">⚠️ 完整介绍（含剧透）</div>
        <div class="cc-spoiler-text">${esc(c.full_description||"—")}</div>
        <div class="cc-spoiler-title" style="margin-top:16px">📝 角色分析</div>
        <div class="cc-spoiler-text" style="line-height:1.8">${esc(c.analysis||"—")}</div></div>
    </div>
    <div class="cc-foot">
      <button class="btn-ghost" id="ccAsk">💬 问 AI</button>
      <button class="btn-ghost" id="ccFull">🔓 查看完整介绍</button>
    </div>`;
  $("#charModal").hidden=false;
  $(".cc-close").onclick=closeCharCard;
  $("#ccAsk").onclick=()=>{closeCharCard();switchTab("ask");$("#askInput").value=`${c.short_name||c.name}是谁？`;sendAsk();};
  $("#ccFull").onclick=()=>{
    $("#ccSpoiler").hidden=false;$("#ccFull").hidden=true;
    $("#ccEvents").innerHTML=fullEventsHTML;
    $("#ccRels").innerHTML=fullRelsHTML;
    $("#ccEventsTitle").textContent="完整事迹（全书）";
    $("#ccRelsTitle").textContent="完整人物关系（全书）";
    $$("#charCard .cc-rel").forEach(el=>el.onclick=()=>openCharCard(el.dataset.jump));
  };
  $$("#charCard .cc-rel").forEach(el=>el.onclick=()=>openCharCard(el.dataset.jump));
}
function closeCharCard(){$("#charModal").hidden=true;}

/* ═══════ confirm ═══════ */
function confirmOpen(title,text,cb){
  $("#confirmTitle").textContent=title;$("#confirmText").textContent=text;confirmCb=cb;
  $("#confirmModal").hidden=false;
  $("#confirmYes").onclick=()=>{cancelConfirm();cb&&cb();};
  $("#confirmNo").onclick=cancelConfirm;
}
function cancelConfirm(){$("#confirmModal").hidden=true;}
function openSettings(){renderProgress();$("#setOrigName").value=S.origMode;$("#settingsModal").hidden=false;}

/* ═══════ graph ═══════ */
function edgeColor(type){return{血缘:"#1E5FBF",爱情:"#E91E63",友情:"#2E7D32",仇恨:"#C0392B"}[type]||"#8d8d8d";}
function setGraphMode(mode){
  S.graphMode=mode;updateGraphSeg();renderGraph();
}
function updateGraphSeg(){$$("#graphModeSeg .seg-btn").forEach(b=>b.classList.toggle("active",b.dataset.gmode===S.graphMode));}
function graphData(){
  const appeared=S.appearedChars;
  const useFull=S.graphMode==="full";
  // Canvas 不支持 CSS var()，预先解析为实际颜色
  const css=getComputedStyle(document.body);
  const paper=css.getPropertyValue("--paper").trim()||"#fdfaf1";
  const ink=css.getPropertyValue("--ink").trim()||"#2a2218";
  const muted=css.getPropertyValue("--muted").trim()||"#948668";
  const nodes=graph.nodes.filter(n=>useFull||appeared.has(n.id)).map(n=>{
    const c=charById[n.id];
    return{id:n.id,label:c?c.name:n.label,
      shape:"circularImage",image:c?c.portraitURL:"",
      color:{border:n.color,background:paper,hover:{border:n.color,background:paper},highlight:{border:n.color,background:paper}},
      borderWidth:3,size:28,
      font:{size:11,color:ink,face:"Songti SC",multi:"html"},
      title:n.label+(c?`（第${c.first_chapter}章登场）`:"")};
  });
  const ns=new Set(nodes.map(n=>n.id));
  const edges=graph.edges.filter(e=>{
    if(!useFull){if(!ns.has(e.source)||!ns.has(e.target))return false;
      const minCh=Math.min(...(e.based_on_chapters||[99]));
      if(minCh>=S.chapter&&!appeared.has(e.source))return false;
      if(minCh>S.chapter)return false;
    }
    return true;
  }).map((e,i)=>({id:"e"+i,from:e.source,to:e.target,label:e.label||"",
    color:{color:edgeColor(e.type),highlight:edgeColor(e.type)},
    font:{size:10,color:muted,align:"middle",strokeWidth:0},
    width:1.6,smooth:{enabled:true,type:"curvedCW",roundness:.2}}));
  return{nodes,edges};
}
function renderGraph(){
  if(typeof vis==="undefined"){toast("图谱库未加载");return;}
  const{nodes,edges}=graphData();
  $("#graphStats").innerHTML=`当前 <b>${nodes.length}</b> 个角色 · <b>${edges.length}</b> 条关系`+
    (S.graphMode==="read"?`（已读至第 ${S.chapter} 章第 ${S.page+1} 页）`:"（全书，含剧透）");
  const data={nodes:new vis.DataSet(nodes),edges:new vis.DataSet(edges)};
  const opt={physics:{enabled:true,barnesHut:{gravitationalConstant:-8000,springLength:200,centralGravity:.08,damping:.4,avoidOverlap:.8}},
    interaction:{hover:true,tooltipDelay:120,zoomView:true,dragView:true},edges:{smooth:true}};
  if(S.graphNet)S.graphNet.destroy();
  S.graphNet=new vis.Network($("#graphCanvas"),data,opt);
  S.graphNet.on("click",p=>{if(p.nodes.length>0)openCharCard(p.nodes[0]);});
  S.graphNet.once("stabilizationIterationsDone",()=>S.graphNet.setOptions({physics:false}));

  // Hover: 预计算邻居表 + 深拷贝样式快照
  // 关键修复：
  //  1) vis-network 的形状(边框/背景)透明度走 color.opacity，而非顶层 opacity
  //     （顶层 opacity 只影响 circularImage 的图片 globalAlpha）
  //  2) 若传入与上次相同的对象引用，vis 会跳过该节点的重绘
  //     —— 故每次 update 都用深拷贝，确保引用变化触发重绘
  const nDS=data.nodes, eDS=data.edges;
  const snap={nodes:[...nodes],edges:[...edges]};

  // 邻居表
  const nbr=Object.create(null);
  snap.nodes.forEach(o=>{nbr[o.id]=new Set();});
  snap.edges.forEach(e=>{if(nbr[e.from])nbr[e.from].add(e.to);if(nbr[e.to])nbr[e.to].add(e.from);});

  // 预计算 active / dim 两套样式（深拷贝；dim 版带 color.opacity 让边框/背景也变灰）
  const DIM=0.12, DIM_E=0.06;
  const act=Object.create(null), dim=Object.create(null);
  snap.nodes.forEach(o=>{
    const fc=JSON.parse(JSON.stringify(o.color));
    const dc=JSON.parse(JSON.stringify(o.color)); dc.opacity=DIM;
    const ff=JSON.parse(JSON.stringify(o.font));
    const df=JSON.parse(JSON.stringify(o.font)); df.color="transparent";
    act[o.id]={opacity:1,font:ff,color:fc};
    dim[o.id]={opacity:DIM,font:df,color:dc};
  });

  S.graphNet.on("hoverNode",p=>{
    const hid=p.node;
    const nb=nbr[hid]||new Set();
    nDS.update(snap.nodes.map(o=>{
      const s=(o.id===hid||nb.has(o.id))?act[o.id]:dim[o.id];
      return{id:o.id,opacity:s.opacity,font:s.font,color:s.color};
    }));
    eDS.update(snap.edges.map(o=>{
      if(o.from===hid||o.to===hid)return{id:o.id,color:JSON.parse(JSON.stringify(o.color)),font:JSON.parse(JSON.stringify(o.font))};
      const bc=o.color.color||(typeof o.color==="string"?o.color:"#8d8d8d");
      return{id:o.id,color:{color:bc,opacity:DIM_E,highlight:bc,hover:bc},font:Object.assign({},o.font,{color:"transparent"})};
    }));
  });
  S.graphNet.on("blurNode",()=>{
    nDS.update(snap.nodes.map(o=>{const s=act[o.id];return{id:o.id,opacity:s.opacity,font:s.font,color:s.color};}));
    eDS.update(snap.edges.map(o=>({id:o.id,color:JSON.parse(JSON.stringify(o.color)),font:JSON.parse(JSON.stringify(o.font))})));
  });
}
function exportGraphPNG(){
  if(!S.graphNet){toast("图谱未就绪");return;}
  S.graphNet.setOptions({physics:false});
  setTimeout(()=>{const cv=S.graphNet.canvas.frame.canvas;
    const a=document.createElement("a");a.download="百年孤独-关系图.png";a.href=cv.toDataURL("image/png");a.click();
    toast("已导出关系图 PNG");},300);
}

/* ═══════ characters ═══════ */
let familyFilter="all";
function buildFamilyChips(){
  const fams=[...new Set(chars.map(c=>c.family||"其他"))];
  $("#familyChips").innerHTML=`<span class="chip active" data-fam="all">全部</span>`+
    fams.map(f=>`<span class="chip" data-fam="${esc(f)}">${esc(f)}</span>`).join("");
  $$("#familyChips .chip").forEach(el=>el.onclick=()=>{
    familyFilter=el.dataset.fam;$$("#familyChips .chip").forEach(x=>x.classList.toggle("active",x===el));renderChars();});
}
function renderChars(){
  const q=($("#charSearch").value||"").trim().toLowerCase();
  let shown=0,hidden=0;
  const html=chars.filter(c=>{
    if(!S.appearedChars.has(c.id)&&!S.spoilerAll){hidden++;return false;}
    if(familyFilter!=="all"&&(c.family||"其他")!==familyFilter)return false;
    if(q){const hay=(c.name+" "+(c.original_name||"")+" "+(c.aliases||[]).join(" ")).toLowerCase();if(!hay.includes(q))return false;}
    shown++;return true;
  }).map(c=>{
    const appeared=S.appearedChars.has(c.id);
    return `<div class="char-tile" data-cid="${c.id}" style="--cc:${c.color}">
      <div class="char-tile-bar" style="background:${c.color}"></div>
      <div class="char-tile-body"><img class="portrait" src="${c.portraitURL}" alt="">
        <div class="char-tile-info">
          <div class="char-tile-name">${esc(c.name)}${collisionSet.has(c.id)&&c.badge?`<span class="char-tile-badge">${c.badge}</span>`:""}</div>
          <div class="char-tile-orig">${esc(c.original_name||"")}</div>
          <div class="char-tile-id">${esc(c.identity||"")}</div></div></div>
      <div class="char-tile-foot"><span>${esc(c.family||"")}</span><span>${appeared?"已出场":"第 "+c.first_chapter+" 章"}</span></div>
    </div>`;}).join("");
  $("#charsGrid").innerHTML=html||`<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted)">没有匹配的角色</div>`;
  $("#charsHiddenNote").textContent=hidden>0?`还有 ${hidden} 位角色将在后续页面登场（勾选"显示未登场角色"可查看）`:"";
}

/* ═══════ timeline ═══════ */
function highlightEventText(text){
  if(!aliasRegex)aliasRegex=buildAliasRegex();
  if(!aliasRegex)return esc(text);
  let html="",last=0,m;
  aliasRegex.lastIndex=0;
  while((m=aliasRegex.exec(text))){
    if(m.index>last)html+=esc(text.slice(last,m.index));
    const c=charById[aliasMap[m[0]]];
    if(c){
      const orig=c.original_name?`<span class="tl-event-orig">${esc(c.original_name)}</span>`:"";
      html+=`<span class="tl-event-char" style="color:${c.color}" data-cid="${c.id}">${esc(m[0])}${orig}</span>`;
    }else html+=esc(m[0]);
    last=m.index+m[0].length;
  }
  if(last<text.length)html+=esc(text.slice(last));
  return html;
}
function renderTimeline(){
  if(S.timelineFull){
    $("#tlNote").innerHTML=`正在显示 <b>全书 ${book.total_chapters} 章</b> 的时间线（含剧透）`;
  }else{
    $("#tlNote").innerHTML=`时间线展示 <b>第 1–${S.chapter} 章</b> 的事件${
      S.chapter<book.total_chapters?`（全书共 ${book.total_chapters} 章）`:"（已读完全书）"}`;
  }
  const byCh={};
  chars.forEach(c=>{
    (c.key_events||[]).forEach(e=>{
      if(!S.timelineFull&&e.chapter>S.chapter)return;
      (byCh[e.chapter]=byCh[e.chapter]||[]).push({c,event:e.event});
    });
  });
  const chs=Object.keys(byCh).map(Number).sort((a,b)=>a-b);
  if(!chs.length){$("#tlList").innerHTML=`<div style="text-align:center;padding:40px;color:var(--muted)">暂无可展示的事件</div>`;return;}
  $("#tlList").innerHTML=chs.map(ch=>
    `<div class="tl-chapter"><div class="tl-chapter-head">第 ${ch} 章</div>
    ${(byCh[ch]).map(({c,event})=>{
      const orig=c.original_name?`<span class="tl-event-orig">${esc(c.original_name)}</span>`:"";
      return `<div class="tl-event" style="--cc:${c.color}">
        <span class="tl-event-content"><span class="tl-event-char" style="color:${c.color}" data-cid="${c.id}">${esc(c.name)}${orig}</span>${highlightEventText(event)}</span>
      </div>`;
    }).join("")}
    </div>`).join("");
  $$("#tlList .tl-event-char").forEach(el=>{el.onclick=()=>openCharCard(el.dataset.cid);});
}

/* ═══════ ask ═══════ *//* ═══════ ask ═══════ */
function renderAskIntro(){
  $("#askIntro").innerHTML=`我只根据你已读到的 <b>第 ${S.chapter} 章·第 ${S.page+1} 页</b> 为止的内容回答，绝不剧透后面的事。
    <span class="ask-hint">由本地演示引擎回答（基于预处理数据），接入 LLM API 后可自由提问。</span>`;
  const known=chars.filter(c=>S.appearedChars.has(c.id));
  const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
  const chips=[];
  if(known.length){
    const a=pick(known);chips.push(`${a.short_name||a.name}是谁？`);
    if(known.length>1){let b=pick(known),t=0;while(b.id===a.id&&t++<5)b=pick(known);
      chips.push(`${a.short_name||a.name}和${b.short_name||b.name}什么关系？`);}
  }
  if(S.chapter>1)chips.push(`第${Math.max(1,S.chapter-1)}章发生了什么？`);
  chips.push("帮我梳理布恩迪亚家族的主要人物");
  $("#askChips").innerHTML=chips.map(c=>`<span class="ask-chip">${esc(c)}</span>`).join("");
  $$("#askChips .ask-chip").forEach(el=>el.onclick=()=>{$("#askInput").value=el.textContent;sendAsk();});
  if(!$("#askLog").children.length){
    $("#askLog").innerHTML=`<div class="ask-bubble ai">你好！我是你的阅读伴侣。试试上面的问题，或直接问我「某角色是谁」「两人什么关系」。我只知道你已读到的第 ${S.chapter} 章第 ${S.page+1} 页为止的内容。</div>`;
  }
}
function sendAsk(){
  const q=($("#askInput").value||"").trim();if(!q)return;
  $("#askInput").value="";
  const log=$("#askLog");
  log.insertAdjacentHTML("beforeend",`<div class="ask-bubble user">${esc(q)}</div>`);
  log.scrollTop=log.scrollHeight;
  setTimeout(()=>{log.insertAdjacentHTML("beforeend",`<div class="ask-bubble ai">${answerQuery(q)}</div>`);log.scrollTop=log.scrollHeight;},180);
}
function findMentioned(q){
  const found=new Map();
  Object.entries(aliasMap).sort((a,b)=>b[0].length-a[0].length).forEach(([name,id])=>{
    if(q.includes(name)&&!found.has(id))found.set(id,charById[id]);});
  chars.sort((a,b)=>b.name.length-a.name.length).forEach(c=>{if(q.includes(c.name))found.set(c.id,c);});
  return[...found.values()];
}
function answerQuery(q){
  const mentioned=findMentioned(q);
  const chM=q.match(/第\s*(\d+)\s*章/);const chNum=chM?+chM[1]:0;
  const future=mentioned.filter(c=>!S.appearedChars.has(c.id));
  if(future.length){
    return future.map(c=>`「${c.short_name||c.name}」${c.first_chapter>S.chapter?`在第 <b>${c.first_chapter}</b> 章才会登场`:"尚未在你读到的位置出场"}，继续阅读就会揭晓，我不剧透。`).join("<br>");
  }
  if(mentioned.length>=2&&/关系|认识|什么关系|和.{0,8}什么/.test(q)){
    const[a,b]=mentioned;
    const rels=(a.relations||[]).filter(r=>r.target_id===b.id&&Math.min(...(r.based_on_chapters||[99]))<S.chapter);
    const rels2=(b.relations||[]).filter(r=>r.target_id===a.id&&Math.min(...(r.based_on_chapters||[99]))<S.chapter);
    const all=[...rels,...rels2];
    if(all.length)return `截至当前进度，<span class="ai-char" style="color:${a.color}">${esc(a.short_name||a.name)}</span> 与 <span class="ai-char" style="color:${b.color}">${esc(b.short_name||b.name)}</span> 的关系：`+all.map(r=>`<b>${esc(r.label||r.type)}</b>（${esc(r.type)}）`).join("、")+"。";
    return `截至当前进度，书中还没有直接写到 TA 们的明确关系。继续往后读看看？`;
  }
  if(mentioned.length>=1&&(/是谁|什么人|介绍|是谁来着/.test(q))){
    const c=mentioned[0];
    const evs=(c.key_events||[]).filter(e=>e.chapter<S.chapter).slice(0,3);
    let s=`<span class="ai-char" style="color:${c.color}">${esc(c.name)}</span>：${esc(c.identity||"")}。`;
    if(evs.length)s+=" 已知事迹："+evs.map(e=>`第${e.chapter}章${esc(e.event)}`).join("；")+"。";
    if(c.key_events&&c.key_events.some(e=>e.chapter>=S.chapter))s+=" 本章及后续的事迹等你读完再聊。";
    return s;
  }
  if(mentioned.length>=1&&chNum){
    const c=mentioned[0];
    if(chNum>=S.chapter)return `第 ${chNum} 章你还没读完哦，防剧透，读完再来问我。`;
    const evs=(c.key_events||[]).filter(e=>e.chapter===chNum);
    if(evs.length)return `在第 ${chNum} 章，<span class="ai-char" style="color:${c.color}">${esc(c.short_name||c.name)}</span>：`+evs.map(e=>esc(e.event)).join("；")+"。";
    return `第 ${chNum} 章的记录里，没有专门提到 ${esc(c.short_name||c.name)} 的关键事迹。`;
  }
  if(chNum){
    if(chNum>=S.chapter)return `第 ${chNum} 章你还没读完哦，防剧透，读完再来问我。`;
    const evs=[];chars.forEach(c=>{(c.key_events||[]).forEach(e=>{if(e.chapter===chNum)evs.push({c,e:e.event});});});
    if(!evs.length)return `第 ${chNum} 章没有特别记录的关键事件。`;
    return `第 ${chNum} 章里：`+evs.slice(0,6).map(({c,e})=>`<span class="ai-char" style="color:${c.color}">${esc(c.short_name||c.name)}</span>${esc(e)}`).join("；")+"。";
  }
  if(mentioned.length>=1&&/做了什么|经历|事迹|干了什么/.test(q)){
    const c=mentioned[0];
    const evs=(c.key_events||[]).filter(e=>e.chapter<S.chapter);
    if(!evs.length)return `截至当前进度，还没有 ${esc(c.short_name||c.name)} 的事迹记录。`;
    return `<span class="ai-char" style="color:${c.color}">${esc(c.short_name||c.name)}</span> 截至第 ${S.chapter-1} 章：`+evs.map(e=>`第${e.chapter}章${esc(e.event)}`).join("；")+"。";
  }
  if(/家族|布恩迪亚|主要人物|梳理|都有谁/.test(q)){
    const fam=chars.filter(c=>(c.family||"").includes("布恩迪亚")&&S.appearedChars.has(c.id));
    return `已出场范围内的布恩迪亚家族成员（共 ${fam.length} 位）：`+
      fam.map(c=>`<span class="ai-char" style="color:${c.color}">${esc(c.short_name||c.name)}</span>（${esc((c.identity||"").slice(0,16))}）`).join("、")+"。";
  }
  if(mentioned.length===1){
    const c=mentioned[0];
    return `<span class="ai-char" style="color:${c.color}">${esc(c.name)}</span>：${esc(c.identity||"")}。想了解更多可以问"TA做了什么"或"TA和某某什么关系"。`;
  }
  return `这个问题我不太确定怎么回答。试试问：<br>· 「${mentioned[0]?(mentioned[0].short_name||mentioned[0].name):'奥雷里亚诺·布恩迪亚'}是谁？」<br>· 「A 和 B 什么关系？」<br>· 「第 ${Math.max(1,S.chapter-1)} 章发生了什么？」`;
}

/* ═══════ TTS ═══════ */
function pickVoice(){const vs=speechSynthesis.getVoices();S.tts.voice=vs.find(v=>/zh|cmn/i.test(v.lang))||vs.find(v=>/Chinese/i.test(v.name))||null;}
if(window.speechSynthesis){speechSynthesis.onvoiceschanged=pickVoice;pickVoice();}
function toggleTTS(){
  if(!window.speechSynthesis){toast("当前浏览器不支持语音合成");return;}
  if(S.tts.playing){
    speechSynthesis.cancel();S.tts.playing=false;
    clearSpeaking();
    $("#ttsPlayPause").textContent="▶";
    return;
  }
  if(!S.sentences.length){toast("正在加载，请稍候");return;}
  if(!S.tts.voice)pickVoice();
  S.tts.playing=true;
  $("#ttsBar").hidden=false;$("#ttsPlayPause").textContent="⏸";
  $("#btnTTS").classList.add("active");
  speakNext();
}
function speakNext(){
  if(!S.tts.playing)return;
  if(S.tts.idx>=S.sentences.length){stopTTS();toast("本章朗读完毕");return;}
  const s=S.sentences[S.tts.idx];
  highlightSentence(s.sid);
  const u=new SpeechSynthesisUtterance(s.text);u.lang="zh-CN";u.rate=S.tts.rate;
  if(S.tts.voice)u.voice=S.tts.voice;
  u.onend=()=>{S.tts.idx++;speakNext();};
  u.onerror=()=>{S.tts.idx++;speakNext();};
  speechSynthesis.speak(u);
  $("#ttsInfo").textContent=`第 ${S.tts.idx+1} / ${S.sentences.length} 句`;
}
function stopTTS(){
  if(!window.speechSynthesis)return;
  S.tts.playing=false;speechSynthesis.cancel();
  const bar=$("#ttsBar");if(bar)bar.hidden=true;clearSpeaking();
  const pp=$("#ttsPlayPause");if(pp)pp.textContent="▶";
  const fab=$("#btnTTS");if(fab)fab.classList.remove("active");
}
function highlightSentence(sid){
  clearSpeaking();
  // find page for this sentence
  let page=S.page;
  for(let p=0;p<(S.pageSents.length||0);p++){
    if(S.pageSents[p]&&S.pageSents[p].includes(sid)){page=p;break;}
  }
  if(page!==S.page)goToPage(page,false);
  $$("#chapterContent .sent").forEach(el=>{if(+el.dataset.sid===sid)el.classList.add("speaking");});
}
function clearSpeaking(){$$("#chapterContent .sent").forEach(el=>el.classList.remove("speaking"));}

/* ═══════ toast ═══════ */
let toastTimer=null;
function toast(msg){const t=$("#toast");t.textContent=msg;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,2400);}

})();
