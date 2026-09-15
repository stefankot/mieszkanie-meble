import { buildLozkoV0017 } from '../../lozko/wersje/v0017-native.js';

export const VERSION = 'v0001';
export const ASSET_ID = 'lozko-pokoj-9';

export const DESIGN_PATCH = Object.freeze({
  sourceAssetId: 'lozko',
  sourceVersion: 'v0017',
  roomId: 'POKOJ-9',
  wallId: 'POKOJ-9-W2',
  placement: {positionMm:[8602,0,3855], rotationDeg:-90},
  note: 'Kopia aktualnego łóżka v0017 do pokoju 9,07 m². Usunięty wyłącznie proxy grzejnika należący do starego pokoju; geometria mebla, kolory, wnęki, drzwiczki, LED i schody pozostają kopią v0017.'
});

const OLD_PREFIX = 'lozko:';
const NEW_PREFIX = `${ASSET_ID}:`;

function remapId(id){
  return typeof id === 'string' && id.startsWith(OLD_PREFIX)
    ? NEW_PREFIX + id.slice(OLD_PREFIX.length)
    : id;
}

function removeRoomRadiator(root){
  const radiator = root.getObjectByName('grzejnik_1200');
  if(!radiator) return false;
  radiator.traverse?.(o => o.geometry?.dispose?.());
  radiator.parent?.remove(radiator);
  return true;
}

function namespaceInteractions(root, ruchy){
  for(const r of ruchy || []){
    r.id = remapId(r.id);
    if(r.os?.name?.startsWith('os:lozko:')) r.os.name = `os:${r.id}`;
  }
  root.traverse(o => {
    if(o.userData?.ruchId) o.userData.ruchId = remapId(o.userData.ruchId);
  });
  if(Array.isArray(root.userData?.doorIds)) root.userData.doorIds = root.userData.doorIds.map(remapId);
}

export function buildLozkoPokoj9V0001({THREE,placement=DESIGN_PATCH.placement}){
  const built = buildLozkoV0017({THREE,placement});
  const root = built.korzen;

  root.name = `biblioteka:${ASSET_ID}`;
  root.userData.assetId = ASSET_ID;
  root.userData.version = VERSION;
  root.userData.nativeOverrideVersion = VERSION;
  root.userData.copiedFrom = {assetId:'lozko', version:'v0017'};
  root.userData.roomId = DESIGN_PATCH.roomId;
  root.userData.wallId = DESIGN_PATCH.wallId;

  namespaceInteractions(root,built.ruchy);
  const removedRadiatorProxy = removeRoomRadiator(root);

  root.userData.nativeModel = {
    ...(root.userData.nativeModel || {}),
    assetId: ASSET_ID,
    copiedFrom: 'lozko/v0017',
    removedRadiatorProxy,
    placementMm: [...placement.positionMm],
    rotationDeg: placement.rotationDeg,
    roomId: DESIGN_PATCH.roomId,
    wallId: DESIGN_PATCH.wallId,
    stairs: {
      ...(root.userData.nativeModel?.stairs || {}),
      wall: 'POKOJ-9-W3',
      wallClearance: 0,
      worldFootprintMm:{x:[7184,7784],z:[4390,4990]}
    }
  };

  return built;
}

export default {VERSION,ASSET_ID,DESIGN_PATCH,buildLozkoPokoj9V0001};
