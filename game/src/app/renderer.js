// Three.js voxel renderer — presentation only. Everything authoritative lives
// in the simulation; this module reads `game.inspect()` and renders it.

import * as THREE from '../../vendor/three.module.js';
import { CFG, PALETTE } from '../game/config.js';
import { LEVEL } from '../game/level-data.js';
import { SOLID } from '../game/solid.js';

const TILE = 16;
const ATLAS = 16; // tiles per row; tile ids 8..12 live in the first row
// Distance from the Mario rig origin down to the shoe soles, in model units.
const MARIO_SOLE_Y = 1.3;
const LEG_HIP_Y = 0.55;
const SHOULDER_Y = 1.05;

// ---------- procedural 16px texture atlas ----------

function makeAtlas() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = ATLAS * TILE;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  const tile = (ix, iy, draw) => {
    g.save();
    g.translate(ix * TILE, iy * TILE);
    draw(g);
    g.restore();
  };
  const px = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };

  // 0 grass top
  tile(0, 0, (g) => {
    g.fillStyle = '#5cc246'; g.fillRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (((x * 7 + y * 13) % 17) === 0) px(g, x, y, '#4ca63a');
      if (((x * 11 + y * 5) % 23) === 0) px(g, x, y, '#79d95c');
    }
  });
  // 1 soil
  tile(1, 0, (g) => {
    g.fillStyle = '#9a6b3f'; g.fillRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (((x * 13 + y * 7) % 29) === 0) px(g, x, y, '#7c5430');
      if (((x * 5 + y * 11) % 31) === 0) px(g, x, y, '#b5824f');
    }
  });
  // 2 soil dark (pipe base)
  tile(2, 0, (g) => {
    g.fillStyle = '#7c5430'; g.fillRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (((x * 7 + y * 9) % 19) === 0) px(g, x, y, '#5d3d22');
    }
  });
  // 3 brick
  tile(3, 0, (g) => {
    g.fillStyle = '#b57a44'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#8a5a2e';
    for (let y = 1; y < 16; y += 5) g.fillRect(0, y, 16, 1);
    g.fillStyle = '#d09a5a';
    for (let x = 4; x < 16; x += 8) g.fillRect(x, 0, 1, 4);
    for (let x = 0; x < 16; x += 8) g.fillRect(x, 5, 1, 4);
    for (let x = 4; x < 16; x += 8) g.fillRect(x, 10, 1, 5);
  });
  // 4 question (gold with ?)
  tile(4, 0, (g) => {
    g.fillStyle = '#ffc93c'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#c98b1d';
    g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1);
    g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
    g.fillStyle = '#8a5f12';
    g.fillRect(7, 3, 2, 6); g.fillRect(10, 3, 1, 1); g.fillRect(10, 7, 1, 1);
    g.fillRect(5, 3, 1, 1);
    g.fillRect(6, 10, 4, 1); g.fillRect(7, 11, 2, 1);
  });
  // 5 used
  tile(5, 0, (g) => {
    g.fillStyle = '#9c7a4a'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#7a5d36';
    g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1);
    g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
    g.fillStyle = '#6b4f2b'; g.fillRect(6, 6, 4, 4);
  });
  // 6 pipe body
  tile(6, 0, (g) => {
    g.fillStyle = '#3f9b3a'; g.fillRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y++) {
      px(g, 1, y, '#2f7a2c'); px(g, 2, y, '#2f7a2c');
      px(g, 13, y, '#5fce57'); px(g, 14, y, '#5fce57');
    }
    for (let y = 3; y < 16; y += 6) {
      g.fillStyle = '#2f7a2c';
      g.fillRect(0, y, 16, 1);
    }
  });
  // 7 pipe rim
  tile(7, 0, (g) => {
    g.fillStyle = '#4faf4a'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#2f7a2c';
    g.fillRect(0, 0, 16, 2); g.fillRect(0, 14, 16, 2);
    g.fillRect(0, 0, 2, 16); g.fillRect(14, 0, 2, 16);
    g.fillStyle = '#7ae06e'; g.fillRect(2, 2, 12, 12);
    g.fillStyle = '#4faf4a'; g.fillRect(3, 3, 10, 10);
  });
  // 8 stone stair
  tile(8, 0, (g) => {
    g.fillStyle = '#b8b2a6'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#8f887b';
    for (let y = 4; y < 16; y += 6) g.fillRect(0, y, 16, 1);
    g.fillStyle = '#a29b8e';
    g.fillRect(3, 0, 1, 4); g.fillRect(10, 5, 1, 5); g.fillRect(6, 10, 1, 6);
  });
  // 9 castle wall
  tile(9, 0, (g) => {
    g.fillStyle = '#d9d4c8'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#b3ad9f';
    g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1);
    g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
    g.fillStyle = '#c4beae'; g.fillRect(3, 3, 4, 4); g.fillRect(10, 9, 4, 4);
  });
  // 10 leaf
  tile(10, 0, (g) => {
    g.fillStyle = '#4fae3e'; g.fillRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (((x * 3 + y * 7) % 13) === 0) px(g, x, y, '#3c8a2e');
      if (((x * 5 + y * 3) % 19) === 0) px(g, x, y, '#66cc50');
    }
  });
  // 11 trunk
  tile(11, 0, (g) => {
    g.fillStyle = '#6b4326'; g.fillRect(0, 0, 16, 16);
    for (let x = 3; x < 16; x += 4) {
      g.fillStyle = '#53331c'; g.fillRect(x, 0, 1, 16);
      g.fillStyle = '#83562f'; g.fillRect(x + 2, 0, 1, 16);
    }
  });
  // 12 flag
  tile(12, 0, (g) => {
    g.fillStyle = '#4faf4a'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#fff6d9'; g.fillRect(6, 6, 4, 4); g.fillRect(4, 4, 2, 2); g.fillRect(10, 4, 2, 2); g.fillRect(4, 10, 2, 2); g.fillRect(10, 10, 2, 2);
  });

  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- voxel geometry builder ----------

function tileUV(tile, out, k) {
  const ix = tile % ATLAS;
  const iy = Math.floor(tile / ATLAS);
  const u0 = ix / ATLAS, v0 = 1 - (iy + 1) / ATLAS;
  const u1 = (ix + 1) / ATLAS, v1 = 1 - iy / ATLAS;
  const u = [u0, u1, u1, u0];
  const v = [v0, v0, v1, v1];
  for (let i = 0; i < 4; i++) { out[2 * (k + i)] = u[i]; out[2 * (k + i) + 1] = v[i]; }
}

export function buildVoxelGeometry(cubes, atlas) {
  const positions = [];
  const uvs = [];
  const normals = [];
  const indices = [];
  const pk = [];
  let vcount = 0;
  const addFace = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, n, tile) => {
    const p = [ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz];
    for (let i = 0; i < 12; i++) positions.push(p[i]);
    tileUV(tile, uvs, uvs.length / 2);
    for (let i = 0; i < 4; i++) normals.push(n[0], n[1], n[2]);
    // Front faces must point along the declared normal, or the GPU culls them (holes in the ground).
    const e1 = [bx - ax, by - ay, bz - az], e2 = [cx - ax, cy - ay, cz - az];
    const cross = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const flip = cross[0] * n[0] + cross[1] * n[1] + cross[2] * n[2] < 0;
    const base = vcount;
    if (flip) indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
    else indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    vcount += 4;
  };
  const addBox = (x, y, z, sx, sy, sz, tTop, tSide, tBottom) => {
    const x0 = x - sx / 2, x1 = x + sx / 2;
    const y0 = y - sy / 2, y1 = y + sy / 2;
    const z0 = z - sz / 2, z1 = z + sz / 2;
    // top
    addFace(x0, y1, z0, x1, y1, z0, x1, y1, z1, x0, y1, z1, [0, 1, 0], tTop);
    // bottom
    addFace(x0, y0, z1, x1, y0, z1, x1, y0, z0, x0, y0, z0, [0, -1, 0], tBottom);
    // +z
    addFace(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1, [0, 0, 1], tSide);
    // -z
    addFace(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0, [0, 0, -1], tSide);
    // +x
    addFace(x1, y0, z0, x1, y0, z1, x1, y1, z1, x1, y1, z0, [1, 0, 0], tSide);
    // -x
    addFace(x0, y0, z1, x0, y0, z0, x0, y1, z0, x0, y1, z1, [-1, 0, 0], tSide);
  };
  for (const c of cubes) {
    addBox(c.x, c.y, c.z, c.sx || 1, c.sy || 1, c.sz || 1, c.top ?? c.side ?? 3, c.side ?? 3, c.bottom ?? c.side ?? 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  return geo;
}

function mat(texture) {
  return new THREE.MeshLambertMaterial({ map: texture });
}

// ---------- Renderer ----------

export class Renderer {
  constructor(canvas) {
    this.clock = new THREE.Clock();
    this.time = 0;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.sky);
    this.scene.fog = new THREE.Fog(PALETTE.sky, 38, 95);

    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 300);
    this.camera.position.set(0, 4, 15);
    this.camera.lookAt(0, 2, 0);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x6f8f7a, 0.85);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff3d6, 1.1);
    this.sun.position.set(12, 22, 12);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -22; this.sun.shadow.camera.right = 22;
    this.sun.shadow.camera.top = 18; this.sun.shadow.camera.bottom = -10;
    this.sun.shadow.camera.near = 1; this.sun.shadow.camera.far = 60;
    this.scene.add(this.sun);

    this.atlas = makeAtlas();
    this.surfaceGroup = new THREE.Group();
    this.cellarGroup = new THREE.Group();
    this.scene.add(this.surfaceGroup, this.cellarGroup);

    this.blockGroup = new THREE.Group();
    this.scene.add(this.blockGroup);
    this._blockSig = '';
    this.cellarLights = [];

    this.buildSurface();
    this.buildCellar();

    this.player = this.buildMario();
    this.player.group.castShadow = true;
    this.scene.add(this.player.group);
    this.player.group.visible = false;

    this.enemyMeshes = new Map();   // enemy object -> mesh group
    this.coinMeshes = new Map();    // coin id -> mesh
    this.itemMeshes = [];
    this.fireballMeshes = [];
    this.particles = [];
    this.fireworkMesh = this.buildFireworkStick();

    this._lastArea = null; // force the first sync to apply area visibility
    this._lastPower = 'small';
    this._starPhase = 0;
  }

  // ---------- world construction ----------

  buildSurface() {
    const g = this.surfaceGroup;
    const cubes = [];

    // terrain
    for (const gr of LEVEL.ground) {
      for (let x = gr.x0; x < gr.x1; x++) {
        for (let y = -8; y < 0; y++) {
          cubes.push({ x: x + 0.5, y: y + 0.5, z: 0, top: 0, side: 1, bottom: 1 });
        }
      }
    }
    for (const c of LEVEL.solidCells) {
      cubes.push({ x: c.x + 0.5, y: c.y + 0.5, z: 0, top: 8, side: 8, bottom: 8 });
    }
    for (const p of LEVEL.pipes) {
      for (let y = -2; y < Math.ceil(p.h); y++) {
        const top = y === Math.ceil(p.h) - 1;
        cubes.push({
          x: p.x + 0.5, y: y + 0.5, z: 0, top: top ? 7 : 6, side: 6, bottom: 6,
          sx: 1, sy: 1, sz: 1,
        });
        cubes.push({
          x: p.x + 1.5, y: y + 0.5, z: 0, top: top ? 7 : 6, side: 6, bottom: 6,
          sx: 1, sy: 1, sz: 1,
        });
      }
    }
    this.groundGeo = buildVoxelGeometry(cubes, this.atlas);
    const mesh = new THREE.Mesh(this.groundGeo, mat(this.atlas));
    mesh.receiveShadow = true;
    g.add(mesh);

    // castle + flag
    this.castle = this.buildCastle();
    g.add(this.castle);
    this.flag = this.buildFlag();
    g.add(this.flag);

    // decorations (deterministic)
    g.add(this.buildScenery());
  }

  buildCellar() {
    const g = this.cellarGroup;
    const c = LEVEL.cellar;
    const cubes = [];
    for (let x = c.ground[0].x0; x < c.ground[0].x1; x++) {
      for (let y = -8; y < 0; y++) cubes.push({ x: x + 0.5, y: y + 0.5, z: 0, top: 1, side: 1, bottom: 1 });
      for (let y = c.ceilingY; y < c.ceilingY + 1; y++) cubes.push({ x: x + 0.5, y: y + 0.5, z: 0, top: 3, side: 3, bottom: 3 });
    }
    // side walls only: the room interior must stay open (sim has walls at these two columns)
    for (const wx of [c.leftWallX, c.rightWallX]) {
      for (let y = 0; y < c.ceilingY; y++) {
        cubes.push({ x: wx + 0.5, y: y + 0.5, z: 0, top: 3, side: 3, bottom: 3 });
      }
    }
    for (const p of [c.entryPipe, c.exitPipe]) {
      for (let y = 0; y < Math.ceil(p.h); y++) {
        cubes.push({ x: p.x + 0.5, y: y + 0.5, z: 0, top: y === Math.ceil(p.h) - 1 ? 7 : 6, side: 6, bottom: 6 });
        cubes.push({ x: p.x + 1.5, y: y + 0.5, z: 0, top: y === Math.ceil(p.h) - 1 ? 7 : 6, side: 6, bottom: 6 });
      }
    }
    const mesh = new THREE.Mesh(buildVoxelGeometry(cubes, this.atlas), mat(this.atlas));
    mesh.receiveShadow = true;
    g.add(mesh);

    // colder, dimmer cellar lighting
    const light = new THREE.PointLight(0xffe9b0, 1.2, 20);
    light.position.set(14, 5, 4);
    g.add(light);
    const light2 = new THREE.PointLight(0xffe9b0, 1.2, 20);
    light2.position.set(28, 5, 4);
    g.add(light2);
    this.cellarLights.push(light, light2);
  }

  buildFlag() {
    const grp = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 11, 0.16),
      new THREE.MeshLambertMaterial({ color: 0x8a8a88 })
    );
    pole.position.y = 5.5;
    pole.castShadow = true;
    grp.add(pole);
    const ball = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshLambertMaterial({ color: 0xd8372c }));
    ball.position.y = 11.1;
    grp.add(ball);
    this.flagCloth = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.95, 0.12),
      new THREE.MeshLambertMaterial({ color: 0x4faf4a })
    );
    this.flagCloth.position.x = -0.75;
    this.flagCloth.position.y = 9.4;
    grp.add(this.flagCloth);
    // star cube on cloth
    const star = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.14), new THREE.MeshLambertMaterial({ color: 0xfff6d9 }));
    star.position.set(-0.75, 9.4, 0.09);
    grp.add(star);
    grp.position.x = LEVEL.flagX + 0.5;
    return grp;
  }

  buildCastle() {
    const g = new THREE.Group();
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xd9d4c8 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x241a12 });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x6b4f2b });

    const base = new THREE.Mesh(new THREE.BoxGeometry(4, 7, 3.2), wallMat);
    base.position.set(LEVEL.castleX + 1.5, 3.5, -0.4);
    base.castShadow = true;
    g.add(base);

    // battlements
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.55), wallMat);
      b.position.set(LEVEL.castleX + 0.25 + i * 0.75, 7.3, -0.4);
      g.add(b);
    }
    // door
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.3), darkMat);
    door.position.set(LEVEL.castleX + 1.5, 1.1, -0.1);
    g.add(door);
    // window
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.3), darkMat);
    win.position.set(LEVEL.castleX + 0.6, 4.6, -0.1);
    g.add(win);
    const win2 = win.clone();
    win2.position.x = LEVEL.castleX + 2.4;
    g.add(win2);
    // roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 1.4), roofMat);
    roof.position.set(LEVEL.castleX + 1.5, 8.2, -0.4);
    g.add(roof);
    const topFlag = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.1), new THREE.MeshLambertMaterial({ color: 0x4faf4a }));
    topFlag.position.set(LEVEL.castleX + 1.2, 9.1, -0.4);
    g.add(topFlag);
    return g;
  }

  buildScenery() {
    const g = new THREE.Group();
    const hillMatFar = new THREE.MeshLambertMaterial({ color: 0xbfe3cf });
    const hillMatNear = new THREE.MeshLambertMaterial({ color: 0x8fd0b5 });
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4326 });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x4fae3e });
    const bushMat = new THREE.MeshLambertMaterial({ color: 0x56aa45 });
    const flowerMat = new THREE.MeshLambertMaterial({ color: 0xffe14a });

    const addHill = (x, y, z, s, m) => {
      const h = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.6, 6), m);
      h.position.set(x, y, z);
      h.scale.z = 1;
      g.add(h);
      const h2 = new THREE.Mesh(new THREE.BoxGeometry(s * 0.7, s * 0.45, 6), m);
      h2.position.set(x + s * 0.35, y + s * 0.3, z);
      g.add(h2);
    };
    const addCloud = (x, y, z, s) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.35, 2), cloudMat);
      c.position.set(x, y, z);
      g.add(c);
      const c2 = new THREE.Mesh(new THREE.BoxGeometry(s * 0.55, s * 0.28, 2), cloudMat);
      c2.position.set(x - s * 0.28, y + s * 0.22, z);
      g.add(c2);
      const c3 = new THREE.Mesh(new THREE.BoxGeometry(s * 0.5, s * 0.28, 2), cloudMat);
      c3.position.set(x + s * 0.3, y + s * 0.2, z);
      g.add(c3);
    };
    const addTree = (x, z, h) => {
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, 0.4), trunkMat);
      trunk.position.set(x, h / 2, z);
      g.add(trunk);
      const crown = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 2), leafMat);
      crown.position.set(x, h + 0.5, z);
      g.add(crown);
      const crown2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.4), leafMat);
      crown2.position.set(x, h + 1.5, z);
      g.add(crown2);
    };
    const addBush = (x, z) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.9), bushMat);
      b.position.set(x, 0.4, z);
      g.add(b);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.7), bushMat);
      b2.position.set(x + 0.5, 0.7, z);
      g.add(b2);
    };
    const addFlower = (x, z) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), trunkMat);
      s.position.set(x, 0.3, z);
      g.add(s);
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), flowerMat);
      f.position.set(x, 0.7, z);
      g.add(f);
    };

    // distant hills (parallax via z depth, animated offset)
    for (let x = -70; x < 160; x += 26) addHill(x, 1.2, -30, 16, hillMatFar);
    for (let x = -64; x < 160; x += 34) addHill(x + 12, 1.0, -22, 13, hillMatNear);
    // clouds
    for (let x = -90; x < 190; x += 30) addCloud(x, 12 + (x % 5), -34, 5);
    for (let x = -80; x < 200; x += 38) addCloud(x + 8, 9 + (x % 4), -28, 4);
    // trees behind lane
    for (let x = -56; x < 150; x += 15) { if (x > -10 && x < 34) continue; addTree(x, -8, 4.6 + (x % 3) * 0.8); }
    // bushes + flowers nearer
    for (let x = -58; x < 150; x += 9) { if (x > 3 && x < 10) continue; addBush(x, -4.4); }
    for (let x = -55; x < 150; x += 13) { if (x > 36 && x < 44) continue; addFlower(x, -4.8); }

    this.scenery = g;
    return g;
  }

  buildFireworkStick() {
    const g = new THREE.Group();
    const m = new THREE.MeshLambertMaterial({ color: 0xffffff });
    for (let i = 0; i < 24; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), m);
      p.visible = false;
      g.add(p);
      g.userData.particles = g.userData.particles || [];
      g.userData.particles.push(p);
    }
    return g;
  }

  // ---------- Mario ----------

  buildMario() {
    const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
    const box = (w, h, d, color, x = 0, y = 0, z = 0, cast = true) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
      m.position.set(x, y, z);
      m.castShadow = cast;
      return m;
    };
    const R = 0xd8372c, B = 0x2a4bd7, P = 0xffcf9f, BR = 0x6b3f1f, W = 0xf5f0e6, K = 0x1c1c1c, G = 0xffd83d;

    const root = new THREE.Group();
    const head = new THREE.Group();
    const cap = box(0.64, 0.4, 0.56, R, 0, 0.2, 0);
    const brim = box(0.82, 0.08, 0.5, R, 0, 0.06, 0.1);
    head.add(cap, brim);
    // M mark on cap
    const mk = (x, y) => box(0.09, 0.09, 0.05, W, x, y, 0.31);
    head.add(mk(-0.16, 0.2), mk(-0.16, 0.3), mk(-0.04, 0.2), mk(-0.04, 0.3), mk(0.08, 0.2), mk(0.08, 0.3), mk(0.2, 0.2), mk(0.2, 0.3));
    const face = box(0.5, 0.4, 0.16, P, 0, -0.06, 0.3);
    const eyeL = box(0.1, 0.12, 0.06, K, -0.14, 0.02, 0.41);
    const eyeR = box(0.1, 0.12, 0.06, K, 0.14, 0.02, 0.41);
    const browL = box(0.12, 0.05, 0.05, BR, -0.14, 0.1, 0.4);
    const browR = box(0.12, 0.05, 0.05, BR, 0.14, 0.1, 0.4);
    const nose = box(0.18, 0.14, 0.16, P, 0, -0.08, 0.46);
    const mo = box(0.3, 0.08, 0.08, BR, 0, -0.16, 0.44);
    const sideL = box(0.08, 0.2, 0.1, BR, -0.3, -0.08, 0.18);
    const sideR = box(0.08, 0.2, 0.1, BR, 0.3, -0.08, 0.18);
    head.add(face, eyeL, eyeR, browL, browR, nose, mo, sideL, sideR);

    const torso = new THREE.Group();
    const shirt = box(0.68, 0.62, 0.42, R, 0, 0, 0);
    const overall = box(0.6, 0.34, 0.26, B, 0, -0.16, 0.12);
    const strapL = box(0.1, 0.42, 0.06, B, -0.18, 0.08, 0.16);
    const strapR = box(0.1, 0.42, 0.06, B, 0.18, 0.08, 0.16);
    const btnL = box(0.09, 0.09, 0.05, G, -0.18, -0.06, 0.28);
    const btnR = box(0.09, 0.09, 0.05, G, 0.18, -0.06, 0.28);
    torso.add(shirt, overall, strapL, strapR, btnL, btnR);

    // limbs with pivot groups
    const armL = new THREE.Group();
    const armR = new THREE.Group();
    const armSegL = box(0.17, 0.42, 0.2, R, 0, -0.2, 0);
    const armSegR = box(0.17, 0.42, 0.2, R, 0, -0.2, 0);
    const gloveL = box(0.2, 0.18, 0.22, W, 0, -0.42, 0);
    const gloveR = box(0.2, 0.18, 0.22, W, 0, -0.42, 0);
    armL.add(armSegL, gloveL); armL.position.set(-0.4, SHOULDER_Y, 0);
    armR.add(armSegR, gloveR); armR.position.set(0.4, SHOULDER_Y, 0);

    const legL = new THREE.Group();
    const legR = new THREE.Group();
    // hips sit under the torso (LEG_HIP_Y); each leg reaches the soles at -MARIO_SOLE_Y
    const legSegL = box(0.22, 1.65, 0.24, B, 0, -0.825, 0);
    const legSegR = box(0.22, 1.65, 0.24, B, 0, -0.825, 0);
    const shoeL = box(0.3, 0.2, 0.42, BR, 0.04, -1.75, 0.02);
    const shoeR = box(0.3, 0.2, 0.42, BR, 0.04, -1.75, 0.02);
    legL.add(legSegL, shoeL); legL.position.set(-0.17, LEG_HIP_Y, 0);
    legR.add(legSegR, shoeR); legR.position.set(0.17, LEG_HIP_Y, 0);

    root.add(head, torso, armL, armR, legL, legR);
    head.position.y = 1.42;
    torso.position.y = 0.9;
    root.scale.setScalar(0.64); // small default; scaled to power

    return {
      group: root,
      parts: { head, torso, armL, armR, legL, legR, cap, brim, shirt, overall, shoeL, shoeR, gloveL, gloveR },
    };
  }

  // ---------- enemies ----------

  buildGoomba() {
    const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
    const root = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.8), mat(0xa5552e));
    dome.position.y = 0.45;
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.34, 0.16), mat(0xe6b98a));
    face.position.set(0, 0.28, 0.42);
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.1), mat(0x1c1c1c));
    eyeL.position.set(-0.2, 0.36, 0.52);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.2;
    const browL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.08), mat(0x1c1c1c));
    browL.position.set(-0.2, 0.5, 0.5);
    const browR = browL.clone(); browR.position.x = 0.2;
    const footL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.5), mat(0x3c2a1a));
    footL.position.set(-0.2, 0.1, 0);
    const footR = footL.clone(); footR.position.x = 0.2;
    root.add(dome, face, eyeL, eyeR, browL, browR, footL, footR);
    return root;
  }

  buildKoopa(red = false) {
    const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
    const shellColor = red ? 0xd0453a : 0x4fae4a;
    const root = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.8), mat(shellColor));
    shell.position.y = 0.75;
    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 0.85), mat(0xe6c36a));
    rim.position.y = 0.42;
    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.8), mat(0xe6c36a));
    belly.position.y = 0.25;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.3, 0.4), mat(0xe6c36a));
    head.position.set(0.45, 1.02, 0);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.06), mat(0x1c1c1c));
    eye.position.set(0.6, 1.08, 0.12);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.3), mat(0xe6c36a));
    legL.position.set(-0.2, 0.16, 0);
    const legR = legL.clone(); legR.position.x = 0.2;
    root.add(shell, rim, belly, head, eye, legL, legR);
    root.userData.parts = { shell, rim, belly, head, eye, legL, legR };
    return root;
  }

  // ---------- items ----------

  buildMushroom(green = false) {
    const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
    const capColor = green ? 0x4fae4a : 0xd8372c;
    const root = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.4, 0.44), mat(0xe6c36a));
    stem.position.y = 0.2;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.35, 0.85), mat(capColor));
    cap.position.y = 0.55;
    for (let i = 0; i < 5; i++) {
      const dot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.14), mat(0xffffff));
      dot.position.set(-0.25 + (i % 3) * 0.25, 0.72, -0.2 + Math.floor(i / 3) * 0.4);
      root.add(dot);
    }
    root.add(stem, cap);
    return root;
  }

  buildFlower() {
    const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
    const root = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.14), mat(0x2f7a2c));
    stem.position.y = 0.25;
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), mat(0xffe14a));
    core.position.y = 0.6;
    const petal = (x, z, rot) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.2), mat(0xd8372c));
      p.position.set(x, 0.66, z);
      p.rotation.y = rot;
      root.add(p);
    };
    petal(0.3, 0, 0); petal(-0.3, 0, 0); petal(0, 0, 0.3); petal(0, 0, -0.3);
    root.add(stem, core);
    return root;
  }

  buildStar() {
    const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
    const root = new THREE.Group();
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.34, 0.3), mat(0xffe14a));
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.9, 0.3), mat(0xffe14a));
    root.add(c1, c2);
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.06), mat(0x1c1c1c));
    eyeL.position.set(-0.14, 0.1, 0.17);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.14;
    root.add(eyeL, eyeR);
    return root;
  }

  buildCoin() {
    const geo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 8);
    const m = new THREE.MeshLambertMaterial({ color: 0xffd83d, emissive: 0x9a6a00 });
    return new THREE.Mesh(geo, m);
  }

  rebuildBlocks(blocks) {
    const cubes = [];
    for (const b of blocks) {
      if (b.state === 'broken' || b.state === 'hidden') continue;
      let top = 3, side = 3, bottom = 3;
      if (b.kind === 'q' && b.state === 'fresh') { top = 4; side = 4; bottom = 4; }
      else if (b.state === 'used') { top = 5; side = 5; bottom = 5; }
      else if (b.kind === 'coinbrick' && b.state === 'fresh') { top = 3; side = 3; bottom = 3; }
      cubes.push({ x: b.x + 0.5, y: b.y + 0.5, z: 0, top, side, bottom });
    }
    // clear old
    while (this.blockGroup.children.length) {
      const c = this.blockGroup.children.pop();
      c.geometry.dispose();
      this.blockGroup.remove(c);
    }
    if (!cubes.length) return;
    const mesh = new THREE.Mesh(buildVoxelGeometry(cubes, this.atlas), mat(this.atlas));
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.blockGroup.add(mesh);
  }

  // ---------- per-frame sync ----------

  sync(st, events) {
    const dt = Math.min(0.05, this.clock.getDelta());
    this.time += dt;

    // dynamic blocks (question/used/brick/coinbrick)
    const blockSig = st.blocks.map(b => b.x + ',' + b.y + ':' + b.kind + ':' + b.state).join('|');
    if (blockSig !== this._blockSig) {
      this._blockSig = blockSig;
      this.rebuildBlocks(st.blocks);
    }

    // area switch
    if (st.area !== this._lastArea) {
      this._lastArea = st.area;
      this.surfaceGroup.visible = st.area === 'surface';
      this.cellarGroup.visible = st.area === 'cellar';
      this.scene.background = new THREE.Color(st.area === 'cellar' ? 0x2a2238 : PALETTE.sky);
      this.scene.fog.color.copy(this.scene.background);
      this.sun.intensity = st.area === 'cellar' ? 0.9 : 1.1;
      this.hemi.intensity = st.area === 'cellar' ? 0.9 : 0.85;
    }

    this.syncPlayer(st);
    this.syncEnemies(st);
    this.syncCoins(st);
    this.syncItems(st);
    this.syncFireballs(st);
    this.syncFlag(st);
    this.processEvents(events, st);
    this.updateParticles(dt);
    this.updateCamera(st, dt);
    this.updateScenery(dt);
  }

  syncPlayer(st) {
    const p = st.player;
    const P = this.player;
    if (st.state === 'title') { P.group.visible = false; return; }
    P.group.visible = p.hidden ? false : true;
    // Model units: shoe soles sit ~1.3 below the rig origin, so lift the rig to put feet on p.y.
    const h = p.power === 'small' ? 1.6 : 2.5;
    const k = h / 2.5;
    P.group.scale.set(p.facing * k, k, k);
    P.group.position.set(p.x, p.y + MARIO_SOLE_Y * k, 0);

    const parts = P.parts;
    const run = Math.abs(p.vx);
    const phase = this.time * (run > 7 ? 13 : 7);
    const airborne = !p.onGround;
    const duck = p.duck;

    if (duck) {
      parts.torso.scale.y = 0.55;
      parts.torso.position.y = 0.45;
      parts.legL.rotation.x = 0.6; parts.legR.rotation.x = -0.6;
      parts.armL.rotation.x = 0.4; parts.armR.rotation.x = -0.4;
    } else if (airborne) {
      parts.torso.scale.y = 1; parts.torso.position.y = 0.9;
      parts.legL.rotation.x = 0.7; parts.legR.rotation.x = -0.4;
      parts.armL.rotation.x = -0.8; parts.armR.rotation.x = -1.6;
      parts.legL.position.y = LEG_HIP_Y; parts.legR.position.y = LEG_HIP_Y;
    } else if (run > 0.3) {
      parts.torso.scale.y = 1; parts.torso.position.y = 0.9;
      parts.legL.position.y = LEG_HIP_Y; parts.legR.position.y = LEG_HIP_Y;
      const swing = Math.sin(phase) * 0.8;
      parts.legL.rotation.x = swing; parts.legR.rotation.x = -swing;
      parts.armL.rotation.x = -swing * 0.7; parts.armR.rotation.x = swing * 0.7;
    } else {
      parts.torso.scale.y = 1; parts.torso.position.y = 0.9;
      parts.legL.position.y = LEG_HIP_Y; parts.legR.position.y = LEG_HIP_Y;
      parts.legL.rotation.x = 0; parts.legR.rotation.x = 0;
      parts.armL.rotation.x = 0; parts.armR.rotation.x = 0;
      const breathe = Math.sin(this.time * 3) * 0.03;
      parts.head.position.y = 1.42 + breathe;
    }
    if (p.skid) {
      parts.torso.rotation.z = 0.15;
      if (Math.random() < 0.2) this.spawnDust(p.x - p.facing * 0.4, p.y + 0.1);
    } else parts.torso.rotation.z = 0;

    // power outfit
    if (st.power !== this._lastPower || st.power === 'fire') {
      this._lastPower = st.power;
      const fire = st.power === 'fire';
      parts.shirt.material.color.set(fire ? 0xf5f0e6 : PALETTE.marioRed);
      parts.cap.material.color.set(PALETTE.marioRed);
      parts.brim.material.color.set(PALETTE.marioRed);
      parts.gloveL.material.color.set(PALETTE.marioWhite);
      parts.gloveR.material.color.set(PALETTE.marioWhite);
    }

    // invincibility / damage blink
    const blink = st.star > 0 ? (Math.floor(this.time * 10) % 2 === 0) : (st.invuln > 0 && Math.floor(this.time * 12) % 2 === 0);
    P.group.visible = p.hidden ? false : (!blink);
    if (st.star > 0) {
      const hue = (this.time * 4) % 1;
      const c = new THREE.Color().setHSL(hue, 0.85, 0.55);
      parts.shirt.material.color.copy(c);
      parts.cap.material.color.copy(c);
      parts.overall.material.color.copy(c);
      parts.shoeL.material.color.copy(c);
      parts.shoeR.material.color.copy(c);
    } else {
      parts.overall.material.color.set(PALETTE.marioBlue);
      parts.shoeL.material.color.set(PALETTE.marioBrown);
      parts.shoeR.material.color.set(PALETTE.marioBrown);
      if (st.power === 'fire') parts.shirt.material.color.set(0xf5f0e6);
    }
  }

  syncEnemies(st) {
    const seen = new Set();
    for (const e of st.enemies) {
      seen.add(e.id);
      let m = this.enemyMeshes.get(e.id);
      if (!m) {
        m = e.kind === 'goomba' ? this.buildGoomba() : this.buildKoopa(e.kind === 'koopa-red');
        m.traverse(o => { if (o.isMesh) o.castShadow = true; });
        this.scene.add(m);
        this.enemyMeshes.set(e.id, m);
      }
      if (!e.active) { m.visible = false; continue; }
      m.visible = true;
      m.position.set(e.x, e.y, 0);
      const parts = m.userData.parts;
      if (e.kind === 'goomba') {
        if (e.state === 'dead') {
          m.scale.set(1.35, 0.35, 0.9);
        } else {
          m.scale.set(1, 1, 1);
        }
      } else if (e.state === 'shell' || e.state === 'sliding') {
        m.scale.y = 0.55;
        parts.legL.visible = false; parts.legR.visible = false;
        parts.head.visible = false; parts.eye.visible = false;
        if (e.state === 'sliding') m.rotation.z = 0.4;
        else {
          m.rotation.z = 0;
          // wake warning blink
          const warn = e.wakeT > 0 && e.wakeT < 1.2;
          m.visible = !(warn && Math.floor(this.time * 8) % 2 === 0);
        }
      } else {
        m.scale.y = 1;
        m.rotation.z = 0;
        if (parts) {
          parts.legL.visible = true; parts.legR.visible = true;
          parts.head.visible = true; parts.eye.visible = true;
          const ph = this.time * 6;
          parts.legL.position.x = -0.2 + Math.sin(ph) * 0.08;
          parts.legR.position.x = 0.2 - Math.sin(ph) * 0.08;
        }
      }
    }
    for (const [id, m] of this.enemyMeshes) {
      if (!seen.has(id)) {
        this.scene.remove(m);
        m.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
        this.enemyMeshes.delete(id);
      }
    }
  }

  syncCoins(st) {
    const current = new Set();
    for (const c of st.collectibles) {
      current.add(c.id);
      let mesh = this.coinMeshes.get(c.id);
      if (!mesh) {
        mesh = this.buildCoin();
        this.scene.add(mesh);
        this.coinMeshes.set(c.id, mesh);
      }
      mesh.position.set(c.x, c.y, 0);
      mesh.rotation.y = this.time * 4 + c.x;
      mesh.visible = !c.taken && st.area === (c.id.startsWith('cellar') ? 'cellar' : 'surface');
    }
    for (const [id, mesh] of this.coinMeshes) {
      if (!current.has(id)) {
        this.scene.remove(mesh);
        this.coinMeshes.delete(id);
      }
    }
  }

  syncItems(st) {
    while (this.itemMeshes.length < st.items.length) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      this.scene.add(mesh);
      this.itemMeshes.push(mesh);
    }
    st.items.forEach((it, i) => {
      const mesh = this.itemMeshes[i];
      let kind = mesh.userData.kind;
      if (kind !== it.type) {
        if (mesh.userData.group) { this.scene.remove(mesh.userData.group); mesh.userData.group = null; }
        let inner = null;
        if (it.type === 'mushroom') inner = this.buildMushroom(false);
        else if (it.type === '1up') inner = this.buildMushroom(true);
        else if (it.type === 'flower') inner = this.buildFlower();
        else if (it.type === 'star') inner = this.buildStar();
        if (inner) {
          mesh.userData.group = inner;
          this.scene.add(inner);
        }
        mesh.userData.kind = it.type;
      }
      const grp = mesh.userData.group;
      if (grp) {
        grp.position.set(it.x, it.y, 0);
        if (it.type === 'star') grp.rotation.y = this.time * 5;
        if (it.type === 'flower') grp.rotation.y = this.time * 2;
      }
      mesh.visible = false;
    });
    while (this.itemMeshes.length > st.items.length) {
      const mesh = this.itemMeshes.pop();
      if (mesh.userData.group) this.scene.remove(mesh.userData.group);
      this.scene.remove(mesh);
    }
  }

  syncFireballs(st) {
    while (this.fireballMeshes.length < st.fireballs) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), new THREE.MeshLambertMaterial({ color: 0xff8c1a, emissive: 0xcc5500 }));
      this.scene.add(m);
      this.fireballMeshes.push(m);
    }
    let idx = 0;
    for (const f of st.fireballs) {
      const m = this.fireballMeshes[idx++];
      m.position.set(f.x, f.y, 0);
      m.rotation.x = this.time * 12;
      m.rotation.z = this.time * 12;
    }
    while (this.fireballMeshes.length > st.fireballs) {
      const m = this.fireballMeshes.pop();
      this.scene.remove(m);
    }
  }

  syncFlag(st) {
    const f = st.finish;
    if (f && f.phase === 'slide') {
      this.flagCloth.position.y = Math.max(0.4, 9.4 - f.t * 22);
    } else {
      this.flagCloth.position.y = 9.4;
    }
    this.flag.visible = st.area === 'surface';
    this.castle.visible = st.area === 'surface';
  }

  // ---------- events → fx ----------

  processEvents(events, st) {
    for (const ev of events) {
      switch (ev.t) {
        case 'break':
          for (let i = 0; i < 6; i++) this.spawnBreak(ev.d.x, ev.d.y);
          break;
        case 'throw':
          this.spawnDust(ev.d.x, ev.d.y, 4);
          break;
        case 'firework':
          this.spawnFirework(ev.d.x, ev.d.y);
          break;
        case 'bump':
          this.spawnDust(ev.d.x, ev.d.y - 0.4, 4);
          break;
        default: break;
      }
    }
  }

  // ---------- particles ----------

  spawnDust(x, y, n = 3) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshLambertMaterial({ color: 0xcfc4b4 }));
      this.particles.push({ mesh: m, vx: (Math.random() - 0.5) * 2.4, vy: 1.6 + Math.random() * 1.6, life: 0.45, t: 0, gravity: -8 });
      m.position.set(x + (Math.random() - 0.5) * 0.4, y, 0);
      this.scene.add(m);
    }
  }

  spawnBreak(x, y) {
    const colors = [0x9a6b3f, 0x8a5a2e, 0xb57a44, 0x6b4f2b];
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)] }));
    this.particles.push({ mesh: m, vx: (Math.random() - 0.5) * 4, vy: 3 + Math.random() * 5, life: 0.9, t: 0, gravity: -22 });
    m.position.set(x, y, 0);
    this.scene.add(m);
  }

  spawnFirework(x, y) {
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const sp = 4 + Math.random() * 3;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.9, 0.6) }));
      this.particles.push({ mesh: m, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.1, t: 0, gravity: -2, twinkle: true });
      m.position.set(x, y, 0);
      this.scene.add(m);
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.t += dt;
      if (p.t >= p.life) {
        this.scene.remove(p.mesh);
        // each particle owns its geometry and material: release GPU buffers with it
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += (p.gravity ?? -12) * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.rotation.x += dt * 6;
      p.mesh.rotation.z += dt * 5;
      if (p.twinkle) p.mesh.material.color.setHSL(Math.random(), 0.9, 0.6);
    }
  }

  // ---------- camera & scenery ----------

  updateCamera(st, dt) {
    const p = st.player;
    const targetX = p.x + p.facing * 2.4;
    const targetY = Math.max(3.4, 2.6 + p.y * 0.18);
    const k = 1 - Math.exp(-6 * dt);
    this.camera.position.x += (targetX - this.camera.position.x) * k;
    this.camera.position.y += (targetY - this.camera.position.y) * k;
    this.camera.position.z = st.area === 'cellar' ? 9.5 : 15.5;
    this.camera.lookAt(this.camera.position.x + 3, 2.3, 0);
    this.sun.position.set(this.camera.position.x + 12, 22, 12);
    this.sun.target.position.set(this.camera.position.x, 0, 0);
    this.sun.target.updateMatrixWorld();
  }

  updateScenery(dt) {
    const scenery = this.scenery;
    if (!scenery) return;
    for (const child of scenery.children) {
      const z = child.position.z;
      if (z < -20) {
        // clouds drift slowly
        child.position.x = (child.userData.baseX ?? child.position.x) + Math.sin(this.time * 0.1 + child.position.z) * 1.2;
      }
      if (child.userData.baseX === undefined) child.userData.baseX = child.position.x;
    }
  }

  // ---------- lifecycle ----------

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
    this.scene.traverse(o => { if (o.isMesh) { o.geometry?.dispose(); o.material?.dispose(); } });
  }
}

export { SOLID };
