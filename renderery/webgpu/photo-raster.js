export const PHOTO_RASTER_TARGET = 64;

export function createPhotoRasterState(){
  return { active:false, samples:0, target:PHOTO_RASTER_TARGET, moving:false, heavy:false };
}

export function updatePhotoRasterState(state, {active, moving}){
  const previous = {...state};
  state.active = Boolean(active);
  state.moving = state.active && Boolean(moving);
  if(!state.active || state.moving) state.samples = 0;
  else state.samples = Math.min(state.target, state.samples + 1);
  state.heavy = state.active && !state.moving && state.samples >= 8;
  return {
    resetHistory: state.active && state.moving && !previous.moving,
    heavyChanged: state.heavy !== previous.heavy,
    samplesChanged: state.samples !== previous.samples
  };
}

export function photoRasterSlices(samples){
  if(samples >= 48) return 12;
  if(samples >= 24) return 8;
  if(samples >= 8) return 6;
  return samples > 0 ? 4 : 2;
}
