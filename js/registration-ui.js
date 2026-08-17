import {createRegistration,validateRegistration} from './registration-model.js';
import {registrationApi} from './registration-api.js';
import {initI18n,t,translateMessage} from './i18n.js';

const $=s=>document.querySelector(s);
const state={companyId:null,email:null,resetEmail:null};
const show=id=>document.querySelectorAll('[data-stage]').forEach(x=>x.classList.toggle('hidden',x.dataset.stage!==id));
const notice=(text,type='')=>{const n=$('#notice');n.textContent=text;n.className=`notice ${type}`;n.hidden=false};
const resetError=error=>{
  if(['RESET_CODE_EXPIRED','CODE_EXPIRED'].includes(error.code))return 'Kod utracił ważność. Wyślij nowy kod.';
  if(error.code==='RESET_CODE_SUPERSEDED')return 'Ten kod nie jest już ważny. Użyj najnowszego kodu wysłanego na e-mail.';
  if(['RESET_CODE_INVALID','INVALID_CODE'].includes(error.code))return 'Kod jest niepoprawny.';
  if(error.code==='CODE_LOCKED')return 'Przekroczono dozwoloną liczbę prób. Wyślij nowy kod.';
  return translateMessage(error.message);
};
initI18n(document.body);

document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===button));
  show(button.dataset.tab);$('#notice').hidden=true;
}));

document.querySelectorAll('[data-back-login]').forEach(button=>button.addEventListener('click',()=>{show('login');$('#notice').hidden=true;}));
$('#forgotPasswordBtn').addEventListener('click',()=>{const email=$('#loginForm [name="email"]').value.trim();if(email)$('#resetEmail').value=email;show('reset_request');$('#notice').hidden=true;});

$('#registerForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const raw=Object.fromEntries(new FormData(event.currentTarget));raw.consent=$('#consent').checked;
  const checked=validateRegistration(raw);
  if(!checked.valid){notice(Object.values(checked.errors)[0],'error');return}
  const registration=createRegistration(raw);
  try{const result=await registrationApi.register({...registration,password:raw.password});state.companyId=result.companyId;state.email=registration.email;$('#emailTarget').textContent=registration.email;show('verify_email');notice(result.preview?t('registration.testCode'):t('registration.emailCodeSent'),'ok')}catch(error){notice(translateMessage(error.message),'error')}
});

$('#verifyEmailForm').addEventListener('submit',async event=>{event.preventDefault();try{await registrationApi.verifyEmail({companyId:state.companyId,code:$('#emailCode').value});notice(t('registration.verified'),'ok');setTimeout(()=>location.href='company.html',900)}catch(error){notice(translateMessage(error.message),'error')}});

$('#loginForm').addEventListener('submit',async event=>{event.preventDefault();const payload=Object.fromEntries(new FormData(event.currentTarget));try{await registrationApi.login(payload);location.href='company.html'}catch(error){notice(translateMessage(error.message),'error')}});

$('#resetRequestForm').addEventListener('submit',async event=>{event.preventDefault();const email=$('#resetEmail').value.trim();try{await registrationApi.passwordResetRequest(email);state.resetEmail=email;$('#resetTarget').textContent=email;$('#resetCode').value='';$('#resetPassword').value='';$('#resetPasswordRepeat').value='';show('reset_confirm');notice('Kod został wysłany. Jest ważny przez 3 minuty.','ok')}catch(error){notice(translateMessage(error.message),'error')}});

$('#resendResetCode').addEventListener('click',async()=>{if(!state.resetEmail)return;try{await registrationApi.passwordResetRequest(state.resetEmail);$('#resetCode').value='';notice('Wysłaliśmy nowy kod. Poprzedni kod nie jest już ważny.','ok')}catch(error){notice(translateMessage(error.message),'error')}});

$('#resetConfirmForm').addEventListener('submit',async event=>{event.preventDefault();const password=$('#resetPassword').value,repeat=$('#resetPasswordRepeat').value;if(password!==repeat){notice('Nowe hasła nie są takie same.','error');return}try{await registrationApi.passwordResetConfirm({email:state.resetEmail,code:$('#resetCode').value,newPassword:password});notice('Hasło zostało zmienione. Możesz się zalogować.','ok');setTimeout(()=>{show('login');$('#loginForm [name="email"]').value=state.resetEmail||'';$('#loginForm [name="password"]').value=''},900)}catch(error){notice(resetError(error),'error')}});

document.querySelectorAll('[data-plan]').forEach(button=>button.addEventListener('click',async()=>{try{const result=await registrationApi.checkout({companyId:state.companyId,plan:button.dataset.plan});if(result.checkoutUrl)location.href=result.checkoutUrl}catch(error){notice(error.message,'error')}}));

const query=new URLSearchParams(location.search);
if(query.get('mode')==='login'){document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab==='login'));show('login')}
if(query.get('checkout')==='success'&&query.get('session_id')){registrationApi.confirmCheckout(query.get('session_id')).then(result=>{notice(result.status==='paid'?t('registration.paymentPaid'):t('registration.paymentPending'),'ok')}).catch(error=>notice(error.message,'error'))}
