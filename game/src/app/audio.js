// Original chiptune synth + concise sound effects via Web Audio.
// One owner, bounded scheduling, gesture-gated, mute covers music and effects.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

// --- themes (16th-note grids, [semitone | 0=rest][, len in 16ths]) ---
const MEADOW = {
  bpm: 138,
  lead: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    60, 0, 64, 0, 67, 0, 64, 0, 60, 0, 64, 0, 67, 0, 72, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    71, 0, 67, 0, 64, 0, 67, 0, 72, 0, 74, 0, 76, 0, 79, 0,
  ],
  bass: [
    36, 0, 0, 0, 43, 0, 0, 0, 36, 0, 0, 0, 43, 0, 0, 0,
    36, 0, 0, 0, 43, 0, 0, 0, 36, 0, 0, 0, 43, 0, 0, 0,
    41, 0, 0, 0, 43, 0, 0, 0, 41, 0, 0, 0, 43, 0, 0, 0,
    38, 0, 0, 0, 43, 0, 0, 0, 38, 0, 0, 0, 43, 0, 0, 0,
  ],
};
const CELLAR = {
  bpm: 118,
  lead: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    64, 0, 67, 0, 71, 0, 67, 0, 64, 0, 67, 0, 71, 0, 74, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    72, 0, 71, 0, 67, 0, 71, 0, 72, 0, 74, 0, 76, 0, 79, 0,
  ],
  bass: [
    40, 0, 0, 0, 47, 0, 0, 0, 40, 0, 0, 0, 47, 0, 0, 0,
    40, 0, 0, 0, 47, 0, 0, 0, 40, 0, 0, 0, 47, 0, 0, 0,
    43, 0, 0, 0, 47, 0, 0, 0, 43, 0, 0, 0, 47, 0, 0, 0,
    41, 0, 0, 0, 47, 0, 0, 0, 41, 0, 0, 0, 47, 0, 0, 0,
  ],
};
const STAR_THEME = {
  bpm: 168,
  lead: [
    76, 79, 84, 79, 76, 79, 84, 79, 76, 79, 84, 79, 88, 84, 79, 76,
    74, 76, 79, 76, 74, 76, 79, 76, 74, 76, 79, 76, 84, 79, 76, 74,
    76, 79, 84, 79, 76, 79, 84, 79, 76, 79, 84, 79, 88, 84, 79, 76,
    79, 81, 83, 81, 79, 81, 83, 81, 79, 81, 83, 81, 86, 83, 81, 79,
  ],
  bass: [
    48, 0, 0, 0, 55, 0, 0, 0, 48, 0, 0, 0, 55, 0, 0, 0,
    43, 0, 0, 0, 50, 0, 0, 0, 43, 0, 0, 0, 50, 0, 0, 0,
    48, 0, 0, 0, 55, 0, 0, 0, 48, 0, 0, 0, 55, 0, 0, 0,
    47, 0, 0, 0, 54, 0, 0, 0, 47, 0, 0, 0, 54, 0, 0, 0,
  ],
};

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.musicOn = false;
    this.theme = 'meadow';
    this.hurry = false;
    this._timer = null;
    this._nextTick = 0;
    this._step = 0;
    this._themeData = MEADOW;
    this._lastSched = 0;
    this.paused = false;
  }

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.55;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1;
      this.sfxGain.connect(this.master);
      return true;
    } catch { return false; }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.02);
    }
  }

  suspend() {
    this.paused = true;
    this.stopMusic();
    if (this.ctx) this.ctx.suspend();
  }

  resume() {
    this.paused = false;
    if (this.ctx) this.ctx.resume();
    if (this.musicOn) this.startMusic(this.theme);
  }

  // ---------- music ----------

  startMusic(theme, hurry = false) {
    if (!this.ensure() || this.muted) return;
    this.stopMusic();
    this.musicOn = true;
    this.theme = theme;
    this.hurry = hurry;
    this._themeData = theme === 'cellar' ? CELLAR : theme === 'star' ? STAR_THEME : MEADOW;
    this._step = 0;
    this._nextTick = this.ctx.currentTime + 0.06;
    this._lastSched = 0;
    this._timer = setInterval(() => this._schedule(), 30);
  }

  setHurry(h) {
    if (h !== this.hurry) {
      this.hurry = h;
      if (this.musicOn) { const t = this.theme; this.startMusic(t, h); }
    }
  }

  _harmony() { return this.hurry ? 1.25 : 1; }

  _schedule() {
    if (!this.ctx || this.paused || this.muted) return;
    const spb = 60 / (this._themeData.bpm * this._harmony()) / 4; // 16th
    const ahead = 0.14;
    while (this._nextTick < this.ctx.currentTime + ahead) {
      const step = this._step % 64;
      const lead = this._themeData.lead[step];
      const bass = this._themeData.bass[step];
      const t = this._nextTick;
      if (lead) this._tone(NOTE(lead), t, spb * 0.9, 'square', 0.16, this.musicGain, 0.02);
      if (bass) this._tone(NOTE(bass), t, spb * 1.8, 'triangle', 0.3, this.musicGain, 0.02);
      if (step % 4 === 2) this._hat(t, 0.03);
      if (step % 8 === 0 && this.theme !== 'cellar') this._hat(t, 0.05, 6000);
      this._nextTick += spb;
      this._step++;
      this._lastSched = t;
    }
  }

  _hat(t, vol, freq = 4000) {
    if (!this.ctx) return;
    const len = 0.04;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.musicGain);
    src.start(t);
  }

  stopMusic() {
    this.musicOn = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  // ---------- primitives ----------

  _tone(freq, t, dur, type, vol, destGain, attack = 0.005) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(destGain || this.sfxGain);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  _slide(from, to, t, dur, type, vol) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  _noise(t, dur, vol, freq, q = 1) {
    if (!this.ctx) return;
    const len = Math.max(0.01, dur);
    const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * len), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t);
  }

  // ---------- effects ----------

  sfx(name) {
    if (!this.ensure() || this.muted) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'jump': this._slide(220, 620, t, 0.16, 'square', 0.12); break;
      case 'land': this._noise(t, 0.06, 0.1, 900); break;
      case 'coin': this._tone(NOTE(83), t, 0.07, 'square', 0.16); this._tone(NOTE(88), t + 0.06, 0.3, 'square', 0.16); break;
      case 'bump': this._noise(t, 0.07, 0.2, 500); this._tone(120, t, 0.08, 'square', 0.2); break;
      case 'break': this._noise(t, 0.25, 0.3, 1200); this._tone(200, t, 0.1, 'triangle', 0.2); break;
      case 'reveal': this._slide(300, 900, t, 0.12, 'square', 0.15); break;
      case 'stomp': this._noise(t, 0.1, 0.22, 700); this._tone(160, t, 0.09, 'square', 0.2); break;
      case 'kick': this._noise(t, 0.08, 0.25, 2400); this._tone(700, t, 0.08, 'square', 0.15); break;
      case 'shellWake': this._slide(200, 500, t, 0.3, 'square', 0.12); break;
      case 'shellStop': this._tone(500, t, 0.08, 'square', 0.14); this._tone(350, t + 0.06, 0.08, 'square', 0.14); break;
      case 'bang': this._noise(t, 0.12, 0.28, 1400); break;
      case 'fire': this._noise(t, 0.1, 0.2, 3000); this._slide(500, 300, t, 0.12, 'square', 0.1); break;
      case 'fireHit': this._noise(t, 0.12, 0.25, 2000); this._tone(900, t, 0.08, 'square', 0.12); break;
      case 'grow': this._arp([60, 64, 67, 72], t, 0.5, 0.14); break;
      case 'firePower': this._arp([60, 64, 67, 72, 76], t, 0.6, 0.14); break;
      case 'shrink': this._arp([72, 67, 64, 60], t, 0.5, 0.12); break;
      case '1up': this._arp([60, 67, 76, 79, 84], t, 0.7, 0.18); break;
      case 'starStart': this._arp([60, 67, 72, 79, 84], t, 0.5, 0.16); break;
      case 'starEnd': this._arp([84, 79, 72, 67, 60], t, 0.5, 0.1); break;
      case 'warning': for (let i = 0; i < 3; i++) this._tone(NOTE(76), t + i * 0.12, 0.09, 'square', 0.16); break;
      case 'pipe': this._slide(300, 80, t, 0.5, 'square', 0.2); break;
      case 'checkpoint': this._arp([72, 76, 79, 84], t, 0.4, 0.14); break;
      case 'death': this._slide(400, 60, t, 0.8, 'square', 0.2); break;
      case 'timeout': this._slide(500, 80, t, 0.9, 'square', 0.2); break;
      case 'flag': this._slide(300, 900, t, 0.4, 'square', 0.16); break;
      case 'castle': this._slide(200, 60, t, 0.6, 'triangle', 0.25); break;
      case 'tick': this._tone(NOTE(84), t, 0.05, 'square', 0.1); break;
      case 'tally': this._arp([60, 64, 67, 72, 76, 79, 84], t, 0.9, 0.14); break;
      case 'firework': this._noise(t, 0.5, 0.3, 900); this._tone(80, t, 0.4, 'sawtooth', 0.2); break;
      case 'clear': this._arp([60, 64, 67, 72, 76, 79, 84, 88], t, 1.4, 0.2); break;
      case 'gameover': this._arp([60, 55, 52, 48, 43], t, 1.6, 0.2); break;
      case 'respawn': this._tone(NOTE(67), t, 0.1, 'square', 0.12); this._tone(NOTE(72), t + 0.1, 0.14, 'square', 0.12); break;
      case 'pause': this._tone(NOTE(60), t, 0.06, 'square', 0.14); this._tone(NOTE(67), t + 0.07, 0.08, 'square', 0.14); break;
      case 'title': this._arp([60, 67, 72, 79], t, 0.45, 0.12); break;
      case 'powerup': this._arp([67, 72, 76, 79], t, 0.3, 0.14); break;
      default: break;
    }
  }

  _arp(notes, t0, dur, vol) {
    const n = notes.length;
    const step = dur / n;
    notes.forEach((note, i) => {
      this._tone(NOTE(note), t0 + i * step, step * 1.4, 'square', vol);
    });
  }

  dispose() {
    this.stopMusic();
    if (this.ctx) this.ctx.close();
    this.ctx = null;
  }
}
