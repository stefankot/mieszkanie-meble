export const SSR_MODERN = 'modern';
export const SSR_BASELINE = 'current';
export const SSR_MODERN_SETTINGS = Object.freeze({
  stochastic: true,
  envImportanceSampling: true,
  binaryRefine: true,
  resolutionScale: 0.5,
  quality: 0.35
});

export function wybierzSSR(search = globalThis.location?.search || '') {
  return new URLSearchParams(search).get('ssr') === SSR_BASELINE ? SSR_BASELINE : SSR_MODERN;
}
