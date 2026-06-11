// obstacles.js — Obstacle types, spawning, collision
import * as THREE from 'three';
import { LANE_WIDTH } from './lane-system.js';
import { randomInt, randomFloat, randomChoice, aabbCollision } from './utils.js';
import { SEGMENT_LENGTH } from './road-generator.js';

const OBSTACLE_TYPES = ['car', 'barrier', 'cone', 'low', 'overhead'];
const CAR_COLORS = [0xFF4444, 0x44AA44, 0x4488FF, 0xFFAA00, 0xFFFFFF, 0x222222, 0xDD44DD];

// Shared materials
const barrierMat = new THREE.MeshToonMaterial({ color: 0xDD5500 });
const coneMat = new THREE.MeshToonMaterial({ color: 0xFF6600 });
const coneStripeMat = new THREE.MeshToonMaterial({ color: 0xFFFFFF });
const lowMat = new THREE.MeshToonMaterial({ color: 0xFFAA00 });
const overheadMat = new THREE.MeshToonMaterial({ color: 0x666666 });
const overheadStripeMat = new THREE.MeshToonMaterial({ color: 0xFFFF00 });
const _carMatCache = {};

function getCarMat(color) {
  if (!_carMatCache[color]) {
    _carMatCache[color] = new THREE.MeshToonMaterial({ color });
  }
  return _carMatCache[color];
}

function createObstacle(type) {
  const group = new THREE.Group();
  group.userData.type = type;

  switch (type) {
    case 'car': {
      const color = randomChoice(CAR_COLORS);
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 3.2), getCarMat(color));
      body.position.y = 0.5;
      body.castShadow = true;
      group.add(body);
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.7, 1.6),
        new THREE.MeshToonMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.6 })
      );
      cabin.position.set(0, 1.15, -0.2);
      group.add(cabin);
      // Wheels
      const wheelMat = new THREE.MeshToonMaterial({ color: 0x222222 });
      const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 8);
      for (const [x, z] of [[-0.9, 0.9], [0.9, 0.9], [-0.9, -0.9], [0.9, -0.9]]) {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(x, 0.3, z);
        group.add(w);
      }
      group.userData.size = { x: 1.8, y: 1.7, z: 3.2 };
      group.userData.groundY = 0;
      break;
    }
    case 'barrier': {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 0.3), barrierMat);
      bar.position.y = 0.55;
      bar.castShadow = true;
      group.add(bar);
      // Posts
      const postMat = new THREE.MeshToonMaterial({ color: 0x884400 });
      for (const x of [-0.9, 0.9]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), postMat);
        post.position.set(x, 0.55, 0);
        group.add(post);
      }
      group.userData.size = { x: 2.2, y: 1.1, z: 0.3 };
      group.userData.groundY = 0;
      break;
    }
    case 'cone': {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 8), coneMat);
      cone.position.y = 0.4;
      cone.castShadow = true;
      group.add(cone);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), coneStripeMat);
      base.position.y = 0.03;
      group.add(base);
      group.userData.size = { x: 0.5, y: 0.8, z: 0.5 };
      group.userData.groundY = 0;
      break;
    }
    case 'low': {
      // Low barrier — must jump over
      const block = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 1.2), lowMat);
      block.position.y = 0.275;
      block.castShadow = true;
      group.add(block);
      // Stripe
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.08, 1.22),
        new THREE.MeshToonMaterial({ color: 0xFF4400 })
      );
      stripe.position.y = 0.55;
      group.add(stripe);
      group.userData.size = { x: 2.4, y: 0.6, z: 1.2 };
      group.userData.groundY = 0;
      break;
    }
    case 'overhead': {
      // Overhead barrier — must slide under
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 1.0), overheadMat);
      bar.position.y = 1.6;
      bar.castShadow = true;
      group.add(bar);
      // Warning stripes
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 1.02), overheadStripeMat);
      stripe.position.y = 1.2;
      group.add(stripe);
      // Support posts
      const postMat = new THREE.MeshToonMaterial({ color: 0x555555 });
      for (const x of [-1.3, 1.3]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.0, 6), postMat);
        post.position.set(x, 1.0, 0);
        group.add(post);
      }
      group.userData.size = { x: 2.8, y: 0.8, z: 1.0 };
      group.userData.groundY = 1.2; // bottom of obstacle
      break;
    }
  }

  return group;
}

export class ObstacleManager {
  constructor(scene) {
    this.scene = scene;
    this.obstacles = []; // { mesh, segmentGroup, worldBox }
    this._box = new THREE.Box3();
  }

  spawnForSegment(segmentGroup, segmentZ, difficulty) {
    const count = Math.floor(1 + difficulty * 3.5);
    const minSpacing = 8;
    const usedSlots = []; // [{lane, z}]

    for (let i = 0; i < count; i++) {
      const lane = randomInt(-1, 1);
      const zOffset = randomFloat(6, SEGMENT_LENGTH - 6);

      // Check spacing
      const tooClose = usedSlots.some(
        s => Math.abs(s.z - zOffset) < minSpacing && s.lane === lane
      );
      if (tooClose) continue;

      // Don't block all 3 lanes at same Z
      const sameZ = usedSlots.filter(s => Math.abs(s.z - zOffset) < minSpacing);
      const blockedLanes = new Set(sameZ.map(s => s.lane));
      if (blockedLanes.size >= 2 && !blockedLanes.has(lane)) {
        // This would block all 3 lanes, skip
        continue;
      }
      if (blockedLanes.size >= 2) continue;

      // Choose type based on difficulty
      let availableTypes;
      if (difficulty < 0.15) {
        availableTypes = ['car', 'barrier', 'cone'];
      } else if (difficulty < 0.4) {
        availableTypes = ['car', 'barrier', 'cone', 'low'];
      } else {
        availableTypes = OBSTACLE_TYPES;
      }
      const type = randomChoice(availableTypes);

      const obs = createObstacle(type);
      obs.position.set(lane * LANE_WIDTH, 0, zOffset);
      segmentGroup.add(obs);

      this.obstacles.push({
        mesh: obs,
        segmentGroup,
        type,
      });

      usedSlots.push({ lane, z: zOffset });
    }
  }

  checkCollision(playerCollider) {
    for (const obs of this.obstacles) {
      if (!obs.mesh.visible) continue;
      if (!obs.mesh.parent) continue;

      // Get world position
      const wp = new THREE.Vector3();
      obs.mesh.getWorldPosition(wp);

      const sz = obs.mesh.userData.size;
      const gy = obs.mesh.userData.groundY || 0;

      this._box.min.set(wp.x - sz.x / 2, gy, wp.z - sz.z / 2);
      this._box.max.set(wp.x + sz.x / 2, gy + sz.y, wp.z + sz.z / 2);

      // Only check obstacles near player (z between -3 and 3)
      if (this._box.max.z < -3 || this._box.min.z > 3) continue;

      if (aabbCollision(playerCollider, this._box)) {
        return obs;
      }
    }
    return null;
  }

  cleanupSegment(segmentGroup) {
    this.obstacles = this.obstacles.filter(o => o.segmentGroup !== segmentGroup);
  }

  reset() {
    this.obstacles = [];
  }
}
