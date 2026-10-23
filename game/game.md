# Low Poly Mario — Complete Creation and Improvement Prompt

You are a game designer, gameplay programmer, visual artist, and QA engineer. Build a complete, polished browser platformer called **Low Poly Mario**, or improve the existing implementation when a project is already present.

Deliver a working game, not a mockup or a list of suggestions. Think critically about what the current version lacks, implement the useful missing features, and verify the resulting experience before declaring the final version complete.

**All player-facing text, controls, notifications, menus, result screens, documentation, and feature-audit notes must be in English.**

## 1. Outcome and priorities

Create a recognizable Mario adventure inspired by the design of the original **Super Mario Bros. World 1-1**, presented as a carefully composed, Minecraft-inspired voxel world. Keep gameplay on one horizontal plane while rendering the world in 3D.

The experience should offer:

- Responsive movement, useful air control, and jumps that comfortably reach the intended surfaces.
- An opening that teaches through play, followed by gradually combined challenges.
- Reliable collisions, predictable enemies, and understandable damage rules.
- Mushrooms, flowers, stars, coins, bricks, question blocks, shells, and discoverable secrets.
- A secret coin cellar, a visible flagpole, a castle finish, and satisfying score rewards.
- Clear sound feedback, original chiptune music, and readable animations.
- A compact English interface, keyboard and touch controls, and persistent personal bests.
- A mandatory feature-gap audit followed by implementation and another verification pass before final delivery.

Prioritize playability and correctness first, progression and discovery second, visual and audio polish third, and additional content fourth. A beautiful level that cannot be completed does not satisfy the task.

## 2. Inspect the project before changing it

If a game already exists:

1. Read the project instructions and locate the actual playable entry point, simulation, renderer, level data, tests, and assets.
2. Inspect the current implementation and play it in a browser when tools permit.
3. Identify which features already work, which are incomplete, which are missing, and which contain defects.
4. Preserve working features, user-approved art direction, and the latest user-requested behavior.
5. Extend the active game in place. Keep one clear primary entry point; do not create a competing game folder merely to avoid integrating changes.
6. Keep unrelated files and existing user work intact.

If starting from scratch, create the same baseline inventory with features marked as missing, then implement the complete required feature set below.

Use this specification as a cohesive design brief. Adapt sample coordinates and numerical values when measured playability requires it. Explain intentional departures from original NES behavior in the feature audit.

## 3. Technical delivery

- Use `index.html` as the primary entry point.
- Use vanilla JavaScript and Three.js, unless the existing project has an appropriate established rendering architecture.
- Keep the project runnable without a required build step, account, backend, or external service.
- Vendor the rendering library locally and pin its version. The finished game must not depend on a CDN connection.
- Generate voxel models, pixel textures, and synthesized audio procedurally where practical.
- Keep supporting modules small and clearly named. A single-file implementation is acceptable, but do not force unrelated systems into one unreadable script.
- If a truly single-file artifact is explicitly requested, bundle the required code into that artifact instead of leaving external runtime dependencies.
- Separate authoritative simulation from rendering. Meshes, camera movement, and cosmetic animations must never determine gameplay collisions.
- Store level geometry and entity placement as explicit data shared by collision construction and rendering.
- Make artwork and restart behavior deterministic.
- Handle unavailable WebGL, audio, or browser storage gracefully. Storage and sound failures must not prevent gameplay.
- Use the project's existing development and validation tools when available.

Expose a small inspection API for deterministic gameplay checks if useful. Keep implementation and debugging details out of the player interface.

## 4. Visual direction

### Overall composition

Build a warm, bright, readable voxel world. Use aligned cubes, clean stepped silhouettes, restrained pixel textures, soft daylight, and contact shadows.

Suggested palette:

| Element | Direction |
| --- | --- |
| Sky | Soft blue, around `#9DD8ED` |
| Distant hills | Pale mint and blue-green |
| Grass | Fresh medium green |
| Soil | Warm brown and terracotta |
| Bricks | Orange-brown with readable mortar |
| Question blocks and coins | Golden yellow |
| Used blocks | Desaturated brown |
| Pipes | Rich green with a darker rim |
| Mario | Red cap and shirt, blue overalls, peach skin |
| UI backing | Deep green-gray, around `#263B36` |
| UI text | Warm off-white, around `#FFF6D9` |

Generate small textures, such as 16 by 16 pixels, with nearest-neighbor filtering. Keep the same apparent texel scale across terrain tiles. Use mineral flecks sparingly, clear brick mortar, vertical bark grain, and grouped foliage pixels.

### Background and scenery

Create an open meadow with several depth layers:

- Broad, stepped hills with softer contrast in the distance.
- Clean, light voxel clouds with slow drift.
- Subtle parallax between distant hills, clouds, and the foreground.
- Small bushes, occasional trees, grass tufts, and flowers.
- Grass-topped soil islands whose exposed ends make pits immediately recognizable.

Compose the background from the actual gameplay camera. Account for the camera angle when positioning distant scenery; hills should not unintentionally fill the entire sky.

Use a small family of designed trees with narrow trunks and coherent stepped crowns. Place them behind the gameplay lane. Keep scenery clear of enemies, blocks, landing zones, and Mario's silhouette.

Decorative ground, hills, and bushes must not bridge a playable pit visually or physically.

### Recognizable Mario

At normal play scale, Mario must have a red cap with a projecting brim and readable `M`, a peach face, eyes, eyebrows, a projecting nose, mustache, sideburns, red shirt, blue overall straps, gold buttons, white gloves, separate legs, and brown shoes.

Use shoulder and hip pivots. Keep his face visible when moving either direction. Preserve power-state proportions during every animation.

| State | Approximate collision height | Appearance |
| --- | ---: | --- |
| Small | 1.6 units | Compact red-and-blue Mario |
| Big | 2.5 units | Persistent larger Mario |
| Fire | 2.5 units | Larger Mario with a red-and-white outfit |

Build recognizable Goombas, Koopas, mushrooms, flowers, stars, coins, pipes, and question blocks using the same voxel language.

## 5. Controls and movement

### Stable controls

| Input | Action |
| --- | --- |
| `A / D` or `Left / Right` | Walk |
| `Space`, `W`, or `Up` | Jump in every power state |
| Hold a jump key | Jump higher |
| `Shift / X` | Run; also throw fireballs as Fire Mario |
| `Down / S` | Duck as powered Mario, or enter an eligible pipe |
| `P / Escape` | Pause or resume |
| `R` | Restart the entire run |
| `Enter` | Start, replay, or resume from an appropriate overlay |

**Space always means jump. Gaining a flower must never unexpectedly change the jump button into a shooting button.**

Provide touch buttons for left, right, jump, run/fire, and down. Support holding movement while jumping. Release inputs reliably on pointer cancellation, lost capture, focus loss, pause, and restart.

Prevent handled keys from scrolling the page. Use fresh presses for jumping and state transitions. Held firing may repeat through an explicit cooldown, not browser key-repeat events.

### Starting movement configuration

Use these as a coherent starting point, then verify them against the actual level:

| Parameter | Suggested value |
| --- | ---: |
| Walking speed | 6 units per second |
| Running speed | 9.8 units per second |
| Ground acceleration | 38 units per second squared |
| Air acceleration | 27 units per second squared |
| Ground braking | 32 units per second squared |
| Air braking | 8 units per second squared |
| Gravity | -40 units per second squared |
| Jump launch speed | 21 units per second |
| Running jump boost | Approximately 1.2 additional units per second |
| Falling speed limit | Approximately 34 units per second |
| Coyote time | Approximately 120 milliseconds |
| Jump buffer | Approximately 160 milliseconds |

A held standing jump should rise approximately 5.4 units. A very short tap should still rise approximately 2.4 to 2.8 units, allowing Small Mario to hit the lowest blocks from below. Running adds useful height and horizontal range.

Tune the level and jump together. Test these outcomes instead of assuming that a launch speed is sufficient:

- Small Mario can hit the first question block with a short tap.
- Small and Big Mario can land on the tallest mandatory pipe from the ground.
- A held jump can reach the top of the lowest floating platforms, approximately five units above the ground.
- Mandatory gaps have a comfortable landing margin.
- Final stairs and the flag remain reachable with the final jump configuration.

Apply acceleration without overshoot and preserve useful air steering. Variable-height jumping, coyote time, and buffering must each work without permitting double jumps.

Implement ducking with a shorter collision body. Mario must remain ducked under a low ceiling until standing is safe.

## 6. Physics and collision contracts

Use a fixed simulation step, preferably `1 / 120` second, with a capped accumulator and a separate render loop.

Use `x` for horizontal movement, `y` for height, and `z` for depth. Keep gameplay at `z = 0` and define player position consistently at the center of his feet. One ordinary block is approximately one world unit.

Maintain explicit world-space collision bounds and previous body positions. Resolve sides, floors, ceilings, enemy contacts, pickups, and progression in a consistent order.

Required guarantees:

- Stable standing on ground, stairs, pipes, and floating blocks.
- No false side collision while standing on a platform.
- Head impacts stop upward movement and activate the correct block once.
- Broken bricks leave the collision system immediately.
- Cosmetic bumps do not unpredictably move collision bounds.
- Pipe rims do not trap Mario underneath a tiny overhang; collision design must permit jumping up against a pipe.
- Valid initial positions for every enemy and item.
- Real falls into open pits, with death below approximately `y = -6`.
- Safe growth under ceilings, using deferred growth when necessary.
- Safe shell collision handling, including immediate block removal.
- No gameplay decisions based on decorative meshes or rendering frame rate.

## 7. Author a teachable World 1-1

Use the original first level's progression principles: demonstrate one interaction safely, provide room to learn it, then combine familiar interactions into more demanding sequences.

A suggested course spans approximately `x = -60` to `x = 148`, with Mario starting at `x = -56`, a flag near `x = 134`, and a castle near `x = 141`. These coordinates are a starting blueprint, not a requirement to reproduce a map blindly.

| Section | Suggested range | Purpose |
| --- | --- | --- |
| Safe opening | -60 to -35 | Learn movement, a coin block, the first Goomba, and the first adaptive power block |
| Pipe sequence | -35 to 4 | Increasing pipe heights, spaced enemies, and a hidden 1-Up |
| First gap and brick route | 4 to 37 | A forgiving gap, another power block, elevated coins, a multi-coin brick, and a hidden star |
| Middle stretch | 41 to 68 | Further combinations, the cellar exit, a halfway checkpoint, and recovery space |
| Staircase practice | 69 to 96 | A safe stair sequence followed by stairs around a real gap |
| Final approach | 96 to 121 | A recovery power block, a small enemy group, and the last pipe |
| Finale | 122 to 148 | A clear ascending staircase, flagpole, and castle |

Possible surface ground intervals are `[-60, 4]`, `[7, 37]`, `[41, 90]`, and `[93, 148]`. Build actual gaps between them.

Place the first lower blocks around bottom height `y = 4`, and optional upper rows around `y = 7.5`. Upper routes must be reachable through lower surfaces. Leave enough headroom for Big Mario to complete the main route.

Use pipes approximately 2.0, 2.8, and 3.4 units tall. Put one secret entrance in the later part of the opening pipe sequence and its exit in the middle stretch.

Place enemies deliberately rather than uniformly. Introduce a single Goomba first, then small groups and a Koopa. Allow clear sightlines before encounters and safe landing space after gaps.

The original NES World 1-1 uses Goombas and a green Koopa. A red Koopa may be a deliberate extension with a distinct ledge behavior. Piranha Plants, bosses, moving platforms, and other-world mechanics are not prerequisites for this first course; consider them separately during the feature audit.

Use coin trails to suggest safe routes, jumps, and optional exploration. Every mandatory obstacle must be passable without a power-up, a secret, or deliberate damage.

## 8. Blocks, coins, and secrets

### Coins

Create rotating gold coins with readable pickup volumes. A pickup disappears and awards points exactly once. Give one extra life per 100 collected coins and communicate the reward with `1-UP` feedback.

### Adaptive power blocks

Determine a power block's item when it is activated:

- Small Mario releases a Super Mushroom.
- Big or Fire Mario releases a Fire Flower.

Activation immediately consumes a single-use block. Animate a brief bump, replace the question face with a used-block appearance, and release one item. Used blocks remain solid.

### Bricks and multi-coin blocks

- Small Mario bumps ordinary bricks.
- Big and Fire Mario break them from below.
- Sliding shells can break ordinary bricks from the side regardless of Mario's size.
- Bumping a block can defeat an enemy standing directly on top.
- A multi-coin brick supports distinct repeated bumps, with a documented finite payout such as ten coins. Do not award several coins from one continuous overlap.

### Secrets

Include at least three distinct discoveries:

1. A hidden block containing a moving green 1-Up Mushroom.
2. A Star hidden in a brick.
3. A pipe leading to a secret coin cellar.

Unrevealed hidden blocks must not act as invisible side walls or floors. Reveal them on a valid hit from below, then make them solid.

Track unique discoveries so `Secrets` never increases repeatedly for the same location. Reset discoveries for a new run. Secrets enhance exploration and rewards without being required to finish.

## 9. Power-ups and damage

All items emerge visibly from their blocks. They must not move away or be collected before fully emerging.

| Item | Behavior after emergence | Collection |
| --- | --- | --- |
| Super Mushroom | Walks at roughly 3.1 units per second, falls, lands, and reverses at obstacles | Small becomes Big; stronger forms remain stronger |
| Fire Flower | Stays on its block with a restrained idle animation | Big becomes Fire; Fire remains Fire |
| 1-Up Mushroom | Moves and obeys gravity like a mushroom | Adds one life |
| Super Star | Moves, falls, and repeatedly bounces | Grants approximately ten seconds of invincibility |

For the original NES-style flower edge case, if a flower was released while Mario was Big and he becomes Small before collecting it, the flower grows him to Big rather than skipping directly to Fire.

Use a short transformation animation and a brief gameplay freeze when growing or shrinking. Keep visual size changes separate from safe collision-body changes. Do not repeatedly trigger collection sounds during deferred growth.

Big or Fire Mario shrinks to Small after harmful contact and receives approximately 2.2 seconds of invulnerability. A Star prevents contact damage and defeats enemies on touch, while pits and timeout remain lethal.

Show Star duration and a controlled color effect. Restore normal appearance and music when it expires.

## 10. Enemy behavior and shells

### Activation and walking

Activate enemies when they approach the visible gameplay area. Distant enemies should not exhaust their encounters before Mario reaches them.

Goombas walk at approximately 1.65 units per second and Koopas at approximately 1.35. Enemies obey gravity, reverse at solid obstacles, and turn apart on contact with other walking enemies.

Green enemies can walk off ledges. If red Koopas are included, give them a visible color distinction and a floor-ahead check that makes walking red Koopas turn at ledges. Their kicked shells still behave as moving shells.

Do not make Goombas reverse at arbitrary invisible patrol boundaries when no obstacle exists.

### Stomping

Use previous feet position and descending top contact to distinguish a stomp from side damage. A descending side overlap must not become a safe stomp.

Flatten a stomped Goomba briefly, disable its harmful contacts immediately, award the correct score once, and bounce Mario. Holding jump may produce a stronger bounce.

### Koopa state machine

Implement explicit walking, stationary-shell, sliding-shell, and defeated states.

- Stomping a walking Koopa retracts it.
- Kicking a stationary shell launches it away from Mario.
- Stomping a sliding shell stops it.
- A stationary shell warns before waking, then restores the full walking body and limbs when there is headroom.
- A sliding shell moves at approximately 12 units per second, ricochets from obstacles, defeats enemies, and remains dangerous to Mario.
- A kick grants a short grace period against that same shell only.
- Side impacts can break bricks and activate suitable blocks.
- Breaking a brick and reacting to the impact must not leave a shell embedded in another solid.

Restore collision dimensions and visible poses consistently at every transition.

## 11. Fireballs

Fire Mario throws small orange voxel projectiles in his facing direction.

- Spawn outside his collision body and reject a spawn embedded in a solid.
- Use approximately 13 units per second horizontal speed and a 0.25-second cooldown.
- Allow at most two active fireballs.
- Apply gravity and small floor bounces.
- Remove a projectile on a wall or ceiling impact, an enemy hit, an expired lifetime, or out-of-bounds travel.
- Award enemy points once and remove the projectile after its hit.
- Keep firing and jumping independently usable.
- Show a brief throwing pose and restrained impact particles.

## 12. Scoring and meaningful chains

Keep score rules explicit and award each event once.

| Event | Suggested points |
| --- | ---: |
| World coin or block coin | 200 |
| Collected power-up | 1,000 |
| Broken ordinary brick | 50 |
| Ordinary fireball, block, or Star enemy defeat | 100 |
| Each end-of-course firework | 500 |
| Each remaining timer unit converted at the finish | 50 |

### Airborne stomp chain

Increase the reward for successive eligible stomps without touching a solid floor:

`100 → 200 → 400 → 800 → 1,000 → 2,000 → 4,000 → 8,000 → 1-UP`

Further qualifying stomps can continue awarding 1-Ups. Reset the chain on a real landing, death, or restart. Fireball and Star kills must not advance this airborne chain. Do not replace the airborne condition with a generic timer-based combo.

### Shell chain

Each moving shell owns an independent chain:

`500 → 800 → 1,000 → 2,000 → 4,000 → 5,000 → 8,000 → 1-UP`

A ricochet does not reset its chain. Stopping, waking, or restarting the shell resets it. A defeated enemy cannot increase a chain again. Keep two active shells' rewards independent.

Display floating point values or `1-UP` near the event without obscuring the action.

## 13. Secret pipe travel

Make the coin cellar a real playable area with its own boundaries, background, coin arrangement, and music.

Enter only when Mario stands on the eligible pipe's top, is sufficiently centered, and presses down. Down beside a pipe must not teleport him.

Animate Mario descending into the entrance. Change the area during a short transition and place him safely inside the cellar. Provide an understandable route to an exit pipe.

Animate the return from inside the surface pipe up to its rim. Suppress normal movement and damage until the transition completes, then restore control with safe positioning and a brief protection period.

Preserve power state, score, collected items, remaining time, and discoveries across travel. Avoid re-awarding cellar coins after repeated entry. Clear obsolete projectiles and input state as appropriate.

The cellar may shorten the route, but the entire surface course must also remain completable.

## 14. Timer, lives, pause, and respawn

Start with three lives and a 300-unit countdown. Display a consistent integer timer.

At 100 remaining units, play a warning once and increase the current music's pace. Pausing must not repeat the warning. Restarting a new run resets it.

Implement clear states such as `title`, `play`, `paused`, `warp`, `dying`, `finish`, `gameover`, and `win`.

Pause freezes simulation, timer, movement, and gameplay animation timers. Silence music while paused or while the page is hidden. Clear held input to avoid sticky movement after returning.

On death, show an upward hop and fall, disable normal control, and deduct exactly one life. The third ordinary death ends the initial three-life run unless the player earned extra lives.

Use one safe halfway checkpoint for this approachable course. Preserve score, coins, discoveries, and consumed items after a non-final death. Respawn Small Mario on safe ground, clear velocity and transient states, and prevent an unavoidable contact hit. Restore a usable countdown after a timeout.

A full restart resets all run-specific state, including enemies, blocks, pickups, shells, chains, timer warnings, effects, secrets, power-ups, input, and the camera. Persistent records survive.

## 15. Flag, castle, time bonus, and fireworks

Finish through an intentional flag interaction while Mario is above the death boundary. Crossing the pole's x-coordinate below ground must not clear the course.

Allow the final high jump to catch the flag, including a jump above its visible top. Clamp Mario into a controlled slide instead of letting a successful high jump miss the goal.

Suggested flag-height rewards:

| Feet height at contact | Bonus |
| --- | ---: |
| More than 7 units | 5,000 |
| More than 5 units | 2,000 |
| More than 3 units | 800 |
| More than 1 unit | 400 |
| Lower valid contact | 100 |

Use a staged finish:

1. Capture the displayed remaining timer value and flag bonus exactly once.
2. Disable damage and normal input.
3. Lower the flag while Mario slides down.
4. Make Mario walk to the castle and disappear through its entrance.
5. Convert the remaining timer into score with visible and audible feedback.
6. Play the earned fireworks.
7. Save records and show the final result screen.

If the last digit of the captured displayed timer is `1`, `3`, or `6`, launch that many fireworks; otherwise launch none. Each burst awards 500 points exactly once. The rule must agree with the number the player saw when touching the flag, not a different rounding of an internal fractional timer.

Schedule fireworks after castle entry and score conversion. Use brief voxel bursts above the castle, distinct sounds, and bounded effect lifetimes. Do not reopen gameplay during the celebration.

## 16. Music and animation polish

### Sound

Generate original chiptune melodies and concise effects with Web Audio. Use distinct music for the meadow, cellar, and Star state. Add a hurry warning, transformation and 1-Up jingles, death feedback, a course-clear fanfare, time tally sounds, and firework sounds.

Initialize audio after a user gesture. Maintain one clear audio owner, bounded scheduling, and cleanup of finished nodes. A delayed frame or resumed tab must not play a backlog of missed notes.

Pause or silence music on pause, hidden-tab suspension, death, and completion as appropriate. Restore the correct current theme on resume or after Star expiration. The mute control must affect both music and effects, including scheduled notes.

### Animation

Include:

- Idle, walking, and running limb movement.
- Distinct airborne and stomp poses.
- A visible skid when reversing while still moving in the previous direction.
- A short fireball throwing pose.
- Controlled growth, shrinking, and Fire costume transitions.
- Damage blinking and bounded Star color changes.
- Mushroom emergence, flower idle movement, and bouncing stars.
- Shell retraction, waking warning, and restored walking limbs.
- Pipe entry and emergence.
- Death hop, flag slide, and castle entry.

Keep animations tied to simulation state or explicit cosmetic time. Never let an animation change the player's actual power state or overwrite a persistent large scale. Avoid excessive particles, flashing, shake, or effects that hide landing surfaces.

## 17. English UI and personal bests

Use a compact HUD with `Score`, `Coins`, `World`, `Time`, `Lives`, and `Power`, plus accessible pause and mute controls. Add a restrained course-progress indicator if it improves orientation.

Use simple overlays:

| State | Main text | Main action |
| --- | --- | --- |
| Title | `Low Poly Mario` | `Play` |
| Pause | `Paused` or `Take a breather.` | `Resume` |
| Game over | `Game Over` | `Try Again` |
| Complete | `Course Clear!` | `Play Again` |

Keep objectives and control summaries short. Use the rendered world as the backdrop. Prioritize the primary action and gameplay readability.

The completed-run screen should show:

- Final score.
- Run time.
- Coins collected.
- Unique secrets found, such as `2 / 3`.
- Enemies defeated.
- Flag bonus.
- Time bonus.
- Firework bonus.

Show `Best Score`, `Best Time`, and `NEW BEST` when appropriate. Save personal records locally using versioned, validated data. Save time records only for completed runs; failed or restarted runs may improve score records but cannot claim a completion-time record.

Treat run duration separately from the remaining countdown. Define which gameplay periods count and apply that definition consistently. Pause and finish celebrations must not inflate the recorded completion time.

Handle absent, corrupt, inaccessible, or full storage without interrupting the game. Retain in-memory records when persistence fails.

Verify narrow portrait and short landscape layouts. Keep HUD values, buttons, overlays, and touch controls within the viewport. Make long result panels scroll internally when necessary.

## 18. Performance and lifecycle

Reuse geometry, textures, and materials. Instance repeated terrain and scenery. Cap pixel ratio and choose reasonable shadow quality for the target viewport.

Remove finished effects, defeated entities, and expired projectiles. Dispose of owned temporary resources without destroying shared assets. Restarting must not accumulate listeners, audio loops, sprites, lights, arrays, or abandoned references.

Use the camera only for presentation. Keep visible enemy activation consistent with the viewport, and keep background parallax out of collision logic.

## 19. Verify the baseline before enrichment

Use focused automated simulation checks and actual browser interaction. Check the real game, not a separate approximation of its rules.

| Area | Required evidence |
| --- | --- |
| Movement | Symmetric acceleration, walking/running caps, braking, air steering, and skid transitions |
| Jumping | Short/held height, ground-to-pipe and ground-to-platform landings, coyote time, buffering, and no double jumps |
| Main route | A complete surface route for both Small and Big Mario without secrets or debug protection |
| Blocks | Head hits, single-use consumption, brick removal, multi-coin limits, hidden-block reveal, and shell side impacts |
| Items | Emergence protection, mushroom motion, stationary flowers, safe growth, flower-after-damage behavior, 1-Ups, and Star expiration |
| Enemies | Valid spawns, activation, obstacle/ledge reactions, top versus side contact, and harmless defeated states |
| Shells | Retraction, kicking grace, stopping, waking, ricochets, enemy kills, block impacts, and independent chains |
| Fireballs | Cooldown, two-shot cap, floor bounces, wall removal, and one score award per hit |
| Progression | Cellar entry and return, unique discoveries, checkpoint safety, life deduction, timeout, and full restart |
| Finish | Valid flag contact, high flag jumps, castle entry, exact score conversion, timer-digit fireworks, and one final transition |
| Records | Better/worse results, reload persistence, completion-only time records, and storage failure handling |
| Audio | Gesture gating, theme changes, hurry tempo, pause/resume, mute, hidden tabs, and bounded scheduling |
| Rendering | Recognizable characters, readable scenery, visible animation states, no errors, and responsive layouts |
| Lifecycle | Repeated restarts, focus loss, cleared inputs, and cleanup of effects and projectiles |

Run meaningful tests appropriate to the change. Record actual results. Do not claim a browser playthrough, sound playback, performance measurement, or completed test that was not performed. If a tool is unavailable, document the precise limitation and complete the remaining available checks.

## 20. Mandatory pre-final feature-gap audit

**This phase is required after the game is playable and before the final version is delivered. Do not stop after writing the list. Implement the selected improvements, then verify them.**

### A. Inspect the playable candidate

Review the actual code and play the candidate again. Compare it with this brief and the design intent of original World 1-1.

Ask concrete questions:

- What feels missing during a real run, even though the code technically works?
- Can a new player discover movement, stomping, power-ups, pipes, and secrets through play?
- Are jump heights, enemy spacing, and landings forgiving enough to be readable?
- Do blocks, mushrooms, flowers, shells, and chains interact consistently in edge cases?
- Does the game provide enough feedback for transformations, invulnerability, low time, and rewards?
- Is the finish satisfying, and is there a clear reason to replay?
- Which missing details belong to World 1-1, and which would be deliberate extensions?
- Are there placeholder buttons, dead controls, incomplete animations, silent states, or misleading text?
- Does the mobile experience expose problems hidden by the desktop viewport?

### B. Produce a concrete feature list

Write a concise English audit in `FEATURE_AUDIT.md` or the project's established implementation notes. Use a table:

| Feature or defect | Current state and evidence | Player benefit | Priority | Decision | Acceptance check | Final status |
| --- | --- | --- | --- | --- | --- | --- |
| Example: shell-to-brick impact | Shell reverses, but the brick survives in a tested side impact | Makes shells useful for discovery and rewards | High | Implement | Brick disappears once, score is awarded once, and the shell remains valid | Pending |

Classify findings as `Working`, `Partial`, `Missing`, or `Broken`. Do not list an existing working feature as missing. Keep factual observations separate from design ideas.

Group priorities:

- **P0:** broken progression, unsafe collisions, lost input, duplicate rewards, or other completion blockers.
- **P1:** missing required mechanics and major gaps in teaching, feedback, sound, secrets, or completion flow.
- **P2:** focused additions that improve replay value or polish without destabilizing the first course.
- **Future:** larger content additions or ideas that do not belong in this release.

For each selected item, define the expected behavior and a concrete way to verify it.

### C. Select and implement

Fix every P0 item and complete missing required P1 behavior. Then choose a small, coherent set of worthwhile P2 improvements supported by the audit. Examples include clearer secret hints, better result presentation, refined animation transitions, or another safe optional route.

Do not add features merely to make the list longer. If the required experience is already complete, implement only improvements that the review actually justifies. Do not force a new boss, world, editor, multiplayer mode, or unrelated power-up into a finished first level.

Within the authorized project scope, proceed from the audit to implementation without stopping to ask whether to continue. The selected list is work to complete, not a substitute for implementation. Ask only when a real external dependency or consequential scope ambiguity prevents the decision.

### D. Re-test and update the audit

For every implemented item:

1. Verify its own acceptance check.
2. Check its interactions with movement, power states, death, pause, restart, and progression.
3. Run the relevant existing regression checks.
4. Inspect its actual appearance and controls in the browser when possible.
5. Update its final status with implementation location and verification evidence.

Run a complete regression pass after the last gameplay change. Re-check the Small and Big surface routes, mobile layout, audio lifecycle, and finish flow.

Repeat this review if the new changes create defects. Keep enrichment bounded to a focused release; do not defer blockers merely because a polish pass is over, and do not extend the task indefinitely with unrelated ideas.

### E. Final gate

The final version is ready only when:

- Every required feature has working behavior.
- Every selected addition is implemented and verified.
- No P0 issue or unresolved selected item remains.
- Deferred ideas have explicit reasons and are not presented as completed.
- English UI and documentation match the actual controls and mechanics.
- All performed tests and material limitations are accurately reported.

## 21. Deliver the final version

Leave the primary game ready to launch from its documented entry point. Provide:

1. The finished game and required local runtime files.
2. A short English README with launch instructions, controls, and validation commands.
3. The completed feature audit with implemented, verified, and intentionally deferred items.
4. Relevant tests and concise verification results.

In the final response, identify the playable entry point, summarize the meaningful implemented improvements, state what was tested, and disclose any material verification limitation. Do not end with a proposed plan or an offer to implement the selected features later.

The final experience should feel like a complete first Mario adventure: immediately understandable, comfortable to control, rewarding to explore, technically dependable, and polished through an actual inspect–implement–verify cycle.
