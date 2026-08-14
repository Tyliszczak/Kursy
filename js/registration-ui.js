import {createRegistration,validateRegistration} from './registration-model.js';
import {registrationApi} from './registration-api.js';
import {initI18n,t,translateMessage} from './i18n.js';

const $=s=>document.querySelector(s);
const state={companyId:null,email:null};
const show=(id)=>document.querySelectorAll('[data-stage]').forEach(x=>x.classList.toggle('hidden',x.dataset.stage!==id));
const notice=(text,type='')=>{const n=$('#notice');n.textContent=text;n.className=`notice ${type}`;n.hidden=false};
initI18n(document.body);

document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===button));
  show(button.dataset.tab);
  $('#notice').hidden=true;
}));

$('#registerForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const raw=Object.fromEntries(new FormData(event.currentTarget));raw.consent=$('#consent').checked;
  const checked=validateRegistration(raw);
  if(!checked.valid){notice(Object.values(checked.errors)[0],'error');return}
  const registration=createRegistration(raw);
  try{
    const result=await registrationApi.register({...registration,password:raw.password});
    state.companyId=result.companyId;state.email=registration.email;
    $('#emailTarget').textContent=registration.email;
    show('verify_email');notice(result.preview?t('registration.testCode'):t('registration.emailCodeSent'),'ok');
  }catch(error){notice(translateMessage(error.message),'error')}
});

$('#verifyEmailForm').addEventListener('submit',async event=>{
  event.preventDefault();
  try{const result=await registrationApi.verifyEmail({companyId:state.companyId,code:$('#emailCode').value});show('verify_phone');notice(result.preview?t('registration.testCode'):t('registration.smsSent'),'ok')}catch(error){notice(translateMessage(error.message),'error')}
});

$('#verifyPhoneForm').addEventListener('submit',async event=>{
  event.preventDefault();
  try{await registrationApi.verifyPhone({companyId:state.companyId,code:$('#phoneCode').value});notice(t('registration.verified'),'ok');setTimeout(()=>location.href='company.html',900)}catch(error){notice(translateMessage(error.message),'error')}
});

$('#loginForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const payload=Object.fromEntries(new FormData(event.currentTarget));
  try{await registrationApi.login(payload);location.href='company.html'}catch(error){notice(translateMessage(error.message),'error')}
});

document.querySelectorAll('[data-plan]').forEach(button=>button.addEventListener('click',async()=>{
  try{const result=await registrationApi.checkout({companyId:state.companyId,plan:button.dataset.plan});if(result.checkoutUrl)location.href=result.checkoutUrl}catch(error){notice(error.message,'error')}
}));

const query=new URLSearchParams(location.search);
if(query.get('mode')==='login'){
  document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab==='login'));
  show('login');
}
if(query.get('checkout')==='success'&&query.get('session_id')){
  registrationApi.confirmCheckout(query.get('session_id')).then(result=>{
    notice(result.status==='paid'?t('registration.paymentPaid'):t('registration.paymentPending'),'ok');
  }).catch(error=>notice(error.message,'error'));
}
