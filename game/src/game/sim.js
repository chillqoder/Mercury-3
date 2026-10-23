// Low Poly Mario — authoritative simulation.
// This module is DOM-free and rendering-free. All gameplay rules, collision
// contracts, scoring, progression and game states live here so they can be
// exercised headlessly in Node and rendered by any front-end.

import { CFG } from './config.js';
import { LEVEL } from './level-data.js';
import { SolidGrid, SOLID } from './solid.js';

const TAU = Math.PI * 2;

// ---------- small helpers ----------

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// ---------- level geometry derivation ----------

function buildAreaTerrain(level, area) {
  const terrain = [];
  const addRect = (x0, x1, y0, y1, kind) => terrain.push({ x0: Math.floor(x0), x1: Math.floor(x1) - 1, y0: Math.floor(y0), y1: Math.floor(y1) - 1, kind });

  if (area === 'surface') {
    for (const g of level.ground) addRect(g.x0, g.x1, -8, 0);
    // solidCells (stairs, ledges)
    for (const c of level.solidCells) addRect(c.x, c.x + 1, c.y, c.y + 1, 'stair');
    // pipes (column from ground to h)
    for (const p of level.pipes) {
      addRect(p.x, p.x + 2, -8, 0); // base into ground so pipes feel grounded
      const top = Math.ceil(p.h);
      addRect(p.x, p.x + 2, 0, top, 'pipe');
    }
  } else {
    // cellar room: floor, ceiling, walls
    const c = level.cellar;
    addRect(c.ground[0].x0, c.ground[0].x1, -8, 0, 'ground');
    addRect(c.leftWallX, c.leftWallX + 1, 0, c.ceilingY, 'ground');
    addRect(c.rightWallX, c.rightWallX + 1, 0, c.ceilingY, 'ground');
    addRect(c.ground[0].x0, c.ground[0].x1, c.ceilingY, c.ceilingY + 1, 'ground');
    // entry & exit pipes
    for (const p of [c.entryPipe, c.exitPipe]) {
      addRect(p.x, p.x + 2, 0, Math.ceil(p.h), 'pipe');
    }
  }
  return terrain;
}

function makeBlockRecords(level) {
  const records = [];
  for (const b of level.blocks) {
    records.push({ x: b.x, y: b.y, kind: b.kind, content: b.content || null, state: 'fresh' });
  }
  for (const b of level.cellar.blocks) {
    records.push({ x: b.x, y: b.y, kind: b.kind, content: b.content || null, state: 'fresh', area: 'cellar' });
  }
  return records;
}

// ---------- Game ----------

export class Game {
  constructor(opts = {}) {
    this.seed = opts.seed ?? 1;
    this.rand = mulberry32(this.seed);
    this.audioEvents = [];
    this.uiEvents = [];
    this._elapsed = 0;

    this.grids = { surface: new SolidGrid(), cellar: new SolidGrid() };
    this.blocks = makeBlockRecords(LEVEL);
    this.buildGrids();

    // run state
    this.state = 'title';        // title | play | paused | warp | dying | finish | gameover | win
    this.paused = false;
    this.area = 'surface';
    this.lives = 3;
    this.score = 0;
    this.coins = 0;
    this.timer = CFG.TIMER_START;
    this.timerWarned = false;
    this.power = 'small';
    this.starT = 0;
    this.invulnT = 0;
    this.freezeT = 0;
    this.pendingGrow = false;
    this.airborneChain = 0;
    this.runTime = 0;
    this.checkpointTaken = false;
    this.respawnX = LEVEL.startX;
    this.discovered = new Set();
    this.collected = new Set();       // collected static coin ids
    this.surfaceCoins = [];
    this.deathCount = 0;
    this.enemiesKilled = 0;
    this.winStats = null;
    this.finish = null;
    this.timeout = false;

    // input intent
    this.input = { left: false, right: false, jump: false, run: false, down: false };
    this._prevInput = { ...this.input };
    this.jumpEdge = false;
    this.downEdge = false;
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.stompCooldown = 0;
    this.fireCooldown = 0;

    // player body
    this.player = {
      x: LEVEL.startX, y: 0,
      vx: 0, vy: 0,
      dir: 1, facing: 1,
      w: CFG.SMALL_W, h: CFG.SMALL_H,
      onGround: false, prevY: 0,
      duck: false, skid: false, animT: 0,
      hidden: false,
      fireballBusy: 0,
    };

    // entities
    this.enemies = [];
    this.items = [];
    this.fireballs = [];
    this.stars = [];
    this.pendingSpawns = [];
    this.cellarCoins = [];

    this.initRun();
  }

  // ---------------- lifecycle ----------------

  buildGrids() {
    const surfaceTerrain = buildAreaTerrain(LEVEL, 'surface');
    const cellarTerrain = buildAreaTerrain(LEVEL, 'cellar');
    const surfaceBlocks = this.blocks.filter(b => b.area !== 'cellar');
    const cellarBlocks = this.blocks.filter(b => b.area === 'cellar');
    this.grids.surface.build(surfaceTerrain, surfaceBlocks);
    this.grids.cellar.build(cellarTerrain, cellarBlocks);
  }

  spawnEnemies() {
    this.enemies = [];
    for (const e of LEVEL.enemies) {
      this.enemies.push(makeEnemy(e.kind, e.x));
    }
    this.cellarCoins = [];
    for (const c of LEVEL.cellar.coins) {
      this.cellarCoins.push({ x: c.x + 0.5, y: c.y + 0.5, taken: false });
    }
    this.surfaceCoins = [];
    for (const c of LEVEL.coins) {
      this.surfaceCoins.push({ x: c.x + 0.5, y: c.y + 0.5, taken: false, area: 'surface' });
    }
  }

  initRun() {
    this.lives = 3;
    this.score = 0;
    this.coins = 0;
    this.timer = CFG.TIMER_START;
    this.timerWarned = false;
    this.power = 'small';
    this.starT = 0;
    this.invulnT = 0;
    this.freezeT = 0;
    this.pendingGrow = false;
    this.airborneChain = 0;
    this.runTime = 0;
    this.checkpointTaken = false;
    this.respawnX = LEVEL.startX;
    this.discovered = new Set();
    this.collected = new Set();
    this.deathCount = 0;
    this.enemiesKilled = 0;
    this.winStats = null;
    this.finish = null;
    this.timeout = false;
    this.area = 'surface';
    this.player.x = LEVEL.startX;
    this.player.y = 0;
    this.player.vx = 0; this.player.vy = 0;
    this.player.dir = 1; this.player.facing = 1;
    this.setPower('small');
    // restore blocks to fresh
    for (const b of this.blocks) { b.state = 'fresh'; }
    this.buildGrids();
    this.spawnEnemies();
    this.items = [];
    this.fireballs = [];
    this.audioEvents.length = 0;
    this.uiEvents.length = 0;
  }

  // ---------------- public controls ----------------

  applyControl(c) {
    this.input.left = !!c.left;
    this.input.right = !!c.right;
    this.input.jump = !!c.jump;
    this.input.run = !!c.run;
    this.input.down = !!c.down;
  }

  refreshEdges() {
    const p = this._prevInput;
    this.jumpEdge = this.input.jump && !p.jump;
    this.downEdge = this.input.down && !p.down;
    Object.assign(p, this.input);
  }

  pressJump() { this.input.jump = true; }
  releaseJump() { this.input.jump = false; }

  startRun() {
    this.initRun();
    this.state = 'play';
    this.emitAudio('start');
  }

  togglePause() {
    if (this.state === 'play') this.state = 'paused';
    else if (this.state === 'paused') this.state = 'play';
  }

  restart() {
    this.startRun();
  }

  toTitle() {
    this.paused = false;
    this.state = 'title';
    this.emitAudio('title');
  }

  // ---------------- inspect API ----------------

  inspect() {
    const p = this.player;
    return {
      state: this.state,
      paused: this.paused,
      lives: this.lives,
      score: this.score,
      coins: this.coins,
      timer: Math.max(0, Math.floor(this.timer)),
      power: this.power,
      area: this.area,
      star: this.starT,
      invuln: this.invulnT,
      player: { x: p.x, y: p.y, vx: p.vx, vy: p.vy, power: this.power, duck: p.duck, onGround: p.onGround, facing: p.facing, hidden: p.hidden },
      secretsFound: this.discovered.size,
      secretsTotal: 3,
      checkpointTaken: this.checkpointTaken,
      runTime: this.runTime,
      collectibles: [
        ...this.surfaceCoins.map(c => ({ id: 'surface:' + c.x + ',' + c.y, x: c.x, y: c.y, taken: c.taken })),
        ...this.cellarCoins.map(c => ({ id: 'cellar:' + c.x + ',' + c.y, x: c.x, y: c.y, taken: c.taken })),
      ],
      enemies: this.enemies.map(e => ({ id: e.id, kind: e.kind, state: e.state, x: e.x, y: e.y, active: e.active })),
      items: this.items.map(i => ({ type: i.type, x: i.x, y: i.y, state: i.state })),
      fireballs: this.fireballs.map(f => ({ x: f.x, y: f.y })),
      finish: this.finish,
      winStats: this.winStats,
      blocks: this.blocks.map(b => ({ x: b.x, y: b.y, kind: b.kind, state: b.state })),
    };
  }

  // ---------------- debug/test helpers ----------------

  solidAt(x, y) { return this.grids[this.area].isBlocking(x, y); }
  cellKind(x, y) { return this.grids[this.area].get(x, y); }
  activeEnemies() { return this.enemies.filter(e => e.active); }

  // ---------------- events ----------------

  emitAudio(type, data) { this.audioEvents.push({ t: type, d: data || null }); }
  emitUI(type, data) { this.uiEvents.push({ t: type, d: data || null }); }

  drainAudioEvents() { const e = this.audioEvents; this.audioEvents = []; return e; }
  drainUIEvents() { const e = this.uiEvents; this.uiEvents = []; return e; }

  // ---------------- fixed step ----------------

  step(dt) {
    this._elapsed += dt;
    if (this.state === 'paused') return;
    if (this.state === 'title' || this.state === 'gameover' || this.state === 'win') return;

    if (this.state === 'play') {
      this.stepPlay(dt);
    } else if (this.state === 'warp') {
      this.stepWarp(dt);
    } else if (this.state === 'dying') {
      this.stepDying(dt);
    } else if (this.state === 'finish') {
      this.stepFinish(dt);
    }
  }

  stepPlay(dt) {
    this.refreshEdges();
    if (this.freezeT > 0) {
      this.freezeT -= dt;
      if (this.freezeT <= 0) {
        this.emitAudio(this.power === 'fire' ? 'fire' : 'grow');
        this.emitUI('power', this.power);
      }
      this.player.animT += dt;
      return;
    }
    if (this.starT > 0) {
      const before = this.starT;
      this.starT -= dt;
      if (this.starT <= 0 && before > 0) this.emitAudio('starEnd');
    }
    if (this.invulnT > 0) this.invulnT -= dt;

    // deferred growth when a low ceiling clears
    if (this.pendingGrow) {
      const p = this.player;
      const r = this.playerRect();
      if (!this.overlapsSolid(r.x0, r.x1, p.y, p.y + CFG.BIG_H)) {
        const toFire = this.pendingGrow;
        this.pendingGrow = false;
        this.grow(toFire);
      }
    }

    this.timer -= dt / CFG.TIMER_PER_UNIT;
    const disp = Math.floor(this.timer);
    if (disp <= CFG.TIMER_WARNING && !this.timerWarned) {
      this.timerWarned = true;
      this.emitAudio('warning');
      this.emitUI('warning');
    }
    if (this.timer <= 0) {
      this.timeout = true;
      this.die(true);
      return;
    }
    this.runTime += dt;

    this.updatePlayer(dt);
    this.updateItems(dt);
    this.updateEnemies(dt);
    this.updateFireballs(dt);
    this.activateEnemies();
    this.updateCollectibles(dt);
    this.updateProgress();
  }

  // ---------------- player ----------------

  setPower(power) {
    this.power = power;
    const p = this.player;
    p.duck = false;
    if (power === 'small') { p.w = CFG.SMALL_W; p.h = CFG.SMALL_H; }
    else { p.w = CFG.BIG_W; p.h = CFG.BIG_H; }
  }

  playerRect() {
    const p = this.player;
    const w = p.w, h = p.h;
    return { x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y, y1: p.y + h };
  }

  updatePlayer(dt) {
    const p = this.player;
    const inp = this.input;
    const grid = this.grids[this.area];

    // --- desired horizontal speed ---
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const targetSpeed = inp.run ? CFG.RUN : CFG.WALK;
    const accel = p.onGround ? CFG.ACCEL_GROUND : CFG.ACCEL_AIR;
    const brake = p.onGround ? CFG.BRAKE_GROUND : CFG.BRAKE_AIR;

    if (dir !== 0) {
      const target = targetSpeed * dir;
      if (p.vx < target) p.vx = Math.min(target, p.vx + accel * dt);
      else if (p.vx > target) p.vx = Math.max(target, p.vx - accel * dt);
      p.dir = dir;
    } else {
      if (p.vx > 0) p.vx = Math.max(0, p.vx - brake * dt);
      else if (p.vx < 0) p.vx = Math.min(0, p.vx + brake * dt);
    }

    // skid visual: moving one way, input the other
    p.skid = p.onGround && dir !== 0 && Math.sign(p.vx) !== dir && Math.abs(p.vx) > 2.5;

    // --- jumping ---
    if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
    if (this.coyote > 0) this.coyote -= dt;
    if (this.jumpEdge) this.jumpBuffer = CFG.JUMP_BUFFER;

    const canJump = p.onGround || this.coyote > 0;

    if (this.jumpBuffer > 0 && canJump) {
      this.jumpBuffer = 0;
      this.coyote = 0;
      const running = inp.run && dir !== 0;
      p.vy = CFG.JUMP_V + (running ? CFG.RUN_JUMP_BOOST : 0);
      p.onGround = false;
      this.emitAudio('jump');
    }
    if (!inp.jump && p.vy > CFG.JUMP_CUT) p.vy = CFG.JUMP_CUT;

    // --- ducking ---
    const wantDuck = inp.down && p.onGround && this.power !== 'small';
    if (wantDuck && !p.duck) {
      // check headroom for standing height
      const r = this.playerRect();
      const hStand = CFG.BIG_H;
      if (!this.overlapsSolid(r.x0, r.x1, p.y, p.y + hStand)) {
        p.duck = true;
        p.h = CFG.DUCK_H;
        this.emitUI('duck', true);
      }
    } else if (p.duck && !inp.down) {
      const r = this.playerRect();
      if (!this.overlapsSolid(r.x0, r.x1, p.y, p.y + CFG.BIG_H)) {
        p.duck = false;
        p.h = CFG.BIG_H;
        this.emitUI('duck', false);
      }
    }

    // --- gravity ---
    p.vy += CFG.GRAVITY * dt;
    if (p.vy < -CFG.FALL_CAP) p.vy = -CFG.FALL_CAP;

    // --- move X ---
    if (p.vx !== 0) {
      const dx = p.vx * dt;
      const nx = p.x + dx;
      const rr = { x0: nx - p.w / 2, x1: nx + p.w / 2, y0: p.y, y1: p.y + p.h };
      if (!this.overlapsSolid(rr.x0, rr.x1, rr.y0, rr.y1)) {
        p.x = nx;
      } else {
        // blocked: attempt a 1-cell step climb first
        const lift = this.tryStepUp(rr);
        if (lift !== null) {
          p.x = nx;
        } else {
          p.vx = 0;
        }
      }
    }

    // --- move Y ---
    const prevY = p.y;
    p.prevY = prevY;
    p.vy = clamp(p.vy, -CFG.FALL_CAP, 60);
    if (p.vy !== 0) {
      const dy = p.vy * dt;
      const ny = p.y + dy;
      const rr = { x0: p.x - p.w / 2, x1: p.x + p.w / 2, y0: ny, y1: ny + p.h };
      if (dy > 0) {
        // invisible hidden blocks are revealed by a rising head contact
        const ix0 = Math.floor(rr.x0), ix1 = Math.floor(rr.x1 - 1e-9);
        const ceilRow = Math.floor(rr.y1);
        for (let x = ix0; x <= ix1; x++) {
          const kind = grid.get(x, ceilRow);
          if (kind === SOLID.HIDDEN) {
            const rec = this.blocks.find(b => b.x === x && b.y === ceilRow && b.state === 'fresh' && (b.area || 'surface') === this.area);
            if (rec) this.activateBlock(x, ceilRow, p);
          }
        }
      }
      if (!this.overlapsSolid(rr.x0, rr.x1, rr.y0, rr.y1)) {
        p.y = ny;
        p.onGround = false;
      } else {
        if (dy < 0) {
          // hitting floor: snap feet onto the surface (resolveFloor sets p.y)
          this.resolveFloor(rr);
          p.vy = 0;
          if (!p.onGround) { p.onGround = true; this.coyote = CFG.COYOTE; this.emitAudio('land'); }
          this.airborneChain = 0;
        } else {
          // hitting ceiling: snap head under the block (resolveCeiling sets p.y)
          this.resolveCeiling(rr);
          p.vy = Math.min(0, p.vy);
          this.bumpBlocksBelow(rr, p);
        }
      }
    }

    // --- update facing for visuals ---
    if (dir !== 0) p.facing = dir;

    p.animT += dt;

    // --- fireball throwing (held fire repeats with an explicit cooldown) ---
    if (this.power === 'fire' && inp.run) {
      this.fireCooldown -= dt;
      if (this.fireCooldown <= 0 && this.fireballs.length < CFG.FIREBALL_MAX) {
        this.throwFireball(p.facing);
        this.fireCooldown = CFG.FIREBALL_COOLDOWN;
        p.fireballBusy = 0.28;
      }
    } else if (this.fireCooldown > 0) {
      this.fireCooldown -= dt;
    }
    if (p.fireballBusy > 0) p.fireballBusy -= dt;

    // --- pipe standing check: holding down on an eligible pipe rim ---
    if (inp.down && p.onGround) {
      const pipe = this.findPipeUnder(p);
      if (pipe) { this.enterPipe(pipe); }
    }

    // --- death by pit ---
    if (p.y < CFG.DEATH_Y) this.die(false);
  }

  overlapsSolid(x0, x1, y0, y1) {
    const grid = this.grids[this.area];
    const ix0 = Math.floor(x0), ix1 = Math.floor(x1 - 1e-9);
    const iy0 = Math.floor(y0), iy1 = Math.floor(y1 - 1e-9);
    for (let x = ix0; x <= ix1; x++) {
      for (let y = iy0; y <= iy1; y++) {
        if (grid.isBlocking(x, y)) return true;
      }
    }
    return false;
  }

  tryStepUp(rr) {
    const grid = this.grids[this.area];
    const stepMax = CFG.STEP_UP;
    const ix0 = Math.floor(rr.x0), ix1 = Math.floor(rr.x1 - 1e-9);
    let hitTop = -Infinity;
    for (let x = ix0; x <= ix1; x++) {
      for (let y = Math.floor(rr.y0); y <= Math.floor(rr.y1); y++) {
        if (grid.isBlocking(x, y)) {
          // blocking cell within our vertical span
          hitTop = Math.max(hitTop, y + 1);
        }
      }
    }
    if (hitTop === -Infinity) return null;
    const lift = hitTop - rr.y0;
    if (lift <= 0 || lift > stepMax) return null;
    // check headroom for the lifted body
    const newY = rr.y0 + lift;
    const h = rr.y1 - rr.y0;
    if (this.overlapsSolid(rr.x0, rr.x1, newY, newY + h)) return null;
    this.player.y = newY;
    this.player.onGround = true;
    return lift;
  }

  // Lands the player on the highest solid top that is at or below its feet.
  // Cells above the feet are ignored so a falling body is never lifted through a ceiling.
  resolveFloor(rr) {
    const grid = this.grids[this.area];
    const feetY = this.player.y;
    const ix0 = Math.floor(rr.x0), ix1 = Math.floor(rr.x1 - 1e-9);
    let top = -Infinity;
    for (let x = ix0; x <= ix1; x++) {
      for (let y = Math.floor(rr.y0); y <= Math.floor(rr.y1); y++) {
        if (y + 1 <= feetY + 1e-6 && grid.isBlocking(x, y)) {
          top = Math.max(top, y + 1);
        }
      }
    }
    if (top !== -Infinity) this.player.y = top;
  }

  // Places the head right under the lowest solid cell that is at or above the head.
  resolveCeiling(rr) {
    const grid = this.grids[this.area];
    const headY = this.player.y + (rr.y1 - rr.y0);
    const ix0 = Math.floor(rr.x0), ix1 = Math.floor(rr.x1 - 1e-9);
    let bottom = Infinity;
    for (let x = ix0; x <= ix1; x++) {
      for (let y = Math.floor(rr.y0); y <= Math.floor(rr.y1); y++) {
        if (y >= headY - 1e-6 && grid.isBlocking(x, y)) {
          bottom = Math.min(bottom, y);
        }
      }
    }
    if (bottom !== Infinity) this.player.y = bottom - (rr.y1 - rr.y0);
  }

  bumpBlocksBelow(rr, p) {
    const grid = this.grids[this.area];
    const ix0 = Math.floor(rr.x0), ix1 = Math.floor(rr.x1 - 1e-9);
    const ceilY = Math.floor(rr.y1);
    for (let x = ix0; x <= ix1; x++) {
      const kind = grid.get(x, ceilY);
      if (!kind || kind === SOLID.PIPE || kind === SOLID.GROUND || kind === SOLID.STAIR) continue;
      this.activateBlock(x, ceilY, p);
    }
  }

  activateBlock(x, y, p) {
    const grid = this.grids[this.area];
    const kind = grid.get(x, y);
    const rec = this.blocks.find(b => b.x === x && b.y === y && b.state !== 'broken' && (b.area || 'surface') === this.area);
    if (!rec) {
      // block is terrain-ish or already consumed; still bump visually
      this.emitUI('bump', { x: x + 0.5, y: y + 0.5 });
      return;
    }
    if (rec.state === 'used') { this.emitUI('bump', { x: x + 0.5, y: y + 0.5 }); return; }

    if (rec.kind === 'hidden') {
      rec.state = 'used';
      grid.setCell(x, y, SOLID.USED);
      this.discovered.add('1up');
      this.emitUI('reveal', { x: x + 0.5, y: y + 0.5 });
      this.emitAudio('reveal');
      this.spawnItemFromBlock(rec, x, y, '1up');
      this.emitUI('bump', { x: x + 0.5, y: y + 0.5 });
      return;
    }

    if (rec.kind === 'coinbrick') {
      // award one coin per distinct bump, finite payout
      const left = rec.payout ?? CFG.MULTI_COIN_PAYOUT;
      if (left > 0) {
        rec.payout = left - 1;
        this.awardCoin(x + 0.5, y + 1.2, true);
        this.emitUI('bump', { x: x + 0.5, y: y + 0.5 });
        if (left - 1 === 0) { rec.state = 'used'; grid.setCell(x, y, SOLID.USED); }
      }
      return;
    }

    if (rec.kind === 'brick') {
      if (this.power === 'small') {
        // bump only
        this.emitUI('bump', { x: x + 0.5, y: y + 0.5 });
        this.emitAudio('bump');
        this.killEnemiesOnBlock(x, y);
        return;
      }
      // break
      rec.state = 'broken';
      grid.setCell(x, y, null);
      this.score += CFG.SCORE.BRICK;
      this.emitUI('break', { x: x + 0.5, y: y + 0.5 });
      this.emitAudio('break');
      this.emitUI('score', { x: x + 0.5, y: y + 1.2, text: String(CFG.SCORE.BRICK) });
      // spawn content if any (star)
      if (rec.content === 'star') {
        this.discovered.add('star');
        this.spawnItemFromBlock(rec, x, y, 'star');
      }
      return;
    }

    // question block
    rec.state = 'used';
    grid.setCell(x, y, SOLID.USED);
    this.emitUI('bump', { x: x + 0.5, y: y + 0.5 });
    this.emitAudio('bump');
    const itemType = this.power === 'small' ? 'mushroom' : 'flower';
    this.spawnItemFromBlock(rec, x, y, itemType);
    this.killEnemiesOnBlock(x, y);
  }

  killEnemiesOnBlock(x, y) {
    for (const e of this.enemies) {
      if (!e.active || e.state === 'dead') continue;
      const topY = y + 1;
      if (Math.abs(e.x - (x + 0.5)) < 0.8 && Math.abs((e.y + e.h) - topY) < 0.5) {
        this.defeatEnemy(e, 'block', x + 0.5, topY);
      }
    }
  }

  spawnItemFromBlock(rec, x, y, type) {
    const item = makeItem(this, type, x + 0.5, y + 1);
    this.items.push(item);
    this.emitAudio(type === 'flower' ? 'flower' : type === 'star' ? 'star' : type === '1up' ? '1upSpawn' : 'mushroom');
  }

  // ---------------- items ----------------

  updateItems(dt) {
    for (const it of this.items) {
      if (it.state === 'emerge') {
        it.et += dt;
        it.y = it.baseY + 0.5 * Math.min(1, it.et / CFG.EMERGE_TIME);
        if (it.et >= CFG.EMERGE_TIME) {
          it.state = 'free';
          it.y = it.baseY + 0.5;
        }
        continue;
      }
      // free item
      if (it.type === 'flower') {
        it.animT += dt;
        it.y = it.baseY + 0.5 + Math.sin(it.animT * 4) * 0.06;
        continue;
      }
      // gravity + motion
      it.vy += CFG.GRAVITY * dt * 0.8;
      if (it.vy < -CFG.FALL_CAP) it.vy = -CFG.FALL_CAP;
      const dx = it.vx * dt;
      const nx = it.x + dx;
      const r = { x0: nx - 0.45, x1: nx + 0.45, y0: it.y, y1: it.y + 0.9 };
      if (!this.overlapsSolid(r.x0, r.x1, r.y0, r.y1)) it.x = nx;
      else { it.vx = -it.vx; }
      const dy = it.vy * dt;
      const ny = it.y + dy;
      const rr = { x0: it.x - 0.45, x1: it.x + 0.45, y0: ny, y1: ny + 0.9 };
      if (!this.overlapsSolid(rr.x0, rr.x1, rr.y0, rr.y1)) {
        it.y = ny;
      } else {
        if (dy < 0) {
          // land on floor top
          let top = -Infinity;
          const ix0 = Math.floor(rr.x0), ix1 = Math.floor(rr.x1 - 1e-9);
          for (let x = ix0; x <= ix1; x++) {
            for (let y = Math.floor(rr.y0); y <= Math.floor(rr.y1); y++) {
              if (this.grids[this.area].isBlocking(x, y)) top = Math.max(top, y + 1);
            }
          }
          it.y = top === -Infinity ? ny : top;
          it.vy = 0;
          if (it.type === 'star') it.vy = CFG.STAR_BOUNCE;
        } else {
          it.y = ny;
          it.vy = 0;
          it.vx = -it.vx;
        }
      }
      if (it.type === 'star') it.vy = Math.max(it.vy, -CFG.STAR_BOUNCE);
    }
    // cleanup offscreen/expired
    this.items = this.items.filter(it => !(it.state === 'free' && (it.y < -8 || it.x < LEVEL.LEVEL_MIN_X - 4 || it.x > LEVEL.LEVEL_MAX_X + 4)));
  }

  tryCollectItem(it) {
    const p = this.player;
    if (it.collected || it.state !== 'free') return;
    const r = { x0: p.x - p.w / 2 - 0.3, x1: p.x + p.w / 2 + 0.3, y0: p.y - 0.2, y1: p.y + p.h + 0.2 };
    const ir = { x0: it.x - 0.5, x1: it.x + 0.5, y0: it.y - 0.4, y1: it.y + 1.1 };
    if (r.x1 < ir.x0 || r.x0 > ir.x1 || r.y1 < ir.y0 || r.y0 > ir.y1) return;
    it.collected = true;
    this.emitUI('pop', { x: it.x, y: it.y + 0.9, text: '1,000', color: '#fff6d9' });
    this.emitAudio('powerup');
    if (it.type === 'mushroom') {
      this.grow(true);
    } else if (it.type === 'flower') {
      this.grow(true, 'fire');
    } else if (it.type === 'star') {
      this.starT = CFG.STAR_TIME;
      this.emitAudio('starStart');
      this.emitUI('star', true);
    } else if (it.type === '1up') {
      this.lives += 1;
      this.emitAudio('1up');
      this.emitUI('1up', { x: it.x, y: it.y + 0.9 });
    }
    this.score += CFG.SCORE.POWERUP;
    this.items = this.items.filter(i => i !== it);
  }

  grow(toFire = false) {
    if (this.power === 'small') {
      // check headroom
      const p = this.player;
      const r = this.playerRect();
      if (this.overlapsSolid(r.x0, r.x1, p.y, p.y + CFG.BIG_H)) {
        this.pendingGrow = toFire;
        return;
      }
      this.setPower(toFire ? 'fire' : 'big');
      this.freezeT = CFG.GROW_FREEZE;
      this.emitAudio(toFire ? 'firePower' : 'grow');
      this.emitUI('power', this.power);
    } else if (toFire && this.power === 'big') {
      this.power = 'fire';
      this.freezeT = CFG.GROW_FREEZE;
      this.emitAudio('firePower');
      this.emitUI('power', this.power);
    }
  }

  shrink() {
    if (this.power === 'small') return;
    this.setPower('small');
    this.freezeT = CFG.SHRINK_FREEZE;
    this.emitAudio('shrink');
    this.emitUI('power', this.power);
  }

  // ---------------- enemies ----------------

  activateEnemies() {
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.active && Math.abs(e.x - p.x) < CFG.ACTIVATE_MARGIN) {
        e.active = true;
      }
    }
  }

  updateEnemies(dt) {
    for (const e of this.enemies) {
      if (!e.active) continue;
      e.prevY = e.y;
      if (e.state === 'sliding') {
        this.updateShell(e, dt);
      } else if (e.state === 'walk') {
        this.updateWalker(e, dt);
      } else if (e.state === 'shell') {
        // stationary shell warning
        if (e.wakeT > 0) e.wakeT -= dt;
        else if (e.wakeT <= 0) {
          // check headroom then wake
          if (!this.overlapsSolid(e.x - 0.45, e.x + 0.45, e.y, e.y + 1.3)) {
            e.state = 'walk';
            e.h = 1.3;
            this.emitAudio('shellWake');
          } else {
            e.wakeT = 1.0;
          }
        }
      } else if (e.state === 'dead') {
        e.deadT -= dt;
        if (e.deadT <= 0) e.remove = true;
      }
    }
    this.enemies = this.enemies.filter(e => !e.remove);
    // enemy-enemy separation
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const a = this.enemies[i], b = this.enemies[j];
        if (a.state !== 'walk' || b.state !== 'walk') continue;
        const dx = Math.abs(a.x - b.x);
        if (dx < 0.9) {
          const dir = a.x < b.x ? -1 : 1;
          a.vx = Math.abs(a.vx) * dir;
          b.vx = Math.abs(b.vx) * -dir;
        }
      }
    }
  }

  updateWalker(e, dt) {
    e.vy += CFG.GRAVITY * dt;
    if (e.vy < -CFG.FALL_CAP) e.vy = -CFG.FALL_CAP;
    const speed = e.kind === 'goomba' ? CFG.GOOMBA_SPEED : CFG.KOOPA_SPEED;
    if (e.vx === 0) e.vx = (e.dir || -1) * speed;
    const dx = e.vx * dt;
    const nx = e.x + dx;
    const r = { x0: nx - e.w / 2, x1: nx + e.w / 2, y0: e.y, y1: e.y + e.h };
    if (!this.overlapsSolid(r.x0, r.x1, r.y0, r.y1)) {
      e.x = nx;
    } else {
      e.vx = -e.vx;
      e.dir = Math.sign(e.vx);
    }
    // ledge check for red koopas
    if (e.kind === 'koopa-red' && e.onGround) {
      const aheadX = e.x + Math.sign(e.vx) * (e.w / 2 + 0.15);
      if (!this.overlapsSolid(aheadX - 0.2, aheadX + 0.2, e.y - 0.1, e.y + 0.1)) {
        e.vx = -e.vx;
        e.dir = Math.sign(e.vx);
      }
    }
    this.moveEnemyY(e, dt);
  }

  // Vertical move for walkers and shells: land on the surface instead of sinking into it.
  moveEnemyY(e, dt) {
    const dy = e.vy * dt;
    const ny = e.y + dy;
    const rr = { x0: e.x - e.w / 2, x1: e.x + e.w / 2, y0: ny, y1: ny + e.h };
    if (!this.overlapsSolid(rr.x0, rr.x1, rr.y0, rr.y1)) {
      e.y = ny; e.onGround = false;
      return;
    }
    if (dy < 0) {
      const grid = this.grids[this.area];
      const ix0 = Math.floor(rr.x0), ix1 = Math.floor(rr.x1 - 1e-9);
      let top = -Infinity;
      for (let x = ix0; x <= ix1; x++) {
        for (let y = Math.floor(rr.y0); y <= Math.floor(rr.y1); y++) {
          if (y + 1 <= e.y + 1e-6 && grid.isBlocking(x, y)) top = Math.max(top, y + 1);
        }
      }
      if (top !== -Infinity) e.y = top;
      e.onGround = true;
    }
    e.vy = 0;
  }

  updateShell(e, dt) {
    if (e.kickGraceT > 0) e.kickGraceT -= dt;
    e.vy += CFG.GRAVITY * dt;
    if (e.vy < -CFG.FALL_CAP) e.vy = -CFG.FALL_CAP;
    const dx = e.vx * dt;
    const nx = e.x + dx;
    const r = { x0: nx - e.w / 2, x1: nx + e.w / 2, y0: e.y, y1: e.y + e.h };
    if (!this.overlapsSolid(r.x0, r.x1, r.y0, r.y1)) {
      e.x = nx;
    } else {
      e.vx = -e.vx;
      e.dir = Math.sign(e.vx);
      this.emitAudio('bang');
    }
    this.moveEnemyY(e, dt);
    // brick impacts: shells break bricks and hit question blocks
    this.shellSideImpacts(e);

    // enemy kills: a moving shell defeats enemies (and other stationary shells)
    for (const other of this.enemies) {
      if (other === e || other.state === 'dead') continue;
      const or = { x0: other.x - other.w / 2, x1: other.x + other.w / 2, y0: other.y, y1: other.y + other.h };
      const er = { x0: e.x - e.w / 2, x1: e.x + e.w / 2, y0: e.y, y1: e.y + e.h };
      if (er.x1 <= or.x0 || er.x0 >= or.x1 || er.y1 <= or.y0 || er.y0 >= or.y1) continue;
      if (other.state === 'sliding') {
        // two sliding shells clash: both rebound
        e.vx = -e.vx; e.dir = Math.sign(e.vx);
        other.vx = -other.vx; other.dir = Math.sign(other.vx);
        this.emitAudio('bang');
        continue;
      }
      this.defeatEnemy(other, 'shell', other.x, other.y + other.h);
    }
  }

  shellSideImpacts(e) {
    const grid = this.grids[this.area];
    const dir = Math.sign(e.vx);
    const probeX = e.x + dir * (e.w / 2 + 0.5);
    const ix = Math.floor(probeX);
    const iy = Math.floor(e.y + e.h / 2);
    // check a 1-high cell at the shell mid-height
    for (let y = iy - 1; y <= iy + 1; y++) {
      const kind = grid.get(ix, y);
      if (!kind) continue;
      if (kind === SOLID.BRICK) {
        const rec = this.blocks.find(b => b.x === ix && b.y === y && b.state !== 'broken' && (b.area || 'surface') === this.area);
        if (rec && rec.kind === 'brick') {
          rec.state = 'broken';
          grid.setCell(ix, y, null);
          this.score += CFG.SCORE.BRICK;
          this.emitUI('break', { x: ix + 0.5, y: y + 0.5 });
          this.emitAudio('break');
          this.emitUI('score', { x: ix + 0.5, y: y + 1.2, text: String(CFG.SCORE.BRICK) });
          if (rec.content === 'star') {
            this.discovered.add('star');
            this.spawnItemFromBlock(rec, ix, y, 'star');
          }
          e.vx = -e.vx; e.dir = Math.sign(e.vx);
          return;
        }
      }
      if (kind === SOLID.QUESTION) {
        const rec = this.blocks.find(b => b.x === ix && b.y === y && b.state !== 'used' && b.state !== 'broken' && (b.area || 'surface') === this.area);
        if (rec) {
          rec.state = 'used';
          grid.setCell(ix, y, SOLID.USED);
          const itemType = this.power === 'small' ? 'mushroom' : 'flower';
          this.spawnItemFromBlock(rec, ix, y, itemType);
          this.emitUI('bump', { x: ix + 0.5, y: y + 0.5 });
          this.emitAudio('bump');
          e.vx = -e.vx; e.dir = Math.sign(e.vx);
          return;
        }
      }
    }
  }

  defeatEnemy(e, by, atX, atY) {
    if (e.state === 'dead') return;
    this.enemiesKilled += 1;
    let pts = 0;
    let text = '';
    if (by === 'stomp') {
      if (e.kind === 'goomba') {
        e.state = 'dead'; e.deadT = 0.5; e.h = 0.3; e.squash = true;
        this.emitAudio('stomp');
      } else {
        e.state = 'shell'; e.h = 0.7; e.wakeT = CFG.SHELL_WAKE; e.vx = 0;
        this.emitAudio('stomp');
      }
      // airborne chain
      const chain = this.airborneChain;
      const table = CFG.SCORE.AIRBORNE_CHAIN;
      if (chain < table.length - 1) {
        pts = table[chain];
        this.airborneChain = chain + 1;
      } else {
        pts = 0;
        this.lives += 1;
        this.emitAudio('1up');
        this.emitUI('1up', { x: atX, y: atY + 0.9 });
        text = '1-UP';
      }
      if (!text) text = String(pts);
    } else if (by === 'fire') {
      pts = CFG.SCORE.FIREBALL_KILL;
      e.state = 'dead'; e.deadT = 0.4;
      text = String(pts);
      this.emitAudio('fireHit');
    } else if (by === 'star') {
      pts = CFG.SCORE.STAR_KILL;
      e.state = 'dead'; e.deadT = 0.4;
      text = String(pts);
      this.emitAudio('stomp');
    } else if (by === 'shell') {
      // shell kill: use shell's own chain
      const chain = e.shellChain || 0;
      const table = CFG.SCORE.SHELL_CHAIN;
      if (chain < table.length - 1) {
        pts = table[chain];
        e.shellChain = chain + 1;
      } else {
        pts = 0;
        this.lives += 1;
        this.emitAudio('1up');
        this.emitUI('1up', { x: atX, y: atY + 0.9 });
        text = '1-UP';
      }
      if (!text) text = String(pts);
      e.state = 'dead'; e.deadT = 0.4;
      this.emitAudio('stomp');
    } else if (by === 'block') {
      pts = CFG.SCORE.BLOCK_KILL;
      e.state = 'dead'; e.deadT = 0.4;
      text = String(pts);
      this.emitAudio('stomp');
    }
    if (pts > 0) this.score += pts;
    if (text) this.emitUI('score', { x: atX, y: atY + 0.9, text });
  }

  // player-enemy contact
  handleEnemyContact(e) {
    const p = this.player;
    if (e.state === 'dead' || (e.state === 'sliding' && e.kickGraceT > 0)) return;
    const pr = this.playerRect();
    const er = { x0: e.x - e.w / 2, x1: e.x + e.w / 2, y0: e.y, y1: e.y + e.h };
    if (pr.x1 <= er.x0 || pr.x0 >= er.x1 || pr.y1 <= er.y0 || pr.y0 >= er.y1) return;

    // Star: defeat enemies
    if (this.starT > 0) {
      this.defeatEnemy(e, 'star', e.x, e.y + e.h);
      return;
    }

    // stomp: was above, descending
    const stompable = p.vy <= 0.5 && p.prevY >= er.y1 - 0.35;
    if (stompable && e.state !== 'sliding') {
      // bounce
      p.vy = this.input.jump ? CFG.STOMP_BOUNCE_HELD : CFG.STOMP_BOUNCE;
      p.onGround = false;
      this.defeatEnemy(e, 'stomp', e.x, er.y1);
      this.emitAudio('stomp');
      return;
    }
    if (stompable && e.state === 'sliding') {
      // stop the shell
      e.state = 'shell'; e.h = 0.7; e.vx = 0; e.wakeT = CFG.SHELL_WAKE; e.shellChain = 0;
      p.vy = this.input.jump ? CFG.STOMP_BOUNCE_HELD : CFG.STOMP_BOUNCE;
      p.onGround = false;
      this.emitAudio('stomp');
      this.emitAudio('shellStop');
      return;
    }

    // kick stationary shell
    if (e.state === 'shell') {
      e.state = 'sliding';
      e.h = 0.7;
      e.dir = p.x < e.x ? 1 : -1;
      e.vx = CFG.SHELL_SPEED * e.dir;
      e.shellChain = 0;
      e.kickGraceT = CFG.SHELL_KICK_GRACE;
      this.emitAudio('kick');
      this.emitUI('kick', { x: e.x, y: e.y + 0.6 });
      return;
    }

    // damage
    if (this.invulnT > 0) return;
    if (this.power !== 'small') {
      this.shrink();
      this.invulnT = CFG.INVULN;
      this.emitUI('damage', true);
    } else {
      this.die(false);
    }
  }

  // ---------------- fireballs ----------------

  throwFireball(dir) {
    const p = this.player;
    const x = p.x + dir * (p.w / 2 + 0.3);
    const y = p.y + p.h * 0.5;
    // reject spawn embedded in solid
    if (this.overlapsSolid(x - 0.2, x + 0.2, y - 0.2, y + 0.2)) return;
    this.fireballs.push({
      x, y, vx: dir * CFG.FIREBALL_SPEED, vy: 0,
      life: CFG.FIREBALL_LIFE, dead: false,
    });
    this.emitAudio('fire');
    this.emitUI('throw', { x, y });
  }

  updateFireballs(dt) {
    for (const f of this.fireballs) {
      f.life -= dt;
      f.vy += CFG.GRAVITY * dt * 0.7;
      if (f.vy < -CFG.FALL_CAP * 0.8) f.vy = -CFG.FALL_CAP * 0.8;
      const dx = f.vx * dt;
      const nx = f.x + dx;
      const r = { x0: nx - 0.2, x1: nx + 0.2, y0: f.y - 0.2, y1: f.y + 0.2 };
      if (!this.overlapsSolid(r.x0, r.x1, r.y0, r.y1)) f.x = nx;
      else { f.dead = true; this.emitAudio('fireHit'); }
      const dy = f.vy * dt;
      const ny = f.y + dy;
      const rr = { x0: f.x - 0.2, x1: f.x + 0.2, y0: ny - 0.2, y1: ny + 0.2 };
      if (!this.overlapsSolid(rr.x0, rr.x1, rr.y0, rr.y1)) f.y = ny;
      else {
        if (dy < 0) { f.y = ny; f.vy = CFG.FIREBALL_BOUNCE; }
        else { f.dead = true; this.emitAudio('fireHit'); }
      }
      // enemy hit
      for (const e of this.enemies) {
        if (e.state === 'dead') continue;
        const er = { x0: e.x - e.w / 2, x1: e.x + e.w / 2, y0: e.y, y1: e.y + e.h };
        const fr = { x0: f.x - 0.2, x1: f.x + 0.2, y0: f.y - 0.2, y1: f.y + 0.2 };
        if (fr.x1 > er.x0 && fr.x0 < er.x1 && fr.y1 > er.y0 && fr.y0 < er.y1) {
          this.defeatEnemy(e, 'fire', e.x, e.y + e.h);
          f.dead = true;
          break;
        }
      }
    }
    this.fireballs = this.fireballs.filter(f => !f.dead && f.life > 0);
  }

  // ---------------- collectibles ----------------

  updateCollectibles(dt) {
    const p = this.player;
    // static coins
    const coinsPool = this.area === 'cellar' ? this.cellarCoins : this.surfaceCoins;
    for (const c of coinsPool) {
      if (c.taken) continue;
      const id = this.area + ':' + c.x + ',' + c.y;
      if (this.collected.has(id)) { c.taken = true; continue; }
      const r = this.playerRect();
      if (r.x1 > c.x - 0.5 && r.x0 < c.x + 0.5 && r.y1 > c.y - 0.6 && r.y0 < c.y + 0.6) {
        c.taken = true;
        this.collected.add(id);
        this.awardCoin(c.x, c.y);
      }
    }
    // items
    for (const it of this.items) this.tryCollectItem(it);
    // enemies
    for (const e of this.enemies) this.handleEnemyContact(e);
  }

  awardCoin(x, y, fromBlock = false) {
    this.coins += 1;
    this.score += CFG.SCORE.COIN;
    this.emitAudio('coin');
    this.emitUI('score', { x, y, text: '200' });
    if (this.coins % CFG.COIN_PER_LIFE === 0) {
      this.lives += 1;
      this.emitAudio('1up');
      this.emitUI('1up', { x, y: y + 0.9 });
    }
  }

  // ---------------- pipes & warp ----------------

  findPipeUnder(p) {
    const grid = this.grids[this.area];
    const pipes = this.area === 'cellar' ? [LEVEL.cellar.entryPipe, LEVEL.cellar.exitPipe] : LEVEL.pipes;
    for (const pipe of pipes) {
      const enterable = this.area === 'cellar' ? (pipe === LEVEL.cellar.exitPipe) : !!pipe.enterable;
      if (!enterable) continue;
      const px = pipe.x + 1; // center
      const topY = Math.ceil(pipe.h);
      if (Math.abs(p.x - px) <= CFG.PIPE_ENTER_CENTER && Math.abs(p.y - topY) < 0.35) {
        return pipe;
      }
    }
    return null;
  }

  enterPipe(pipe) {
    if (this.state !== 'play') return;
    const to = this.area === 'cellar' ? 'surface' : 'cellar';
    if (to === 'cellar') this.discovered.add('cellar');
    // start warp
    this.state = 'warp';
    this.warp = {
      phase: 'down',
      t: 0,
      to,
      exitPipe: pipe,
    };
    this.emitAudio('pipe');
    this.emitUI('warp', true);
  }

  stepWarp(dt) {
    const w = this.warp;
    w.t += dt;
    const p = this.player;
    if (w.phase === 'down') {
      p.vy = -4; p.vx = 0;
      p.y -= 4 * dt;
      if (w.t >= 0.9) {
        // switch area
        this.area = w.to;
        if (this.area === 'cellar') {
          // place at cellar entry pipe base
          const ep = LEVEL.cellar.entryPipe;
          p.x = ep.x + 1; p.y = -0.2; // will rise
          w.phase = 'up';
          w.t = 0;
        } else {
          const ret = LEVEL.pipes.find(pp => pp.x === 52);
          p.x = ret.x + 1; p.y = -0.2;
          w.phase = 'up';
          w.t = 0;
        }
        this.buildGrids();
      }
    } else {
      p.vy = 4;
      p.y += 4 * dt;
      const topY = this.area === 'cellar' ? Math.ceil(LEVEL.cellar.entryPipe.h) : Math.ceil(2.8);
      if (p.y >= topY) {
        p.y = topY;
        p.vy = 0;
        this.state = 'play';
        this.invulnT = 1.0;
        this.emitAudio('pipe');
        this.emitUI('warp', false);
        this.warp = null;
      }
    }
  }

  // ---------------- progression ----------------

  updateProgress() {
    const p = this.player;
    if (this.area === 'surface') {
      if (!this.checkpointTaken && p.x >= LEVEL.checkpointX) {
        this.checkpointTaken = true;
        this.respawnX = LEVEL.checkpointX;
        this.emitUI('checkpoint', { x: p.x });
        this.emitAudio('checkpoint');
      }
      // flag interaction while above death boundary
      if (p.x >= LEVEL.flagX - 0.4 && p.y > -1) {
        this.grabFlag();
      }
    }
  }

  grabFlag() {
    const p = this.player;
    const feetH = p.y;
    let bonus = 100;
    if (feetH > 7) bonus = 5000;
    else if (feetH > 5) bonus = 2000;
    else if (feetH > 3) bonus = 800;
    else if (feetH > 1) bonus = 400;
    const capturedTimer = Math.max(0, Math.floor(this.timer));
    this.finish = {
      phase: 'slide', t: 0,
      flagBonus: bonus, capturedTimer,
      fireworks: [1, 3, 6].includes(capturedTimer % 10) ? capturedTimer % 10 : 0,
    };
    this.state = 'finish';
    this.winStats = {
      score: this.score, coins: this.coins, secrets: this.discovered.size,
      enemies: this.enemiesKilled || 0, flagBonus: bonus,
      timeBonus: 0, fireworkBonus: 0, runTime: this.runTime,
    };
    this.score += bonus;
    this.emitAudio('flag');
    this.emitUI('finish', { bonus, timer: capturedTimer });
  }

  stepFinish(dt) {
    const f = this.finish;
    f.t += dt;
    const p = this.player;
    if (f.phase === 'slide') {
      // slide down pole
      p.x = LEVEL.flagX - 0.3;
      p.y = Math.max(0, p.y - 8 * dt);
      p.vy = 0; p.vx = 0;
      if (p.y <= 0.01) {
        p.y = 0;
        f.phase = 'walk';
        f.t = 0;
        this.emitAudio('land');
      }
    } else if (f.phase === 'walk') {
      p.x += 2.2 * dt;
      if (p.x >= LEVEL.castleX - 0.6) {
        p.hidden = true;
        f.phase = 'tally';
        f.t = 0;
        this.emitAudio('castle');
      }
    } else if (f.phase === 'tally') {
      // convert time
      const timeBonus = f.capturedTimer * CFG.SCORE.TIME_UNIT;
      const step = 4;
      if (f.capturedTimer > 0) {
        const per = timeBonus / f.capturedTimer;
        const n = Math.ceil(f.capturedTimer / step);
        const done = Math.min(n, Math.floor(f.t / 0.06));
        const spent = Math.min(f.capturedTimer, done * step);
        const pts = Math.round(spent * per);
        this.score = this.winStats.score + f.flagBonus + pts;
        if (done >= n) {
          this.winStats.timeBonus = timeBonus;
          this.score = this.winStats.score + f.flagBonus + timeBonus;
          f.phase = 'fireworks';
          f.t = 0;
          this.emitAudio('tally');
        } else if (f._lastTally !== done) {
          f._lastTally = done;
          this.emitAudio('tick');
        }
      } else {
        this.winStats.timeBonus = 0;
        f.phase = 'fireworks';
        f.t = 0;
      }
    } else if (f.phase === 'fireworks') {
      const totalFireworks = f.fireworks;
      if (f._fw === undefined) f._fw = 0;
      const fireAt = [0.4, 1.0, 1.6];
      for (let i = f._fw; i < totalFireworks; i++) {
        if (f.t >= fireAt[i]) {
          f._fw = i + 1;
          this.score += CFG.SCORE.FIREWORK;
          this.winStats.fireworkBonus += CFG.SCORE.FIREWORK;
          this.emitAudio('firework');
          this.emitUI('firework', { x: LEVEL.castleX + 1.5, y: 9 - i * 0.5 });
        }
      }
      if (f._fw >= totalFireworks && f.t > 4.0) {
        this.winStats.score = this.score;
        this.state = 'win';
        this.emitAudio('clear');
        this.emitUI('win', this.winStats);
      }
    }
  }

  // ---------------- death / respawn ----------------

  die(timeout = false) {
    if (this.state === 'dying') return;
    this.state = 'dying';
    this.dying = { t: 0 };
    this.player.vy = 14;
    this.player.vx = 0;
    this.player.onGround = false;
    this.emitAudio(timeout ? 'timeout' : 'death');
  }

  stepDying(dt) {
    const d = this.dying;
    d.t += dt;
    const p = this.player;
    p.vy += CFG.GRAVITY * dt * 0.6;
    p.y += p.vy * dt;
    p.vx = 0;
    if (p.y < CFG.DEATH_Y - 6 || d.t > 3.2) {
      this.lives -= 1;
      if (this.lives <= 0) {
        this.state = 'gameover';
        this.emitAudio('gameover');
        return;
      }
      // respawn at checkpoint
      this.area = 'surface';
      this.player.x = this.respawnX;
      this.player.y = 0;
      this.player.vx = 0; this.player.vy = 0;
      this.player.hidden = false;
      this.setPower('small');
      this.invulnT = 3;
      this.starT = 0;
      this.airborneChain = 0;
      this.pendingGrow = false;
      this.timer = Math.max(this.timer, 60);
      this.spawnEnemies();
      this.buildGrids();
      this.state = 'play';
      this.emitAudio('respawn');
      this.emitUI('respawn', { x: this.respawnX });
    }
  }
}

// ---------- entity factories ----------

let nextEnemyId = 1;

function makeEnemy(kind, x) {
  const base = {
    id: nextEnemyId++, // stable identity for renderers (snapshots are fresh objects)
    kind, x, y: 0,
    vx: 0, vy: 0,
    dir: -1,
    w: kind === 'goomba' ? 0.9 : 0.9,
    h: kind === 'goomba' ? 0.9 : 1.3,
    onGround: false, prevY: 0,
    state: 'walk',
    active: false,
    wakeT: 0, kickGraceT: 0,
    shellChain: 0, deadT: 0, squash: false, remove: false,
  };
  if (kind === 'koopa' || kind === 'koopa-red') {
    base.state = 'walk';
  }
  return base;
}

function makeItem(game, type, x, y) {
  const baseY = y;
  let vx = 0;
  if (type === 'mushroom' || type === '1up') vx = CFG.MUSHROOM_SPEED; // deterministic: walks right, reverses at walls
  else if (type === 'star') vx = CFG.STAR_SPEED * (game.player.x < x ? 1 : -1); // toward Mario
  return {
    type,
    x, y: baseY,
    baseY,
    vx,
    vy: 0,
    state: 'emerge',
    et: 0,
    animT: 0,
    collected: false,
  };
}
