const ATTACHMENTS=Object.freeze({
  output:{bytes:8,why:'beauty HDR'},
  diffuseColor:{bytes:4,why:'SSGI albedo'},
  emissive:{bytes:8,why:'selective bloom'},
  normal:{bytes:4,why:'SSGI/SSR edge data'},
  metalrough:{bytes:2,why:'SSR material data'},
  velocity:{bytes:8,why:'TAAU/temporal reprojection'}
});

export const MRT_PROFILE_NEEDS=Object.freeze({
  minimalna:['output','emissive'],
  srednia:['output','diffuseColor','emissive','normal'],
  wysoka:['output','diffuseColor','emissive','normal','metalrough','velocity']
});

export function audytMrt(width,height,pixelRatio=1){
  const pixels=Math.max(1,Math.round(width*pixelRatio))*Math.max(1,Math.round(height*pixelRatio));
  const all=Object.values(ATTACHMENTS).reduce((s,a)=>s+a.bytes,0);
  const profiles={};
  for(const [name,used] of Object.entries(MRT_PROFILE_NEEDS)){
    const bytesPerSample=used.reduce((s,id)=>s+ATTACHMENTS[id].bytes,0);
    profiles[name]={used,unused:Object.keys(ATTACHMENTS).filter(id=>!used.includes(id)),bytesPerSample,
      estimatedColorWriteMiB:Math.round(bytesPerSample*pixels/10485.76)/100,
      estimatedReductionPercent:Math.round((1-bytesPerSample/all)*1000)/10};
  }
  return {prototype:'attachment-write estimate; not GPU timing',width,height,pixelRatio,
    currentBytesPerSample:all,attachments:ATTACHMENTS,profiles,
    decision:'keep shared MRT baseline; rebuilding pass-dependent node graphs on every profile switch is disproportionate'};
}
