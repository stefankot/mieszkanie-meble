/* Adapter biblioteki; osadzany wyłącznie w sekcji AI. Silnik pozostaje identyczny. */
function startFurnitureSync(api) {
  const {THREE:T,F,furniture,scene,camera,controls,motions,progress,motionButtons,applyPose,poseHooks,finishObject,registerPBRMaterials,pbrBindings,invalidate,baseMaterial,boxGeo} = api;
  const REMOTE='https://raw.githubusercontent.com/stefankot/mieszkanie-meble/main/';
  const BASE=window.__MEBLE_TEST_BASE__ || REMOTE;
  const specs=[['lozko','Łóżko pod oknem'],['regal-salon','Regał w salonie'],['regal-przy-lozku','Regał przy łóżku'],['kuchnia','Nowa kuchnia'],['regal-kuchnia','Regał w kuchni']];
  const states=new Map(), legacyChildren=[...furniture.children], legacyMotions=[...motions];
  const legacyRoot=new T.Group();legacyRoot.name='biblioteka:lozko-bazowe';furniture.add(legacyRoot);legacyChildren.forEach(o=>legacyRoot.add(o));
  let polling=false, enabled=true;
  const node=(tag,text,parent)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(parent)parent.append(n);return n;};
  const style=node('style'); style.textContent=`
  #meble-sync{position:fixed;right:12px;bottom:12px;z-index:10020;width:min(344px,calc(100vw - 24px));font:13px/1.45 system-ui;color:#25241f;background:#f8f7f1;border:1px solid #bdbbac;border-radius:12px;box-shadow:0 4px 24px #0002;max-height:75vh;overflow:auto}
  #meble-sync summary{cursor:pointer;padding:13px 15px;font-weight:700;list-style:none}#meble-sync .ms-body{padding:0 14px 14px}#meble-sync p{margin:5px 0 10px}#meble-sync .ms-card{border-top:1px solid #d7d5ca;padding:11px 0}#meble-sync strong{display:block;font-size:14px}#meble-sync select{width:100%;margin:7px 0;padding:7px;background:white;color:#222;border:1px solid #bdbbac;border-radius:5px}#meble-sync button,#meble-sync a{font:inherit;color:#295947;cursor:pointer}#meble-sync button{padding:6px 9px;border:1px solid #bcc7be;border-radius:5px;background:#fff;margin-right:6px}#meble-sync .ms-info{font-size:12px;color:#595a50;white-space:pre-wrap}#meble-sync .ms-error{color:#963a2d}#meble-sync .ms-links{display:flex;gap:12px;margin:8px 0}#meble-sync .ms-status{font-size:12px;margin-bottom:10px}#meble-sync button:disabled{opacity:.45;cursor:default}`;
  document.head.append(style);
  const panel=node('details');panel.id='meble-sync';panel.open=window.innerWidth>700;node('summary','Biblioteka mebli · synchronizacja',panel);
  const body=node('div',undefined,panel);body.className='ms-body';
  const status=node('p','Łączenie z biblioteką…',body);status.className='ms-status';status.setAttribute('role','status');
  const links=node('div',undefined,body);links.className='ms-links';
  const planLink=node('a','Plan mieszkania',links);planLink.href=REMOTE+'plan/mieszkanie.svg';planLink.target='_blank';planLink.rel='noopener';
  const repoLink=node('a','Biblioteka GitHub',links);repoLink.href='https://github.com/stefankot/mieszkanie-meble';repoLink.target='_blank';repoLink.rel='noopener';
  const refresh=node('button','Sprawdź teraz',body);refresh.type='button';refresh.onclick=()=>poll();
  const pause=node('button','Wstrzymaj',body);pause.type='button';pause.onclick=()=>{enabled=!enabled;pause.textContent=enabled?'Wstrzymaj':'Wznów';if(enabled)poll();else status.textContent='Synchronizacja wstrzymana.';};
  document.body.append(panel);
  function assert(ok,message){if(!ok)throw Error(message);}
  const num=(v,min=-30000,max=30000)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
  const vec=(v,n=3,min=-30000,max=30000)=>Array.isArray(v)&&v.length===n&&v.every(x=>num(x,min,max));
  const idok=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(v);
  const words=(v,n=500)=>typeof v==='string'&&v.length>0&&v.length<=n;
  function pathOK(path){return typeof path==='string'&&path.length<250&&/^[a-zA-Z0-9_./-]+$/.test(path)&&!path.split('/').some(p=>!p||p==='.'||p==='..');}
  async function getJSON(path,fresh=false){
    assert(pathOK(path),'Niedozwolona ścieżka pliku.');
    const r=await fetch(BASE+path+(fresh?'?sync='+Math.floor(Date.now()/15000):''),{cache:fresh?'no-store':'default',signal:AbortSignal.timeout(18000)});
    if(!r.ok)throw Error(r.status===404?'Pliku nie ma jeszcze w bibliotece.':'GitHub: HTTP '+r.status);
    const text=await r.text();assert(text.length<=3000000,'Plik przekracza limit 3 MB.');return JSON.parse(text);
  }
  function validate(data,id,version){
    assert(data&&data.schemaVersion===1&&data.assetId===id&&data.version===version,'Wersja lub identyfikator modelu nie pasuje do katalogu.');
    const p=data.placement,m=data.model;
    assert(p&&p.confirmed===true&&vec(p.positionMm)&&num(p.rotationDeg,-360,360)&&words(p.roomId,50)&&words(p.wallId,100)&&pathOK(p.confirmationSvg),'Brak ustawienia potwierdzonego na SVG.');
    assert(m&&m.units==='mm'&&words(m.name,200)&&Array.isArray(m.parts)&&m.parts.length>0&&m.parts.length<=1500,'Niepoprawny model lub jednostki (wymagane mm).');
    assert(m.materials&&typeof m.materials==='object'&&!Array.isArray(m.materials)&&Object.keys(m.materials).length<=100,'Niepoprawne materiały.');
    for(const [id,mat]of Object.entries(m.materials)){
      assert(idok(id)&&mat&&['wood','white','graphite','fabric','metal','black','glass'].includes(mat.type),'Nieznany materiał.');
      assert(mat.color===undefined||/^#[0-9a-fA-F]{6}$/.test(mat.color),'Niepoprawny kolor.');
      for(const k of ['roughness','metalness'])assert(mat[k]===undefined||num(mat[k],0,1),'Niepoprawny parametr materiału.');
    }
    const ids=new Map();let triangles=0;
    for(const p of m.parts){
      assert(p&&idok(p.id)&&!ids.has(p.id),'Powtórzony lub niepoprawny identyfikator części.');ids.set(p.id,p);
      assert(vec(p.positionMm||[0,0,0])&&vec(p.rotationDeg||[0,0,0],3,-360,360),'Niepoprawna pozycja części.');
      assert(p.type==='group'||Object.hasOwn(m.materials,p.material),'Brakuje materiału części.');
      if(p.type==='box'){assert(vec(p.sizeMm,3,.1,15000)&&num(p.bevelMm||0,0,Math.min(...p.sizeMm)/2),'Niepoprawny prostopadłościan.');triangles+=324;}
      else if(p.type==='cylinder'){assert(num(p.radiusTopMm,0,7500)&&num(p.radiusBottomMm,0,7500)&&p.radiusTopMm+p.radiusBottomMm>0&&num(p.heightMm,.1,15000)&&Number.isInteger(p.segments??24)&&num(p.segments??24,8,64),'Niepoprawny cylinder.');triangles+=(p.segments??24)*4;}
      else if(p.type==='sphere'){assert(num(p.radiusMm,.1,7500)&&Number.isInteger(p.segments??24)&&num(p.segments??24,8,48)&&Number.isInteger(p.rings??12)&&num(p.rings??12,4,32),'Niepoprawna kula.');triangles+=(p.segments??24)*(p.rings??12)*2;}
      else if(p.type==='extrude'){assert(Array.isArray(p.profileMm)&&p.profileMm.length>=3&&p.profileMm.length<=100&&p.profileMm.every(v=>vec(v,2))&&num(p.depthMm,.1,15000)&&num(p.bevelMm||0,0,Math.min(30,p.depthMm/2)),'Niepoprawny profil.');triangles+=p.profileMm.length*30;}
      else if(p.type==='mesh'){assert(Array.isArray(p.verticesMm)&&p.verticesMm.length>=9&&p.verticesMm.length<=90000&&p.verticesMm.length%3===0&&p.verticesMm.every(v=>num(v))&&Array.isArray(p.indices)&&p.indices.length>=3&&p.indices.length<=90000&&p.indices.length%3===0&&p.indices.every(i=>Number.isInteger(i)&&i>=0&&i<p.verticesMm.length/3),'Niepoprawna siatka.');assert(p.uv===undefined||Array.isArray(p.uv)&&p.uv.length===p.verticesMm.length/3*2&&p.uv.every(v=>num(v,-1000,1000)),'Niepoprawne UV.');triangles+=p.indices.length/3;}
      else assert(p.type==='group','Nieobsługiwany typ części; kod z rozmowy nie jest wykonywany.');
    }
    assert(triangles<=180000,'Zbyt szczegółowy model: limit 180 000 trójkątów.');
    for(const p of m.parts){let parent=p.parent;const seen=new Set([p.id]);while(parent!==undefined&&parent!==null){assert(ids.has(parent)&&ids.get(parent).type==='group'&&!seen.has(parent)&&seen.size<12,'Błędne zagnieżdżenie części.');seen.add(parent);parent=ids.get(parent).parent;}}
    const joints=m.joints||[],used=new Set();assert(Array.isArray(joints)&&joints.length<=100,'Zbyt wiele mechanizmów.');
    for(const j of joints){assert(j&&ids.has(j.part)&&!used.has(j.part)&&['hinge','slide'].includes(j.type)&&vec(j.axis,3,-1,1)&&j.axis.reduce((s,x)=>s+x*x,0)>.01,'Błędny mechanizm.');used.add(j.part);if(j.type==='hinge')assert(vec(j.pivotMm)&&num(j.angleDeg,-180,180),'Błędny zawias.');else assert(num(j.travelMm,0,5000),'Błędny wysuw.');}
    for(const id of used){let parent=ids.get(id).parent;while(parent){assert(!used.has(parent),'Zagnieżdżone mechanizmy nie są obsługiwane.');parent=ids.get(parent).parent;}}
    return data;
  }
  function dispose(group){
    const gs=new Set(),ms=new Set();group.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m)ms.add(m);});
    gs.forEach(g=>g.dispose());ms.forEach(m=>{pbrBindings.delete(m);m.dispose();});group.removeFromParent();
  }
  function compile(data){
    const root=new T.Group(),parts=new Map(),pending=[];root.name='biblioteka:'+data.assetId;
    try{
      for(const p of data.model.parts){
        let o;if(p.type==='group')o=new T.Group();else{
          let g;
          if(p.type==='box')g=boxGeo(...p.sizeMm.map(x=>x/10),(p.bevelMm||0)/10);
          if(p.type==='cylinder')g=new T.CylinderGeometry(p.radiusTopMm/10,p.radiusBottomMm/10,p.heightMm/10,p.segments||24);
          if(p.type==='sphere')g=new T.SphereGeometry(p.radiusMm/10,p.segments||24,p.rings||12);
          if(p.type==='extrude'){const s=new T.Shape();p.profileMm.forEach((v,i)=>i?s.lineTo(v[0]/10,v[1]/10):s.moveTo(v[0]/10,v[1]/10));s.closePath();g=new T.ExtrudeGeometry(s,{depth:p.depthMm/10,steps:1,bevelEnabled:!!p.bevelMm,bevelThickness:(p.bevelMm||0)/10,bevelSize:(p.bevelMm||0)/10,bevelSegments:2});g.translate(0,0,-p.depthMm/20);}
          if(p.type==='mesh'){g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p.verticesMm.map(x=>x/10),3));g.setIndex(p.indices);if(p.uv)g.setAttribute('uv',new T.Float32BufferAttribute(p.uv,2));g.computeVertexNormals();}
          const d=data.model.materials[p.material],sizes=p.sizeMm||[500,500,500];
          const mat=d.type==='glass'?new T.MeshPhysicalMaterial({color:d.color||'#d9e4df',roughness:.08,transparent:true,opacity:.32,depthWrite:false}):baseMaterial[d.type](sizes[0]/10,sizes[1]/10,d.color).clone();
          if(d.color)mat.color.set(d.color);if(d.roughness!==undefined)mat.roughness=d.roughness;if(d.metalness!==undefined)mat.metalness=d.metalness;
          o=new T.Mesh(g,mat);o.castShadow=o.receiveShadow=true;
        }
        o.name=data.assetId+':'+p.id;o.userData.label=p.label||p.id;o.position.fromArray((p.positionMm||[0,0,0]).map(x=>x/10));o.rotation.set(...(p.rotationDeg||[0,0,0]).map(T.MathUtils.degToRad));parts.set(p.id,o);root.add(o);
      }
      for(const p of data.model.parts)if(p.parent)parts.get(p.parent).add(parts.get(p.id));
      root.updateMatrixWorld(true);
      for(const j of data.model.joints||[]){
        const id=data.assetId+':'+j.part,o=parts.get(j.part),pivot=new T.Group();pivot.name='pivot:'+id;root.add(pivot);
        if(j.type==='hinge')pivot.position.fromArray(j.pivotMm.map(x=>x/10));pivot.updateWorldMatrix(true,false);pivot.attach(o);
        const spec=j.type==='hinge'?['h',id,...j.pivotMm.map(x=>x/10),...j.axis,j.angleDeg]:['s',id,...j.axis,j.travelMm/10];
        const motion={id,kind:spec[0],node:o,pivot,spec,value:0,target:0,basePosition:pivot.position.clone(),baseQuaternion:pivot.quaternion.clone()};
        o.traverse(n=>{n.userData.motionId=id;});pending.push(motion);
      }
      const old=new Set();root.traverse(o=>{if(o.material)old.add(o.material);});finishObject(root);const live=new Set();root.traverse(o=>{if(o.material)live.add(o.material);});old.forEach(m=>{if(!live.has(m))m.dispose();});
      const pos=data.placement.positionMm.map(x=>x/10),q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),T.MathUtils.degToRad(data.placement.rotationDeg));
      furniture.updateWorldMatrix(true,false);const world=new T.Matrix4().compose(new T.Vector3(...pos),q,new T.Vector3(1,1,1));
      new T.Matrix4().copy(furniture.matrixWorld).invert().multiply(world).decompose(root.position,root.quaternion,root.scale);
      return {root,pending};
    }catch(e){dispose(root);throw e;}
  }
  function controlsFor(m,label){
    const row=node('div');row.className='part-row';const caption=node('span',label,row),button=node('button','Otwórz',row);button.type='button';button.onclick=()=>{m.target=m.target>.5?0:1;invalidate();};document.getElementById('motionControls').append(row);motionButtons.push({motion:m,button,label:caption});return row;
  }
  function removeState(s){
    if(!s.active)return;for(const m of s.active.pending){let i=motions.indexOf(m);if(i>=0)motions.splice(i,1);i=motionButtons.findIndex(b=>b.motion===m);if(i>=0){motionButtons[i].button.parentElement.remove();motionButtons.splice(i,1);}delete progress[m.id];}dispose(s.active.root);s.active=null;
  }
  function legacyVisible(yes){legacyRoot.visible=yes;legacyMotions.forEach(m=>{const b=motionButtons.find(x=>x.motion===m);if(b)b.button.parentElement.hidden=!yes;});}
  function focus(group){
    const b=new T.Box3().setFromObject(group,true);if(b.isEmpty())return;
    api.stopTour();api.cancelCameraMotion();if(api.isWalk())api.setWalk(false);
    const center=b.getCenter(new T.Vector3()),size=b.getSize(new T.Vector3()),distance=Math.max(...size.toArray(),80)*1.8;
    controls.target.copy(center);camera.position.copy(center).add(new T.Vector3(1,.7,1).normalize().multiplyScalar(distance));controls.update();invalidate();
  }
  async function loadVersion(s){
    const ticket=++s.ticket;const v=s.meta?.versions?.find(v=>v.id===(s.select.value==='latest'?s.meta.currentVersion:s.select.value));
    if(!v){s.info.textContent='Czeka na model i położenie zaakceptowane na SVG.';return;}
    if(s.loaded===v.id)return;
    s.info.textContent='Pobieranie '+v.id+'…';
    try{
      if(v.legacy===true){assert(s.id==='lozko','Niepoprawny model bazowy.');if(ticket!==s.ticket)return;removeState(s);legacyVisible(true);s.loaded=v.id;s.data=null;s.info.textContent=v.summary;}
      else{
        const data=validate(await getJSON(v.file),s.id,v.id);if(ticket!==s.ticket)return;
        const built=compile(data);if(ticket!==s.ticket){dispose(built.root);return;}
        const previous=new Map((s.active?.pending||[]).map(m=>[m.id,{value:m.value,target:m.target}]));
        removeState(s);furniture.add(built.root);s.active=built;
        for(const m of built.pending){const previousPose=previous.get(m.id);if(previousPose)Object.assign(m,previousPose);motions.push(m);progress[m.id]=m.value;applyPose(m,m.value);const j=data.model.joints.find(j=>s.id+':'+j.part===m.id);controlsFor(m,j.label||j.part);}
        registerPBRMaterials(built.root);if(s.id==='lozko')legacyVisible(false);s.loaded=v.id;s.data=data;
        s.info.textContent=(v.summary||data.summary||v.id)+'\n'+data.placement.roomId+' · '+data.placement.wallId;
        s.plan.href=REMOTE+data.placement.confirmationSvg;s.plan.hidden=false;
      }
      s.info.classList.remove('ms-error');s.show.disabled=false;poseHooks();invalidate();
      document.getElementById('motionDetails').hidden=motions.length<2;document.getElementById('togglePart').hidden=motions.length===0;
      panel.dataset.lastVersion=s.id+'/'+s.loaded;
    }catch(e){if(ticket===s.ticket){s.info.textContent='Nie zastosowano zmiany: '+e.message+' Poprzedni model pozostaje widoczny.';s.info.classList.add('ms-error');}}
  }
  for(const [id,name]of specs){
    const card=node('div',undefined,body);card.className='ms-card';node('strong',name,card);const select=node('select',undefined,card);select.setAttribute('aria-label','Wersja: '+name);node('option','Najnowsza — automatycznie',select).value='latest';
    const info=node('p',id==='lozko'?'Model z dostarczonego renderera.':'Czeka na pierwszy zapis z ChatGPT.',card);info.className='ms-info';
    const show=node('button','Pokaż mebel',card);show.type='button';show.disabled=id!=='lozko';const plan=node('a','Zatwierdzony plan SVG',card);plan.hidden=true;plan.target='_blank';plan.rel='noopener';
    const s={id,select,info,show,plan,meta:null,loaded:id==='lozko'?'bazowa':null,active:null,ticket:0,data:null};states.set(id,s);
    select.onchange=()=>loadVersion(s);show.onclick=()=>focus(s.active?.root||legacyRoot);
  }
  async function poll(){
    if(polling)return;polling=true;refresh.disabled=true;let errors=0;
    await Promise.all([...states.values()].map(async s=>{
      try{
        const meta=await getJSON('meble/'+s.id+'/manifest.json',true);
        assert(meta.schemaVersion===1&&meta.assetId===s.id&&Array.isArray(meta.versions)&&meta.versions.length<=2000,'Błędny katalog wersji.');
        const ids=new Set();for(const v of meta.versions){assert(v&&idok(v.id)&&!ids.has(v.id)&&words(v.summary)&&((v.legacy===true&&s.id==='lozko')||pathOK(v.file)),'Błędny wpis historii.');ids.add(v.id);}assert(meta.currentVersion===null||ids.has(meta.currentVersion),'Brakuje wskazanej wersji.');
        const signature=JSON.stringify(meta);if(s.signature!==signature){const chosen=s.select.value;s.meta=meta;s.signature=signature;while(s.select.options.length>1)s.select.remove(1);for(const v of [...meta.versions].reverse()){const o=node('option',v.id+' · '+v.summary,s.select);o.value=v.id;}s.select.value=chosen==='latest'||ids.has(chosen)?chosen:'latest';}
        await loadVersion(s);
      }catch(e){errors++;s.info.textContent=e.message;s.info.classList.add('ms-error');}
    }));
    status.textContent=errors?'Nie pobrano '+errors+' katalogów. Zachowano widoczne modele.':'Połączono · sprawdzanie co 15 s · '+new Date().toLocaleTimeString('pl-PL');
    status.classList.toggle('ms-error',errors>0);polling=false;refresh.disabled=false;
  }
  const timer=setInterval(()=>{if(enabled&&!document.hidden)poll();},15000);document.addEventListener('visibilitychange',()=>{if(enabled&&!document.hidden)poll();});
  window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  // Read-only diagnostics used by the integration test, without changing engine globals.
  window.__mebleSync={states,validate,compile,dispose,poll,version:'1.0.0',base:BASE};
  poll();
}
