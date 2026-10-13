(function () {
  'use strict';
  const root=new URL('../',document.currentScript.src);
  const prefix=`hanzi:${root.pathname}:`;
  const keys=['lockInd','bgPlay','theme','math-range','math-sub','math-state','poem_currGrade','poem_currPoemInd','poem_showAuthor','poem_repeatPlay','poetryAppTheme'];
  const raw=new Set(['poetryAppTheme']);
  let timer,flight,session=null,previous={},applying=false,blocked=false;
  const pendingKey=id=>`${prefix}pending:${id}`;
  const storageError=()=>Error('当前浏览器无法保存登录信息。请复制网址到 Safari 或 Chrome，在普通模式下打开，并允许保存网站数据。');
  const randomID=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
  function read(key,fallback=null){try{return JSON.parse(localStorage.getItem(key)) ?? fallback;}catch{return fallback;}}
  function snapshot(){return Object.fromEntries(keys.filter(k=>localStorage.getItem(k)!==null).map(k=>[k,raw.has(k)?localStorage.getItem(k):read(k)]));}
  function apply(progress){
    applying=true;
    try{for(const k of keys){if(progress[k]===undefined || progress[k]===null)localStorage.removeItem(k);else localStorage.setItem(k,raw.has(k)?String(progress[k]):JSON.stringify(progress[k]));}}
    finally{applying=false;previous=snapshot();}
  }
  function device(){
    try{
      let d=localStorage.getItem(prefix+'device');
      if(!d){d=randomID();localStorage.setItem(prefix+'device',d);}
      return d;
    }catch{throw storageError();}
  }
  function configuration(){
    const c=window.HANZI_CONFIG;
    if(!c?.supabaseUrl || !c?.publishableKey)throw Error('网站尚未完成云端配置，请联系管理员。');
    return c;
  }
  async function api(action,payload={},options={}){
    const c=configuration();
    const token=options.token || session?.token || read(prefix+'session')?.token || '';
    const deviceKey=device();
    if(typeof AbortController!=='function')throw Error('当前浏览器版本较旧，请使用更新后的 Safari 或 Chrome 打开。');
    // Older iOS browsers support AbortController but not AbortSignal.timeout.
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),18000);
    let response;
    try{response=await fetch(`${c.supabaseUrl}/functions/v1/study-api`,{
      method:'POST',headers:{'Content-Type':'application/json',apikey:c.publishableKey,'x-device-key':deviceKey,'x-session-token':token},
      body:JSON.stringify({action,...payload}),keepalive:!!options.keepalive,signal:controller.signal
    });}catch{throw Error(action==='login'?'暂时无法连接登录服务。请复制网址到 Safari 或 Chrome 打开，或切换 Wi-Fi / 移动网络后重试。':'网络连接暂时中断，进度已暂存本机。请恢复联网后重试。');}
    finally{clearTimeout(timeout);}
    const data=await response.json().catch(()=>({}));
    if(!response.ok){const e=Error(data.error || '服务暂时不可用，请稍后重试。');e.code=data.code;e.status=response.status;throw e;}
    return data;
  }
  function loginURL(){const url=new URL('login.html',root);url.searchParams.set('next',location.href);return url.href;}
  function status(message,error=false){const el=document.getElementById('sync-status');if(el){el.textContent=message;el.classList.toggle('sync-error',error);}}
  function showGate(message,retry=false){
    blocked=true;
    let el=document.getElementById('auth-gate');
    if(!el){el=document.createElement('section');el.id='auth-gate';document.body.append(el);}
    el.replaceChildren();const p=document.createElement('p');p.textContent=message;el.append(p);
    const button=document.createElement('button');button.textContent=retry?'重试连接':'重新登录';
    button.onclick=()=>retry?location.reload():location.replace(loginURL());el.append(button);
  }
  function assertOwner(){
    if(!session || blocked)return false;
    if(read(prefix+'session')?.token!==session.token || localStorage.getItem(prefix+'owner')!==session.user.id){
      showGate('账号已在其他标签页切换，请重新打开当前页面。',true);return false;
    }
    return true;
  }
  function queueSync(){
    if(applying || !assertOwner())return;
    const now=snapshot(),pending=read(pendingKey(session.user.id),{});
    for(const k of keys)if(JSON.stringify(now[k])!==JSON.stringify(previous[k]))pending[k]={value:now[k] ?? null,version:randomID()};
    previous=now;localStorage.setItem(pendingKey(session.user.id),JSON.stringify(pending));
    if(Object.keys(pending).length){status('进度待同步');clearTimeout(timer);timer=setTimeout(()=>syncNow().catch(()=>{}),500);}
  }
  async function syncNow(keepalive=false){
    if(!assertOwner())return;
    if(flight){await flight;return syncNow(keepalive);}
    const owner=session.user.id,items=read(pendingKey(owner),{});
    if(!Object.keys(items).length)return;
    const patch=Object.fromEntries(Object.entries(items).map(([k,v])=>[k,v.value]));
    status('正在保存…');
    flight=(async()=>{
      try{
        await api('save',{patch},{keepalive});
        const rest=read(pendingKey(owner),{});
        for(const [k,v] of Object.entries(items))if(rest[k]?.version===v.version)delete rest[k];
        localStorage.setItem(pendingKey(owner),JSON.stringify(rest));
        status(Object.keys(rest).length?'进度待同步':'已保存到云端');
      }catch(e){status('已暂存本机 · 待联网同步',true);if(e.status===401)showGate(e.message);throw e;}
      finally{flight=null;}
    })();
    await flight;
  }
  function renderBar(){
    if(document.getElementById('hanzi-account-bar'))return;
    const bar=document.createElement('div');bar.id='hanzi-account-bar';
    const label=document.createElement('span');label.textContent=session.user.label;
    const state=document.createElement('span');state.id='sync-status';state.setAttribute('role','status');state.textContent='已保存到云端';
    const home=document.createElement('a');home.href=new URL('index.html',root).href;home.textContent='⌂ 主界面';home.setAttribute('aria-label','返回主界面');
    home.onclick=event=>{if(document.body.classList.contains('hanzi-page')){event.preventDefault();window.dispatchEvent(new Event('study-home'));}};
    const retry=document.createElement('button');retry.textContent='同步';retry.setAttribute('aria-label','同步学习进度');retry.onclick=async()=>{retry.disabled=true;try{await syncNow();}catch(e){status(e.message,true);}finally{retry.disabled=false;}};
    const exit=document.createElement('button');exit.textContent='退出';exit.onclick=async()=>{exit.disabled=true;try{await HanziAuth.logout();}catch(e){status(e.message,true);}finally{exit.disabled=false;}};
    bar.append(home,label,state,retry,exit);document.body.append(bar);
  }
  window.HanziAuth={
    user:null,root,configuration,
    async login(password){
      const result=await api('login',{password});
      const saved={token:result.token,user:result.user};
      try{localStorage.setItem(prefix+'session',JSON.stringify(saved));}catch{throw storageError();}
      return result;
    },
    async requireLogin(){
      const saved=read(prefix+'session');
      if(!saved){location.replace(loginURL());return new Promise(()=>{});}
      try{
        const data=await api('me',{}, {token:saved.token});
        if(read(prefix+'session')?.token!==saved.token){showGate('账号已在其他标签页切换，请刷新后继续。',true);return new Promise(()=>{});}
        session={...saved,user:data.user};this.user=data.user;
        const pending=read(pendingKey(data.user.id),{});
        const progress={...data.progress};
        for(const [k,v] of Object.entries(pending))if(keys.includes(k))progress[k]=k==='lockInd'?Math.max(progress[k]||0,v.value||0):v.value;
        apply(progress);localStorage.setItem(prefix+'owner',data.user.id);
        // The original poem view mounts Vue on body. Add controls after Vue has finished mounting.
        setTimeout(()=>{renderBar();syncNow().catch(()=>{});},0);
        return data.user;
      }catch(e){
        if(e.status===401){localStorage.removeItem(prefix+'session');location.replace(loginURL());}
        else showGate(e.message,true);
        return new Promise(()=>{});
      }
    },
    queueSync,syncNow,canWrite:assertOwner,
    async logout(){
      queueSync();await syncNow();
      await api('logout');
      localStorage.removeItem(prefix+'session');localStorage.removeItem(prefix+'owner');apply({});
      location.replace(new URL('login.html',root));
    }
  };
  window.addEventListener('online',()=>syncNow().catch(()=>{}));
  window.addEventListener('pagehide',()=>{queueSync();syncNow(true).catch(()=>{});});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){queueSync();syncNow(true).catch(()=>{});}
    else if(session && assertOwner())api('me').then(()=>syncNow()).catch(e=>{if(e.status===401)showGate(e.message);else status(e.message,true);});
  });
  window.addEventListener('storage',e=>{if(e.key===prefix+'session' || e.key===prefix+'owner')assertOwner();});
  setInterval(()=>{if(session && !document.hidden && assertOwner())api('me').then(()=>syncNow()).catch(e=>{if(e.status===401)showGate(e.message);else status('连接暂时中断',true);});},60000);
})();
