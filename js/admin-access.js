(()=>{
  const KEY='kursy.admin.access.v1';
  const defaults={maxEditorDevices:3,maxDrivers:10,editorDevices:[],drivers:[]};
  const read=()=>{try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...defaults}}};
  const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state=read();

  const style=document.createElement('style');
  style.textContent=`
    .accessGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}
    .accessBox{border:1px solid var(--line);border-radius:14px;padding:16px;background:#fff}
    .accessBox h3{margin:0 0 8px}.accessStats{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}
    .accessStat{border:1px solid var(--line);border-radius:12px;padding:10px 12px;min-width:140px;background:#fafbfc}
    .accessStat strong{display:block;font-size:22px}.accessList{display:grid;gap:8px;margin-top:10px}
    .accessRow{display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid var(--line);border-radius:10px;padding:10px}
    .accessRow small{color:var(--muted)}.accessLimitRow{display:grid;grid-template-columns:1fr 120px;gap:10px;align-items:end;margin-top:10px}
    .accessLimitRow input{width:100%;border:1px solid var(--line);border-radius:10px;padding:10px}
    .accessNote{font-size:13px;color:var(--muted);line-height:1.45}
    @media(max-width:760px){.accessGrid{grid-template-columns:1fr}.accessLimitRow{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  function render(){
    const view=document.getElementById('view-admin'); if(!view)return;
    const panel=view.querySelector('.panel'); if(!panel)return;
    panel.innerHTML=`
      <h2>Licencja i firma</h2>
      <p class="muted">Kontrola dostępu firmy, kierowców i urządzeń. Docelowo limity będą egzekwowane również po stronie serwera.</p>
      <div class="accessGrid">
        <section class="accessBox">
          <h3>Urządzenia do edycji tras</h3>
          <p class="accessNote">Domyślny limit licencji: 3 urządzenia z dostępem do Panelu firmy.</p>
          <div class="accessStats"><div class="accessStat"><small>Aktywne</small><strong>${state.editorDevices.length}/${state.maxEditorDevices}</strong></div></div>
          <div class="accessLimitRow"><label class="field"><span>Maksymalna liczba urządzeń</span><input id="maxEditorDevices" type="number" min="1" value="${state.maxEditorDevices}"></label><button id="saveEditorLimit" class="btn primary">Zapisz limit</button></div>
          <div class="accessList">${state.editorDevices.length?state.editorDevices.map((d,i)=>`<div class="accessRow"><div><strong>${esc(d.name||`Urządzenie ${i+1}`)}</strong><br><small>${esc(d.lastSeen||'brak danych')}</small></div><button class="btn dangerText" data-remove-device="${i}">Usuń</button></div>`).join(''):'<div class="empty">Brak zarejestrowanych urządzeń edycyjnych.</div>'}</div>
        </section>
        <section class="accessBox">
          <h3>Kierowcy / użytkownicy</h3>
          <p class="accessNote">Każdy kierowca zajmuje jedno miejsce w limicie użytkowników. Kierowca może mieć jedno aktywne urządzenie naraz.</p>
          <div class="accessStats"><div class="accessStat"><small>Aktywni kierowcy</small><strong>${state.drivers.length}/${state.maxDrivers}</strong></div></div>
          <div class="accessLimitRow"><label class="field"><span>Maksymalna liczba kierowców</span><input id="maxDrivers" type="number" min="1" value="${state.maxDrivers}"></label><button id="saveDriverLimit" class="btn primary">Zapisz limit</button></div>
          <div class="actions"><button id="addDriver" class="btn primary" ${state.drivers.length>=state.maxDrivers?'disabled':''}>+ Dodaj kierowcę</button></div>
          <div class="accessList">${state.drivers.length?state.drivers.map((d,i)=>`<div class="accessRow"><div><strong>${esc(d.name)}</strong><br><small>${esc(d.deviceName||'Brak aktywnego urządzenia')}</small></div><button class="btn dangerText" data-remove-driver="${i}">Cofnij dostęp</button></div>`).join(''):'<div class="empty">Brak dodanych kierowców.</div>'}</div>
        </section>
      </div>`;
  }

  document.addEventListener('click',e=>{
    if(e.target.id==='saveEditorLimit'){const v=Math.max(1,Number(document.getElementById('maxEditorDevices')?.value)||3);state.maxEditorDevices=v;write(state);render()}
    if(e.target.id==='saveDriverLimit'){const v=Math.max(1,Number(document.getElementById('maxDrivers')?.value)||1);state.maxDrivers=v;write(state);render()}
    if(e.target.id==='addDriver'){if(state.drivers.length>=state.maxDrivers){alert('Osiągnięto maksymalną liczbę kierowców w tej licencji.');return}const name=prompt('Podaj nazwę lub imię kierowcy:');if(!name?.trim())return;state.drivers.push({name:name.trim(),deviceName:'Brak aktywnego urządzenia'});write(state);render()}
    const rd=e.target.closest('[data-remove-device]'); if(rd){state.editorDevices.splice(Number(rd.dataset.removeDevice),1);write(state);render()}
    const rr=e.target.closest('[data-remove-driver]'); if(rr){if(confirm('Cofnąć temu kierowcy dostęp do aplikacji?')){state.drivers.splice(Number(rr.dataset.removeDriver),1);write(state);render()}}
  });

  const obs=new MutationObserver(()=>{if(!document.getElementById('view-admin')?.hidden)render()});
  obs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden']});
  render();
})();