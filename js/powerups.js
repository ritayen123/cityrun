// powerups.js — Magnet, Shield, Multiplier power-ups
import * as THREE from 'three';
import { LANE_WIDTH } from './lane-system.js';
import { randomInt, randomFloat, randomChoice } from './utils.js';

const POWERUP_DURATION = 6;
const POWERUP_TYPES = ['magnet', 'shield', 'multiplier'];

const magnetMat = new THREE.MeshToonMaterial({ color: 0x4488FF });
const shieldMat = new THREE.MeshToonMaterial({
  color: 0x44FF88,
  transparent: true,
  opacity: 0.7,
});
const multiplierMat = new THREE.MeshToonMaterial({ color: 0xFF4488 });

function createPowerupMesh(type) {
  const group = new THREE.Group();
  group.userData.powerupType = type;

  // Glowing base ring
  const ringGeo = new THREE.TorusGeometry(0.5, 0.08, 8, 16);

  switch (type) {
    case 'magnet': {
      const ring = new THREE.Mesh(ringGeo, magnetMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
      // U shape
      const barGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
      const l = new THREE.Mesh(barGeo, new THREE.MeshToonMaterial({ color: 0xFF0000 }));
      l.position.set(-0.2, 0, 0);
      group.add(l);
      const r = new THREE.Mesh(barGeo, new THREE.MeshToonMaterial({ color: 0x0000FF }));
      r.position.set(0.2, 0, 0);
      group.add(r);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.15, 0.15),
        new THREE.MeshToonMaterial({ color: 0x888888 }));
      bridge.position.y = 0.3;
      group.add(bridge);
      break;
    }
    case 'shield': {
      const ring = new THREE.Mesh(ringGeo, shieldMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 10, 10),
        new THREE.MeshToonMaterial({ color: 0x44FF88, transparent: true, opacity: 0.5 })
      );
      group.add(sphere);
      break;
    }
    case 'multiplier': {
      const ring = new THREE.Mesh(ringGeo, multiplierMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
      // X2 — two crossing bars
      const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), multiplierMat);
      bar1.rotation.z = Math.PI / 4;
      group.add(bar1);
      const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), multiplierMat);
      bar2.rotation.z = -Math.PI / 4;
      group.add(bar2);
      break;
    }
  }

  return group;
}

export class PowerupManager {
  constructor(scene) {
    this.scene = scene;
    this.items = []; // { mesh, segmentGroup, collected, type }
    this._time = 0;

    // Active effects
    this.magnetActive = false;
    this.shieldActive = false;
    this.multiplier = 1;
    this._magnetTimer = 0;
    this._shieldTimer = 0;
    this._multiplierTimer = 0;

    // Shield visual on character
    this.shieldVisual = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 12, 12),
      new THREE.MeshToonMaterial({ color: 0x44FF88, transparent: true, opacity: 0.25 })
    );
    this.shieldVisual.visible = false;
    this.shieldVisual.renderOrder = 999;
  }

  attachShieldTo(characterMesh) {
    characterMesh.add(this.shieldVisual);
    this.shieldVisual.position.set(0, 0.5, 0);
  }

  spawnForSegment(segmentGroup, segmentZ) {
    // 8% chance per segment
    if (Math.random() > 0.08) return;

    const type = randomChoice(POWERUP_TYPES);
    const lane = randomInt(-1, 1);
    const z = randomFloat(10, 40);

    const mesh = createPowerupMesh(type);
    mesh.position.set(lane * LANE_WIDTH, 1.2, z);
    segmentGroup.add(mesh);

    this.items.push({
      mesh,
      segmentGroup,
      collected: false,
      type,
    });
  }

  checkCollection(playerCollider) {
    const px = (playerCollider.min.x + playerCollider.max.x) / 2;
    const pz = (playerCollider.min.z + playerCollider.max.z) / 2;

    for (const item of this.items) {
      if (item.collected || !item.mesh.parent) continue;

      const wp = new THREE.Vector3();
      item.mesh.getWorldPosition(wp);

      const dx = px - wp.x;
      const dz = pz - wp.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1.5) {
        item.collected = true;
        item.mesh.visible = false;
        this._activate(item.type);
        return item.type;
      }
    }
    return null;
  }

  _activate(type) {
    switch (type) {
      case 'magnet':
        this.magnetActive = true;
        this._magnetTimer = POWERUP_DURATION;
        break;
      case 'shield':
        this.shieldActive = true;
        this._shieldTimer = POWERUP_DURATION;
        this.shieldVisual.visible = true;
        break;
      case 'multiplier':
        this.multiplier = 2;
        this._multiplierTimer = POWERUP_DURATION;
        break;
    }
  }

  consumeShield() {
    this.shieldActive = false;
    this._shieldTimer = 0;
    this.shieldVisual.visible = false;
  }

  update(dt) {
    this._time += dt;

    // Rotate items
    for (const item of this.items) {
      if (item.collected || !item.mesh.parent) continue;
      item.mesh.rotation.y += dt * 2;
      item.mesh.position.y = 1.2 + Math.sin(this._time * 2) * 0.2;
    }

    // Timers
    if (this.magnetActive) {
      this._magnetTimer -= dt;
      if (this._magnetTimer <= 0) {
        this.magnetActive = false;
      }
    }
    if (this.shieldActive) {
      this._shieldTimer -= dt;
      if (this._shieldTimer <= 0) {
        this.shieldActive = false;
        this.shieldVisual.visible = false;
      }
      // Pulse shield visual
      const s = 1 + Math.sin(this._time * 6) * 0.08;
      this.shieldVisual.scale.set(s, s, s);
    }
    if (this.multiplier > 1) {
      this._multiplierTimer -= dt;
      if (this._multiplierTimer <= 0) {
        this.multiplier = 1;
      }
    }
  }

  getActiveEffects() {
    const effects = [];
    if (this.magnetActive) effects.push({ type: 'magnet', time: this._magnetTimer });
    if (this.shieldActive) effects.push({ type: 'shield', time: this._shieldTimer });
    if (this.multiplier > 1) effects.push({ type: 'x2', time: this._multiplierTimer });
    return effects;
  }

  cleanupSegment(segmentGroup) {
    this.items = this.items.filter(i => i.segmentGroup !== segmentGroup);
  }

  reset() {
    this.items = [];
    this.magnetActive = false;
    this.shieldActive = false;
    this.multiplier = 1;
    this._magnetTimer = 0;
    this._shieldTimer = 0;
    this._multiplierTimer = 0;
    this.shieldVisual.visible = false;
    this._time = 0;
  }
}
