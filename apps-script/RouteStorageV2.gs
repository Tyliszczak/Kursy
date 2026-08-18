// KURSY API — magazyn tras v2.
// Jedna trasa = jeden wiersz w RouteItems. Stary arkusz Routes pozostaje jako kopia migracyjna.

const ROUTE_JSON_MAX_CHARS_V2=45000;

function ensureRouteSchemaV2_(){
  SHEETS.ROUTE_ITEMS='RouteItems';
  SHEETS.ROUTE_STATE='RouteState';
  HEADERS.RouteItems=['routeId','companyId','name','position','version','routeJson','updatedAt','updatedBy','deletedAt'];
  HEADERS.RouteState=['companyId','version','updatedAt','migratedAt'];
}

function migrateRouteStorageV2(){
  ensureRouteSchemaV2_();
  rows_(SHEETS.COMPANIES).forEach(company=>ensureRouteMigrationForCompanyV2_(company.id));
  PropertiesService.getScriptProperties().setProperty('SCHEMA_VERSION','5');
  return 'OK';
}

function loadRoutesV2_(p){
  ensureRouteSchemaV2_();
  const auth=session_(p.sessionToken);
  assertAdminDevice_(auth,p);
  ensureRouteMigrationForCompanyV2_(auth.companyId);
  const collection=loadRouteCollectionV2_(auth.companyId);
  const company=findOne_(SHEETS.COMPANIES,x=>x.id===auth.companyId);
  return {
    ok:true,
    routes:collection.routes,
    version:collection.version,
    routeVersions:collection.routeVersions,
    updatedAt:collection.updatedAt,
    company:{id:auth.companyId,name:company&&company.name||''}
  };
}

function saveRoutesV2_(p){
  ensureRouteSchemaV2_();
  const auth=session_(p.sessionToken);
  assertAdminDevice_(auth,p);
  assertRouteWriteAllowed_(auth.companyId);
  ensureRouteMigrationForCompanyV2_(auth.companyId);

  const hasChanges=Boolean(p.routeChanges&&typeof p.routeChanges==='object');
  const hasFullRoutes=Array.isArray(p.routes);
  if(!hasChanges&&!hasFullRoutes)throw apiError_('VALIDATION_ERROR','Brak danych tras do zapisania.');

  const lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw apiError_('SAVE_BUSY','Inny zapis jest w toku. Spróbuj ponownie.');
  try{
    const current=routeRowsForCompanyV2_(auth.companyId,true);
    const active=current.filter(x=>!x.deletedAt);
    const byId=Object.fromEntries(current.map(x=>[String(x.routeId),x]));
    const activeById=Object.fromEntries(active.map(x=>[String(x.routeId),x]));
    const state=routeStateV2_(auth.companyId);
    const currentGlobalVersion=state?Number(state.version)||0:0;
    const expectedGlobalVersion=Number(p.expectedVersion)||0;
    const expectedVersions=p.routeVersions&&typeof p.routeVersions==='object'?p.routeVersions:null;

    let upserts=[];
    let deletes=[];
    let order=[];
    let modern=hasChanges;

    if(hasChanges){
      upserts=Array.isArray(p.routeChanges.upserts)?p.routeChanges.upserts:[];
      deletes=Array.isArray(p.routeChanges.deletes)?p.routeChanges.deletes.map(String):[];
      order=Array.isArray(p.routeChanges.order)?p.routeChanges.order.map(String):[];
    }else{
      const routes=p.routes;
      const seen=new Set();
      routes.forEach(route=>{
        const routeId=routeIdFromDataV2_(route);
        if(seen.has(routeId))throw apiError_('DUPLICATE_ROUTE_ID','Dwie trasy mają ten sam identyfikator.');
        seen.add(routeId);
        const existing=activeById[routeId];
        const json=routeJsonV2_(route);
        if(!existing||String(existing.routeJson)!==json)upserts.push(route);
      });
      deletes=active.filter(x=>!seen.has(String(x.routeId))).map(x=>String(x.routeId));
      order=routes.map(routeIdFromDataV2_);
      modern=Boolean(expectedVersions);
      if(!modern&&currentGlobalVersion!==expectedGlobalVersion){
        const error=apiError_('VERSION_CONFLICT','Trasy zostały zmienione na innym urządzeniu. Odśwież dane przed ponownym zapisem.');
        error.currentVersion=currentGlobalVersion;
        throw error;
      }
    }

    const upsertIds=upserts.map(routeIdFromDataV2_);
    const upsertSet=new Set(upsertIds);
    if(upsertIds.length!==upsertSet.size)throw apiError_('DUPLICATE_ROUTE_ID','Dwie trasy mają ten sam identyfikator.');
    const deleteSet=new Set(deletes.map(String));
    if([...upsertSet].some(id=>deleteSet.has(id)))throw apiError_('VALIDATION_ERROR','Ta sama trasa nie może być jednocześnie zapisywana i usuwana.');

    const orderSet=new Set(order);
    if(order.length!==orderSet.size)throw apiError_('DUPLICATE_ROUTE_ID','Dwie trasy mają ten sam identyfikator.');
    const positionById={};
    order.forEach((id,index)=>positionById[String(id)]=index);

    // Kontrola konfliktów odbywa się przed pierwszym zapisem, aby nie dopuścić do częściowej aktualizacji.
    upserts.forEach(route=>{
      const routeId=routeIdFromDataV2_(route);
      routeJsonV2_(route);
      const existing=byId[routeId];
      assertExpectedRouteVersionV2_(routeId,existing?Number(existing.version)||0:0,expectedVersions,modern);
    });
    deletes.forEach(routeId=>{
      routeId=String(routeId);
      const existing=byId[routeId];
      if(!existing||existing.deletedAt)return;
      assertExpectedRouteVersionV2_(routeId,Number(existing.version)||0,expectedVersions,modern);
    });

    let orderChanged=false;
    if(order.length){
      const currentOrder=active.slice().sort(routePositionSortV2_).map(x=>String(x.routeId));
      const finalIds=new Set(currentOrder.filter(id=>!deleteSet.has(id)));
      upsertIds.forEach(id=>finalIds.add(id));
      orderChanged=currentOrder.length!==order.length||currentOrder.some((id,index)=>id!==order[index]);
      if(orderChanged&&modern&&currentGlobalVersion!==expectedGlobalVersion){
        const error=apiError_('VERSION_CONFLICT','Kolejność tras została zmieniona na innym urządzeniu. Odśwież dane przed ponownym zapisem.');
        error.currentVersion=currentGlobalVersion;
        throw error;
      }
      if(finalIds.size!==orderSet.size||[...finalIds].some(id=>!orderSet.has(id))){
        throw apiError_('VALIDATION_ERROR','Lista kolejności tras jest niezgodna z zapisywanymi danymi.');
      }
    }

    let added=0,updated=0,removed=0,reordered=0;
    const now=iso_();

    upserts.forEach(route=>{
      const routeId=routeIdFromDataV2_(route);
      const json=routeJsonV2_(route);
      const existing=byId[routeId];
      const currentVersion=existing?Number(existing.version)||0:0;
      const patch={
        name:String(route.name||''),routeJson:json,version:currentVersion+1,
        updatedAt:now,updatedBy:auth.adminId,deletedAt:''
      };
      if(Object.prototype.hasOwnProperty.call(positionById,routeId))patch.position=positionById[routeId];
      if(existing){
        updateOne_(SHEETS.ROUTE_ITEMS,x=>x.companyId===auth.companyId&&String(x.routeId)===routeId,patch);
        updated++;
      }else{
        append_(SHEETS.ROUTE_ITEMS,{
          routeId,companyId:auth.companyId,name:String(route.name||''),
          position:Object.prototype.hasOwnProperty.call(positionById,routeId)?positionById[routeId]:active.length+added,
          version:1,routeJson:json,updatedAt:now,updatedBy:auth.adminId,deletedAt:''
        });
        added++;
      }
    });

    deletes.forEach(routeId=>{
      routeId=String(routeId);
      const existing=byId[routeId];
      if(!existing||existing.deletedAt)return;
      updateOne_(SHEETS.ROUTE_ITEMS,x=>x.companyId===auth.companyId&&String(x.routeId)===routeId,{
        version:(Number(existing.version)||0)+1,deletedAt:now,updatedAt:now,updatedBy:auth.adminId
      });
      removed++;
    });

    if(orderChanged){
      order.forEach((routeId,index)=>{
        const row=findOne_(SHEETS.ROUTE_ITEMS,x=>x.companyId===auth.companyId&&String(x.routeId)===String(routeId)&&!x.deletedAt);
        if(row&&Number(row.position)!==index){
          updateOne_(SHEETS.ROUTE_ITEMS,x=>x.companyId===auth.companyId&&String(x.routeId)===String(routeId),{position:index,updatedAt:now,updatedBy:auth.adminId});
          reordered++;
        }
      });
    }

    const changed=added+updated+removed+reordered>0;
    if(changed){
      setRouteStateV2_(auth.companyId,currentGlobalVersion+1,now,state&&state.migratedAt||now);
      history_(auth.companyId,'routes_published',{
        version:currentGlobalVersion+1,added,updated,removed,reordered,adminId:auth.adminId
      });
    }

    const collection=loadRouteCollectionV2_(auth.companyId);
    return {
      ok:true,
      routes:hasFullRoutes?p.routes:undefined,
      version:collection.version,
      routeVersions:collection.routeVersions,
      updatedAt:collection.updatedAt,
      changes:{added,updated,removed,reordered}
    };
  }finally{
    lock.releaseLock();
  }
}

function driverRoutesV2_(p){
  ensureRouteSchemaV2_();
  required_(p,['driverSessionToken','deviceId']);
  const status=driverStatus_(p);
  if(!status.mayUse)throw apiError_('DRIVER_ACCESS_DENIED','Brak dostępu do tras.');
  ensureRouteMigrationForCompanyV2_(status.company.id);
  const collection=loadRouteCollectionV2_(status.company.id);
  const routes=collection.routes.map(route=>{
    const services=Array.isArray(route.services)?route.services:[];
    const times=services.map(x=>String(x.targetTime||'')).filter(Boolean);
    return {
      name:route.name,
      times,
      stops:(route.stops||[]).map(stop=>{
        const values={};
        services.forEach(service=>values[String(service.targetTime||'')]=stop.times&&stop.times[service.id]||'');
        return {name:stop.name,coordinates:stop.locationOut||'',times:values};
      })
    };
  });
  return {ok:true,routes,version:collection.version,updatedAt:collection.updatedAt};
}

function routeIdFromDataV2_(route){
  const routeId=String(route&&route.id||'').trim();
  if(!routeId)throw apiError_('ROUTE_ID_REQUIRED','Trasa nie ma identyfikatora.');
  return routeId;
}

function routeJsonV2_(route){
  const json=JSON.stringify(route||{});
  if(json.length>ROUTE_JSON_MAX_CHARS_V2)throw apiError_('ROUTE_TOO_LARGE','Pojedyncza trasa jest zbyt duża do zapisania.');
  return json;
}

function assertExpectedRouteVersionV2_(routeId,currentVersion,expectedVersions,modern){
  if(!modern)return;
  const hasExpected=expectedVersions&&Object.prototype.hasOwnProperty.call(expectedVersions,routeId);
  const expected=hasExpected?Number(expectedVersions[routeId])||0:0;
  if(expected!==currentVersion){
    const error=apiError_('VERSION_CONFLICT','Ta trasa została zmieniona na innym urządzeniu. Odśwież dane przed ponownym zapisem.');
    error.routeId=routeId;
    error.currentRouteVersion=currentVersion;
    throw error;
  }
}

function routeRowsForCompanyV2_(companyId,includeDeleted=false){
  return rows_(SHEETS.ROUTE_ITEMS).filter(x=>x.companyId===companyId&&(includeDeleted||!x.deletedAt));
}

function routePositionSortV2_(a,b){
  const pa=Number(a.position),pb=Number(b.position);
  if(pa!==pb)return pa-pb;
  return String(a.routeId).localeCompare(String(b.routeId));
}

function routeStateV2_(companyId){
  return findOne_(SHEETS.ROUTE_STATE,x=>x.companyId===companyId);
}

function setRouteStateV2_(companyId,version,updatedAt,migratedAt){
  const state=routeStateV2_(companyId);
  const patch={version:Number(version)||0,updatedAt:updatedAt||'',migratedAt:migratedAt||''};
  if(state)updateOne_(SHEETS.ROUTE_STATE,x=>x.companyId===companyId,patch);
  else append_(SHEETS.ROUTE_STATE,{companyId,...patch});
}

function loadRouteCollectionV2_(companyId){
  const routeRows=routeRowsForCompanyV2_(companyId,false).sort(routePositionSortV2_);
  const routes=[];
  const routeVersions={};
  routeRows.forEach(row=>{
    const route=parseJson_(row.routeJson,null);
    if(!route||typeof route!=='object'||Array.isArray(route))throw apiError_('ROUTES_CORRUPTED','Nie można odczytać zapisanej trasy.');
    if(!route.id)route.id=String(row.routeId);
    routes.push(route);
    routeVersions[String(row.routeId)]=Number(row.version)||0;
  });
  const state=routeStateV2_(companyId);
  return {
    routes,
    routeVersions,
    version:state?Number(state.version)||0:0,
    updatedAt:state&&state.updatedAt||null
  };
}

function ensureRouteMigrationForCompanyV2_(companyId){
  const state=routeStateV2_(companyId);
  if(state&&state.migratedAt)return;

  const legacy=findOne_(SHEETS.ROUTES,x=>x.companyId===companyId);
  const now=iso_();
  if(!legacy){
    setRouteStateV2_(companyId,state?Number(state.version)||0:0,state&&state.updatedAt||'',now);
    return;
  }

  const routes=parseJson_(legacy.routesJson,null);
  if(!Array.isArray(routes))throw apiError_('ROUTES_CORRUPTED','Nie można zmigrować zapisanych tras firmy.');
  const existing=routeRowsForCompanyV2_(companyId,true);
  const existingIds=new Set(existing.map(x=>String(x.routeId)));
  const used=new Set(existingIds);

  routes.forEach((source,index)=>{
    const route=source&&typeof source==='object'?source:{};
    let routeId=String(route.id||'').trim();
    if(routeId&&existingIds.has(routeId))return;
    if(!routeId||used.has(routeId)){
      routeId=id_('route');
      route.id=routeId;
    }
    used.add(routeId);
    append_(SHEETS.ROUTE_ITEMS,{
      routeId,companyId,name:String(route.name||''),position:index,version:1,
      routeJson:routeJsonV2_(route),updatedAt:legacy.updatedAt||now,updatedBy:legacy.updatedBy||'',deletedAt:''
    });
  });

  setRouteStateV2_(companyId,Number(legacy.version)||0,legacy.updatedAt||now,now);
  history_(companyId,'routes_storage_migrated',{
    from:'Routes',to:'RouteItems',routeCount:routes.length,legacyVersion:Number(legacy.version)||0
  });
}
