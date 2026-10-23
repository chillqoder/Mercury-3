# Prompt: Living Glass Aquarium — A Detailed Procedural Three.js Experience

## Goal

Create a beautiful, interactive 3D aquarium in **one complete HTML file**, using **Three.js** for all 3D rendering. Build a miniature underwater world with convincing glass, visibly refracting water, delicate lighting, four individually designed fish, a working bubble filter, a pebble bed, a miniature castle, four distinct aquatic plants, one walking crab, and two crawling snails.

The result should feel like a carefully composed aquarium filmed with a cinematic camera: clear water, rich natural colors, detailed creatures, and continuous gentle movement. It must remain impressive both as a wide composition and when the viewer zooms in.

This is an artistic mixed-species aquarium. Preserve the specified freshwater and marine characters together as a deliberate visual choice.

**Implement the stages below in order.** Develop and inspect each model separately before integrating its behavior into the scene. Complete every stage; do not stop after making a tank and a few placeholder fish. The final deliverable is the working HTML implementation, not a plan or pseudocode.

## Exact Scene Inventory

| Object | Required quantity | Identity |
|---|---:|---|
| Glass aquarium | 1 | Rectangular, open top, visible wall thickness |
| Water body | 1 | Animated surface, visible refraction, moving caustics |
| Internal bubble filter | 1 | Black sponge filter with an airlift outlet and airline tube |
| Fish | Exactly 4 | One fancy guppy, one clownfish, one freshwater angelfish, one betta |
| Aquatic plants | Exactly 4 rooted specimens/clusters | Vallisneria, Anubias, Java fern, Cabomba |
| Castle | 1 | Detailed weathered aquarium ornament |
| Crab | Exactly 1 | Articulated, actively walking across the bottom |
| Snails | Exactly 2 | One on the bottom, one attached to the inside of the front glass |
| Pebbles | A dense bed | Hundreds of small stones with a few larger accents |

Do not add extra fish, crabs, snails, or additional plant clusters. Each of the four plants may contain multiple leaves or stems belonging to that one rooted specimen.

## Technical Boundaries

- Deliver one HTML file containing the CSS, JavaScript, shader code, and procedural asset generation.
- Use Three.js and its addons through CDN ES module imports. Pin the core and all addons to the same version; use an import map when needed to resolve addon imports.
- No downloaded models, image textures, HDR files, videos, sprites, or external asset packs. Generate geometry, surface patterns, and any environment lighting textures at runtime.
- Organize the code into clear creation functions and update systems even though it lives in one file.
- Give each fish, plant, crab, snail, and major decoration its own named group and construction function. Sharing utilities is encouraged; replacing different species with recolored copies is not.
- Use elapsed time and delta time in seconds for all animation. Keep behavior independent of frame rate and clamp large deltas after a hidden tab resumes.
- Fill the browser viewport, support resizing and touch, and keep the camera outside the tank.

---

## Stage 1 — Construct the Aquarium and Establish the Composition

1. Create the renderer, scene, perspective camera, basic lighting, and orbit controls.
2. Use a tank approximately **8 units wide × 4 units deep × 5 units high**, with Y as the vertical axis. Place its bottom near Y = 0 and its waterline near Y = 4.55.
3. Construct five glass panels: front, back, left, right, and bottom. Give them believable thickness, subtle edge tint, small seams, and clean highlights. Keep the top open.
4. Add a restrained matte-black bottom frame and narrow upper rim. Mount the tank on a simple dark pedestal with a soft contact shadow.
5. Use a deep navy-to-teal studio background. Keep it calm so the aquarium remains the focal point.
6. Start with a slightly elevated three-quarter front view that reveals the front, one side, the water surface, and the bottom.
7. Reserve the back-center for the castle, the back-right for the filter, and separate spaces around them for the four plants. Leave a broad central swimming area and a readable foreground route for the crab and bottom snail.

Use physically based glass shading with low roughness and an appropriate glass IOR around 1.5. Tune transmission, reflections, thickness, and transparency together: the panes must read as glass without hiding the inhabitants behind a milky overlay.

**Stage acceptance:** the empty tank already looks like a real transparent container, with stable edges and reflections from front, side, and elevated viewpoints.

## Stage 2 — Build the Water, Surface Movement, and Optical Refraction

Treat water as a major visual system, not a transparent blue cube.

### Surface movement

- Create a sufficiently subdivided water surface just below the rim.
- Combine several small waves with different directions, wavelengths, speeds, and phases. Use restrained amplitudes: this is an indoor aquarium, not an ocean.
- Compute surface normals consistently with the displacement so highlights and refraction respond to the actual wave shapes.
- Support localized, expanding, fading ripple rings where bubbles reach the surface. Connect their positions and timing to the bubble simulation in Stage 3.
- Include a thin waterline and a subtle meniscus-like edge along the glass.
- Keep the water surface contained inside the tank throughout the animation.

### Mandatory refraction and reflections

- Show **visible distortion of submerged objects when viewed through the rippling surface**. Pebble edges, fish silhouettes, and the castle must subtly bend and shift with the changing surface normals.
- Water should use an IOR near 1.333, distinct from the glass.
- Combine angle-dependent reflections with transmission: the surface becomes more reflective at grazing angles while remaining clear from above.
- Add restrained depth-dependent color absorption. Nearby fish retain vivid colors; longer paths through water gain a faint cool tint.
- Preserve clear visibility through the front and side panes, with subtle view-dependent glass refraction.
- Implement a suitable transmission/refraction rendering solution, using dedicated scene-color/depth render targets or additional passes if needed. Do not assume that stacking several transparent meshes automatically renders nested glass and water correctly.
- Prevent recursive feedback when capturing the scene for refraction. Handle screen edges, depth discontinuities, and transparent objects without black holes or unstable outlines.
- Restrict underwater distortion to the appropriate water/glass surfaces; do not wobble the entire screen or the interface.

### Shared current

Define one gentle spatial current field that can influence bubbles, plant leaves, suspended particles, and trailing fins. Introduce a localized upward flow around the future bubble plume. Different objects should respond according to their stiffness and position rather than swaying with identical sine waves.

**Stage acceptance:** use temporary submerged shapes to verify optical distortion and remove them afterward. Tilting the camera above the water must clearly reveal refraction, surface reflections, and a moving waterline. A static blue tint does not satisfy this stage.

## Stage 3 — Model the Black Filter and Animate Its Bubble Plume

Build a recognizable **black internal sponge filter with aeration**, mounted near the back-right bottom.

### Separate filter model

- A weighted dark base resting on the substrate.
- A cylindrical or rounded rectangular black sponge body with grooves and a subtle procedural porous surface.
- A dark vertical airlift tube and a clearly visible outlet.
- A thin airline hose routed discreetly toward and over the rear rim. The external air pump may remain outside the composition.
- Small mounting details or suction cups where appropriate.

Keep the filter visible enough to understand where the bubbles originate, while allowing the fish and castle to remain the main visual subjects.

### Bubbles

- Emit a continuous, irregular stream from the actual filter outlet. Start around 10–20 small bubbles per second and tune for elegance and performance.
- Vary bubble radius, rise speed, release timing, and lateral drift. Use mostly small bubbles with occasional slightly larger ones.
- Render bubbles as clear forms with bright curved highlights and subtle refraction, not opaque white balls.
- Let them rise with buoyancy, gentle wobble, and the shared current. Their size may remain nearly constant or expand subtly; do not visibly shrink them on the way up.
- Give the plume a narrow source and a gently widening upper region.
- Detect arrival at the animated water surface. Remove each bubble there and trigger a short-lived surface ripple; aggregate nearby arrivals when necessary for performance.
- Recycle bubble objects or instance data rather than continuously allocating geometry and materials.

**Stage acceptance:** the black device, bubble source, rising plume, and surface disturbance form one visibly connected system.

## Stage 4 — Create the Pebble Bed

- Cover the bottom with a continuous shallow substrate layer and approximately 350–700 instanced pebbles. Avoid a bare plane with a few scattered balls.
- Generate several rounded, irregular stone shapes and vary their scale, flattening, rotation, and color.
- Use a balanced palette of warm beige, slate gray, charcoal, muted brown, and occasional pale stones.
- Slightly slope the bed upward toward the back, with small local height variations around plants and the castle.
- Add a few larger stones as compositional accents without blocking creature routes.
- Use rough stone surfaces, subtle procedural mottling, and contact shadows. Pebbles must feel settled rather than suspended.
- Expose a substrate-height query or equivalent simplified collision surface for the bottom animals. Avoid forcing them to follow every tiny pebble vertex.

**Stage acceptance:** the floor reads as a dense, tactile pebble bed and supports believable contact for the later crab, snails, plants, and castle.

## Stage 5 — Build the Miniature Castle as Its Own Detailed Asset

Create one small, weathered stone castle ornament toward the rear center, slightly offset for a natural composition. Keep it below roughly half the tank height.

Include:

- Two or three towers with different heights, crenellations, and connected walls.
- A real arched doorway with visible depth and an interior passage, not a black rectangle painted on a solid wall.
- Small recessed windows, distinct stone courses, worn edges, and a few chips or cracks.
- A muted gray-beige ceramic/stone appearance with restrained greenish staining near the base.
- A foundation partly buried in the pebbles and convincing contact shadows.

Build the doorway from geometry that leaves an actual opening. Keep the structure attractive from the side and rear as well as the default camera angle. Supply collision volumes for its solid walls and towers; preserve the doorway as an opening if animals can traverse it.

**Stage acceptance:** the castle is recognizable in the wide shot and holds up under close inspection. It should look like a crafted aquarium ornament rather than several untouched primitives.

## Stage 6 — Develop Four Different Aquatic Plants Separately

Create exactly four rooted specimens, each with its own modeling function, silhouette, leaf structure, material variation, and animation response.

### Plant 1: Vallisneria

- One rear-corner clump of 8–12 long, narrow ribbon leaves.
- Leaves curve upward and bend softly near their tips; some approach the surface without piercing it.
- Use bright-to-deep green variation, a visible central crease, and gentle twisting.
- Animate broad, slow tip motion while keeping the rooted bases fixed.

### Plant 2: Anubias

- One low foreground or midground plant with 6–8 thick oval leaves.
- Model distinct petioles, a visible rhizome resting above the gravel, broad leaf surfaces, central veins, and slightly curled edges.
- Use rich dark green with subtle highlights.
- Give it small, relatively stiff movements rather than long waving motions.

### Plant 3: Java Fern

- One medium-height plant with 7–10 lance-shaped fronds growing from a single anchored base.
- Give the leaves uneven natural outlines, tapered tips, slight wrinkles, and varied curvature.
- Use olive and emerald tones.
- Animate delayed bending along each frond, strongest toward the tips.

### Plant 4: Cabomba

- One bushy rooted cluster of several fine stems with delicate fan-like or feathery leaf whorls.
- Make its branching structure visibly different from the other three plants.
- Use fresh light green with darker stems and subtle translucency at thin edges.
- Let the fine foliage respond more readily to the current, with varied phases along the stems.

Use curved leaf meshes with sufficient subdivisions for deformation. Add believable veins or fine surface patterns procedurally. Leaves must remain attached to their stems; do not rotate each whole plant like a rigid prop. Arrange the four specimens so their silhouettes are individually readable and do not hide the castle entrance or filter.

**Stage acceptance:** all four plant types are distinguishable by shape even without their colors, and each moves differently in the same water current.

## Stage 7 — Develop Fish 1: Fancy Guppy

Create the guppy as a complete independent procedural model before adding autonomous navigation.

- Small, slender, tapered body with a silver-blue base and patches of turquoise or green iridescent coloration.
- A large triangular fan tail with warm orange-red coloration, dark speckles, subtle rays, and a thin translucent edge.
- A distinct dorsal fin, paired pectoral fins, underside fins, gill details, a small mouth, and two glossy eyes.
- A smooth transition from the body through a narrow tail base into the broad tail.
- Total length around 0.75–0.9 units, with the fan tail contributing visibly to the silhouette.

Rig or procedurally deform the tail so movement travels from its base toward the flexible edge. Animate small pectoral flutters independently.

Personality: lively upper-to-middle-water exploration, short smooth bursts, and brief hovering pauses.

**Stage acceptance:** the guppy looks slim and delicate, with a broad patterned fan tail; it must not resemble a recolored clownfish.

## Stage 8 — Develop Fish 2: Clownfish

- A fuller orange body with a rounded head and a recognizable compact clownfish silhouette.
- Three irregular white vertical bands with narrow dark borders, wrapped continuously around the body surface.
- Orange fins with dark edging, a rounded fan tail, and a clearly defined dorsal fin.
- Paired pectoral fins, underside fins, visible gill lines, a small mouth, and two glossy eyes with restrained highlights.
- Total length around 0.95–1.1 units.

Create stripes through procedural surface coordinates or shader masks that follow the body. Avoid floating rings, raised white slabs, and disconnected markings.

Animate lateral body and tail movement, pectoral sculling, and subtle breathing at the gills.

Personality: steady mid-water swimming with occasional curious approaches toward the castle and plants.

**Stage acceptance:** the three orange-white-black bands and stockier silhouette make the species immediately recognizable.

## Stage 9 — Develop Fish 3: Freshwater Angelfish

- A tall, laterally compressed silver body with dark vertical bands and a slight pearlescent sheen.
- Large triangular dorsal and anal fins that form a distinctive high diamond-like silhouette.
- Two long, fine pelvic-fin filaments with gently trailing tips.
- A narrow head, small mouth, visible eyes, thin pectoral fins, and a proportionally modest tail.
- Body length around 0.8–1.0 units, with total height including fins around 1.3–1.6 units.

Give the tall fins visible rays and delicate edge deformation. Animate the pelvic filaments with flowing curves, keeping their attachment points fixed.

Personality: calm gliding, gradual vertical changes, broad turns, and controlled hovering.

**Stage acceptance:** this fish is clearly tall and flat from the front and side; its long fins must remain within the aquarium and avoid decorations.

## Stage 10 — Develop Fish 4: Betta

- An elongated deep-blue or violet body with a brighter turquoise head and subtle procedural scale detail.
- Large flowing caudal, dorsal, and anal fins with blue-to-magenta or burgundy gradients.
- Scalloped or softly ruffled fin outlines, visible radial rays, and translucent thin edges.
- Small paired pectoral fins, gill details, a mouth, and expressive but realistically proportioned eyes.
- Total length including flowing fins around 1.1–1.3 units.

Use subdivided fin meshes or an equivalent deformation system. Motion should travel through the fin surfaces with phase delay and greater freedom toward the trailing edges. The fins must not behave like rigid triangles rotating at their roots.

Personality: slow, deliberate exploration in the upper-middle region, short hovering intervals, and graceful turns with trailing fin motion.

**Stage acceptance:** the betta is immediately distinct from the guppy's triangular fan tail: its large flowing fins surround much more of the body.

## Stage 11 — Integrate Four Individual Swimming Behaviors

After all four fish models are complete, give each its own motion state, random seed, preferred depth range, speed profile, steering parameters, and animation phase.

- Use smoothly changing targets or wandering steering, with acceleration and turn-rate limits. Do not move fish along identical circles or teleport between waypoints.
- Orient each fish toward its actual velocity through smooth quaternion interpolation. Apply restrained pitch and slight banking during turns; keep fish upright.
- Couple swimming effort to body and tail motion. Faster movement increases tail activity; hovering retains small fin movements without constant full-speed tail thrashing.
- Make body undulation increase toward the tail while keeping the head relatively stable.
- Use predictive wall avoidance and a final bounds safeguard. Account for the full body, tall fins, long tails, and current animation envelope rather than checking only the center point.
- Avoid the castle, filter, larger stones, plant bases, and other fish. Use simple collision volumes and separation steering where appropriate.
- Check travel paths rather than only target locations so fish do not cut straight through the castle.
- Keep all four fish below the animated water surface and above the substrate.
- Let their preferred zones overlap naturally. Each should occasionally cross a clear, well-lit part of the composition without moving in lockstep.
- Do not force fish through the castle doorway unless their full animated shape fits safely.

**Stage acceptance:** all four inhabitants feel independent, remain recognizable while moving, and can swim for several minutes without clipping, jittering, or becoming stuck.

## Stage 12 — Develop and Animate One Bottom-Walking Crab

Construct a detailed crab approximately 0.7–0.9 units wide including its legs.

### Anatomy

- A low rounded carapace with subtle segmentation and a warm reddish-brown shell.
- Two claws on articulated front arms, each with distinct opening pincers.
- Eight walking legs, each with multiple visible segments and joints.
- Two short eyestalks with glossy dark eyes and small mouthpart details.
- Small asymmetries and procedural shell mottling for natural character.

### Movement

- Give the crab a clear route across the foreground pebbles, occasionally passing near the castle entrance and larger stones.
- Use predominantly sideways locomotion, with deliberate turns and short pauses.
- Coordinate alternating leg groups. Feet should plant against the substrate during stance and lift during recovery; the body must not simply slide over cycling legs.
- Follow the simplified substrate height with small body adjustments and stable ground contact.
- Occasionally open one claw or make a small exploratory gesture while stopped.
- Avoid solid decorations, plant bases, the bottom snail, and the tank walls. Do not teleport, float, or bury the legs deeply in the gravel.

**Stage acceptance:** the crab clearly walks on articulated legs and stays easy to observe from the default camera.

## Stage 13 — Develop Two Snails with Different Surface Constraints

Create two separately controlled snail instances. Shared construction utilities are acceptable, but give them different shell patterns and movement paths.

### Snail A: Bottom crawler

- A warm amber-brown, visibly spiral shell with growth bands and convincing three-dimensional coiling.
- A soft elongated body, a broad muscular foot, a small head, and two fine tentacles.
- Very slow movement over a visible foreground route, including gentle climbs over suitable small stones.
- Subtle foot deformation and tentacle exploration. Keep the shell firmly attached to the body as its posture changes.
- Follow the substrate height and avoid the crab and solid obstacles.

### Snail B: Glass crawler

- A contrasting olive or cream shell with dark stripes or speckles and a clear spiral form.
- Start on the **inside of the front glass**, in its lower third and offset from the center so the snail does not hide a fish.
- Place the soft foot against the pane and orient the shell inward into the water. From outside, the viewer should be able to read its attachment through the glass.
- Crawl extremely slowly along a short vertical or diagonal path. Keep its movement constrained to that pane and below the waterline.
- Model the contact accurately: no floating gap, penetration through the glass, or drifting away from the pane.
- Animate small head and tentacle movements even when forward motion is nearly imperceptible.

Scale both snails so they are visible when zoomed in but do not dominate the scene.

**Stage acceptance:** there are exactly two snails: one visibly crawling on the bottom and one visibly attached to and crawling along the inside of the glass.

## Stage 14 — Finish Underwater Lighting and Moving Caustics

- Add a believable aquarium light above the water, with a soft bright key and restrained cool fill. Create attractive reflections without blowing out fish markings.
- Generate soft shadows and contact shading under the castle, stones, filter, crab, and rooted plants.
- Add **animated caustic light patterns** across the pebbles and castle, with subtler contributions on suitable submerged surfaces.
- Derive the caustic motion from the same wave state, or a visually coherent approximation of it, so the light patterns feel caused by the water above.
- Map caustics onto submerged geometry in world space. Do not use a flat full-screen animated overlay or illuminate dry external objects as if they were underwater.
- Keep the patterns delicate: slowly concentrating and dispersing light, not bright white noise or flashing stripes.
- Add a small number of faint suspended particles to reveal depth and current. Keep the water clean rather than cloudy.
- Use restrained tone mapping and balanced exposure. Maintain saturated fish colors, natural greens, dark readable equipment, and clear glass.
- If adding bloom or underwater light shafts, keep them subtle and subordinate to clarity and performance.

**Stage acceptance:** water movement, refraction, bubbles, plant motion, and shifting light read as parts of the same underwater environment.

## Stage 15 — Camera, Interaction, and Presentation

- Provide smooth orbit rotation, zoom, and controlled panning through OrbitControls, including touch equivalents.
- Choose camera-distance, target, and angle limits that prevent entry into the tank or pedestal. Panning must not bypass those constraints.
- Include a small unobtrusive overlay with only essential controls: reset view and pause/resume animation.
- Pausing must freeze the simulation time for all fish, limbs, fins, plants, bubbles, ripples, particles, and caustics while leaving camera inspection available.
- Keep the default view stationary until the user interacts; avoid compulsory camera spinning.
- Frame the scene carefully across desktop and narrow screens. The first view should show the complete tank and make the castle, bubble column, varied vegetation, and inhabitants discoverable.
- Remove temporary model previews, debug helpers, collision outlines, and development controls from the final presentation.

**Stage acceptance:** the experience is ready to open, explore, pause, inspect closely, and capture in a screenshot without UI clutter.

## Stage 16 — Performance and Final Visual Verification

Aim for smooth interactive rendering, ideally around 60 fps on a capable laptop, without treating a frame-rate target as permission to remove required features.

- Instance pebbles and suitable repeated details; share geometries and materials where it preserves visual variety.
- Pool bubbles and particles. Avoid creating objects, geometry, or materials in the animation loop.
- Cap device pixel ratio and scale expensive render targets to an appropriate resolution.
- Keep transparent overdraw, transmission passes, shadow maps, and post-processing under control.
- If quality needs to adapt, reduce particle density, shadow resolution, and optical render-target resolution before simplifying the required creatures or removing refraction.
- Handle resize updates for the camera, renderer, and all render targets.
- Check imports, shader compilation, and the browser console. Deliver no missing assets, unimplemented functions, or runtime errors.

Inspect the finished scene from the default view, both sides, and above the water. Run it long enough to observe complete behavior cycles.

### Final acceptance checklist

- [ ] One coherent, polished glass aquarium, entirely rendered with Three.js.
- [ ] One self-contained HTML implementation, with only Three.js/addon CDN imports as external dependencies.
- [ ] Clear, animated water with visible refraction, angle-dependent reflections, a waterline, and localized bubble ripples.
- [ ] Moving underwater caustics that complement the water motion.
- [ ] Exactly four separately modeled, unmistakably different fish: guppy, clownfish, angelfish, and betta.
- [ ] Distinct body shapes, surface patterns, fin construction, and swimming personalities for all four fish.
- [ ] A visible black internal filter producing a continuous bubble plume from its outlet.
- [ ] A dense pebble bed and a detailed castle with a real arched opening.
- [ ] Exactly four distinct rooted aquatic plants with different leaf structures and motion.
- [ ] Exactly one crab with two claws, eight walking legs, and believable bottom contact.
- [ ] Exactly two snails, correctly constrained to the bottom and the inside of the front glass respectively.
- [ ] No fish crossing the glass, surface, substrate, filter, or solid castle walls.
- [ ] No obvious floating objects, intersecting animal parts, transparency flicker, opaque water, or disappearing creatures during orbiting.
- [ ] Smooth camera controls, working pause/resume, responsive layout, and a clean console.

## Final Quality Standard

Deliver a complete living aquarium, not an early prototype. Prioritize the combination of convincing water optics, carefully designed individual creatures, detailed miniature scenery, and restrained natural motion. The fish must look like four different species, the plants must look rooted and flexible, and the bottom animals must visibly interact with their surfaces. The final image should be calm, rich, readable, and beautiful enough to serve as the centerpiece of a Three.js graphics demo.
