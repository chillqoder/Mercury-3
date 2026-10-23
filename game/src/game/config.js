// Low Poly Mario — central configuration & tuning constants.
// All simulation values live here so tests can verify expectations against them.

export const CFG = {
  // ---- Fixed-step simulation ----
  STEP: 1 / 120,
  MAX_FRAME: 0.1,          // accumulator cap (seconds)

  // ---- Coordinate conventions ----
  GRAVITY: -40,            // units/s^2
  FALL_CAP: 34,            // max downward speed
  WALK: 6,
  RUN: 9.8,
  ACCEL_GROUND: 38,
  ACCEL_AIR: 27,
  BRAKE_GROUND: 32,
  BRAKE_AIR: 8,
  JUMP_V: 21,              // launch speed
  JUMP_CUT: 14.2,          // rising speed clamped to on release (tap ≈ 2.6 units)
  RUN_JUMP_BOOST: 1.2,
  COYOTE: 0.12,
  JUMP_BUFFER: 0.16,
  STEP_UP: 1,              // automatic 1-cell step climb

  // ---- Player bodies ----
  SMALL_W: 0.7, SMALL_H: 1.6,
  BIG_W: 0.7, BIG_H: 2.5,
  DUCK_H: 1.4,
  STOMP_BOUNCE: 16,
  STOMP_BOUNCE_HELD: 22,
  INVULN: 2.2,
  STAR_TIME: 10,

  // ---- Blocks ----
  BLOCK: 1,
  MULTI_COIN_PAYOUT: 10,
  COIN_PER_LIFE: 100,

  // ---- Enemies ----
  GOOMBA_SPEED: 1.65,
  KOOPA_SPEED: 1.35,
  SHELL_SPEED: 12,
  SHELL_WAKE: 4,
  SHELL_KICK_GRACE: 0.35,
  ACTIVATE_MARGIN: 14,     // activation x-margin beyond viewport edge

  // ---- Fireballs ----
  FIREBALL_SPEED: 13,
  FIREBALL_COOLDOWN: 0.25,
  FIREBALL_MAX: 2,
  FIREBALL_LIFE: 2.2,
  FIREBALL_BOUNCE: 8,

  // ---- Items ----
  MUSHROOM_SPEED: 3.1,
  STAR_SPEED: 4.5,
  STAR_BOUNCE: 16,
  EMERGE_TIME: 0.5,
  GROW_FREEZE: 0.6,
  SHRINK_FREEZE: 0.6,

  // ---- Timer ----
  TIMER_START: 300,
  TIMER_PER_UNIT: 0.55,    // seconds per displayed unit (~165s total)
  TIMER_WARNING: 100,

  // ---- Course ----
  DEATH_Y: -6,
  PIPE_ENTER_CENTER: 0.6,
  CHECKPOINT_X: 66,
  FLAG_X: 134,
  FLAG_TOP: 11,
  CASTLE_X: 141,

  // ---- Level layout bounds ----
  LEVEL_MIN_X: -60,
  LEVEL_MAX_X: 149,

  // ---- Scoring ----
  SCORE: {
    COIN: 200,
    POWERUP: 1000,
    BRICK: 50,
    FIREBALL_KILL: 100,
    STAR_KILL: 100,
    BLOCK_KILL: 100,
    FIREWORK: 500,
    TIME_UNIT: 50,
    FLAG: [100, 400, 800, 2000, 5000],
    AIRBORNE_CHAIN: [100, 200, 400, 800, 1000, 2000, 4000, 8000],
    SHELL_CHAIN: [500, 800, 1000, 2000, 4000, 5000, 8000],
  },
  POINTS_TO_1UP_AFTER: 8000, // chain value where a 1-UP is awarded
};

export const PALETTE = {
  sky: 0x9dd8ed,
  hillFar: 0xbfe3cf,
  hillNear: 0x8fd0b5,
  grass: 0x63c74d,
  soil: 0x9a6b3f,
  soilDark: 0x7c5430,
  brick: 0xd09a5a,
  brickDark: 0x8a5a2e,
  question: 0xffc93c,
  questionDark: 0xb8891f,
  used: 0x9c7a4a,
  coin: 0xffd83d,
  pipe: 0x4faf4a,
  pipeDark: 0x2f7a2c,
  stone: 0xb8b2a6,
  castle: 0xd9d4c8,
  marioRed: 0xd8372c,
  marioBlue: 0x2a4bd7,
  marioPeach: 0xffcf9f,
  marioBrown: 0x6b3f1f,
  marioWhite: 0xf5f0e6,
  marioBlack: 0x1c1c1c,
  goomba: 0xa5552e,
  koopa: 0x4fae4a,
  koopaRed: 0xd0453a,
  star: 0xffe14a,
};
