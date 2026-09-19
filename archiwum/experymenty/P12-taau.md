# P12 — core r185 TAAU

Use `?aa=taau` or the Quality panel selector. TAAU is isolated to the high profile: the scene/MRT pass runs at 0.75 resolution and the r185 `TAAUNode` resolves to the drawing-buffer size from beauty, depth and velocity. Minimal and medium continue to use SMAA.

History is recreated on resize and profile/AA switching. The r185 node applies and clears camera jitter through the render-pipeline lifecycle, rejects history by depth/velocity, and seeds resized history from the current beauty buffer. `window.__silnik.aa` exposes the active mode and reset counters.

Baseline remains SMAA until the visual compare covers motion, stop, disocclusion, thin edges and resize on the deployment GPU.

Local runtime check (2026-09-10, visible 1280 × 720 in-app Chromium/WebGPU): high-profile TAAU compiled, camera drag and two seconds of settling completed, and a 1024 × 700 resize plus return produced no console error or WebGPU validation error. Thin-edge/ghosting preference remains a visual A/B decision, so TAAU is not the default.
