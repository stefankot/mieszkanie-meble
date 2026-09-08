# Renderer WebGPU — podglądy robocze

Silnik przepisany z WebGL/EffectComposer na `WebGPURenderer` + graf węzłów TSL.

Katalog leży **poza** `renderery/zrodla/`, więc:

- nie uruchamia workflow „Zbuduj wersje rendererów",
- nie przechodzi przez adapter `mebel-sync/1`, który wymaga interfejsu WebGL
  (`window.__viewer`, `motions`, `pbrBindings`),
- nie zmienia ani nie nadpisuje opublikowanych wersji w `renderery/`.

Podgląd: `https://stefankot.github.io/mieszkanie-meble/renderery/webgpu/<plik>`

Integracja z biblioteką mebli wróci po przeniesieniu adaptera na API węzłowe.
