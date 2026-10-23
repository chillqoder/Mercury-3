# Prompt for Creating a 3D Orc Character with Axe in Three.js

## Objective
Create a single-file `index.html` web application using **Three.js** (loaded via CDN, e.g., `https://unpkg.com/three@0.160.0/build/three.module.js` with an import map, or the UMD build) that renders a stylized **3D orc warrior** holding a **battle axe** in his right hand. The scene must include a **UI button labeled "Attack"** that triggers an **axe swing / strike animation** when clicked.

---

## Technical Requirements

### 1. File Structure
- **One single file:** `index.html`
- No external assets (no images, no GLTF models, no textures) — everything must be **procedurally generated using Three.js primitives** (`BoxGeometry`, `SphereGeometry`, `CylinderGeometry`, `ConeGeometry`, `CapsuleGeometry`, `LatheGeometry`, `ExtrudeGeometry`, etc.).
- Include all CSS and JavaScript inline inside the HTML file.
- Use **ES modules** via `<script type="importmap">` and `<script type="module">`.
- Do **not** use any build tools, bundlers, or npm.

### 2. Renderer / Scene Setup
- `WebGLRenderer` with `antialias: true`, `shadowMap.enabled = true`, and `ACESFilmicToneMapping` for a cinematic look.
- `PerspectiveCamera` positioned to frame the orc from the front-left three-quarter view (e.g., position `(3, 3, 6)`, looking at `(0, 1.2, 0)`).
- `OrbitControls` (from `three/addons/controls/OrbitControls.js`) so the user can rotate/zoom around the model. Enable damping.
- Scene background: a dark gradient or solid dark color (e.g., `#1a1a1f`), with optional fog for atmosphere.
- Ground plane: large circular or square mesh (e.g., `CircleGeometry`), dark green/brown, receiving shadows.
- Lighting:
  - `HemisphereLight` for ambient fill.
  - `DirectionalLight` (warm, from upper-left) casting shadows.
  - Optional `PointLight` with red/orange tint near the axe for a menacing rim light.
- Enable `renderer.shadowMap.type = THREE.PCFSoftShadowMap`.

### 3. Orc Character (Procedural, Low-Poly / Stylized)
Build the orc as a **hierarchical group** (`THREE.Group`) named `orc`, made of child groups so it can be animated by rotating limbs.

**Anatomy to construct (all primitives, green skin color `#4a7c3a` with slight variation):**

- **Head** — slightly elongated sphere or rounded box; add:
  - Two small white eyes with dark pupils (spheres).
  - Heavy brow ridge (flattened box).
  - Two **tusks** (cones pointing upward from the lower jaw), off-white color.
  - Two **pointed ears** (cones rotated outward).
  - Optional: dark topknot or war paint via colored stripes.
- **Torso** — broad, muscular box or capsule, wider at the shoulders. Add a leather chest strap (thin rotated box) or simple pauldrons (small spheres/cones).
- **Shoulders / Upper arms / Forearms / Hands** — each limb is its own nested `Group` with pivot at the joint, so rotation looks natural:
  - `leftArmGroup` (shoulder pivot) → upper arm cylinder → `leftForearmGroup` (elbow pivot) → forearm → hand.
  - Same for the right arm; the right hand holds the axe.
- **Legs** — hips → thigh → knee pivot → shin → boot (box). Keep static or add subtle idle breathing.
- **Armor / details** — optional: leather bracers (cylinders), belt (torus), shoulder pads (half-spheres), loincloth (plane/box).

**Proportions:** stylized “heroic” — big shoulders, thick arms, shorter legs, oversized hands.

### 4. Battle Axe (Procedural)
Attach the axe as a child of the **right hand group**, so it moves with the arm.

- **Handle** — long thin cylinder, brown wood color, ~1.4 units long.
- **Axe head** — composed of:
  - A central block (box) for the socket.
  - Two blade shapes on either side, made with `ExtrudeGeometry` from a `THREE.Shape` (a curved crescent blade) or approximated with scaled `ConeGeometry` / custom `BufferGeometry`.
  - Metal color: `#8a8f98` with high `metalness` and low `roughness` (`MeshStandardMaterial`).
- Optionally add a leather wrap (a few thin torus rings) near the grip.

### 5. UI / Controls
- Add an HTML `<button id="attackBtn">Attack!</button>` positioned bottom-center with CSS styling (dark red, rounded, hover glow, subtle press animation).
- Add a small on-screen title ("Orc Warrior — Click to Attack") and a hint ("Drag to rotate · Scroll to zoom").
- Button listener calls a function `playAttack()`.

### 6. Attack Animation (Axe Swing + Impact)
Implement the swing animation **manually** with a small tweening system (no external libs), or use `requestAnimationFrame` with an eased timeline. **Do not use GSAP.**

**Timeline (≈ 1.0 s total), driven by the right arm group + torso + slight camera shake:**

1. **Wind-up (0.0 → 0.35 s, ease-out):**
   - Rotate `rightArmGroup` back and up (raise the axe overhead).
   - Rotate `torso` slightly backwards and twist.
   - Lean the whole `orc` group back slightly.
   - (Optional) Slight step back with the right leg.

2. **Strike (0.35 → 0.55 s, ease-in, fast):**
   - Snap `rightArmGroup` forward and down in a big arc.
   - Snap `torso` forward.
   - Axe should end pointing down-forward, as if hitting an enemy.
   - On the frame where the strike lands (~0.55 s):
     - Trigger a short **camera shake** (small random offsets over ~150 ms).
     - Spawn a simple **impact effect** at the axe's tip: a burst of small particles (a `THREE.Points` burst using `BufferGeometry` with random velocities, fading out over ~0.5 s) or an expanding ring (`RingGeometry` scaling up and fading).
     - Optional: screen flash via a white `div` overlay with a CSS opacity tween.
     - Play a subtle "thud" via the Web Audio API (`OscillatorNode` + gain envelope), no audio files.

3. **Recovery (0.55 → 1.0 s, ease-in-out):**
   - Smoothly return all joints to their resting pose.

**Implementation details:**
- Store each animated group's **rest rotation** as a base state.
- Use a keyframe array like:
  ```js
  const swing = [
    { t: 0.00, armX: 0,     armZ: 0,     torsoX: 0 },
    { t: 0.35, armX: -2.4,  armZ: 0.6,   torsoX: -0.25 }, // wind-up
    { t: 0.55, armX: 1.6,   armZ: -0.3,  torsoX: 0.35  }, // strike
    { t: 1.00, armX: 0,     armZ: 0,     torsoX: 0     }, // return
  ];
  ```
- Interpolate with easing functions (`easeInOutCubic`, `easeOutBack`, etc.).
- Guard against re-entry: if `isAttacking` is true, ignore new clicks (or queue/restart).
- Use a `THREE.Clock` to track `elapsed` and update the pose in the render loop.
- Add an idle animation: gentle torso breathing (sin wave on Y scale or slight rotation), arm sway, so the model feels alive when not attacking.

### 7. Polish
- `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`.
- Handle window `resize` to update camera aspect and renderer size.
- Use `MeshStandardMaterial` for all parts with appropriate `color`, `metalness`, `roughness`.
- Add subtle rim lighting to make the orc pop against the dark background.
- Optional: a rotating subtle "hero" light or emissive glow on the axe blade edges.

### 8. Code Quality
- Keep the code **modular in functions**: `createOrc()`, `createAxe()`, `setupLights()`, `setupUI()`, `playAttack()`, `updateAnimation(dt)`, `animate()`.
- Add short comments for each section.
- Keep everything self-contained and copy-paste runnable — opening `index.html` in a browser must work immediately.

---

## Deliverable
A single `index.html` file, ready to run in any modern browser, showing a stylized 3D orc warrior holding a battle axe, with orbit controls, a glowing "Attack" button, and a satisfying wind-up → strike → impact → recovery animation triggered on click.