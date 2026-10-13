const form=document.getElementById('login-form'),input=document.getElementById('password'),errorEl=document.getElementById('login-error');
const offer=document.getElementById('browser-link-offer'),pendingPanel=document.getElementById('browser-link-pending');
const requestButton=document.getElementById('request-browser-link'),checkButton=document.getElementById('check-browser-link'),cancelButton=document.getElementById('cancel-browser-link');
const linkStatus=document.getElementById('browser-link-status');
let pending=null,pollTimer,busy=false,cancelling=false;
function enter(){
  const root=HanziAuth.root;let next=new URL('index.html',root);
  const requested=new URLSearchParams(location.search).get('next');
  if(requested){try{const u=new URL(requested,root);if(u.origin===root.origin && [new URL('index.html',root).pathname,new URL('math/index.html',root).pathname,new URL('poem/index.html',root).pathname,root.pathname].includes(u.pathname))next=u;}catch{}}
  location.replace(next.href);
}
function submitState(disabled,text='进入学习 →'){const button=form.querySelector('[type=submit]');button.disabled=disabled;button.textContent=text;}
function clearPending(){pending=null;clearTimeout(pollTimer);HanziAuth.forgetBrowserRequest();pendingPanel.hidden=true;form.hidden=false;offer.hidden=false;input.value='';}
function schedule(){clearTimeout(pollTimer);if(pending && !document.hidden && !cancelling)pollTimer=setTimeout(check,3000);}
async function check(){
  if(!pending || busy || cancelling)return;
  busy=true;checkButton.disabled=true;cancelButton.disabled=true;
  try{
    const result=await HanziAuth.checkBrowser(pending.requestToken);
    if(result.state==='approved'){pending=null;clearTimeout(pollTimer);enter();return;}
    linkStatus.textContent='等待原入口确认…确认后回到本页即可继续。';
  }catch(e){
    if(e.code==='LINK_EXPIRED'){clearPending();errorEl.textContent=e.message;}
    else{linkStatus.textContent=e.message+' 确认成功后仍可用原密码重试。';}
  }finally{busy=false;checkButton.disabled=false;cancelButton.disabled=false;schedule();}
}
function showPending(value){
  pending=value;form.hidden=true;offer.hidden=true;pendingPanel.hidden=false;
  document.getElementById('browser-link-code').textContent=value.code;
  document.getElementById('browser-link-expiry').textContent='有效至 '+new Date(value.expiresAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
  linkStatus.textContent='等待原入口确认…';schedule();
}
document.getElementById('toggle-password').onclick=function(){input.type=input.type==='password'?'text':'password';this.textContent=input.type==='password'?'显示':'隐藏';this.setAttribute('aria-label',`${this.textContent}密码`);};
form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;busy=true;errorEl.textContent='';offer.hidden=true;submitState(true,'正在登录…');
  try{await HanziAuth.login(input.value);enter();}
  catch(e){errorEl.textContent=e.code==='DEVICE_BOUND'?'当前入口尚未授权，请由原已登录入口确认。':e.message;offer.hidden=e.code!=='DEVICE_BOUND';}
  finally{busy=false;submitState(false);}
});
requestButton.onclick=async()=>{
  if(busy)return;if(!input.value.trim()){errorEl.textContent='请先填写原学习密码，再申请确认码。';input.focus();return;}
  busy=true;requestButton.disabled=true;submitState(true,'正在申请…');errorEl.textContent='';
  try{const result=await HanziAuth.requestBrowser(input.value);input.value='';if(result.state==='already_allowed')enter();else showPending(result);}
  catch(e){errorEl.textContent=e.message;}
  finally{busy=false;requestButton.disabled=false;submitState(false);}
};
checkButton.onclick=check;
cancelButton.onclick=async()=>{
  if(!pending || busy)return;cancelling=true;clearTimeout(pollTimer);cancelButton.disabled=true;checkButton.disabled=true;
  try{await HanziAuth.cancelBrowser(pending.requestToken);clearPending();errorEl.textContent='申请已取消。';}
  catch(e){linkStatus.textContent=e.message+' 申请尚未取消，请联网后再试；也可等待确认码过期。';}
  finally{cancelling=false;cancelButton.disabled=false;checkButton.disabled=false;schedule();}
};
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();else clearTimeout(pollTimer);});
window.addEventListener('pagehide',()=>clearTimeout(pollTimer));
window.addEventListener('pageshow',()=>schedule());
(async()=>{
  busy=true;submitState(true,'正在检查登录…');
  try{
    if(await HanziAuth.resumeLogin()){HanziAuth.forgetBrowserRequest();enter();return;}
    const saved=HanziAuth.browserRequest();
    if(saved?.requestToken && saved?.code && Date.parse(saved.expiresAt)>Date.now())showPending(saved);
    else HanziAuth.forgetBrowserRequest();
  }catch(e){errorEl.textContent=e.message;}
  finally{busy=false;submitState(false);}
})();
