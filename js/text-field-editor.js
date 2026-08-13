let textEditorTarget=null;

function ensureTextEditor(){
  if(document.getElementById('textFieldEditor'))return;
  const modal=document.createElement('div');
  modal.id='textFieldEditor';
  modal.className='modal';
  modal.hidden=true;
  modal.innerHTML=`<div class="modalCard" style="width:min(92vw,680px);max-width:680px">
    <h3 id="textFieldEditorTitle">Edytuj nazwę przystanku</h3>
    <textarea id="textFieldEditorValue" rows="5" style="width:100%;box-sizing:border-box;resize:vertical;min-height:140px;padding:14px;font:inherit;font-size:18px;line-height:1.45;border:1px solid #bbb;border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere"></textarea>
    <div class="actions"><button type="button" id="textFieldEditorSave" class="btn primary">Zapisz</button><button type="button" id="textFieldEditorCancel" class="btn">Anuluj</button></div>
  </div>`;
  document.body.appendChild(modal);
  document.getElementById('textFieldEditorSave').addEventListener('click',saveTextEditor);
  document.getElementById('textFieldEditorCancel').addEventListener('click',closeTextEditor);
}

function openTextEditor(input){
  ensureTextEditor();
  textEditorTarget=input;
  const modal=document.getElementById('textFieldEditor');
  const textarea=document.getElementById('textFieldEditorValue');
  textarea.value=input.value||'';
  modal.hidden=false;
  requestAnimationFrame(()=>{
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length,textarea.value.length);
  });
}

function closeTextEditor(){
  const modal=document.getElementById('textFieldEditor');
  if(modal)modal.hidden=true;
  textEditorTarget=null;
}

function saveTextEditor(){
  if(!textEditorTarget){closeTextEditor();return;}
  const value=document.getElementById('textFieldEditorValue')?.value??'';
  textEditorTarget.value=value;
  textEditorTarget.dispatchEvent(new Event('input',{bubbles:true}));
  textEditorTarget.dispatchEvent(new Event('change',{bubbles:true}));
  closeTextEditor();
}

document.addEventListener('pointerdown',e=>{
  const input=e.target.closest('.stopName');
  if(!input)return;
  e.preventDefault();
  openTextEditor(input);
},{capture:true});

document.addEventListener('keydown',e=>{
  if(document.getElementById('textFieldEditor')?.hidden!==false)return;
  if(e.key==='Escape'){e.preventDefault();closeTextEditor();}
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();saveTextEditor();}
});
