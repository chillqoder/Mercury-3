// Persistent personal records — versioned, validated, resilient to storage failure.

const KEY = 'lowpoly-mario:v1';
const PREFS_KEY = 'lowpoly-mario:prefs';

function sanitize(raw) {
  const out = { v: 1, bestScore: 0, bestTime: null };
  if (raw && typeof raw === 'object') {
    const s = Number(raw.bestScore);
    const t = Number(raw.bestTime);
    if (Number.isFinite(s) && s >= 0) out.bestScore = Math.floor(s);
    if (Number.isFinite(t) && t > 0) out.bestTime = t;
  }
  return out;
}

function read() {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return sanitize(null);
    return sanitize(JSON.parse(s));
  } catch {
    return sanitize(null);
  }
}

function write(rec) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rec));
    return true;
  } catch {
    return false; // storage full/unavailable — keep in-memory
  }
}

export const records = {
  load() {
    this.mem = read();
    return this.mem;
  },
  // A score can improve the best at any moment; times are completion-only.
  noteScore(score) {
    const rec = this.mem || this.load();
    const newBest = score > rec.bestScore;
    if (newBest) {
      rec.bestScore = score;
      write(rec);
    }
    return { newBest, bestScore: rec.bestScore };
  },
  noteCompletion(runTime, score) {
    const rec = this.mem || this.load();
    const newBestScore = score > rec.bestScore;
    const newBestTime = rec.bestTime === null || runTime < rec.bestTime;
    if (newBestScore) rec.bestScore = score;
    if (newBestTime) rec.bestTime = runTime;
    write(rec);
    return { newBestScore, newBestTime, bestScore: rec.bestScore, bestTime: rec.bestTime };
  },
  prefs: {
    readMuted() {
      try {
        const s = localStorage.getItem(PREFS_KEY);
        return s ? !!JSON.parse(s).muted : false;
      } catch { return false; }
    },
    writeMuted(muted) {
      try { localStorage.setItem(PREFS_KEY, JSON.stringify({ muted })); } catch { /* ignore */ }
    },
  },
};
