# Testy kontraktu WebGPU

Uruchamiaj na dokładnym Three0.185.0 (r185). `THREE_TEST_ROOT` wskazuje katalog zainstalowanego pakietu three, zawierający build/ i examples/.

```sh
THREE_TEST_ROOT=/absolute/path/to/node_modules/three node --test tests/edge-profiles.test.mjs
```

To testy geometrii/kontraktu w Node. Nie zastępują testów WebGPU w przeglądarce.
