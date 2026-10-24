(() => {
  const mount=()=>{
    if(document.getElementById('wayon-rules-link'))return;
    const nav=document.querySelector('.sidebar');if(!nav)return;
    const link=document.createElement('a');link.id='wayon-rules-link';link.href='./rules.html';link.target='_blank';link.rel='noopener';link.textContent='规则';link.title='任务频率、内容与特殊规则';link.setAttribute('aria-label',link.title);
    link.style.cssText='display:block;margin:14px 8px;padding:10px 5px;text-align:center;color:#007aff;text-decoration:none;font-size:12px;border:1px solid #e5e5e7;border-radius:12px;background:var(--card,#fff)';nav.append(link);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
