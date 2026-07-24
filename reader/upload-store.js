/* ═══════════════════════════════════════════
   上传书包的 IndexedDB 存储
   bookshelf.html（上架/下架）与 app.js（读取）共用
   ═══════════════════════════════════════════ */
window.PackStore=(function(){
"use strict";
const DB="rc-shelf-store",STORE="packs",VER=1;

function open(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open(DB,VER);
    r.onupgradeneeded=()=>{
      if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE);
    };
    r.onsuccess=()=>res(r.result);
    r.onerror=()=>rej(r.error);
  });
}
function run(mode,op){
  return open().then(db=>new Promise((res,rej)=>{
    const t=db.transaction(STORE,mode);
    const req=op(t.objectStore(STORE));
    t.oncomplete=()=>res(req?req.result:undefined);
    t.onerror=()=>rej(t.error);
  }));
}
return{
  put:(name,buf)=>run("readwrite",s=>s.put(buf,name)),
  get:name=>run("readonly",s=>s.get(name)),
  del:name=>run("readwrite",s=>s.delete(name)),
  keys:()=>run("readonly",s=>s.getAllKeys()).then(k=>k||[])
};
})();
