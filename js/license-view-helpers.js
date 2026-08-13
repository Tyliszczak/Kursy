import {effectiveStatus} from './license-model.js';

export const STATUS_LABELS={trial_pending:'Oczekuje na trial',trial_active:'Trial aktywny',active:'Aktywna',expired:'Wygasła',blocked:'Zablokowana'};
export const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const formatDate=value=>value?new Date(value).toLocaleDateString('pl-PL'):'—';
export const statusLabel=(company,translate)=>translate?translate(`status.${effectiveStatus(company)}`):(STATUS_LABELS[effectiveStatus(company)]||effectiveStatus(company));
export const activationUrl=driver=>`${location.origin}${location.pathname.replace(/[^/]*$/,'')}driver.html?token=${encodeURIComponent(driver.activationToken)}`;
