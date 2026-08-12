const API_URL='https://script.google.com/macros/s/AKfycbwbZ-TijD0Z6sSrCy4cq7vGnMD0dQLupLd81tQE4_2GNqpnyszLCUlNMQDe1aF7pkcdgw/exec';

async function callApi(params={}){
  const url=new URL(API_URL);
  Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

export async function checkApi(){
  try{
    await callApi({action:'ping'});
    return {ok:true,label:'Połączono'};
  }catch{
    return {ok:false,label:'Brak połączenia'};
  }
}

export async function verifyLicense({companyId,licenseKey,deviceId}){
  return callApi({action:'verifyLicense',companyId,licenseKey,deviceId});
}
