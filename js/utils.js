// utils.js — Object Pool & AABB Collision

export class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
    this._create = createFn;
    this._reset = resetFn;
    this._pool = [];
    this._active = [];
    for (let i = 0; i < initialSize; i++) {
      const obj = this._create();
      obj.visible = false;
      this._pool.push(obj);
    }
  }

  get() {
    let obj;
    if (this._pool.length > 0) {
      obj = this._pool.pop();
    } else {
      obj = this._create();
    }
    obj.visible = true;
    this._active.push(obj);
    return obj;
  }

  release(obj) {
    obj.visible = false;
    const idx = this._active.indexOf(obj);
    if (idx !== -1) this._active.splice(idx, 1);
    if (this._reset) this._reset(obj);
    this._pool.push(obj);
  }

  releaseAll() {
    while (this._active.length > 0) {
      this.release(this._active[0]);
    }
  }

  get active() { return this._active; }
  get available() { return this._pool.length; }
}

export function aabbCollision(a, b) {
  return (
    a.min.x < b.max.x && a.max.x > b.min.x &&
    a.min.y < b.max.y && a.max.y > b.min.y &&
    a.min.z < b.max.z && a.max.z > b.min.z
  );
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
