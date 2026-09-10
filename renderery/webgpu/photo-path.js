export const PHOTO_PATH_CONTRACT = Object.freeze({
  id:'furniture-webgpu-pathtracer',
  apiVersion:1,
  threeRevision:'185',
  required:['create','setScene','setCamera','reset','renderSample','dispose']
});

export function inspectPhotoPathCapability({revision, adapter}={}){
  if(String(revision)!==PHOTO_PATH_CONTRACT.threeRevision)
    return {supported:false, reason:`Three r${revision ?? '?'}; wymagane r185`};
  if(!adapter) return {supported:false, reason:'r185 core nie zawiera WebGPUPathTracer; brak izolowanego adaptera'};
  if(adapter.apiVersion!==PHOTO_PATH_CONTRACT.apiVersion)
    return {supported:false, reason:`adapter API ${adapter.apiVersion ?? '?'}; wymagane 1`};
  const missing=PHOTO_PATH_CONTRACT.required.filter(name=>typeof adapter[name]!=='function');
  return missing.length ? {supported:false, reason:`adapter bez: ${missing.join(', ')}`}
    : {supported:true, reason:'zgodny adapter eksperymentalny'};
}

export function createPhotoPathIntegration({revision, adapter}={}){
  const capability=inspectPhotoPathCapability({revision,adapter});
  return {capability, adapter:capability.supported ? adapter : null,
    mode:capability.supported ? 'experimental' : 'photo_raster_fallback'};
}
