const ID=/^[A-Za-z0-9_.:-]{1,120}$/;
const clone=v=>structuredClone(v);
const object=v=>v && typeof v==='object' && !Array.isArray(v);

function requireObject(value,name){ if(!object(value)) throw Error(`v2: ${name} musi być obiektem`); }
function requireArray(value,name){ if(!Array.isArray(value)) throw Error(`v2: ${name} musi być tablicą`); }
function ids(items,name){
  const seen=new Set();
  for(const item of items){
    if(!ID.test(item?.id||'')) throw Error(`v2: niepoprawne ID w ${name}`);
    if(seen.has(item.id)) throw Error(`v2: powtórzone ID "${item.id}" w ${name}`);
    seen.add(item.id);
  }
  return seen;
}

export function validateFurnitureV2(doc){
  if(doc?.schemaVersion!==2) throw Error('v2: wymagane schemaVersion 2');
  if(!ID.test(doc.assetId||'') || !ID.test(doc.version||'')) throw Error('v2: niepoprawne assetId/version');
  if(doc.units!=='mm') throw Error('v2: design data muszą używać mm');
  for(const name of ['geometry','materials','states','customParameters','extensions','designTime','rendererDefaults','rendererOverrides'])
    requireObject(doc[name],name);
  for(const name of ['mechanics','interactions','constraints','assets','anchors']) requireArray(doc[name],name);
  requireArray(doc.geometry.parts,'geometry.parts');
  requireObject(doc.materials.definitions,'materials.definitions');
  if(!Array.isArray(doc.lights?.recesses)) throw Error('v2: lights.recesses musi być tablicą');
  if(doc.runtimeState!==undefined) throw Error('v2: runtimeState nie może być zapisany w furniture.json');
  if(doc.runtimeStatePolicy?.persist!=='named-states-only') throw Error('v2: wymagane persist=named-states-only');

  const parts=ids(doc.geometry.parts,'geometry.parts');
  const mechanics=ids(doc.mechanics,'mechanics');
  const interactions=ids(doc.interactions,'interactions');
  const assets=ids(doc.assets,'assets');
  const anchors=ids(doc.anchors,'anchors');
  const constraints=ids(doc.constraints,'constraints');
  const recesses=ids(doc.lights.recesses,'lights.recesses');
  ids(doc.states.named||[],'states.named');
  const materials=new Set(Object.keys(doc.materials.definitions));

  for(const part of doc.geometry.parts){
    if(part.parent && !parts.has(part.parent)) throw Error(`v2: część ${part.id} wskazuje brakującego rodzica ${part.parent}`);
    if(part.material && !materials.has(part.material)) throw Error(`v2: część ${part.id} wskazuje brakujący materiał ${part.material}`);
  }
  for(const mechanism of doc.mechanics){
    if(!parts.has(mechanism.part)) throw Error(`v2: mechanizm ${mechanism.id} wskazuje brakującą część ${mechanism.part}`);
  }
  for(const interaction of doc.interactions){
    if(interaction.mechanismId && !mechanics.has(interaction.mechanismId))
      throw Error(`v2: interakcja ${interaction.id} wskazuje brakujący mechanizm ${interaction.mechanismId}`);
  }
  for(const anchor of doc.anchors){
    if(anchor.partId && !parts.has(anchor.partId)) throw Error(`v2: anchor ${anchor.id} wskazuje brakującą część ${anchor.partId}`);
  }
  for(const constraint of doc.constraints){
    if(constraint.anchorId && !anchors.has(constraint.anchorId)) throw Error(`v2: constraint ${constraint.id} wskazuje brakujący anchor ${constraint.anchorId}`);
  }
  for(const material of Object.values(doc.materials.definitions)){
    for(const assetId of Object.values(material.assets||{}))
      if(!assets.has(assetId)) throw Error(`v2: materiał wskazuje brakujący asset ${assetId}`);
  }
  for(const recess of doc.lights.recesses){
    if(!Array.isArray(recess.ledStrips)) throw Error(`v2: wnęka ${recess.id} nie ma ledStrips`);
    ids(recess.ledStrips,`lights.recesses.${recess.id}.ledStrips`);
  }
  if(doc.states.default && !(doc.states.named||[]).some(s=>s.id===doc.states.default))
    throw Error(`v2: brak domyślnego named state ${doc.states.default}`);
  for(const [id,spec] of Object.entries(doc.extensions)){
    if(!ID.test(id)||!object(spec)||typeof spec.required!=='boolean') throw Error(`v2: niepoprawne extension ${id}`);
  }
  return {parts,mechanics,interactions,assets,anchors,constraints,recesses};
}

export function normalizeFurnitureDocument(doc){
  if(doc?.schemaVersion===1) return {document:doc,sourceSchemaVersion:1,notes:[]};
  validateFurnitureV2(doc);
  const joints=doc.mechanics.map(({id,states,...joint})=>clone(joint));
  const parts=clone(doc.geometry.parts);
  const edgeRadius=doc.customParameters?.edgeProfile?.defaultRadiusMm;
  if(Number.isFinite(edgeRadius) && edgeRadius>=0)
    for(const part of parts) if(part.type==='box' && part.edgeRadiusMm===undefined)
      part.edgeRadiusMm=Math.min(edgeRadius,Math.min(...part.sizeMm)*.49);
  return {sourceSchemaVersion:2,notes:[],document:{
    schemaVersion:1,assetId:doc.assetId,version:doc.version,summary:doc.summary,placement:clone(doc.placement),
    extensions:clone(doc.extensions),model:{name:doc.name,units:'mm',
      materials:clone(doc.materials.definitions),parts,joints,
      lighting:{units:'mm',coordinateSystem:'model-local',recesses:clone(doc.lights.recesses)},
      notes:clone(doc.notes||[]),v2:{states:clone(doc.states),interactions:clone(doc.interactions),
        constraints:clone(doc.constraints),assets:clone(doc.assets),anchors:clone(doc.anchors),
        customParameters:clone(doc.customParameters),designTime:clone(doc.designTime),
        rendererDefaults:clone(doc.rendererDefaults),rendererOverrides:clone(doc.rendererOverrides)}}
  }};
}

export function migrateFurnitureV1ToV2(doc){
  if(doc?.schemaVersion!==1) throw Error('Migracja wymaga dokumentu v1');
  const model=doc.model||{};
  return {
    schemaVersion:2,assetId:doc.assetId,version:doc.version,name:model.name||doc.assetId,
    summary:doc.summary||'',units:'mm',placement:clone(doc.placement),
    geometry:{parts:clone(model.parts||[])},materials:{definitions:clone(model.materials||{})},
    lights:{recesses:clone(model.lighting?.recesses||[])},
    mechanics:(model.joints||[]).map((joint,i)=>({id:joint.id||`mechanism-${i+1}`,...clone(joint)})),
    interactions:[],states:{default:'default',named:[{id:'default',mechanics:{}}]},
    constraints:[],assets:[],anchors:[],customParameters:{},extensions:clone(doc.extensions||{}),
    designTime:{activeNamedState:'default'},runtimeStatePolicy:{persist:'named-states-only'},
    rendererDefaults:{},rendererOverrides:{},notes:clone(model.notes||[])
  };
}
