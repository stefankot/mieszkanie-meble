/* Tryb pathtracingu. Ten plik i biblioteki, których używa, ładują się DOPIERO przy
   pierwszym włączeniu trybu — reszta konfiguratora nic o nich nie wie i nic przez
   nie nie waży. Import jest dynamiczny, w szafa.js: await import('./sciezki.js'). */
import * as THREE from 'three';
import {EXRLoader} from 'three/addons/loaders/EXRLoader.js';
import {WebGLPathTracer, GradientEquirectTexture} from 'https://cdn.jsdelivr.net/npm/three-gpu-pathtracer@0.0.24/src/index.js';

const HDRI = 'tekstury/EveningSkyHDRI044B_2K.exr';     // CC0, ambientCG — wieczorne niebo

const MAKS_PROBEK = 400;

export async function uruchom(renderer, scena, kamera, sterowanie, raport){
  const tlo = scena.background, srodowisko = scena.environment;

  /* Pathtracing liczy całe światło z otoczenia, więc scena dostaje HDRI wieczornego
     nieba. Gdyby plik nie doszedł, zostaje gradient — tryb ma zadziałać tak czy siak. */
  let niebo;
  try{
    niebo = await new EXRLoader().loadAsync(HDRI);
    niebo.mapping = THREE.EquirectangularReflectionMapping;
  }catch(e){
    niebo = new GradientEquirectTexture();
    niebo.topColor.set(0xffffff);
    niebo.bottomColor.set(0xd8d4cd);
    niebo.update();
  }
  scena.environment = niebo;
  scena.background = niebo;

  const sciezki = new WebGLPathTracer(renderer);
  sciezki.renderScale = Math.min(1, 1 / (renderer.getPixelRatio() || 1));
  sciezki.tiles.set(2, 2);
  sciezki.bounces = 4;
  sciezki.filterGlossyFactor = .5;
  sciezki.setScene(scena, kamera);

  const przyRuchu = () => sciezki.updateCamera();
  sterowanie.addEventListener('change', przyRuchu);

  return {
    klatka(){
      if(sciezki.samples >= MAKS_PROBEK) return;
      sciezki.renderSample();
      raport(Math.round(sciezki.samples), MAKS_PROBEK);
    },
    przebudowano(){
      sciezki.setScene(scena, kamera);
    },
    zatrzymaj(){
      sterowanie.removeEventListener('change', przyRuchu);
      sciezki.dispose();
      niebo.dispose();
      scena.background = tlo;
      scena.environment = srodowisko;
    }
  };
}
