// character.js — Player character model, animation, physics
import * as THREE from 'three';
import { getLaneX, LANE_WIDTH } from './lane-system.js';
import { lerp } from './utils.js';

const JUMP_FORCE = 14;
const GRAVITY = 38;
const GROUND_Y = 0.9;
const SLIDE_DURATION = 0.6;
const LANE_SWITCH_SPEED = 14;

// Shared materials
const skinMat = new THREE.MeshToonMaterial({ color: 0xFFCC88 });
const bodyMat = new THREE.MeshToonMaterial({ color: 0x4488FF });
const pantsMat = new THREE.MeshToonMaterial({ color: 0x2244AA });
const shoeMat = new THREE.MeshToonMaterial({ color: 0x333333 });
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

export class Character {
  constructor(scene) {
    this.scene = scene;
    this.currentLane = 0;
    this.targetX = 0;
    this.isJumping = false;
    this.isSliding = false;
    this.velocityY = 0;
    this.slideTimer = 0;
    this.alive = true;
    this.runTime = 0;

    this.mesh = new THREE.Group();
    this._buildModel();
    this.mesh.position.set(0, GROUND_Y, 0);
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    // Collision box (slightly smaller than visual for forgiving gameplay)
    this.collider = new THREE.Box3();
  }

  _buildModel() {
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.5), bodyMat);
    body.position.y = 0.45;
    body.castShadow = true;
    this.mesh.add(body);
    this.body = body;

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), skinMat);
    head.position.y = 1.22;
    head.castShadow = true;
    this.mesh.add(head);
    this.head = head;

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 1.28, 0.28);
    this.mesh.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 1.28, 0.28);
    this.mesh.add(rightEye);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
    this.leftArm = new THREE.Mesh(armGeo, bodyMat);
    this.leftArm.position.set(-0.52, 0.45, 0);
    this.leftArm.geometry.translate(0, -0.3, 0);
    this.leftArm.castShadow = true;
    this.mesh.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, bodyMat);
    this.rightArm.position.set(0.52, 0.45, 0);
    this.rightArm.geometry.translate(0, -0.3, 0);
    this.rightArm.castShadow = true;
    this.mesh.add(this.rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.22, 0.6, 0.22);
    this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.leftLeg.position.set(-0.18, -0.05, 0);
    this.leftLeg.geometry.translate(0, -0.3, 0);
    this.leftLeg.castShadow = true;
    this.mesh.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
    this.rightLeg.position.set(0.18, -0.05, 0);
    this.rightLeg.geometry.translate(0, -0.3, 0);
    this.rightLeg.castShadow = true;
    this.mesh.add(this.rightLeg);

    // Shoes
    const shoeGeo = new THREE.BoxGeometry(0.24, 0.12, 0.35);
    this.leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    this.leftShoe.position.set(-0.18, -0.6, 0.05);
    this.mesh.add(this.leftShoe);
    this.rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    this.rightShoe.position.set(0.18, -0.6, 0.05);
    this.mesh.add(this.rightShoe);
  }

  moveLeft() {
    if (!this.alive) return;
    this.currentLane = Math.max(this.currentLane - 1, -1);
    this.targetX = getLaneX(this.currentLane);
  }

  moveRight() {
    if (!this.alive) return;
    this.currentLane = Math.min(this.currentLane + 1, 1);
    this.targetX = getLaneX(this.currentLane);
  }

  jump() {
    if (!this.alive || this.isJumping) return;
    if (this.isSliding) this._endSlide();
    this.isJumping = true;
    this.velocityY = JUMP_FORCE;
  }

  slide() {
    if (!this.alive || this.isSliding || this.isJumping) return;
    this.isSliding = true;
    this.slideTimer = SLIDE_DURATION;
    // Squash character
    this.mesh.scale.y = 0.45;
    this.mesh.position.y = GROUND_Y * 0.45;
  }

  _endSlide() {
    this.isSliding = false;
    this.slideTimer = 0;
    this.mesh.scale.y = 1;
    this.mesh.position.y = GROUND_Y;
  }

  die() {
    this.alive = false;
  }

  reset() {
    this.currentLane = 0;
    this.targetX = 0;
    this.isJumping = false;
    this.isSliding = false;
    this.velocityY = 0;
    this.slideTimer = 0;
    this.alive = true;
    this.runTime = 0;
    this.mesh.position.set(0, GROUND_Y, 0);
    this.mesh.scale.set(1, 1, 1);
    this.mesh.rotation.set(0, 0, 0);
    this.mesh.visible = true;
  }

  getCollider() {
    const p = this.mesh.position;
    const halfW = 0.28;
    const height = this.isSliding ? 0.5 : 1.4;
    const halfD = 0.2;
    this.collider.min.set(p.x - halfW, p.y - (this.isSliding ? 0.2 : 0), p.z - halfD);
    this.collider.max.set(p.x + halfW, p.y + height, p.z + halfD);
    return this.collider;
  }

  update(dt, speed) {
    if (!this.alive) return;

    // Lane movement
    this.mesh.position.x = lerp(this.mesh.position.x, this.targetX, LANE_SWITCH_SPEED * dt);

    // Slight body tilt when switching lanes
    const laneOffset = this.targetX - this.mesh.position.x;
    this.mesh.rotation.z = lerp(this.mesh.rotation.z, -laneOffset * 0.08, 8 * dt);

    // Jump physics
    if (this.isJumping) {
      this.mesh.position.y += this.velocityY * dt;
      this.velocityY -= GRAVITY * dt;
      if (this.mesh.position.y <= GROUND_Y) {
        this.mesh.position.y = GROUND_Y;
        this.isJumping = false;
        this.velocityY = 0;
      }
    }

    // Slide timer
    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this._endSlide();
      }
    }

    // Run animation
    this.runTime += dt * speed * 0.12;
    const swing = Math.sin(this.runTime * 2) * 0.6;
    if (!this.isSliding) {
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing * 0.8;
      this.rightArm.rotation.x = swing * 0.8;
      this.leftShoe.position.z = 0.05 + Math.sin(this.runTime * 2) * 0.15;
      this.rightShoe.position.z = 0.05 - Math.sin(this.runTime * 2) * 0.15;
    }

    // Head bob
    this.head.position.y = 1.22 + Math.abs(Math.sin(this.runTime * 2)) * 0.04;
  }
}
