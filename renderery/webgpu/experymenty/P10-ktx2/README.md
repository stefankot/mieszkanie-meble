# P10 — KTX2 hero-material pilot

Only the existing `oak_veneer_01` hero material is included. The default renderer still uses the original 1K JPEG maps.

- `?ktx2=etc1s` — ETC1S albedo plus UASTC normal and ARM.
- `?ktx2=uastc` — UASTC albedo, normal and ARM.
- no parameter — unchanged JPEG baseline.

The runtime report is available as `window.__silnik.ktx2`: encoded bytes, download time, transcoding time, selected GPU format, total material-start time and fallback state. A KTX2 failure falls back to the JPEG set.

Files were produced with Basis Universal 2.50.0, mipmaps enabled. Albedo uses sRGB metadata; normal and ARM use linear metadata. Encoded file size does not represent VRAM: runtime GPU format and mip allocation determine resident memory.

Offline pilot on the exact 1024 × 1024 source maps:

| Set | Transfer bytes | Change vs JPEG |
| --- | ---: | ---: |
| JPEG baseline (albedo + normal + ARM) | 2,109,265 | — |
| ETC1S albedo + UASTC normal/ARM | 2,033,423 | −3.6% |
| all UASTC | 2,878,225 | +36.5% |

Albedo transcoded to ASTC 4×4 measured 37.46 dB RGB PSNR for ETC1S and 44.11 dB for UASTC. All four KTX2 files passed `basisu -validate`. Browser timings and the actual adapter format are deliberately reported only at runtime; file size alone is not treated as a VRAM result.
