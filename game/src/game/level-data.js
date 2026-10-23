// Low Poly Mario — explicit level data for World 1-1.
// One ordinary block is ~1 world unit. Cells are integer (x,y) squares with
// half-open intervals: a cell at (x,y) spans [x, x+1) x [y, y+1).
// The surface ground top surface sits at y = 0; pits are gaps in the ground.

export const LEVEL = {
  name: 'World 1-1',
  startX: -56,
  startArea: 'surface',

  // Solid ground runs: [x0, x1) means cells x0..x1-1 at y = -8..-1.
  ground: [
    { x0: -64, x1: 4 },
    { x0: 7, x1: 37 },
    { x0: 41, x1: 90 },
    { x0: 93, x1: 149 },
  ],

  // Standing stairs & standalone solid ledges (cells above the ground).
  solidCells: [
    // stair practice (before the real gap)
    { x: 70, y: 1 }, { x: 71, y: 1 }, { x: 72, y: 1 },
    { x: 71, y: 2 }, { x: 72, y: 2 },
    { x: 72, y: 3 },
    // stairs toward the third pit
    { x: 86, y: 1 }, { x: 87, y: 1 }, { x: 88, y: 1 }, { x: 89, y: 1 },
    { x: 87, y: 2 }, { x: 88, y: 2 }, { x: 89, y: 2 },
    { x: 88, y: 3 }, { x: 89, y: 3 },
    { x: 89, y: 4 },
    // final staircase
    { x: 123, y: 1 }, { x: 124, y: 1 }, { x: 125, y: 1 }, { x: 126, y: 1 },
    { x: 127, y: 1 }, { x: 128, y: 1 }, { x: 129, y: 1 }, { x: 130, y: 1 },
    { x: 124, y: 2 }, { x: 125, y: 2 }, { x: 126, y: 2 }, { x: 127, y: 2 },
    { x: 128, y: 2 }, { x: 129, y: 2 }, { x: 130, y: 2 },
    { x: 125, y: 3 }, { x: 126, y: 3 }, { x: 127, y: 3 }, { x: 128, y: 3 },
    { x: 129, y: 3 }, { x: 130, y: 3 },
    { x: 126, y: 4 }, { x: 127, y: 4 }, { x: 128, y: 4 }, { x: 129, y: 4 },
    { x: 130, y: 4 },
    { x: 127, y: 5 }, { x: 128, y: 5 }, { x: 129, y: 5 }, { x: 130, y: 5 },
    { x: 128, y: 6 }, { x: 129, y: 6 }, { x: 130, y: 6 },
    { x: 129, y: 7 }, { x: 130, y: 7 },
    { x: 130, y: 8 },
  ],

  // Pipes sit on the ground and span cells x, x+1 for y = 0..h-1.
  pipes: [
    { x: -15, h: 2.0 },
    { x: -4, h: 2.8, enterable: 'cellar' },      // secret entrance
    { x: 24, h: 3.4 },
    { x: 44, h: 2.0 },
    { x: 52, h: 2.8 },                           // cellar return pipe
    { x: 77, h: 2.0 },
    { x: 102, h: 3.4 },
    { x: 119, h: 2.0 },
  ],

  // Block list. kind: 'q' (adaptive item), 'brick', 'coinbrick' (multi-coin),
  // 'hidden' (invisible until bumped). content: 'star' | '1up' | 'coins'.
  blocks: [
    // --- Opening: learn movement, coins, first Goomba, first adaptive block ---
    { x: -30, y: 4, kind: 'q' },
    { x: -20, y: 4, kind: 'q' },
    { x: -16, y: 4, kind: 'brick' },
    { x: -11, y: 4, kind: 'q' },
    { x: -7, y: 4, kind: 'brick' },
    { x: -6, y: 4, kind: 'brick' },
    // --- First gap & brick route ---
    { x: 10, y: 4, kind: 'brick' },
    { x: 11, y: 4, kind: 'coinbrick' },
    { x: 12, y: 4, kind: 'brick' },
    { x: 13, y: 4, kind: 'brick' },
    { x: 14, y: 4, kind: 'brick', content: 'star' },   // hidden Star
    // --- Middle stretch ---
    { x: 47, y: 4, kind: 'brick' },
    { x: 50, y: 4, kind: 'q' },
    { x: 56, y: 4, kind: 'brick' },
    { x: 57, y: 4, kind: 'brick' },
    { x: 74, y: 4, kind: 'q' },
    { x: 80, y: 4, kind: 'brick' },
    { x: 81, y: 4, kind: 'brick' },
    { x: 84, y: 4, kind: 'hidden', content: '1up' },   // hidden 1-UP (reachable from the ground)
    // --- Final approach ---
    { x: 108, y: 4, kind: 'q' },
    { x: 113, y: 4, kind: 'brick' },
    { x: 114, y: 4, kind: 'brick' },
    { x: 115, y: 4, kind: 'brick' },
  ],

  // Floating coins: {x, y} at their cell center; y=1 is just above the ground.
  coins: [
    { x: -33, y: 1 }, { x: -32, y: 1 }, { x: -31, y: 1 },
    { x: -19, y: 1 }, { x: -18, y: 1 }, { x: -17, y: 1 },
    { x: -9, y: 1 }, { x: -8, y: 1 },
    { x: 5, y: 3 }, { x: 6, y: 4 },
    { x: 15, y: 1 }, { x: 16, y: 1 }, { x: 17, y: 1 }, { x: 18, y: 1 },
    { x: 19, y: 1 }, { x: 20, y: 1 }, { x: 21, y: 1 },
    { x: 26, y: 1 }, { x: 27, y: 1 },
    { x: 38, y: 3 }, { x: 39, y: 4 }, { x: 40, y: 3 },
    { x: 48, y: 1 }, { x: 49, y: 1 },
    { x: 54, y: 5 }, { x: 55, y: 5 }, { x: 58, y: 5 }, { x: 59, y: 5 },
    { x: 60, y: 5 }, { x: 61, y: 5 },
    { x: 65, y: 1 }, { x: 66, y: 1 }, { x: 67, y: 1 },
    { x: 78, y: 1 }, { x: 79, y: 1 },
    { x: 83, y: 1 }, { x: 84, y: 1 }, { x: 85, y: 1 },
    { x: 90, y: 3 }, { x: 91, y: 4 }, { x: 92, y: 3 },
    { x: 95, y: 1 }, { x: 96, y: 1 }, { x: 97, y: 1 },
    { x: 104, y: 1 }, { x: 105, y: 1 },
    { x: 110, y: 1 }, { x: 111, y: 1 }, { x: 112, y: 1 },
    { x: 121, y: 1 }, { x: 122, y: 1 },
  ],

  // Enemies: kind goomba | koopa | koopa-red
  enemies: [
    { kind: 'goomba', x: -27 },
    { kind: 'goomba', x: -12 },
    { kind: 'goomba', x: -10 },
    { kind: 'goomba', x: 18 },
    { kind: 'goomba', x: 20 },
    { kind: 'koopa', x: 28 },
    { kind: 'goomba', x: 31 },
    { kind: 'goomba', x: 33 },
    { kind: 'goomba', x: 56 },
    { kind: 'goomba', x: 58 },
    { kind: 'koopa-red', x: 62 },
    { kind: 'goomba', x: 82 },
    { kind: 'goomba', x: 84 },
    { kind: 'goomba', x: 96 },
    { kind: 'goomba', x: 98 },
    { kind: 'goomba', x: 111 },
    { kind: 'goomba', x: 113 },
    { kind: 'koopa', x: 116 },
    { kind: 'goomba', x: 131 },
    { kind: 'goomba', x: 133 },
  ],

  // The secret coin cellar. Entry: pipe 'cellar' (x=-4). Return: pipe at x=30.
  cellar: {
    ground: [{ x0: -12, x1: 40 }],
    leftWallX: -13,
    rightWallX: 39,
    ceilingY: 7,
    entryPipe: { x: 8, h: 2 },
    exitPipe: { x: 30, h: 2 },
    coins: [
      { x: 10, y: 2 }, { x: 12, y: 2 }, { x: 14, y: 2 }, { x: 16, y: 2 },
      { x: 18, y: 2 }, { x: 20, y: 2 }, { x: 22, y: 2 }, { x: 24, y: 2 },
      { x: 26, y: 2 }, { x: 28, y: 2 },
      { x: 12, y: 5 }, { x: 15, y: 5 }, { x: 18, y: 5 }, { x: 21, y: 5 },
      { x: 24, y: 5 }, { x: 27, y: 5 },
      { x: 14, y: 3 }, { x: 22, y: 3 },
    ],
    blocks: [
      { x: 16, y: 4, kind: 'coinbrick' },
      { x: 19, y: 4, kind: 'brick' },
    ],
    exitX: 30, // surface x where the return pipe emerges
  },

  // Finale positions
  checkpointX: 66,
  flagX: 134,
  castleX: 141,
  castleWidth: 3,
  finishX: 145,
};
