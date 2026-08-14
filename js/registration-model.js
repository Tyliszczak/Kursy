export const RegistrationStatus=Object.freeze({
  PENDING_EMAIL:'pending_email',
  PENDING_PHONE:'pending_phone',
  READY:'trial_pending'
});

export function normalizeEmail(value=''){
  return String(value).trim().toLowerCase();
}

export function normalizePhone(value='',country='PL'){
  const raw=String(value).trim().replace(/[^\d+]/g,'');
  if(country==='PL'){
    const digits=raw.replace(/\D/g,'').replace(/^0048/,'').replace(/^48(?=\d{9}$)/,'');
    return digits.length===9?`+48${digits}`:raw;
  }
  return raw.startsWith('+')?raw:`+${raw.replace(/\D/g,'')}`;
}

export function normalizeTaxId(value='',country='PL'){
  const compact=String(value).toUpperCase().replace(/[\s.-]/g,'');
  if(country==='PL') return compact.replace(/^PL/,'');
  return compact;
}

export function isValidPolishNip(value){
  const nip=normalizeTaxId(value,'PL');
  if(!/^\d{10}$/.test(nip)) return false;
  const weights=[6,5,7,2,3,4,5,6,7];
  const checksum=weights.reduce((sum,w,i)=>sum+w*Number(nip[i]),0)%11;
  return checksum!==10&&checksum===Number(nip[9]);
}

export function validateRegistration(input){
  const errors={};
  const country=String(input.country||'PL').toUpperCase();
  if(!String(input.companyName||'').trim()) errors.companyName='Podaj nazwÄ™ firmy.';
  if(country==='PL'&&!isValidPolishNip(input.taxId)) errors.taxId='Podaj prawidĹ‚owy NIP.';
  if(country!=='PL'&&!normalizeTaxId(input.taxId,country)) errors.taxId='Podaj numer VAT / identyfikator podatkowy.';
  if(!/^\S+@\S+\.\S+$/.test(normalizeEmail(input.email))) errors.email='Podaj prawidĹ‚owy e-mail.';
  if(!/^\+\d{8,15}$/.test(normalizePhone(input.phone,country))) errors.phone='Podaj prawidĹ‚owy numer telefonu.';
  if(String(input.password||'').length<10) errors.password='HasĹ‚o musi mieÄ‡ co najmniej 10 znakĂłw.';
  if(!input.consent) errors.consent='Zgoda na przetwarzanie danych jest wymagana.';
  return {valid:Object.keys(errors).length===0,errors};
}

export function createRegistration(input,now=new Date()){
  const validation=validateRegistration(input);
  if(!validation.valid) throw new Error(Object.values(validation.errors)[0]);
  const country=String(input.country||'PL').toUpperCase();
  return {
    companyName:String(input.companyName).trim(),
    country,
    taxId:normalizeTaxId(input.taxId,country),
    adminName:String(input.adminName||'').trim(),
    email:normalizeEmail(input.email),
    phone:normalizePhone(input.phone,country),
    status:RegistrationStatus.PENDING_EMAIL,
    emailVerifiedAt:null,
    phoneVerifiedAt:null,
    licenseStatus:'trial_pending',
    trialStartedAt:null,
    createdAt:new Date(now).toISOString()
  };
}

export function confirmEmail(registration,now=new Date()){
  registration.emailVerifiedAt=new Date(now).toISOString();
  registration.status=RegistrationStatus.PENDING_PHONE;
  return registration;
}

export function confirmPhone(registration,now=new Date()){
  if(!registration.emailVerifiedAt) throw new Error('Najpierw potwierdĹş e-mail.');
  registration.phoneVerifiedAt=new Date(now).toISOString();
  registration.status=RegistrationStatus.READY;
  return registration;
}

