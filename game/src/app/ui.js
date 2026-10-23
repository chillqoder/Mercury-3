// HUD, overlays, floating score popups, toasts and touch controls.

const $ = (id) => document.getElementById(id);

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export class UI {
  constructor() {
    this.el = {};
    this.overlay = null;
    this._attach();
    this._popups = [];
    this._toasts = [];
  }

  _attach() {
    this.el.score = $('hud-score');
    this.el.coins = $('hud-coins');
    this.el.world = $('hud-world');
    this.el.time = $('hud-time');
    this.el.lives = $('hud-lives');
    this.el.power = $('hud-power');
    this.el.progress = $('hud-progress-fill');
    this.el.mute = $('btn-mute');
    this.el.pause = $('btn-pause');
    this.el.overlay = $('overlay');
    this.el.toasts = $('toasts');
    this.el.popups = $('popups');
    this.el.starOverlay = $('star-overlay');

    this.el.mute.addEventListener('click', () => this.onMute?.());
    this.el.pause.addEventListener('click', () => this.onPause?.());
  }

  update(st) {
    this.el.score.textContent = String(st.score).padStart(6, '0');
    this.el.coins.textContent = String(st.coins).padStart(2, '0');
    this.el.world.textContent = st.area === 'cellar' ? 'CELLAR' : '1-1';
    this.el.time.textContent = String(st.timer).padStart(3, '0');
    this.el.lives.textContent = String(st.lives);
    this.el.power.textContent = { small: 'SMALL', big: 'BIG', fire: 'FIRE' }[st.power] || 'SMALL';
    const lo = -60, hi = 149;
    const p = Math.min(1, Math.max(0, (st.player.x - lo) / (hi - lo)));
    this.el.progress.style.width = (p * 100).toFixed(1) + '%';
    this.el.starOverlay.style.opacity = st.star > 0 ? '0.95' : '0';
    if (st.state === 'play') this.el.overlay.classList.add('hidden');
  }

  setMutedIcon(muted) {
    this.el.mute.textContent = muted ? '🔇' : '🔊';
  }

  // ---------- overlays ----------

  showOverlay(kind, data = {}) {
    const o = this.el.overlay;
    o.classList.remove('hidden');
    o.className = 'overlay ' + kind;
    const title = o.querySelector('.ov-title');
    const sub = o.querySelector('.ov-sub');
    const actions = o.querySelector('.ov-actions');
    actions.innerHTML = '';
    const mkBtn = (label, id, primary) => {
      const b = document.createElement('button');
      b.className = 'btn' + (primary ? ' primary' : '');
      b.id = id;
      b.textContent = label;
      actions.appendChild(b);
      return b;
    };
    if (kind === 'title') {
      title.textContent = 'Low Poly Mario';
      sub.innerHTML = 'World 1-1 · a voxel adventure<br><span class="dim">Move A/D or ←/→ · Jump Space · Run Shift/X · Duck ↓ · Pause P</span>';
      const b = mkBtn('▶ Play', 'ov-play', true);
      b.addEventListener('click', () => this.onPrimary?.());
    } else if (kind === 'paused') {
      title.textContent = 'Paused';
      sub.textContent = 'Take a breather.';
      const r = mkBtn('Resume', 'ov-resume', true);
      r.addEventListener('click', () => this.onPrimary?.());
      const rr = mkBtn('Restart', 'ov-restart');
      rr.addEventListener('click', () => this.onRestart?.());
    } else if (kind === 'gameover') {
      title.textContent = 'Game Over';
      sub.textContent = `Score ${data.score ?? 0} · Best ${data.bestScore ?? 0}`;
      const b = mkBtn('Try Again', 'ov-retry', true);
      b.addEventListener('click', () => this.onPrimary?.());
    } else if (kind === 'win') {
      title.textContent = 'Course Clear!';
      const d = data;
      const rows = [
        ['Final Score', String(d.score ?? 0)],
        ['Run Time', fmtTime(d.runTime ?? 0)],
        ['Coins Collected', String(d.coins ?? 0)],
        ['Secrets Found', `${d.secrets ?? 0} / 3`],
        ['Enemies Defeated', String(d.enemies ?? 0)],
        ['Flag Bonus', String(d.flagBonus ?? 0)],
        ['Time Bonus', String(d.timeBonus ?? 0)],
        ['Firework Bonus', String(d.fireworkBonus ?? 0)],
      ];
      let html = '<table class="results">';
      for (const [k, v] of rows) html += `<tr><td>${k}</td><td>${v}</td></tr>`;
      if (d.newBestScore || d.newBestTime) {
        html += `<tr class="newbest"><td colspan="2">🎉 NEW BEST</td></tr>`;
      }
      html += `<tr class="best"><td>Best Score</td><td>${d.bestScore ?? 0}</td></tr>`;
      html += `<tr class="best"><td>Best Time</td><td>${d.bestTime ? fmtTime(d.bestTime) : '—'}</td></tr>`;
      html += '</table>';
      sub.innerHTML = html;
      const b = mkBtn('Play Again', 'ov-again', true);
      b.addEventListener('click', () => this.onPrimary?.());
    }
  }

  hideOverlay() {
    this.el.overlay.classList.add('hidden');
  }

  // ---------- floating popups / toasts ----------

  // popup at screen-space (x, y) (CSS px)
  popup(x, y, text, color = '#fff6d9') {
    const d = document.createElement('div');
    d.className = 'popup';
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    d.style.color = color;
    d.textContent = text;
    this.el.popups.appendChild(d);
    requestAnimationFrame(() => d.classList.add('go'));
    setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 1000);
  }

  toast(text, ttl = 1800) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = text;
    this.el.toasts.appendChild(d);
    setTimeout(() => { d.classList.add('hide'); setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 250); }, ttl);
  }

  clearTransient() {
    this.el.popups.innerHTML = '';
    this.el.toasts.innerHTML = '';
  }
}
