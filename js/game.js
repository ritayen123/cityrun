// game.js — Game state machine, score, speed progression
export const STATE = {
  MENU: 'menu',
  PLAYING: 'playing',
  GAMEOVER: 'gameover',
};

const BASE_SPEED = 25;
const SPEED_INCREMENT = 2.2;
const MAX_SPEED = 75;

export class GameManager {
  constructor() {
    this.state = STATE.MENU;
    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.speed = BASE_SPEED;
    this.bestScore = parseInt(localStorage.getItem('cityrun_best') || '0', 10);
    this.isNewBest = false;
    this._difficulty = 0;
  }

  start() {
    this.state = STATE.PLAYING;
    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.speed = BASE_SPEED;
    this.isNewBest = false;
    this._difficulty = 0;
  }

  update(dt) {
    if (this.state !== STATE.PLAYING) return;

    this.distance += this.speed * dt;
    this.speed = Math.min(BASE_SPEED + (this.distance / 100) * SPEED_INCREMENT, MAX_SPEED);
    this._difficulty = Math.min(this.distance / 1500, 1);
  }

  addCoins(count, multiplier = 1) {
    this.coins += count * multiplier;
  }

  getScore() {
    return Math.floor(this.distance + this.coins * 5);
  }

  getDistanceDisplay() {
    return Math.floor(this.distance);
  }

  get difficulty() {
    return this._difficulty;
  }

  gameOver() {
    this.state = STATE.GAMEOVER;
    this.score = this.getScore();
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.isNewBest = true;
      localStorage.setItem('cityrun_best', String(this.bestScore));
    }
  }

  returnToMenu() {
    this.state = STATE.MENU;
  }
}
