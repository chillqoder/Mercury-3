// Low Poly Mario — application bootstrap & game loop wiring.

import * as THREE from '../../vendor/three.module.js';
import { Game } from '../game/sim.js';
import { CFG } from '../game/config.js';
import { Renderer } from './renderer.js';
import { AudioSystem } from './audio.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { records } from './records.js';

const canvas = document.getElementById('game-canvas');

const game = new Game({ seed: 20261023 });
const renderer = new Renderer(canvas);
const audio = new AudioSystem();
const ui = new UI();

let muted = records.prefs.readMuted();
audio.setMuted(muted);
ui.setMutedIcon(muted);

// ---------- helpers ----------

function worldToScreen(x, y) {
  const v = new THREE.Vector3(x, y, 0).project(renderer.camera);
  return {
    x: (v.x + 1) / 2 * window.innerWidth,
    y: (1 - v.y) / 2 * window.innerHeight,
    visible: v.z < 1,
  };
}

// ---------- input actions ----------

const input = new Input({
  onAction: (action) => {
    if (action === 'primary') {
      if (game.state === 'title') { audio.ensure(); game.startRun(); ui.hideOverlay(); }
      else if (game.state === 'paused') { game.togglePause(); audio.sfx('pause'); ui.hideOverlay(); }
      else if (game.state === 'gameover') { game.startRun(); ui.hideOverlay(); }
      else if (game.state === 'win') { game.startRun(); ui.hideOverlay(); }
    } else if (action === 'pause') {
      if (game.state === 'play' || game.state === 'paused') {
        game.togglePause();
        audio.sfx('pause');
        if (game.state === 'paused') {
          audio.stopMusic();
          ui.showOverlay('paused');
        } else {
          ui.hideOverlay();
          audio.resume();
          syncMusic();
        }
      }
    } else if (action === 'restart') {
      if (game.state !== 'title') {
        game.startRun();
        ui.hideOverlay();
        audio.ensure();
        syncMusic();
      }
    } else if (action === 'mute') {
      muted = !muted;
      audio.setMuted(muted);
      records.prefs.writeMuted(muted);
      ui.setMutedIcon(muted);
    }
  },
});
ui.onMute = () => input.onAction('mute');
ui.onPause = () => input.onAction('pause');
ui.onPrimary = () => input.onAction('primary');
ui.onRestart = () => input.onAction('restart');

// ---------- music mapping ----------

function syncMusic() {
  if (game.state !== 'play') { audio.stopMusic(); return; }
  const theme = game.starT > 0 ? 'star' : game.area === 'cellar' ? 'cellar' : 'meadow';
  const hurry = game.timerWarned;
  audio.startMusic(theme, hurry);
}

function processAudio(events) {
  for (const ev of events) {
    switch (ev.t) {
      case 'warning': audio.sfx('warning'); if (game.state === 'play') audio.startMusic(game.starT > 0 ? 'star' : game.area === 'cellar' ? 'cellar' : 'meadow', true); break;
      case 'starStart': audio.sfx('starStart'); syncMusic(); break;
      case 'starEnd': audio.sfx('starEnd'); syncMusic(); break;
      case 'death': audio.stopMusic(); audio.sfx('death'); break;
      case 'timeout': audio.stopMusic(); audio.sfx('timeout'); break;
      case 'gameover': audio.sfx('gameover'); break;
      case 'finish': audio.stopMusic(); audio.sfx('flag'); break;
      case 'clear': audio.sfx('clear'); break;
      case 'respawn': audio.sfx('respawn'); syncMusic(); break;
      case 'warp': audio.sfx('pipe'); break;
      case 'checkpoint': audio.sfx('checkpoint'); break;
      default: audio.sfx(ev.t); break;
    }
  }
}

// ---------- UI event handling ----------

function processUI(events) {
  for (const ev of events) {
    switch (ev.t) {
      case 'score': {
        const s = worldToScreen(ev.d.x, ev.d.y);
        if (s.visible) ui.popup(s.x, s.y, ev.d.text);
        break;
      }
      case '1up': {
        const s = worldToScreen(ev.d.x, ev.d.y);
        if (s.visible) ui.popup(s.x, s.y, '1-UP', '#8dff9c');
        break;
      }
      case 'reveal': ui.toast('Secret block! 1-UP Mushroom'); break;
      case 'star': ui.toast('Invincible! Collect Star power!'); break;
      case 'power': ui.toast(ev.d === 'fire' ? 'FIRE MARIO!' : ev.d === 'big' ? 'BIG MARIO!' : 'SMALL MARIO'); break;
      case 'checkpoint': ui.toast('Checkpoint reached!'); break;
      case 'warning': ui.toast('Hurry! Time is low!'); break;
      case 'respawn': ui.toast('Try again!'); break;
      case 'win': {
        const d = ev.d;
        const rec = records.noteCompletion(d.runTime, d.score);
        ui.showOverlay('win', { ...d, bestScore: rec.bestScore, bestTime: rec.bestTime, newBestScore: rec.newBestScore, newBestTime: rec.newBestTime });
        break;
      }
      default: break;
    }
  }
}

// ---------- fixed-step loop ----------

let last = performance.now();
let acc = 0;
let fxEvents = [];

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > CFG.MAX_FRAME) dt = CFG.MAX_FRAME;
  acc += dt;

  // apply live input intent
  if (game.state === 'play') {
    game.applyControl(input.control());
  }

  let stepCount = 0;
  while (acc >= CFG.STEP && stepCount < 24) {
    game.step(CFG.STEP);
    acc -= CFG.STEP;
    stepCount++;
  }
  if (stepCount === 24) acc = 0;

  const audioEvents = game.drainAudioEvents();
  if (audioEvents.length) processAudio(audioEvents);

  const uiEvents = game.drainUIEvents();
  if (uiEvents.length) {
    processUI(uiEvents);
    fxEvents = fxEvents.concat(uiEvents.filter(e => ['break', 'throw', 'firework', 'bump'].includes(e.t)));
  }

  // keep best score advisory up to date
  if ((game.state === 'gameover' || game.state === 'win') && game.score > 0) {
    records.noteScore(game.score);
  }

  const st = game.inspect();
  ui.update(st);
  renderer.sync(st, fxEvents);
  fxEvents = [];
  renderer.render();
}

// ---------- resize / visibility ----------

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.resize(w, h);
}
window.addEventListener('resize', resize);
resize();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    audio.suspend();
    input.clear();
    if (game.state === 'play') game.togglePause();
  } else {
    audio.resume();
  }
});

// ---------- boot ----------

game.toTitle();
ui.showOverlay('title');
records.load();
audio.ensure(); // will no-op until gesture; fine
requestAnimationFrame(frame);

// Expose a small inspection API for deterministic checks & debugging.
window.__GAME__ = {
  game,
  renderer,
  audio,
  ui,
  input,
  records,
  inspect: () => game.inspect(),
  startRun: () => { input.onAction('primary'); },
  togglePause: () => input.onAction('pause'),
  restart: () => input.onAction('restart'),
  applyControl: (c) => game.applyControl(c),
  step: () => game.step(CFG.STEP),
};
