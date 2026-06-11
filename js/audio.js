// audio.js — Procedural sound effects via Web Audio API (no files needed)
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _playTone(freq, duration, type = 'sine', volume = 0.15, freqEnd = null) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (freqEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  coin() {
    this._playTone(1200, 0.08, 'sine', 0.12);
    setTimeout(() => this._playTone(1600, 0.08, 'sine', 0.12), 60);
  }

  jump() {
    this._playTone(300, 0.15, 'sine', 0.1, 600);
  }

  slide() {
    this._playTone(200, 0.12, 'sawtooth', 0.06, 100);
  }

  crash() {
    if (!this.ctx || this.muted) return;
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    source.connect(gain).connect(this.ctx.destination);
    source.start();
  }

  powerup() {
    this._playTone(400, 0.08, 'sine', 0.1);
    setTimeout(() => this._playTone(600, 0.08, 'sine', 0.1), 60);
    setTimeout(() => this._playTone(800, 0.12, 'sine', 0.1), 120);
  }

  swoosh() {
    this._playTone(400, 0.1, 'sine', 0.06, 200);
  }

  toggle() {
    this.muted = !this.muted;
    return this.muted;
  }
}
