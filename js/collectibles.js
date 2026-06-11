// collectibles.js — Coins system
import * as THREE from 'three';
import { LANE_WIDTH } from './lane-system.js';
import { randomInt, randomChoice, randomFloat } from './utils.js';
import { SEGMENT_LENGTH } from './road-generator.js';

const coinMat = new THREE.MeshToonMaterial({ color: 0xFFD700 });
const coinEdgeMat = new THREE.MeshToonMaterial({ color: 0xFFA500 });
const coinGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 10);

const PATTERNS = ['line', 'arc', 'jumpArc', 'none'];

export class CollectibleManager {
  constructor(scene) {
    this.scene = scene;
    this.coins = []; // { mesh, segmentGroup, collected }
    this._time = 0;
  }

  spawnForSegment(segmentGroup, segmentZ) {
    const pattern = randomChoice(PATTERNS);
    if (pattern === 'none') return;

    switch (pattern) {
      case 'line': {
        const lane = randomInt(-1, 1);
        const startZ = randomFloat(5, 15);
        for (let i = 0; i < 7; i++) {
          this._addCoin(segmentGroup, lane * LANE_WIDTH, 1.0, startZ + i * 2.5);
        }
        break;
      }
      case 'arc': {
        const startZ = randomFloat(8, 20);
        const lanes = [-1, 0, 1, 0, -1];
        for (let i = 0; i < 5; i++) {
          this._addCoin(segmentGroup, lanes[i] * LANE_WIDTH, 1.0, startZ + i * 2.5);
        }
        break;
      }
      case 'jumpArc': {
        const lane = randomInt(-1, 1);
        const startZ = randomFloat(8, 18);
        const heights = [1.0, 2.0, 3.0, 3.5, 3.0, 2.0, 1.0];
        for (let i = 0; i < 7; i++) {
          this._addCoin(segmentGroup, lane * LANE_WIDTH, heights[i], startZ + i * 1.8);
        }
        break;
      }
    }
  }

  _addCoin(segmentGroup, x, y, z) {
    const coin = new THREE.Mesh(coinGeo, coinMat);
    coin.position.set(x, y, z);
    coin.rotation.x = Math.PI / 2;
    coin.castShadow = true;
    segmentGroup.add(coin);

    this.coins.push({
      mesh: coin,
      segmentGroup,
      collected: false,
      baseY: y,
    });
  }

  checkCollection(playerCollider, magnetActive) {
    let collected = 0;
    const playerPos = new THREE.Vector3(
      (playerCollider.min.x + playerCollider.max.x) / 2,
      (playerCollider.min.y + playerCollider.max.y) / 2,
      (playerCollider.min.z + playerCollider.max.z) / 2
    );

    for (const coin of this.coins) {
      if (coin.collected || !coin.mesh.parent) continue;

      const wp = new THREE.Vector3();
      coin.mesh.getWorldPosition(wp);

      const dist = playerPos.distanceTo(wp);

      // Magnet attraction
      if (magnetActive && dist < 8) {
        const dir = playerPos.clone().sub(wp).normalize();
        coin.mesh.position.x += dir.x * 0.5;
        coin.mesh.position.z += dir.z * 0.5;
      }

      // Collection distance
      if (dist < 1.2) {
        coin.collected = true;
        coin.mesh.visible = false;
        collected++;
      }
    }

    return collected;
  }

  update(dt) {
    this._time += dt;
    // Rotate and bob coins
    for (const coin of this.coins) {
      if (coin.collected || !coin.mesh.parent) continue;
      coin.mesh.rotation.z += dt * 3;
      coin.mesh.position.y = coin.baseY + Math.sin(this._time * 3 + coin.mesh.position.x) * 0.12;
    }
  }

  cleanupSegment(segmentGroup) {
    this.coins = this.coins.filter(c => c.segmentGroup !== segmentGroup);
  }

  reset() {
    this.coins = [];
    this._time = 0;
  }
}
