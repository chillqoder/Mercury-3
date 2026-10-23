// Scripted autoplay controller for headless verification of the surface route.
// It only uses the public inspect() + solidAt() API and a small decision loop.

import { CFG } from '../src/game/config.js';
import { LEVEL } from '../src/game/level-data.js';

export function autoplay(game, opts = {}) {
  const maxSteps = opts.maxSteps || 26000; // ~216s of game time at 1/120
  const dir = 1; // always advance right
  const mem = { holdJumpUntil: 0, jumpFrames: 0, lastJumpEnd: 0 };

  let steps = 0;
  let started = false;
  let wins = 0;
  let fails = 0;

  while (steps < maxSteps) {
    const st = game.inspect();
    const s = st.state;

    if (s === 'gameover') { fails++; break; }
    if (s === 'win') { wins++; break; }

    const control = { left: false, right: false, jump: false, run: false, down: false };

    if (s === 'title') {
      control.right = false;
      game.applyControl(control);
      game.startRun();
      started = true;
      steps++;
      continue;
    }
    if (s === 'finish' || s === 'warp' || s === 'dying') {
      game.applyControl(control);
      for (let i = 0; i < 2; i++) game.step(CFG.STEP);
      steps += 2;
      continue;
    }
    if (s !== 'play') { game.applyControl(control); steps++; continue; }

    const p = st.player;

    // do not fight the sim while transitioning/frozen
    const x = p.x, y = p.y;
    const h = p.power === 'small' ? CFG.SMALL_H : CFG.BIG_H;

    // --- probes ---
    const wallProbe = (dist) => {
      for (let yy = Math.floor(y + 0.3); yy <= Math.floor(y + h - 0.05); yy++) {
        if (game.solidAt(Math.floor(x + dir * dist), yy)) return true;
      }
      return false;
    };
    const wall = wallProbe(3.0);
    const nearWall = wallProbe(1.6);
    const pit = !game.solidAt(Math.floor(x + dir * 2.0), -1);
    const pitFar = !game.solidAt(Math.floor(x + dir * 3.2), -1);
    const pitRescue = !game.solidAt(Math.floor(x + dir * 2.6), -1);

    // stay focused near real pits: don't let enemy hops throw off the jump
    const PITS = [[4, 7], [37, 41], [90, 93]];
    const nearPit = PITS.some(([a, b]) => x > a - 8 && x < b + 2);
    const nextPit = PITS.find(([a, b]) => x > a - 40 && x < a + 2) || null;

    // planned pipe clears (tall pipes need a full run-up)
    let nextPipe = null;
    for (const p of LEVEL.pipes) {
      if (p.h >= 2 && p.x - 3.8 <= x && x <= p.x + 1.5) { nextPipe = p; break; }
    }

    // takeoff column must have clear sky above (avoid head-bumping bricks)
    const col = Math.floor(x + dir * 0.6);
    const headClear = !game.solidAt(col, 4);

    // nearest enemy ahead
    let enemyDist = 1e9;
    let enemyState = null;
    for (const e of st.enemies) {
      if (!e.active || e.state === 'dead') continue;
      const edx = (e.x - x) * dir;
      if (edx > -0.8 && edx < 5.0) {
        const dy = Math.abs(e.y - y);
        if (dy < 2.4 && edx < enemyDist) { enemyDist = edx; enemyState = e.state; }
      }
    }
    const enemyNear = enemyDist < 2.1;
    const enemyClose = enemyDist < 1.15;

    // --- behavior ---
    // Always run; take long, decisive jumps whenever something is ahead, but
    // avoid taking off directly beneath a low block row (head bump).
    let wantJump = false;
    const reason = wall || pit || pitFar || pitRescue || enemyNear || nextPit || nextPipe;
    if (reason) {
      if (p.onGround && (headClear || enemyClose || nearWall || pitRescue)) {
        wantJump = true;
      }
      control.right = true;
    } else {
      control.right = true;
    }
    // run always (full speed = longest, safest arcs)
    control.run = true;
    const hold = 0.55;

    // Emulate jump hold / release tied to the *launch* moment, so a hold is
    // never cut short by a transient grounded/false recomputation mid-flight.
    const now = steps * CFG.STEP;
    if (wantJump && p.onGround) {
      mem.launchT = now;
      mem.launchHold = hold;
    }
    const airborneHold = mem.launchT !== undefined && (now - mem.launchT) < mem.launchHold;
    control.jump = airborneHold || (p.onGround && wantJump);
    if (p.onGround && !wantJump) { mem.launchT = undefined; }

    game.applyControl(control);
    for (let i = 0; i < 2; i++) game.step(CFG.STEP);
    steps += 2;
  }

  return { wins, fails, steps, state: game.inspect().state, score: game.inspect().score, runTime: game.inspect().runTime };
}
