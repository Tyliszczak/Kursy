export async function loadRepoData(){
  const load=async path=>{
    const r=await fetch(path,{cache:'no-store'});
    if(!r.ok) throw new Error(`Nie można pobrać ${path}`);
    return r.json();
  };
  const [company,routes,courses]=await Promise.all([
    load('./data/company.json'),
    load('./data/routes.json'),
    load('./data/courses.json')
  ]);
  return {company,routes:routes.routes||[],courses:courses.courses||[]};
}

export function buildStopsIndex(routes){
  const map=new Map();
  routes.forEach(route=>(route.stops||[]).forEach(stop=>map.set(stop.id,stop)));
  return map;
}
