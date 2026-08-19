(()=>{
  let bypass=false;

  const style=document.createElement('style');
  style.textContent=`
    #routesList .item{cursor:pointer}
    #routesList [data-edit-route]{display:none!important}
    #routesList .item:active,.stopCard .stopTableWrap:active{transform:scale(.995)}
    .stopCard{position:relative;padding-right:48px}
    .stopCard .stopTableWrap{cursor:pointer}
    .stopCard .routeTable input,
    .stopCard .stopMap,
    .stopCard .stopTimeBtn{pointer-events:none}
    .stopCard [data-move-up],
    .stopCard [data-move-down]{display:none!important}
    .stopCard .routeTable input{border:0!important;background:transparent!important;box-shadow:none!important;padding-left:0!important}
    .stopCard .stopMap{display:none!important}
    .stopCard .stopTimeBtn{border:0!important;background:transparent!important;box-shadow:none!important}
    .stopCard .stopNameOpen{border:0!important;background:transparent!important;box-shadow:none!important;padding-left:0!important;pointer-events:none}
    .stopCard .tableActions [data-remove-stop]{position:absolute;right:8px;top:50%;transform:translateY(-50%);z-index:3}
    #routeEditorTitle{font-size:clamp(22px,4vw,32px)!important;font-weight:800!important;line-height:1.15!important}
    #stopEditorModal .editorRouteContext{display:block;font-size:clamp(22px,4vw,30px);font-weight:800;line-height:1.15}
  `;
  document.head.appendChild(style);

  document.addEventListener('click',e=>{
    if(bypass)return;
    const route=e.target.closest('#routesList .item');
    if(route){if(e.target.closest('[data-delete-route]'))return;const edit=route.querySelector('[data-edit-route]');if(edit){e.preventDefault();e.stopImmediatePropagation();bypass=true;edit.click();bypass=false}return}
    const card=e.target.closest('#stopRows .stopCard');
    if(card){if(e.target.closest('[data-remove-stop],[data-add-stop-after]'))return;const edit=card.querySelector('[data-edit-stop]');if(edit){e.preventDefault();e.stopImmediatePropagation();bypass=true;edit.click();bypass=false}}
  },true);
})();
