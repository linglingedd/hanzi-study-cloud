(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const storageKey=`hanzi-admin:${location.pathname}`;
  let auth=null,accounts=[],credentials=[],saved=false;
  try{auth=JSON.parse(sessionStorage.getItem(storageKey));}catch{}
  const config=()=>{const c=window.HANZI_CONFIG;if(!c?.supabaseUrl || !c?.publishableKey)throw Error('网站尚未完成云端配置。');return c;};
  function message(text,success=false){$('message').textContent=text;$('message').classList.toggle('success',success);}
  // Web dialogs also work in embedded browsers that do not implement prompt/confirm.
  const operationDialog=document.createElement('dialog');
  operationDialog.id='operation-dialog';
  operationDialog.setAttribute('aria-labelledby','operation-title');
  operationDialog.setAttribute('aria-describedby','operation-description');
  operationDialog.innerHTML='<form><h2 id="operation-title"></h2><p id="operation-description" class="muted"></p><label id="operation-field">账号名称<input id="operation-value" maxlength="80" required></label><div class="dialog-actions"><button type="button" id="operation-cancel">取消</button><button type="submit" id="operation-confirm" class="primary"></button></div></form>';
  document.body.append(operationDialog);
  function decision({title,text,value,confirmLabel='确认'}){
    if(operationDialog.open)return Promise.resolve(null);
    const editing=value!==undefined;
    $('operation-title').textContent=title;$('operation-description').textContent=text;
    $('operation-field').hidden=!editing;$('operation-value').disabled=!editing;
    $('operation-value').value=value ?? '';$('operation-confirm').textContent=confirmLabel;
    return new Promise(resolve=>{
      let finished=false;
      const finish=result=>{if(finished)return;finished=true;operationDialog.close();resolve(result);};
      operationDialog.querySelector('form').onsubmit=e=>{
        e.preventDefault();if(editing&&!$('operation-value').value.trim())return;
        finish(editing?$('operation-value').value.trim():true);
      };
      $('operation-cancel').onclick=()=>finish(null);
      operationDialog.oncancel=e=>{e.preventDefault();finish(null);};
      operationDialog.showModal();
      if(editing){$('operation-value').focus();$('operation-value').select();}else $('operation-cancel').focus();
    });
  }
  async function authRequest(path,body,token){
    const c=config();const r=await fetch(c.supabaseUrl+'/auth/v1/'+path,{method:'POST',headers:{apikey:c.publishableKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(18000)});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw Error('管理员登录失败，请检查邮箱、密码或登录状态。');return d;
  }
  function saveAuth(value){auth={...value,expires_at:Math.floor(Date.now()/1000)+(value.expires_in || 3600)};sessionStorage.setItem(storageKey,JSON.stringify(auth));}
  async function api(action,body={}){
    const c=config();if(!auth)throw Error('请先登录管理后台。');
    if(auth.expires_at<Date.now()/1000+60)saveAuth(await authRequest('token?grant_type=refresh_token',{refresh_token:auth.refresh_token}));
    const r=await fetch(c.supabaseUrl+'/functions/v1/study-api',{method:'POST',headers:{apikey:c.publishableKey,'Content-Type':'application/json',Authorization:'Bearer '+auth.access_token},body:JSON.stringify({action:'admin/'+action,...body}),signal:AbortSignal.timeout(20000)});
    const d=await r.json().catch(()=>({}));if(!r.ok){if(r.status===401){auth=null;sessionStorage.removeItem(storageKey);showLogin();}throw Error(d.error || '操作失败，请稍后重试。');}return d;
  }
  function showLogin(){ $('admin-login').hidden=false;$('dashboard').hidden=true;$('logout').hidden=true; }
  const date=v=>v?new Date(v).toLocaleString('zh-CN',{hour12:false}):'尚未登录';
  function render(){
    $('total').textContent=accounts.length;$('bound').textContent=accounts.filter(a=>a.bound && a.enabled).length;
    $('unbound').textContent=accounts.filter(a=>!a.bound && a.enabled).length;$('disabled').textContent=accounts.filter(a=>!a.enabled).length;
    const filtered=accounts.filter(a=>a.label.toLowerCase().includes($('search').value.trim().toLowerCase()));
    $('accounts').replaceChildren();$('empty').hidden=filtered.length>0;
    for(const a of filtered){
      const row=document.createElement('tr');const cell=text=>{const e=document.createElement('td');e.textContent=text;row.append(e);return e;};
      cell(a.label);const s=cell(''),tag=document.createElement('span');tag.className='tag '+(!a.enabled?'off':a.bound?'':'idle');tag.textContent=!a.enabled?'已停用':a.bound?'已绑定':'待绑定';s.append(tag);
      cell(String(a.level));cell(date(a.last_login_at));const actions=cell('');
      for(const [name,action] of [['改名','rename'],['重置密码','reset'],['解绑','unbind'],[a.enabled?'停用':'启用','enable']]){
        const btn=document.createElement('button');btn.textContent=name;btn.disabled=action==='unbind'&&!a.bound;
        btn.onclick=()=>act(a,action,btn);actions.append(btn);
      }
      ['账号名称','状态','学习关卡','最近登录','管理操作'].forEach((name,i)=>row.children[i].setAttribute('data-label',name));
      $('accounts').append(row);
    }
  }
  async function load(){const d=await api('list');accounts=d.accounts;$('admin-login').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;render();}
  function displayCredentials(items){credentials=items;saved=false;$('credentials-list').replaceChildren();for(const c of items){const row=document.createElement('div');row.className='credential-row';const label=document.createElement('span');label.textContent=c.label;const code=document.createElement('code');code.textContent=c.password;row.append(label,code);$('credentials-list').append(row);}$('credentials-dialog').showModal();}
  async function act(a,action,button){
    let data={id:a.id};
    if(action==='rename'){const name=await decision({title:'修改账号名称',text:'名称用于识别账号，不影响学习密码和进度。',value:a.label,confirmLabel:'保存名称'});if(name===null)return;data.label=name;}
    else if(action==='reset'){if(!await decision({title:'重置学习密码',text:`为「${a.label}」生成新密码？旧密码和旧登录将失效，学习进度保留。`,confirmLabel:'生成新密码'}))return;}
    else if(action==='unbind'){if(!await decision({title:'解除设备绑定',text:`解除「${a.label}」的设备绑定？旧登录将失效，下次登录会绑定新浏览器，学习进度保留。`,confirmLabel:'确认解绑'}))return;}
    else{data.enabled=!a.enabled;const verb=data.enabled?'启用':'停用';if(!await decision({title:verb+'学习账号',text:`${verb}「${a.label}」？当前登录将失效，学习进度保留。`,confirmLabel:'确认'+verb}))return;}
    button.disabled=true;
    try{const result=await api(action,data);if(result.credentials)displayCredentials(result.credentials.map(c=>({...c,label:a.label})));message('操作已完成。',true);await load();}catch(e){message(e.message);}finally{button.disabled=false;}
  }
  $('admin-login-form').onsubmit=async e=>{
    e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;message('正在登录…');
    try{saveAuth(await authRequest('token?grant_type=password',{email:$('admin-email').value.trim(),password:$('admin-password').value}));await load();$('admin-password').value='';message('');}
    catch(e){message(e.message);}finally{button.disabled=false;}
  };
  $('create-form').onsubmit=async e=>{
    e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;
    try{if(Number($('account-count').value)>1 && $('custom-password').value)throw Error('批量生成请留空自定义密码，每个账号将使用不同的随机密码。');const result=await api('create',{label:$('account-label').value,count:Number($('account-count').value),password:$('custom-password').value || undefined});displayCredentials(result.credentials);$('custom-password').value='';message('学习密码已生成，请保存清单。',true);await load();}
    catch(e){message(e.message);}finally{button.disabled=false;}
  };
  $('refresh').onclick=()=>load().then(()=>message('数据已更新。',true)).catch(e=>message(e.message));
  $('search').oninput=render;
  $('logout').onclick=async()=>{try{await authRequest('logout',{},auth.access_token);}catch{}auth=null;sessionStorage.removeItem(storageKey);accounts=[];$('accounts').replaceChildren();$('credentials-dialog').close();credentials=[];$('credentials-list').replaceChildren();showLogin();message('已退出管理。',true);};
  $('download-credentials').onclick=()=>{
    const quote=v=>'"'+String(v).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
    const csv='\ufeff账号名称,学习密码\r\n'+credentials.map(c=>[c.label,c.password].map(quote).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`学习密码-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);saved=true;
  };
  async function closeCredentials(e){e?.preventDefault();if(!saved && !await decision({title:'关闭密码清单',text:'尚未下载清单。请确认您已经复制保存了全部密码。',confirmLabel:'确认关闭'}))return;credentials=[];$('credentials-list').replaceChildren();$('credentials-dialog').close();}
  $('close-credentials').onclick=closeCredentials;$('credentials-dialog').addEventListener('cancel',closeCredentials);
  window.addEventListener('beforeunload',e=>{if(credentials.length&&!saved){e.preventDefault();e.returnValue='';}});
  if(auth)load().catch(e=>{showLogin();message(e.message);});
})();
