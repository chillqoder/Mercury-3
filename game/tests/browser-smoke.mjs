// Browser integration smoke test (Playwright). Verifies boot, rendering,
// input flow, pause, mute, resize, and captures screenshots.

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const root = '/Users/konstantin/Documents/Dev/Mercury 3/game';
const shotsDir = path.join(root, 'tests', 'shots');
mkdirSync(shotsDir, { recursive: true });

const CHROME = '/Users/konstantin/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const server = spawn('python3', ['-m', 'http.server', '8877'], { cwd: root, stdio: 'ignore' });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
await sleep(800);

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const problems = [];
page.on('console', msg => { if (msg.type() === 'error') problems.push('console: ' + msg.text()); });
page.on('pageerror', err => problems.push('pageerror: ' + err.message));

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + ' ' + detail); }
};

try {
  await page.goto('http://127.0.0.1:8877/', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__GAME__ !== undefined, null, { timeout: 15000 });
  check('boots with inspection API', true);

  // title overlay visible
  const titleVisible = await page.locator('#overlay .ov-title').textContent();
  check('title overlay shows', titleVisible.includes('Low Poly Mario'), titleVisible);

  await page.screenshot({ path: path.join(shotsDir, '01-title.png') });

  // start with Enter
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  const overlayHidden = await page.locator('#overlay').evaluate(el => el.classList.contains('hidden'));
  check('play overlay hidden after Enter', overlayHidden);

  const hudInitial = await page.evaluate(() => {
    const g = window.__GAME__.inspect();
    return { x: g.player.x, score: g.score, lives: g.lives };
  });
  check('starts at x ~ -56', Math.abs(hudInitial.x + 56) < 0.5, JSON.stringify(hudInitial));

  // move right ~1.5s
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1500);
  await page.keyboard.up('ArrowRight');
  const moved = await page.evaluate(() => window.__GAME__.inspect().player.x);
  check('moving right changes x', moved > hudInitial.x + 3, `from ${hudInitial.x} to ${moved}`);

  // jump
  await page.keyboard.down('Space');
  await page.waitForTimeout(160);
  await page.keyboard.up('Space');
  const j = await page.evaluate(() => window.__GAME__.inspect().player);
  check('jump launches', j.vy > 4, JSON.stringify({ vy: j.vy, y: j.y }));

  await page.screenshot({ path: path.join(shotsDir, '02-play.png') });

  // pause
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(200);
  const paused = await page.evaluate(() => window.__GAME__.inspect().state);
  check('pause overlay & state', paused === 'paused', paused);
  await page.screenshot({ path: path.join(shotsDir, '03-paused.png') });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const resumed = await page.evaluate(() => window.__GAME__.inspect().state);
  check('resume works', resumed === 'play', resumed);

  // mute toggle
  const mutedBefore = await page.evaluate(() => window.__GAME__.audio.muted);
  await page.click('#btn-mute');
  const mutedAfter = await page.evaluate(() => window.__GAME__.audio.muted);
  check('mute toggles', mutedAfter !== mutedBefore, `${mutedBefore} -> ${mutedAfter}`);

  // restart
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(300);
  const afterRestart = await page.evaluate(() => {
    const g = window.__GAME__.inspect();
    return { state: g.state, lives: g.lives, score: g.score, x: g.player.x };
  });
  check('restart resets run', afterRestart.state === 'play' && afterRestart.lives === 3 && afterRestart.score === 0 && Math.abs(afterRestart.x + 56) < 0.5, JSON.stringify(afterRestart));

  // mobile-ish portrait
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const touchVisible = await page.locator('#touch-controls').isVisible();
  check('touch controls visible on touch viewport', touchVisible);
  await page.screenshot({ path: path.join(shotsDir, '04-portrait.png') });

  // short landscape
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(shotsDir, '05-landscape.png') });
  const hudInView = await page.evaluate(() => {
    const r = document.getElementById('hud').getBoundingClientRect();
    return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
  });
  check('HUD fits short landscape', hudInView);

  console.log('\nproblems:', problems.length ? problems : 'none');
} catch (e) {
  console.error('browser smoke failed:', e);
  fail++;
} finally {
  await browser.close();
  server.kill();
}

console.log(`\npassed: ${pass}  failed: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
