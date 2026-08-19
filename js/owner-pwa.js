const banner=document.querySelector('#ownerInstallBanner');
const installButton=document.querySelector('#ownerInstallBtn');
const closeButton=document.querySelector('#ownerInstallClose');
const dismissedKey='kursy.owner.install.dismissed.session';
let deferredPrompt=null;
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function updateBanner(){if(!banner)return;banner.hidden=standalone()||sessionStorage.getItem(dismissedKey)==='1'}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;updateBanner()});
window.addEventListener('appinstalled',()=>{deferredPrompt=null;if(banner)banner.hidden=true});
installButton?.addEventListener('click',async()=>{
  if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;updateBanner();return}
  alert('Otwórz menu przeglądarki i wybierz „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”.');
});
closeButton?.addEventListener('click',()=>{sessionStorage.setItem(dismissedKey,'1');updateBanner()});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}),{once:true});
updateBanner();
