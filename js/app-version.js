(()=>{
  const VERSION='0.10.0';
  globalThis.KURSY_APP_VERSION=VERSION;
  const paint=()=>{const b=document.querySelector('.badge');if(b)b.textContent=`WERSJA TESTOWA ${VERSION}`};
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint,{once:true});else paint();
  }
  if(typeof window!=='undefined'&&'serviceWorker' in navigator){
    let reloading=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(reloading)return;
      const key=`kursy-reloaded-${VERSION}`;
      if(sessionStorage.getItem(key)==='1')return;
      sessionStorage.setItem(key,'1');
      reloading=true;
      location.reload();
    });
    window.addEventListener('load',()=>navigator.serviceWorker.getRegistration().then(r=>r?.update()).catch(()=>{}),{once:true});
  }
})();
