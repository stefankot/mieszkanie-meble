import { buildLozkoV0018 } from '../../lozko/wersje/v0018-native.js';

export const VERSION = 'v0002';
export const ASSET_ID = 'lozko-pokoj-9';

export const DESIGN_PATCH = Object.freeze({
  sourceAssetId: 'lozko',
  sourceVersion: 'v0018',
  roomId: 'POKOJ-9',
  wallId: 'POKOJ-9-W2',
  placement: {positionMm:[8602,0,3855], rotationDeg:-90},
  note: 'Kopia lustrzanej wersji lozko/v0018. Poduszki i płyta perforowana są zamienione stronami dokładnie tak samo jak w oryginalnym łóżku. Proxy grzejnika starego pokoju pozostaje usunięty.'
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

export function buildLozkoPokoj9V0002({THREE,placement=DESIGN_PATCH.placement}){
  const built = buildLozkoV0018({THREE,placement});
  const root = built.korzen;

  root.name = `biblioteka:${ASSET_ID}`;
  root.userData.assetId = ASSET_ID;
  root.userData.version = VERSION;
  root.userData.nativeOverrideVersion = VERSION;
  root.userData.copiedFrom = {assetId:'lozko', version:'v0018'};
  root.userData.roomId = DESIGN_PATCH.roomId;
  root.userData.wallId = DESIGN_PATCH.wallId;

  namespaceInteractions(root,built.ruchy);
  const removedRadiatorProxy = removeRoomRadiator(root);

  root.userData.nativeModel = {
    ...(root.userData.nativeModel || {}),
    assetId: ASSET_ID,
    copiedFrom: 'lozko/v0018',
    removedRadiatorProxy,
    placementMm: [...placement.positionMm],
    rotationDeg: placement.rotationDeg,
    roomId: DESIGN_PATCH.roomId,
    wallId: DESIGN_PATCH.wallId,
    horizontalMirror: {
      axis: 'local X',
      cushionsSideSwappedWithPegboard: true,
      sameAsSourceBed: true
    },
    stairs: {
      ...(root.userData.nativeModel?.stairs || {}),
      wall: 'opposite side after mirror',
      wallClearance: 180,
      worldFootprintMm:{x:[7184,7784],z:[2720,3320]}
    }
  };

  return built;
}

export default {VERSION,ASSET_ID,DESIGN_PATCH,buildLozkoPokoj9V0002};
