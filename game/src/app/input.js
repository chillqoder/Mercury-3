// Input handling — keyboard + touch. Produces the same control intent the
// simulation consumes: {left,right,jump,run,down} + edge signals.

import { CFG } from '../game/config.js';

const KEYMAP = {
  keya: 'left', keyd: 'right', arrowleft: 'left', arrowright: 'right',
  space: 'jump', keyw: 'jump', arrowup: 'jump',
  shiftleft: 'run', shiftright: 'run', keyx: 'run',
  arrowdown: 'down', keys: 'down',
};

export class Input {
  constructor({ onAction }) {
    this.onAction = onAction;          // (action: 'start'|'pause'|'restart'|'mute'|'primary') => void
    this.held = { left: false, right: false, jump: false, run: false, down: false };
    this.pressed = { left: false, right: false, jump: false, run: false, down: false };
    this.disabled = false;
    this._bound = [];
    this._attachKeyboard();
    this._attachTouch();
  }

  control() {
    return {
      left: this.held.left, right: this.held.right,
      jump: this.held.jump, run: this.held.run, down: this.held.down,
    };
  }

  clear() {
    this.held = { left: false, right: false, jump: false, run: false, down: false };
    this.pressed = { left: false, right: false, jump: false, run: false, down: false };
  }

  _prevent(e) {
    if (e instanceof KeyboardEvent) {
      const k = e.code.toLowerCase();
      if (k in KEYMAP || k === 'enter' || k === 'keyp' || k === 'escape' || k === 'keyr') {
        e.preventDefault();
      }
    }
  }

  _attachKeyboard() {
    const down = (e) => {
      this._prevent(e);
      if (this.disabled) return;
      const k = e.code.toLowerCase();
      if (k === 'enter') { this.onAction('primary'); return; }
      if (k === 'keyp' || k === 'escape') { this.onAction('pause'); return; }
      if (k === 'keyr') { this.onAction('restart'); return; }
      const map = KEYMAP[k];
      if (map && !e.repeat) {
        this.pressed[map] = true;
        this.held[map] = true;
      }
    };
    const up = (e) => {
      const k = e.code.toLowerCase();
      const map = KEYMAP[k];
      if (map) this.held[map] = false;
    };
    const blur = () => this.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });
    this._bound.push(() => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    });
  }

  _pressTouch(btn, action) {
    const press = (e) => {
      e.preventDefault();
      if (this.disabled) return;
      if (action === 'primary') { this.onAction('primary'); return; }
      this.pressed[action] = true;
      this.held[action] = true;
      btn.setPointerCapture?.(e.pointerId);
    };
    const release = (e) => {
      e.preventDefault();
      this.held[action] = false;
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    this._bound.push(() => {
      btn.removeEventListener('pointerdown', press);
      btn.removeEventListener('pointerup', release);
      btn.removeEventListener('pointercancel', release);
    });
  }

  _attachTouch() {
    const ids = ['touch-left', 'touch-right', 'touch-jump', 'touch-run', 'touch-down'];
    const actions = ['left', 'right', 'jump', 'run', 'down'];
    for (let i = 0; i < ids.length; i++) {
      const el = document.getElementById(ids[i]);
      if (el) this._pressTouch(el, actions[i]);
    }
  }

  dispose() {
    this._bound.forEach(fn => fn());
    this._bound = [];
  }
}

export { CFG };
