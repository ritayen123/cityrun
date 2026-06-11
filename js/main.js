// main.js — Entry point: init all modules, game loop
import * as THREE from 'three';
import { createScene, createCamera, createRenderer, createLights, setupResize } from './scene-setup.js';
import { GameManager, STATE } from './game.js';
import { Character } from './character.js';
import { RoadGenerator } from './road-generator.js';
import { ObstacleManager } from './obstacles.js';
import { CollectibleManager } from './collectibles.js';
import { PowerupManager } from './powerups.js';
import { InputManager } from './input.js';
import { UIManager } from './ui.js';
import { AudioManager } from './audio.js';

// Init Three.js
const canvas = document.getElementById('game-canvas');
const scene = createScene();
const camera = createCamera();
const renderer = createRenderer(canvas);
const lights = createLights(scene);
setupResize(camera, renderer);

// Ground plane (extends beyond road for visual grounding)
const groundGeo = new THREE.PlaneGeometry(200, 400);
const groundMat = new THREE.MeshToonMaterial({ color: 0x556B2F });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
ground.position.z = 100;
ground.receiveShadow = true;
scene.add(ground);

// Modules
const game = new GameManager();
const character = new Character(scene);
const road = new RoadGenerator(scene);
const obstacles = new ObstacleManager(scene);
const collectibles = new CollectibleManager(scene);
const powerups = new PowerupManager(scene);
const input = new InputManager();
const ui = new UIManager();
const audio = new AudioManager();

// Attach shield visual to character
powerups.attachShieldTo(character.mesh);

// Track old segments for cleanup
let lastSegmentCount = 0;

// Camera shake state
let shakeIntensity = 0;
let shakeDuration = 0;

// Particle effects
const particles = [];

function spawnCoinParticles(worldPos) {
  const particleMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.08),
      particleMat
    );
    p.position.copy(worldPos);
    p.userData.vel = new THREE.Vector3(
      (Math.random() - 0.5) * 4,
      Math.random() * 5 + 2,
      (Math.random() - 0.5) * 4
    );
    p.userData.life = 0.5;
    scene.add(p);
    particles.push(p);
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.userData.life -= dt;
    if (p.userData.life <= 0) {
      scene.remove(p);
      particles.splice(i, 1);
      continue;
    }
    p.position.x += p.userData.vel.x * dt;
    p.position.y += p.userData.vel.y * dt;
    p.position.z += p.userData.vel.z * dt;
    p.userData.vel.y -= 15 * dt;
    const s = p.userData.life * 2;
    p.scale.set(s, s, s);
  }
}

// Road segment spawn callback — add obstacles & collectibles to new segments
function onNewSegments() {
  const segs = road.getSegments();
  if (segs.length > lastSegmentCount) {
    // Process only newly added segments
    for (let i = lastSegmentCount; i < segs.length; i++) {
      const seg = segs[i];
      if (seg.z > 20) { // Don't spawn obstacles right at start
        obstacles.spawnForSegment(seg.group, seg.z, game.difficulty);
      }
      collectibles.spawnForSegment(seg.group, seg.z);
      powerups.spawnForSegment(seg.group, seg.z);
    }
  }
  lastSegmentCount = segs.length;
}

function cleanupOldSegments() {
  // When road removes a segment, clean up our references
  const segs = road.getSegments();
  if (segs.length < lastSegmentCount) {
    // Segments were removed — clean our arrays
    const activeGroups = new Set(segs.map(s => s.group));
    obstacles.obstacles = obstacles.obstacles.filter(o => activeGroups.has(o.segmentGroup));
    collectibles.coins = collectibles.coins.filter(c => activeGroups.has(c.segmentGroup));
    powerups.items = powerups.items.filter(p => activeGroups.has(p.segmentGroup));
    lastSegmentCount = segs.length;
  }
}

// Start game
function startGame() {
  audio.init();
  audio.resume();
  game.start();
  character.reset();
  road.reset();
  obstacles.reset();
  collectibles.reset();
  powerups.reset();
  lastSegmentCount = 0;
  shakeIntensity = 0;
  shakeDuration = 0;

  // Clear particles
  for (const p of particles) scene.remove(p);
  particles.length = 0;

  input.enable();
  ui.showPlaying();

  // Move directional light shadow target
  lights.dir.target = character.mesh;

  // Initial segment population
  onNewSegments();
}

function endGame() {
  game.gameOver();
  input.disable();
  audio.crash();

  // Camera shake
  shakeIntensity = 0.4;
  shakeDuration = 0.4;

  // Delay showing game over screen
  setTimeout(() => {
    ui.showGameOver(game.score, game.coins, game.getDistanceDisplay(), game.bestScore, game.isNewBest);
  }, 600);
}

// Event listeners
document.getElementById('menu-screen').addEventListener('click', startGame);
document.getElementById('menu-screen').addEventListener('touchstart', (e) => {
  e.preventDefault();
  startGame();
}, { passive: false });

document.getElementById('retry-btn').addEventListener('click', startGame);

document.getElementById('menu-btn').addEventListener('click', () => {
  game.returnToMenu();
  ui.showMenu(game.bestScore);
});

// Sound toggle
document.getElementById('sound-btn').addEventListener('click', () => {
  const muted = audio.toggle();
  document.getElementById('sound-btn').textContent = muted ? '🔇' : '🔊';
});

// Keyboard start
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && game.state === STATE.MENU) {
    e.preventDefault();
    startGame();
  }
  if (e.code === 'Space' && game.state === STATE.GAMEOVER) {
    e.preventDefault();
    startGame();
  }
});

// Game loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05); // Cap dt to prevent spiral

  if (game.state === STATE.PLAYING) {
    // Process input
    const actions = input.consume();
    if (actions.left) { character.moveLeft(); audio.swoosh(); }
    if (actions.right) { character.moveRight(); audio.swoosh(); }
    if (actions.jump) { character.jump(); audio.jump(); }
    if (actions.slide) { character.slide(); audio.slide(); }

    // Update systems
    game.update(dt);
    character.update(dt, game.speed);
    road.update(dt, game.speed);
    collectibles.update(dt);
    powerups.update(dt);

    // Spawn/cleanup
    onNewSegments();
    cleanupOldSegments();

    // Collision — obstacles
    const playerBox = character.getCollider();
    const hit = obstacles.checkCollision(playerBox);
    if (hit) {
      if (powerups.shieldActive) {
        powerups.consumeShield();
        audio.powerup();
      } else {
        character.die();
        endGame();
      }
    }

    // Collision — coins
    const coinsCollected = collectibles.checkCollection(playerBox, powerups.magnetActive);
    if (coinsCollected > 0) {
      game.addCoins(coinsCollected, powerups.multiplier);
      audio.coin();
      // Particle effect at player position
      spawnCoinParticles(character.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)));
    }

    // Collision — powerups
    const pu = powerups.checkCollection(playerBox);
    if (pu) {
      audio.powerup();
    }

    // Update UI
    ui.updateHUD(game.getScore(), game.coins, game.getDistanceDisplay());
    ui.updatePowerups(powerups.getActiveEffects());

    // Update shadow light position to follow player
    lights.dir.position.set(
      character.mesh.position.x - 8,
      20,
      character.mesh.position.z + 10
    );
  }

  // Update particles (even during game over for visual continuity)
  updateParticles(dt);

  // Camera follow
  if (game.state === STATE.PLAYING || game.state === STATE.GAMEOVER) {
    const targetCamX = character.mesh.position.x * 0.35;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, 4 * dt);
    camera.position.y = 8;
    camera.position.z = -12;
    camera.lookAt(
      character.mesh.position.x * 0.5,
      2,
      20
    );
  }

  // Camera shake
  if (shakeDuration > 0) {
    shakeDuration -= dt;
    const shake = shakeIntensity * (shakeDuration / 0.4);
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
  }

  // Move ground with camera
  ground.position.z = 100;

  renderer.render(scene, camera);
}

// Initial state
ui.showMenu(game.bestScore);
road.init();
onNewSegments();
animate();
