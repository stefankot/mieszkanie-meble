# P11 — lean MRT prototype result

`window.__silnik.mrtAudit` computes the attachment use and an upper-bound color-write estimate for the current viewport. It is explicitly not GPU timing.

At 1280 × 720 and pixel ratio 1, the shared six-attachment MRT is estimated at 29.9 MiB of color writes per scene pass. A profile-specific layout would be approximately 14.1 MiB for minimal, 21.1 MiB for medium and unchanged for high after TAAU consumes velocity.

The production graph remains shared. `PassNode`, SSGI, SSR, TAAU and every cached output graph retain references to the attachment textures; changing the layout during a profile switch therefore requires rebuilding and disposing the dependent graph, recompiling shaders and resetting temporal history. This is a large lifecycle change for no high-profile saving. The audit is retained as the P11 prototype and the baseline is unchanged.
