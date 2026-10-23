// Low Poly Mario — headless verification suite.
// Every check runs against the real simulation (no mock physics).

import { Game } from '../src/game/sim.js';
import { CFG } from '../src/game/config.js';
import { LEVEL } from '../src/game/level-data.js';

const results = [];
let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) { passed++; results.push(`  ok  ${name}`); }
  else { failed++; results.push(`  FAIL ${name} ${detail}`); }
}

function near(a, b, eps = 0.02) { return Math.abs(a - b) <= eps; }

function newGame() { return new Game({ seed: 7 }); }

// run(game, seconds) advances the simulation by a duration in seconds.
function run(game, seconds) {
  runSteps(game, Math.round(seconds / CFG.STEP));
}

function runSteps(game, steps) {
  for (let i = 0; i < steps; i++) game.step(CFG.STEP);
}

function holdRight(game, seconds) {
  game.applyControl({ left: false, right: true, jump: false, run: false, down: false });
  run(game, seconds);
}

function tapJump(game) {
  game.applyControl({ left: false, right: false, jump: true, run: false, down: false });
  game.step(CFG.STEP);
  game.applyControl({ left: false, right: false, jump: false, run: false, down: false });
}

function holdJump(game, seconds) {
  game.applyControl({ left: false, right: false, jump: true, run: false, down: false });
  run(game, seconds);
  game.applyControl({ left: false, right: false, jump: false, run: false, down: false });
}

// ================= 3. Blocks & items =================

{
  const g = newGame();
  g.startRun();
  g.player.x = -29.5; g.player.y = 0;
  tapJump(g);
  let sawItem = false;
  for (let i = 0; i < 260; i++) { g.step(CFG.STEP); if (g.items.some(it => it.type === 'mushroom')) sawItem = true; }
  check('small Mario taps first question block -> mushroom appears', sawItem);
  check('question block consumed (used)', g.cellKind(-30, 4) === 'used', `kind=${g.cellKind(-30, 4)}`);
  check('used block stays solid', g.solidAt(-30, 4) === true);
}

{
  const g = newGame();
  g.startRun();
  g.setPower('big');
  g.player.x = -29.5; g.player.y = 0;
  tapJump(g);
  let sawFlower = false;
  for (let i = 0; i < 260; i++) { g.step(CFG.STEP); if (g.items.some(it => it.type === 'flower')) sawFlower = true; }
  check('Big Mario -> Fire Flower', sawFlower);
}

{
  const g = newGame();
  g.startRun();
  g.setPower('big');
  g.player.x = 10.5; g.player.y = 0;
  tapJump(g);
  let broke = false;
  for (let i = 0; i < 260; i++) { g.step(CFG.STEP); if (g.cellKind(10, 4) === null) broke = true; }
  check('Big Mario breaks bricks from below', broke);
}

{
  const g = newGame();
  g.startRun();
  g.player.x = 11.5; g.player.y = 0;
  const coins0 = g.coins;
  for (let i = 0; i < 12; i++) {
    holdJump(g, 0.12);
    runSteps(g, 300); // full jump arc + settle
  }
  const gained = g.coins - coins0;
  check('multi-coin brick pays exactly 10', gained === 10, `gained=${gained}`);
  check('multi-coin brick used after payout', g.cellKind(11, 4) === 'used', `kind=${g.cellKind(11, 4)}`);
}

{
  const g = newGame();
  g.startRun();
  check('hidden block is not solid', g.solidAt(84, 4) === false);
  g.player.x = 84.5; g.player.y = 0;
  holdJump(g, 0.12);
  let revealed = false, oneup = false;
  for (let i = 0; i < 300; i++) {
    g.step(CFG.STEP);
    if (g.cellKind(84, 4) === 'used') revealed = true;
    if (g.items.some(it => it.type === '1up')) oneup = true;
  }
  check('hidden block reveals and stays solid', revealed && g.solidAt(84, 4) === true);
  check('hidden block releases 1-UP', oneup);
}

// ================= 4. Fireballs =================

{
  const g = newGame();
  g.startRun();
  g.setPower('fire');
  g.player.x = 0; g.player.y = 0;
  g.applyControl({ left: false, right: true, jump: false, run: true, down: false });
  run(g, 0.35);
  check('fireball thrown', g.fireballs.length === 1);
  run(g, 0.3);
  run(g, 0.5);
  check('two-shot cap', g.fireballs.length <= 2);
}

{
  const g = newGame();
  g.startRun();
  g.setPower('fire');
  g.player.x = -11; g.player.y = 0;
  g.applyControl({ left: true, right: false, jump: false, run: true, down: false });
  run(g, 1.2);
  g.applyControl({ left: false, right: false, jump: false, run: false, down: false });
  check('fireball removed on wall impact', g.fireballs.length === 0);
}

// ================= 5. Enemies & shells =================

{
  const g = newGame();
  g.startRun();
  g.enemies = [];
  const goomba = { kind: 'goomba', x: 0.3, y: 0, vx: -1.65, vy: 0, dir: -1, w: 0.9, h: 0.9, onGround: true, prevY: 0, state: 'walk', active: true, wakeT: 0, kickGraceT: 0, shellChain: 0, deadT: 0, squash: false, remove: false };
  g.enemies.push(goomba);
  g.player.x = 0; g.player.y = 2; g.player.vy = 0; g.player.prevY = 2;
  run(g, 0.6);
  check('stomp kills goomba', goomba.state === 'dead', `state=${goomba.state}`);
  check('stomp bounces player', g.player.vy > 0, `vy=${g.player.vy}`);
  check('stomp awards 100', g.score >= 100, `score=${g.score}`);
}

{
  const g = newGame();
  g.startRun();
  const k = { kind: 'koopa', x: 0.3, y: 0, vx: -1.35, vy: 0, dir: -1, w: 0.9, h: 1.3, onGround: true, prevY: 0, state: 'walk', active: true, wakeT: 0, kickGraceT: 0, shellChain: 0, deadT: 0, squash: false, remove: false };
  g.enemies = [k];
  g.player.x = 0; g.player.y = 2; g.player.vy = 0; g.player.prevY = 2;
  run(g, 0.6);
  check('koopa retracts to shell', k.state === 'shell', `state=${k.state}`);
  check('shell height reduced', near(k.h, 0.7, 0.001), `h=${k.h}`);
  g.player.x = k.x - 1.0; g.player.y = 0; g.player.vx = 4; g.player.vy = 0; g.player.prevY = 0;
  g.applyControl({ left: false, right: true, jump: false, run: false, down: false });
  run(g, 0.25);
  g.applyControl({ left: false, right: false, jump: false, run: false, down: false });
  check('shell kicked', k.state === 'sliding', `state=${k.state}`);
  check('kick grace protects player', g.inspect().lives === 3);
  const gb = { kind: 'goomba', x: k.x + 6, y: 0, vx: -1.65, vy: 0, dir: -1, w: 0.9, h: 0.9, onGround: true, prevY: 0, state: 'walk', active: true, wakeT: 0, kickGraceT: 0, shellChain: 0, deadT: 0, squash: false, remove: false };
  g.enemies.push(gb);
  run(g, 1.2);
  check('shell defeats enemy (500 chain)', gb.state === 'dead', `state=${gb.state}`);
}

{
  const g = newGame();
  g.startRun();
  g.applyControl({ left: false, right: true, jump: false, run: false, down: false });
  const mk = (x) => ({ kind: 'goomba', x, y: 0, vx: 0, vy: 0, dir: 1, w: 0.9, h: 0.9, onGround: true, prevY: 0, state: 'walk', active: true, wakeT: 0, kickGraceT: 0, shellChain: 0, deadT: 0, squash: false, remove: false });
  const e1 = mk(0), e2 = mk(0.55), e3 = mk(1.1);
  g.enemies = [e1, e2, e3];
  g.player.x = 0; g.player.y = 3; g.player.vy = 0; g.player.prevY = 3;
  g.input.jump = true;
  g.applyControl({ left: false, right: true, jump: true, run: false, down: false });
  for (let i = 0; i < 400; i++) g.step(CFG.STEP);
  g.input.jump = false;
  const s1 = g.score;
  check('first stomp 100', s1 >= 100 && s1 <= 199, `score=${s1}`);
  check('second stomp 200 (chain)', e2.state === 'dead' && g.score >= s1 + 200, `score=${g.score} e2=${e2.state}`);
  check('third stomp 400 (chain)', e3.state === 'dead' && g.score >= s1 + 600, `score=${g.score} e3=${e3.state}`);
}

// ================= 6. Warp / cellar =================

{
  const g = newGame();
  g.startRun();
  g.player.x = -3; g.player.y = 3; g.player.vy = 0; g.player.prevY = 3;
  g.applyControl({ left: false, right: false, jump: false, run: false, down: true });
  g.step(CFG.STEP);
  check('down on pipe enters warp', g.state === 'warp', `state=${g.state}`);
  run(g, 2.5);
  check('arrives in cellar', g.state === 'play' && g.area === 'cellar', `area=${g.area} state=${g.state}`);
  check('cellar secret discovered once', g.discovered.size === 1);
  const coins0 = g.coins;
  g.player.x = 10.5; g.player.y = 0;
  holdRight(g, 0.6);
  check('cellar coins collectable', g.coins > coins0);
  g.player.x = 31; g.player.y = 2; g.player.prevY = 2;
  g.applyControl({ left: false, right: false, jump: false, run: false, down: true });
  g.step(CFG.STEP);
  run(g, 2.5);
  check('returns to surface', g.area === 'surface' && g.state === 'play', `area=${g.area}`);
  g.player.x = -3; g.player.y = 3; g.player.prevY = 3;
  g.applyControl({ left: false, right: false, jump: false, run: false, down: true });
  g.step(CFG.STEP);
  run(g, 2.5);
  check('secret count does not double', g.discovered.size === 1);
}

{
  const g = newGame();
  g.startRun();
  g.player.x = -13; g.player.y = 2; g.player.prevY = 2;
  g.applyControl({ left: false, right: false, jump: false, run: false, down: true });
  g.step(CFG.STEP);
  check('non-secret pipe ignores down', g.state === 'play' && g.area === 'surface');
}

// ================= 7. Timer / checkpoint / death =================

{
  const g = newGame();
  g.startRun();
  g.timer = 101.2;
  let warned = false, warnEvents = 0;
  for (let i = 0; i < 200; i++) {
    g.step(CFG.STEP);
    for (const e of g.drainAudioEvents()) if (e.t === 'warning') warnEvents++;
    if (g.inspect().timer <= 100) warned = true;
  }
  check('warning fires once at 100', warned && warnEvents === 1, `warnEvents=${warnEvents}`);
  g.togglePause();
  const tPaused = g.inspect().timer;
  runSteps(g, 60);
  check('pause freezes timer', g.inspect().timer === tPaused);
  g.togglePause();
}

{
  const g = newGame();
  g.startRun();
  g.player.x = 80; g.player.y = 0;
  g.applyControl({ left: false, right: true, jump: false, run: false, down: false });
  run(g, 0.5);
  check('checkpoint taken', g.checkpointTaken === true);
  g.score = 5000;
  g.timer = 0.2;
  runSteps(g, 100);
  check('timeout kills', g.state === 'dying' || g.inspect().lives === 2, `state=${g.state} lives=${g.inspect().lives}`);
  for (let i = 0; i < 500 && g.state !== 'play' && g.state !== 'gameover'; i++) g.step(CFG.STEP);
  if (g.state === 'play') {
    check('respawned at checkpoint', Math.abs(g.player.x - 66) < 0.5, `x=${g.player.x}`);
    check('score preserved across death', g.score === 5000);
    check('respawn power is small', g.power === 'small');
  } else {
    check('death sequence completes', g.state === 'gameover');
  }
}

{
  const g = newGame();
  g.startRun();
  g.lives = 1;
  g.player.y = -10;
  g.step(CFG.STEP);
  for (let i = 0; i < 700 && g.state !== 'gameover'; i++) g.step(CFG.STEP);
  check('game over after last life', g.state === 'gameover', `state=${g.state}`);
}

// ================= 8. Finish & fireworks =================

{
  const g = newGame();
  g.startRun();
  g.timer = 431.9;
  g.player.x = 133.9; g.player.y = 1.2; g.player.prevY = 1.2;
  g.step(CFG.STEP);
  const grabbed = g.state === 'finish';
  check('flag grabbed', grabbed, `state=${g.state}`);
  if (grabbed) {
    check('captured timer digit 1', g.finish.capturedTimer % 10 === 1, `captured=${g.finish.capturedTimer}`);
    check('fireworks rule 1', g.finish.fireworks === 1);
    for (let i = 0; i < 2200 && g.state !== 'win'; i++) g.step(CFG.STEP);
    check('course clear', g.state === 'win', `state=${g.state}`);
    if (g.state === 'win') {
      const ws = g.inspect().winStats;
      check('final score includes flag bonus', ws.score >= 5000);
      const expectTimeBonus = g.finish.capturedTimer * 50;
      check('time bonus matches captured timer', ws.timeBonus === expectTimeBonus, `tb=${ws.timeBonus} expect=${expectTimeBonus}`);
      check('one firework +500', ws.fireworkBonus === 500, `fw=${ws.fireworkBonus}`);
      check('run time recorded only for play', ws.runTime > 0 && ws.runTime < 600);
    }
  }
}

{
  const g = newGame();
  g.startRun();
  g.player.x = 133.9; g.player.y = 0.6; g.player.prevY = 0.6;
  g.step(CFG.STEP);
  check('low flag grab', g.state === 'finish' && g.finish.flagBonus === 100, `bonus=${g.finish && g.finish.flagBonus}`);
}

{
  const g = newGame();
  g.startRun();
  g.player.x = 133.7; g.player.y = -4; g.player.prevY = -4;
  g.step(CFG.STEP);
  check('below-ground crossing does not finish', g.state !== 'finish', `state=${g.state}`);
}

// ================= 9. Route reachability (scripted arcs) =================

{
  const arc = (x, y, prep, hold, seconds = 1.2) => {
    const g = newGame();
    g.startRun();
    g.enemies = [];
    g.player.x = x; g.player.y = y; g.player.vy = 0; g.player.vx = 0; g.player.prevY = y;
    g.applyControl({ left: false, right: true, jump: false, run: true, down: false });
    for (let dbg = 0; dbg < Math.round(prep / CFG.STEP); dbg++) {
      g.step(CFG.STEP);
    }
    g.applyControl({ left: false, right: true, jump: true, run: true, down: false });
    for (let dbg = 0; dbg < Math.round(hold / CFG.STEP); dbg++) {
      g.step(CFG.STEP);
    }
    g.applyControl({ left: false, right: true, jump: false, run: true, down: false });
    for (let dbg = 0; dbg < Math.round(seconds / CFG.STEP); dbg++) {
      g.step(CFG.STEP);
    }
    g.applyControl({ left: false, right: false, jump: false, run: false, down: false });
    const st = g.inspect();
    if (g === undefined) {}
    return { x: st.player.x, y: st.player.y, state: st.state };
  };

  const r1 = arc(0.5, 0, 0.25, 0.62);
  check('gap1 (4..7) clearable', r1.state === 'play' && r1.x > 8.5, JSON.stringify(r1));

  const r2 = arc(29.5, 0, 0.5, 0.62);
  check('gap2 (37..41) clearable', r2.state === 'play' && r2.x > 43, JSON.stringify(r2));

  const r3 = arc(18.0, 0, 0.55, 0.55);
  check('tall pipe (3.4) clearable', r3.state === 'play' && r3.x > 28, JSON.stringify(r3));

  const r4 = arc(85.0, 0, 0.45, 0.55);
  check('gap3 from stairs (90..93) clearable', r4.state === 'play' && r4.x > 95, JSON.stringify(r4));

  {
    const g = newGame();
    g.startRun();
    g.enemies = [];
    g.player.x = 130.5; g.player.y = 8; g.player.vy = 0; g.player.vx = 8; g.player.prevY = 8;
    g.applyControl({ left: false, right: true, jump: true, run: true, down: false });
    let grabbed = false;
    for (let i = 0; i < 260 && !grabbed; i++) { g.step(CFG.STEP); if (g.state === 'finish') grabbed = true; }
    check('flag catchable from final staircase', grabbed && g.finish && g.finish.flagBonus === 5000, `state=${g.state} bonus=${g.finish && g.finish.flagBonus}`);
  }
}

// ================= output =================

console.log(`\n=== Low Poly Mario simulation checks ===\n${results.join('\n')}\n`);
console.log(`passed: ${passed}  failed: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
// ================= 1. Movement =================

{
  const g = newGame();
  g.startRun();
  g.enemies = [];
  holdRight(g, 2);
  check('walk cap ≈ 6', near(g.inspect().player.vx, CFG.WALK, 0.1), `vx=${g.inspect().player.vx}`);
  g.applyControl({ left: false, right: true, jump: false, run: true, down: false });
  runSteps(g, 2);
  check('run cap ≈ 9.8', near(g.inspect().player.vx, CFG.RUN, 0.1), `vx=${g.inspect().player.vx}`);
  g.applyControl({ left: true, right: false, jump: false, run: false, down: false });
  run(g, 1.5);
  check('reverses: vx < 0', g.inspect().player.vx < -1, `vx=${g.inspect().player.vx}`);
  check('no overshoot at cap', Math.abs(g.inspect().player.vx) <= CFG.WALK + 0.01);
}

// ================= 2. Jumping =================

{
  const g = newGame();
  g.startRun();
  g.enemies = [];
  tapJump(g);
  let peak = 0;
  for (let i = 0; i < 240; i++) { g.step(CFG.STEP); peak = Math.max(peak, g.inspect().player.y); }
  check('short tap rises ~2.4–2.9', peak >= 2.35 && peak <= 2.95, `peak=${peak.toFixed(3)}`);
  check('tap lands again', Math.abs(g.inspect().player.y) < 0.05);
}

{
  const g = newGame();
  g.startRun();
  g.enemies = [];
  g.applyControl({ left: false, right: false, jump: true, run: false, down: false });
  for (let i = 0; i < 30; i++) {
    g.step(CFG.STEP);
  }
  g.applyControl({ left: false, right: false, jump: false, run: false, down: false });
  let peak = 0;
  for (let i = 0; i < 240; i++) { g.step(CFG.STEP); peak = Math.max(peak, g.inspect().player.y); }
  check('held jump rises ~5.4', peak >= 5.1 && peak <= 5.9, `peak=${peak.toFixed(3)}`);
}

{
  function airTime(g) {
    let t = 0;
    while (g.player.onGround) { g.step(CFG.STEP); t += CFG.STEP; if (t > 2) break; }
    return t;
  }
  const g = newGame();
  g.startRun();
  g.enemies = [];
  g.player.x = 3.5; g.player.y = 0; g.player.vx = 6; g.player.vy = 0;
  g.applyControl({ left: false, right: false, jump: false, run: false, down: false });
  airTime(g);
  run(g, 0.06);
  g.applyControl({ left: false, right: false, jump: true, run: false, down: false });
  g.step(CFG.STEP);
  g.applyControl({ left: false, right: false, jump: false, run: false, down: false });
  check('coyote allows jump shortly after leaving ledge', g.inspect().player.vy > 5, `vy=${g.inspect().player.vy}`);

  const g2 = newGame();
  g2.startRun();
  g2.enemies = [];
  g2.player.x = 3.5; g2.player.y = 0; g2.player.vx = 6; g2.player.vy = 0;
  g2.applyControl({ left: false, right: false, jump: false, run: false, down: false });
  airTime(g2);
  run(g2, 0.19);
  g2.applyControl({ left: false, right: false, jump: true, run: false, down: false });
  g2.step(CFG.STEP);
  g2.applyControl({ left: false, right: false, jump: false, run: false, down: false });
  check('no jump 190ms after leaving ground', g2.inspect().player.vy < 5, `vy=${g2.inspect().player.vy}`);
}

{
  const g = newGame();
  g.startRun();
  g.enemies = [];
  g.player.y = 2; g.player.vy = 0;
  g.applyControl({ left: false, right: false, jump: false, run: false, down: false });
  run(g, 0.2);
  g.applyControl({ left: false, right: false, jump: true, run: false, down: false });
  run(g, 0.6);
  g.applyControl({ left: false, right: false, jump: false, run: false, down: false });
  check('buffered jump fires on landing', g.inspect().player.vy > 5, `vy=${g.inspect().player.vy}`);
}

{
  const g = newGame();
  g.startRun();
  g.enemies = [];
  tapJump(g);
  runSteps(g, 30);
  const vyBefore = g.inspect().player.vy;
  tapJump(g);
  runSteps(g, 3);
  check('no double jump in air', g.inspect().player.vy <= vyBefore + 0.4, `vy before=${vyBefore} after=${g.inspect().player.vy}`);
}


// ================= output =================

