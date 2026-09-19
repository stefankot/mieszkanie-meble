export function frontParametryczny({id,widthMm,heightMm,faceZMm=0,gapMm,recessMm,panelThicknessMm,edgeRadiusMm,material}){
  const finite=[widthMm,heightMm,faceZMm,gapMm,recessMm,panelThicknessMm,edgeRadiusMm].every(Number.isFinite);
  if(!finite || gapMm<0 || recessMm<0 || edgeRadiusMm<0 || panelThicknessMm<=0 || widthMm<=2*gapMm || heightMm<=2*gapMm)
    throw Error('Niepoprawne wymiary frontu');
  return {id,type:'box',material,edgeRadiusMm,gapMm,recessMm,panelThicknessMm,
    sizeMm:[widthMm-2*gapMm,heightMm-2*gapMm,panelThicknessMm],
    positionMm:[0,0,faceZMm-recessMm-panelThicknessMm/2]};
}
