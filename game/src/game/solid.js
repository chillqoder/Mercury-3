// SolidGrid — the authoritative voxel collision map for one area.
// Cells are 1x1 world units, keyed by integer coordinates. Terrain is built
// from explicit level data; interaction blocks are separate mutable records
// so consumed/revealed state can be exactly re-applied after a checkpoint death.

export const SOLID = {
  GROUND: 'ground',
  STAIR: 'stair',
  PIPE: 'pipe',
  BRICK: 'brick',
  QUESTION: 'question',
  USED: 'used',
  COINBRICK: 'coinbrick',
  HIDDEN: 'hidden',
};

export class SolidGrid {
  constructor() {
    this.map = new Map();
  }

  clear() {
    this.map.clear();
  }

  setCell(x, y, kind) {
    if (kind === null) this.map.delete(key(x, y));
    else this.map.set(key(x, y), kind);
  }

  get(x, y) {
    return this.map.get(key(x, y)) || null;
  }

  isSolid(x, y) {
    const k = this.map.get(key(x, y));
    return k !== undefined && k !== SOLID.HIDDEN;
  }

  // Blocking only (hidden blocks are invisible and pass-through until revealed).
  isBlocking(x, y) {
    return this.isSolid(x, y);
  }

  // Build terrain + blocks for an area.
  //   terrain: array of {x0,x1,y0,y1} solid rectangles (cells inclusive)
  //   blocks:  array of block records {x,y,kind,state}
  build(terrain, blocks) {
    this.clear();
    for (const r of terrain) {
      for (let x = r.x0; x <= r.x1; x++) {
        for (let y = r.y0; y <= r.y1; y++) {
          this.setCell(x, y, r.kind || SOLID.GROUND);
        }
      }
    }
    for (const b of blocks) {
      if (b.state === 'broken') continue;
      const kind = blockKind(b);
      this.setCell(b.x, b.y, kind);
    }
  }

  // Snapshot of every solid cell (used for rendering).
  cells() {
    const out = [];
    for (const [k, kind] of this.map) {
      if (kind === SOLID.HIDDEN) continue;
      const [x, y] = k.split(',').map(Number);
      out.push({ x, y, kind });
    }
    return out;
  }
}

function key(x, y) {
  return x + ',' + y;
}

export function blockKind(b) {
  if (b.state === 'used') return SOLID.USED;
  if (b.state === 'broken') return null;
  switch (b.kind) {
    case 'q': return SOLID.QUESTION;
    case 'brick': return SOLID.BRICK;
    case 'coinbrick': return SOLID.COINBRICK;
    case 'hidden': return b.state === 'revealed' ? SOLID.QUESTION : SOLID.HIDDEN;
    default: return SOLID.BRICK;
  }
}
