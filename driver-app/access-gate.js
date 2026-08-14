import {getDeviceIdentity} from '../js/device-identity.js';
import {loadStore} from '../js/license-store.js';
import {mayUse} from '../js/license-model.js';
import {initI18n,t} from '../js/i18n.js';
import {statusLabel} from '../js/license-view-helpers.js';

const TOKEN_KEY='kursy.driver.activationToken.v1';
const queryToken=new URLSearchParams(location.search).get('token');
const token=queryToken||localStorage.getItem(TOKEN_KEY)||'';
const gate=document.querySelector('#accessGate');
const shell=document.querySelector('#driverShell');
const message=document.querySelector('#accessMessage');
const activationLink=document.querySelector('#activationLink');

function findDriver(){
  for(const company of loadStore().companies){
    const driver=company.drivers.find(item=>item.activationToken===token);
    if(driver)return {company,driver};
  }
  return null;
}

function loadScript(src){
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=src;
    script.onload=resolve;
    script.onerror=reject;
    document.body.append(script);
  });
}

function deny(text,{allowActivation=false}={}){
  message.textContent=text;
  activationLink.hidden=!allowActivation;
  if(allowActivation)activationLink.href='../driver.html?token='+encodeURIComponent(token);
}

async function start(){
  initI18n(document.body);
  globalThis.KURSY_T=t;
  if(!token){deny(t('driver.noToken'));return}
  const found=findDriver();
  if(!found){deny(t('driver.badLink'));return}
  const {company,driver}=found;
  if(driver.status==='blocked'){deny(t('driver.accessBlocked'));return}
  if(!mayUse(company)){deny(t('driver.accessLicense',{status:statusLabel(company,t)}));return}
  const {deviceId}=getDeviceIdentity();
  const activeDevice=company.driverDevices.some(device=>device.deviceId===deviceId&&device.userId===driver.id);
  if(driver.status!=='active'||!activeDevice){deny(t('driver.accessActivation'),{allowActivation:true});activationLink.textContent=t('driver.goActivation');return}
  localStorage.setItem(TOKEN_KEY,token);
  globalThis.KURSY_DRIVER_CONTEXT=Object.freeze({companyId:company.id,driverId:driver.id,activationToken:token,dataApiUrl:null});
  gate.hidden=true;
  shell.hidden=false;
  await import('./app.js?v=i18n-1');
  await loadScript('./wake-style.js?v=i18n-1');
  await loadScript('./vehicles.js?v=i18n-1');
  await loadScript('./nav-map.js?v=i18n-1');
}

start().catch(error=>{console.error(error);deny(t('driver.accessError'))});
