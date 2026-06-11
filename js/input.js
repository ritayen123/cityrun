// input.js — Unified keyboard + touch swipe input
export class InputManager {
  constructor() {
    this.actions = { left: false, right: false, jump: false, slide: false };
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchStartTime = 0;
    this._enabled = false;
    this._onKeyDown = this._handleKey.bind(this);
    this._onTouchStart = this._handleTouchStart.bind(this);
    this._onTouchEnd = this._handleTouchEnd.bind(this);
  }

  enable() {
    if (this._enabled) return;
    this._enabled = true;
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('touchstart', this._onTouchStart, { passive: false });
    window.addEventListener('touchend', this._onTouchEnd, { passive: false });
  }

  disable() {
    this._enabled = false;
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('touchstart', this._onTouchStart);
    window.removeEventListener('touchend', this._onTouchEnd);
  }

  consume() {
    const a = { ...this.actions };
    this.actions.left = false;
    this.actions.right = false;
    this.actions.jump = false;
    this.actions.slide = false;
    return a;
  }

  _handleKey(e) {
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA':
        this.actions.left = true; e.preventDefault(); break;
      case 'ArrowRight': case 'KeyD':
        this.actions.right = true; e.preventDefault(); break;
      case 'ArrowUp': case 'KeyW': case 'Space':
        this.actions.jump = true; e.preventDefault(); break;
      case 'ArrowDown': case 'KeyS':
        this.actions.slide = true; e.preventDefault(); break;
    }
  }

  _handleTouchStart(e) {
    e.preventDefault();
    const t = e.touches[0];
    this._touchStartX = t.clientX;
    this._touchStartY = t.clientY;
    this._touchStartTime = performance.now();
  }

  _handleTouchEnd(e) {
    e.preventDefault();
    if (e.changedTouches.length === 0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - this._touchStartX;
    const dy = t.clientY - this._touchStartY;
    const dt = performance.now() - this._touchStartTime;

    if (dt > 400) return; // too slow

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const threshold = 30;

    if (absDx < threshold && absDy < threshold) {
      // Tap = jump
      this.actions.jump = true;
      return;
    }

    if (absDx > absDy) {
      if (dx > threshold) this.actions.right = true;
      else if (dx < -threshold) this.actions.left = true;
    } else {
      if (dy < -threshold) this.actions.jump = true;
      else if (dy > threshold) this.actions.slide = true;
    }
  }
}
