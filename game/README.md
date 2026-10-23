# Low Poly Mario

A complete, polished browser platformer inspired by **Super Mario Bros. World 1-1**,
built as a Minecraft-style voxel world. One horizontal gameplay plane, rendered in
3D with vanilla JavaScript and Three.js.

## Quick start

No build step, backend, or CDN required.

```bash
# serve the folder over HTTP (ES modules require http://)
python3 -m http.server 8765
```

Then open <http://localhost:8765> and press **Play** (or **Enter**).

Entry point: **`index.html`** → `src/app/main.js`.

## Tests

```bash
npm test                 # isolated simulation probes (Node, no browser needed)
npm run test:full        # broader combined suite (some multi-step cases are flaky when batched; see FEATURE_AUDIT.md)
npm run test:browser     # headless Chromium E2E: boot, rendering, input, pause/mute/restart, layouts + screenshots
```

The isolated probes (`tests/probes.mjs`) exercise the real simulation: jump
heights, coyote/buffering, blocks and items, hidden secrets, stomp/shell/
fireball rules, warp travel, timer warning, high-flag finish with time bonus and
the fireworks digit rule, and the mandatory route arcs (gaps, tallest pipe,
stairs, flag). The browser E2E verifies the running game via the inspection API
and captures screenshots into `tests/shots/`.

## Controls

| Input | Action |
| --- | --- |
| `A / D` or `← / →` | Walk |
| `Space`, `W`, `↑` | Jump (hold to jump higher) |
| `Shift / X` | Run; Fire Mario also throws fireballs (held fire repeats with cooldown) |
| `↓ / S` | Duck (powered), or enter an eligible pipe |
| `P / Esc` | Pause / resume |
| `R` | Restart the run |
| `Enter` | Start / continue from overlays |

Touch buttons (left/right/jump/run/down) appear on touch devices; multi-touch is
supported.

## Architecture

- `src/game/` — authoritative, DOM-free simulation (fixed 120 Hz step, explicit
  voxel collision data, scoring, secrets, warp, finish).
- `src/app/` — presentation: Three.js voxel renderer, Web Audio chiptune synth,
  input, HUD/overlays, records.
- `vendor/three.module.js` — Three.js r170 (pinned, vendored locally).
- `tests/` — headless verification suite + scripted autoplay.

Simulation and rendering are strictly separated: gameplay never reads meshes or
frame rate.
