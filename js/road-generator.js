// road-generator.js — Procedural city road segments with object pooling
import * as THREE from 'three';
import { LANE_WIDTH } from './lane-system.js';
import { randomFloat, randomInt, randomChoice } from './utils.js';

const SEGMENT_LENGTH = 50;
const VISIBLE_SEGMENTS = 5;
const RECYCLE_Z = -15;

// Building colors — vibrant macaron palette
const BUILDING_COLORS = [
  0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0x96CEB4, 0xFFEAA7,
  0xDDA0DD, 0xFF8A5C, 0xA8E6CF, 0xFFD3B6, 0xB8E0D2,
  0xEAB8E4, 0x95E1D3, 0xF38181, 0xFCE38A, 0xF6B93B,
];

const roadMat = new THREE.MeshToonMaterial({ color: 0x444444 });
const sidewalkMat = new THREE.MeshToonMaterial({ color: 0x999999 });
const lineMat = new THREE.MeshToonMaterial({ color: 0xFFFFFF });
const curbMat = new THREE.MeshToonMaterial({ color: 0xCCCCCC });

export class RoadGenerator {
  constructor(scene) {
    this.scene = scene;
    this.segments = [];
    this.nextZ = 0;
    this._buildingMatCache = {};
  }

  _getBuildingMat(color) {
    if (!this._buildingMatCache[color]) {
      this._buildingMatCache[color] = new THREE.MeshToonMaterial({ color });
    }
    return this._buildingMatCache[color];
  }

  init() {
    for (let i = 0; i < VISIBLE_SEGMENTS; i++) {
      this._spawnSegment();
    }
  }

  _spawnSegment() {
    const group = new THREE.Group();
    group.position.z = this.nextZ;

    // Road surface
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(LANE_WIDTH * 3 + 3, SEGMENT_LENGTH),
      roadMat
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, SEGMENT_LENGTH / 2);
    road.receiveShadow = true;
    group.add(road);

    // Lane markings (dashed)
    for (const x of [-LANE_WIDTH / 2 - 0.8, LANE_WIDTH / 2 + 0.8]) {
      for (let z = 2; z < SEGMENT_LENGTH - 2; z += 4) {
        const dash = new THREE.Mesh(
          new THREE.PlaneGeometry(0.12, 2),
          lineMat
        );
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(x, 0.02, z);
        group.add(dash);
      }
    }

    // Center lane markings
    for (let z = 2; z < SEGMENT_LENGTH - 2; z += 4) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, 2),
        lineMat
      );
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.02, z);
      group.add(dash);
    }

    // Sidewalks
    const roadHalfW = LANE_WIDTH * 1.5 + 1.5;
    for (const side of [-1, 1]) {
      const sw = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.2, SEGMENT_LENGTH),
        sidewalkMat
      );
      sw.position.set(side * (roadHalfW + 1.25), 0.1, SEGMENT_LENGTH / 2);
      sw.receiveShadow = true;
      group.add(sw);

      // Curb
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, SEGMENT_LENGTH),
        curbMat
      );
      curb.position.set(side * roadHalfW, 0.1, SEGMENT_LENGTH / 2);
      group.add(curb);
    }

    // Buildings on both sides
    this._addBuildings(group, -1);
    this._addBuildings(group, 1);

    // Occasional streetlights
    this._addStreetlights(group);

    this.scene.add(group);
    this.segments.push({ group, z: this.nextZ });
    this.nextZ += SEGMENT_LENGTH;
  }

  _addBuildings(group, side) {
    const roadHalfW = LANE_WIDTH * 1.5 + 1.5;
    const baseX = side * (roadHalfW + 2.5);
    let z = 1;

    while (z < SEGMENT_LENGTH - 1) {
      const width = randomFloat(3, 7);
      const height = randomFloat(6, 22);
      const depth = randomFloat(4, 8);
      const color = randomChoice(BUILDING_COLORS);

      const building = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        this._getBuildingMat(color)
      );
      building.position.set(
        baseX + side * (width / 2 + 0.5),
        height / 2,
        z + depth / 2
      );
      building.castShadow = true;
      building.receiveShadow = true;
      group.add(building);

      // Windows — dark stripes
      const windowRows = Math.floor(height / 2.5);
      if (windowRows > 0 && depth > 3) {
        const windowMat = new THREE.MeshToonMaterial({ color: 0x334455 });
        for (let row = 0; row < windowRows; row++) {
          const wy = row * 2.5 + 1.8;
          if (wy > height - 1) break;
          const win = new THREE.Mesh(
            new THREE.PlaneGeometry(width * 0.7, 1),
            windowMat
          );
          win.position.set(
            baseX + side * (width / 2 + 0.5) - side * (width / 2 + 0.01),
            wy,
            z + depth / 2
          );
          win.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
          group.add(win);
        }
      }

      z += depth + randomFloat(0.5, 2);
    }
  }

  _addStreetlights(group) {
    const roadHalfW = LANE_WIDTH * 1.5 + 1.5;
    const poleMat = new THREE.MeshToonMaterial({ color: 0x555555 });
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xFFDD66,
      emissive: 0xFFDD66,
      emissiveIntensity: 0.3,
    });

    for (let z = 10; z < SEGMENT_LENGTH; z += 25) {
      for (const side of [-1, 1]) {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.08, 5, 6),
          poleMat
        );
        pole.position.set(side * (roadHalfW - 0.3), 2.5, z);
        pole.castShadow = true;
        group.add(pole);

        // Light head
        const head = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.12, 0.8),
          lightMat
        );
        head.position.set(side * (roadHalfW - 0.3), 5, z);
        group.add(head);
      }
    }
  }

  update(dt, speed) {
    // Move segments toward camera
    for (const seg of this.segments) {
      seg.group.position.z -= speed * dt;
      seg.z -= speed * dt;
    }

    // Recycle segments behind camera
    while (this.segments.length > 0 && this.segments[0].z + SEGMENT_LENGTH < RECYCLE_Z) {
      const old = this.segments.shift();
      this.scene.remove(old.group);
      // Dispose geometries would go here for memory, but for pooling we skip
      this._spawnSegment();
    }
  }

  reset() {
    for (const seg of this.segments) {
      this.scene.remove(seg.group);
    }
    this.segments = [];
    this.nextZ = 0;
    this.init();
  }

  getSegments() {
    return this.segments;
  }
}

export { SEGMENT_LENGTH };
