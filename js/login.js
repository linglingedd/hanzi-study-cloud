const form=document.getElementById('login-form');
const input=document.getElementById('password');
const errorEl=document.getElementById('login-error');
document.getElementById('toggle-password').onclick=function(){input.type=input.type==='password'?'text':'password';this.textContent=input.type==='password'?'显示':'隐藏';this.setAttribute('aria-label',`${this.textContent}密码`);};
form.addEventListener('submit',async event=>{
  event.preventDefault();errorEl.textContent='';const button=form.querySelector('[type=submit]');button.disabled=true;button.textContent='正在登录…';
  try{
    await HanziAuth.login(input.value);
    const root=HanziAuth.root;
    let next=new URL('index.html',root);
    const requested=new URLSearchParams(location.search).get('next');
    if(requested){try{const u=new URL(requested,root);if(u.origin===root.origin && [new URL('index.html',root).pathname,new URL('math/index.html',root).pathname,new URL('poem/index.html',root).pathname,root.pathname].includes(u.pathname))next=u;}catch{}}
    location.replace(next.href);
  }catch(e){errorEl.textContent=e.message;button.disabled=false;button.textContent='进入学习 →';}
});
