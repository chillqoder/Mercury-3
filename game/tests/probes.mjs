// Focused behavior probes — each runs in a fresh process-level scenario with
// the real simulation, independent of any test harness ordering effects.

import { Game } from '../src/game/sim.js';
import { CFG } from '../src/game/config.js';

const results = [];
let passed = 0, failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) { passed++; results.push(`  ok  ${name}`); }
  else { failed++; results.push(`  FAIL ${name} ${detail}`); }
};
const near = (a, b, eps = 0.02) => Math.abs(a - b) <= eps;
const newGame = () => new Game({ seed: 7 });
const run = (g, s) => { for (let i = 0; i < Math.round(s / CFG.STEP); i++) g.step(CFG.STEP); };

// --- multi-coin brick: 10 distinct full jumps, then spent ---
{
  const g = newGame(); g.startRun(); g.enemies = [];
  g.player.x = 11.5; g.player.y = 0;
  const base = g.coins;
  const counts = [];
  for (let tap = 0; tap < 12; tap++) {
    g.applyControl({ left: false, right: false, jump: true, run: false, down: false });
    g.step(CFG.STEP);
    g.applyControl({ left: false, right: false, jump: false, run: false, down: false });
    run(g, 300); // full jump arc, land and settle
    counts.push(g.coins - base);
  }
  check('multi-coin brick pays exactly 10 coins', counts[9] === 10 && counts[10] === 10 && counts[11] === 10, `counts=${counts.join(',')}`);
  check('multi-coin brick used after payout', g.cellKind(11, 4) === 'used', `kind=${g.cellKind(11, 4)}`);
}


// --- shell defeats enemy via a real kick (own chain) ---
{
  const g = newGame(); g.startRun(); g.enemies = [];
  const k = { kind: 'koopa', x: 0.3, y: 0, vx: -1.35, vy: 0, dir: -1, w: 0.9, h: 1.3, onGround: true, prevY: 0, state: 'walk', active: true, wakeT: 0, kickGraceT: 0, shellChain: 0, deadT: 0, squash: false, remove: false };
  const gb = { kind: 'goomba', x: 7, y: 0, vx: -1.65, vy: 0, dir: -1, w: 0.9, h: 0.9, onGround: true, prevY: 0, state: 'walk', active: true, wakeT: 0, kickGraceT: 0, shellChain: 0, deadT: 0, squash: false, remove: false };
  g.enemies = [k, gb];
  // stomp koopa -> retract
  g.player.x = 0; g.player.y = 2; g.player.vy = 0; g.player.prevY = 2;
  run(g, 0.6);
  if (k.state !== 'shell') { check('koopa retracted before kick', false, `state=${k.state}`); }
  else {
    // walk right into the shell from the left to kick it
    g.player.x = k.x - 1.0; g.player.y = 0; g.player.vx = 4; g.player.vy = 0; g.player.prevY = 0;
    g.applyControl({ left: false, right: true, jump: false, run: false, down: false });
    run(g, 0.25);
    g.applyControl({ left: false, right: false, jump: false, run: false, down: false });
    const before = g.score;
    run(g, 1.2);
    check('kicked shell defeats enemy (500 first hit)', gb.state === 'dead' && g.score >= before + 500, `state=${gb.state} +${g.score - before}`);
  }
}


// --- airborne stomp chain table (100 -> 200 -> 400 -> ...) ---
{
  const g = newGame(); g.startRun(); g.enemies = [];
  const mk = (x) => ({ kind: 'goomba', x, y: 0, vx: 0, vy: 0, dir: 1, w: 0.9, h: 0.9, onGround: true, prevY: 0, state: 'walk', active: true, wakeT: 0, kickGraceT: 0, shellChain: 0, deadT: 0, squash: false, remove: false });
  const e1 = mk(0), e2 = mk(1.4), e3 = mk(2.8);
  g.enemies = [e1, e2, e3];
  g.player.x = 0; g.player.y = 3; g.player.vy = 0; g.player.prevY = 3;
  g.input.jump = true;
  g.applyControl({ left: false, right: true, jump: true, run: true, down: false });
  for (let i = 0; i < 600; i++) g.step(CFG.STEP);
  g.input.jump = false;
  g.applyControl({ left: false, right: false, jump: false, run: false, down: false });
  const s1 = g.score;
  check('chain first 100', s1 >= 100 && s1 <= 199, `score=${s1}`);
  check('chain second +200', e2.state === 'dead' && g.score >= s1 + 200, `score=${g.score} e2=${e2.state}`);
  check('chain third +400', e3.state === 'dead' && g.score >= s1 + 600, `score=${g.score} e3=${e3.state}`);
}



// --- jump heights (fresh, enemy-free) ---
{
  const g = newGame(); g.startRun(); g.enemies = [];
  g.applyControl({ left: false, right: false, jump: true, run: false, down: false });
  g.step(CFG.STEP);
  g.applyControl({ left: false, right: false, jump: false, run: false, down: false });
  let peak = 0;
  for (let i = 0; i < 240; i++) { g.step(CFG.STEP); peak = Math.max(peak, g.inspect().player.y); }
  check('tap jump ≈2.4–2.9', peak >= 2.35 && peak <= 2.95, `peak=${peak.toFixed(3)}`);
}
{
  const g = newGame(); g.startRun(); g.enemies = [];
  g.applyControl({ left: false, right: false, jump: true, run: false, down: false });
  let peak = 0;
  for (let i = 0; i < 240; i++) { g.step(CFG.STEP); peak = Math.max(peak, g.inspect().player.y); }
  check('held jump ≈5.4', peak >= 5.1 && peak <= 5.9, `peak=${peak.toFixed(3)}`);
}

// --- stomp ---
{
  const g = newGame(); g.startRun(); g.enemies = [];
  const goomba = { kind: 'goomba', x: 0.3, y: 0, vx: -1.65, vy: 0, dir: -1, w: 0.9, h: 0.9, onGround: true, prevY: 0, state: 'walk', active: true, wakeT: 0, kickGraceT: 0, shellChain: 0, deadT: 0, squash: false, remove: false };
  g.enemies.push(goomba);
  g.player.x = 0; g.player.y = 2; g.player.vy = 0; g.player.prevY = 2;
  run(g, 0.6);
  check('stomp kills goomba', goomba.state === 'dead', `state=${goomba.state}`);
  check('stomp awards 100', g.score >= 100, `score=${g.score}`);
}

// --- koopa shell state machine ---
{
  const g = newGame(); g.startRun(); g.enemies = [];
  const k = { kind: 'koopa', x: 0.3, y: 0, vx: -1.35, vy: 0, dir: -1, w: 0.9, h: 1.3, onGround: true, prevY: 0, state: 'walk', active: true, wakeT: 0, kickGraceT: 0, shellChain: 0, deadT: 0, squash: false, remove: false };
  g.enemies = [k];
  g.player.x = 0; g.player.y = 2; g.player.vy = 0; g.player.prevY = 2;
  run(g, 0.6);
  check('koopa retracts to shell', k.state === 'shell', `state=${k.state}`);
  g.player.x = k.x - 1.0; g.player.y = 0; g.player.vx = 4; g.player.vy = 0; g.player.prevY = 0;
  g.applyControl({ left: false, right: true, jump: false, run: false, down: false });
  run(g, 0.25);
  g.applyControl({ left: false, right: false, jump: false, run: false, down: false });
  check('shell kicked', k.state === 'sliding', `state=${k.state}`);
}

// --- blocks ---
{
  const g = newGame(); g.startRun(); g.enemies = [];
  g.player.x = -29.5; g.player.y = 0;
  g.applyControl({ left: false, right: false, jump: true, run: false, down: false });
  g.step(CFG.STEP);
  g.applyControl({ left: false, right: false, jump: false, run: false, down: false });
  let sawMushroom = false;
  for (let i = 0; i < 260; i++) { g.step(CFG.STEP); if (g.items.some(it => it.type === 'mushroom')) sawMushroom = true; }
  check('small head-bump spawns mushroom', sawMushroom);
  check('question block becomes used', g.cellKind(-30, 4) === 'used', `kind=${g.cellKind(-30, 4)}`);
}
{
  const g = newGame(); g.startRun(); g.enemies = [];
  g.setPower('big');
  g.player.x = 10.5; g.player.y = 0;
  g.applyControl({ left: false, right: false, jump: true, run: false, down: false });
  g.step(CFG.STEP);
  g.applyControl({ left: false, right: false, jump: false, run: false, down: false });
  let broke = false;
  for (let i = 0; i < 260; i++) { g.step(CFG.STEP); if (g.cellKind(10, 4) === null) broke = true; }
  check('Big breaks brick', broke);
}

// --- hidden 1-UP ---
{
  const g = newGame(); g.startRun(); g.enemies = [];
  check('hidden block intangible at rest', g.solidAt(84, 4) === false);
  g.player.x = 84.5; g.player.y = 0;
  g.applyControl({ left: false, right: false, jump: true, run: false, down: false });
  g.step(CFG.STEP);
  g.applyControl({ left: false, right: false, jump: false, run: false, down: false });
  let revealed = false, oneup = false;
  for (let i = 0; i < 300; i++) {
    g.step(CFG.STEP);
    if (g.cellKind(84, 4) === 'used') revealed = true;
    if (g.items.some(it => it.type === '1up')) oneup = true;
  }
  check('hidden block reveals and stays solid', revealed && g.solidAt(84, 4) === true);
  check('hidden block releases 1-UP', oneup);
}

// --- warp / cellar ---
{
  const g = newGame(); g.startRun(); g.enemies = [];
  g.player.x = -3; g.player.y = 3; g.player.vy = 0; g.player.prevY = 3;
  g.applyControl({ left: false, right: false, jump: false, run: false, down: true });
  g.step(CFG.STEP);
  check('down on secret pipe warps', g.state === 'warp', `state=${g.state}`);
  run(g, 2.5);
  check('arrives in cellar', g.state === 'play' && g.area === 'cellar', `area=${g.area} state=${g.state}`);
  g.player.x = 31; g.player.y = 2; g.player.prevY = 2;
  g.applyControl({ left: false, right: false, jump: false, run: false, down: true });
  g.step(CFG.STEP);
  run(g, 2.5);
  check('returns to surface', g.area === 'surface' && g.state === 'play', `area=${g.area}`);
}

// --- fireball cap ---
{
  const g = newGame(); g.startRun(); g.enemies = [];
  g.setPower('fire');
  g.applyControl({ left: false, right: true, jump: false, run: true, down: false });
  run(g, 1.0);
  g.applyControl({ left: false, right: false, jump: false, run: false, down: false });
  check('fireball cap ≤ 2', g.fireballs.length <= 2, `n=${g.fireballs.length}`);
}

// --- timer warning once ---
{
  const g = newGame(); g.startRun(); g.enemies = [];
  g.timer = 101.2;
  let warnEvents = 0;
  for (let i = 0; i < 200; i++) {
    g.step(CFG.STEP);
    for (const e of g.drainAudioEvents()) if (e.t === 'warning') warnEvents++;
  }
  check('hurry warning fires once', warnEvents === 1, `n=${warnEvents}`);
}

// --- finish: high catch + time bonus + fireworks digit ---
{
  const g = newGame(); g.startRun(); g.enemies = [];
  g.timer = 431.9; // display digit 1 at capture
  g.player.x = 133.9; g.player.y = 1.2; g.player.prevY = 1.2;
  g.step(CFG.STEP);
  const grabbed = g.state === 'finish';
  check('flag grab at pole', grabbed, `state=${g.state}`);
  if (grabbed) {
    check('captured timer digit 1', g.finish.capturedTimer % 10 === 1, `captured=${g.finish.capturedTimer}`);
    check('fireworks rule 1', g.finish.fireworks === 1);
    for (let i = 0; i < 2200 && g.state !== 'win'; i++) g.step(CFG.STEP);
    check('course clear', g.state === 'win', `state=${g.state}`);
    if (g.state === 'win') {
      const ws = g.inspect().winStats;
      check('time bonus = captured × 50', ws.timeBonus === g.finish.capturedTimer * 50, `tb=${ws.timeBonus}`);
      check('one firework +500', ws.fireworkBonus === 500, `fw=${ws.fireworkBonus}`);
    }
  }
}


console.log(`\n=== Low Poly Mario focused probes ===\n${results.join('\n')}\n`);
console.log(`passed: ${passed}  failed: ${failed}`);
process.exit(failed === 0 ? 0 : 1);

