import { CONFIG } from './config.js';
import {
  anthemFrequencies as anthemFrequenciesFx,
  playConfetti as playConfettiFx,
  playReveal as playRevealFx,
  playPodium as playPodiumFx,
  playAnthem as playAnthemFx,
  playDrumroll as playDrumrollFx,
  playCrowd as playCrowdFx,
} from './celebrationAudio.js';

export const anthemFrequencies = anthemFrequenciesFx;

const MAX_VOICES = 12;

class Voice {
  constructor() {
    this.active = false;
    this.nodes = [];
    this.stopTime = 0;
  }

  start(duration) {
    this.active = true;
    this.stopTime = performance.now() + duration * 1000;
  }

  addNode(node) {
    this.nodes.push(node);
  }

  release() {
    this.active = false;
    for (const n of this.nodes) {
      try {
        if (n.stop) n.stop(0);
        if (n.disconnect) n.disconnect();
      } catch (_) {}
    }
    this.nodes.length = 0;
  }
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.masterVolume = 0.35;
    this.enabled = true;
    this.initialized = false;
    this.unlocked = false;

    this.voices = [];
    for (let i = 0; i < MAX_VOICES; i++) {
      this.voices.push(new Voice());
    }
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      this.enabled = false;
    }
  }

  unlock() {
    if (!this.ctx || this.unlocked) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => { this.unlocked = true; });
    } else {
      this.unlocked = true;
    }
  }

  _canPlay() {
    return this.enabled && this.ctx && this.ctx.state === 'running';
  }

  _acquireVoice(duration) {
    for (const v of this.voices) {
      if (!v.active || performance.now() >= v.stopTime) {
        if (v.active) v.release();
        v.start(duration);
        return v;
      }
    }
    return null;
  }

  _panForX(x) {
    const half = CONFIG.CANVAS_WIDTH / 2;
    return Math.max(-1, Math.min(1, (x - half) / half));
  }

  _createPan(x) {
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = this._panForX(x);
    pan.connect(this.masterGain);
    return pan;
  }

  playClaim(x = CONFIG.CANVAS_WIDTH / 2) {
    if (!this._canPlay()) return;
    const v = this._acquireVoice(0.08);
    if (!v) return;
    const t = this.ctx.currentTime;

    const pitch = CONFIG.CLAIM_PITCH;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const pan = this._createPan(x);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, t);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(pan);

    v.addNode(osc);
    v.addNode(gain);
    v.addNode(pan);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  playPickup(type, x = CONFIG.CANVAS_WIDTH / 2) {
    if (!this._canPlay()) return;
    const v = this._acquireVoice(0.35);
    if (!v) return;
    const t = this.ctx.currentTime;
    const pan = this._createPan(x);

    const arpeggios = {
      overcharge: [523, 659, 784],
      colorbomb:  [392, 494, 587],
    };
    const notes = arpeggios[type] || [523, 659, 784];

    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteT = t + i * 0.08;

      osc.type = 'sine';
      osc.frequency.value = notes[i];

      gain.gain.setValueAtTime(0, noteT);
      gain.gain.linearRampToValueAtTime(0.15, noteT + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.12);

      osc.connect(gain);
      gain.connect(pan);

      v.addNode(osc);
      v.addNode(gain);

      osc.start(noteT);
      osc.stop(noteT + 0.12);
    }

    v.addNode(pan);
  }

  playColorBomb(x = CONFIG.CANVAS_WIDTH / 2) {
    if (!this._canPlay()) return;
    const v = this._acquireVoice(0.4);
    if (!v) return;
    const t = this.ctx.currentTime;
    const pan = this._createPan(x);

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
    oscGain.gain.setValueAtTime(0.3, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(oscGain);
    oscGain.connect(pan);
    v.addNode(osc);
    v.addNode(oscGain);
    v.addNode(pan);
    osc.start(t);
    osc.stop(t + 0.3);

    const bufferSize = this.ctx.sampleRate * 0.12;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    const noisePan = this._createPan(x);
    noise.connect(noiseGain);
    noiseGain.connect(noisePan);
    v.addNode(noise);
    v.addNode(noiseGain);
    v.addNode(noisePan);
    noise.start(t);
    noise.stop(t + 0.12);
  }

  playElimination(x = CONFIG.CANVAS_WIDTH / 2) {
    if (!this._canPlay()) return;
    const v = this._acquireVoice(0.55);
    if (!v) return;
    const t = this.ctx.currentTime;
    const pan = this._createPan(x);

    const minor = [261, 311, 233];
    for (let i = 0; i < minor.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteT = t + i * 0.14;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(minor[i], noteT);
      osc.frequency.exponentialRampToValueAtTime(minor[i] * 0.5, noteT + 0.12);

      gain.gain.setValueAtTime(0, noteT);
      gain.gain.linearRampToValueAtTime(0.14, noteT + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.13);

      osc.connect(gain);
      gain.connect(pan);

      v.addNode(osc);
      v.addNode(gain);

      osc.start(noteT);
      osc.stop(noteT + 0.13);
    }

    v.addNode(pan);
  }

  playConfetti(x = CONFIG.CANVAS_WIDTH / 2) {
    playConfettiFx(this, x);
  }

  playReveal(x = CONFIG.CANVAS_WIDTH / 2) {
    playRevealFx(this, x);
  }

  playPodium(x = CONFIG.CANVAS_WIDTH / 2) {
    playPodiumFx(this, x);
  }

  playAnthem(team) {
    playAnthemFx(this, team);
  }

  playDrumroll(x = CONFIG.CANVAS_WIDTH / 2) {
    playDrumrollFx(this, x);
  }

  playCrowd(x = CONFIG.CANVAS_WIDTH / 2) {
    playCrowdFx(this, x);
  }

  playJoin(x = CONFIG.CANVAS_WIDTH / 2) {
    if (!this._canPlay()) return;
    const v = this._acquireVoice(0.34);
    if (!v) return;
    const t = this.ctx.currentTime;
    const pan = this._createPan(x);
    const notes = [660, 990];
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteT = t + i * 0.09;
      osc.type = 'triangle';
      osc.frequency.value = notes[i];
      gain.gain.setValueAtTime(0, noteT);
      gain.gain.linearRampToValueAtTime(0.14, noteT + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.16);
      osc.connect(gain);
      gain.connect(pan);
      v.addNode(osc);
      v.addNode(gain);
      osc.start(noteT);
      osc.stop(noteT + 0.16);
    }
    v.addNode(pan);
  }

  playGift(x = CONFIG.CANVAS_WIDTH / 2) {
    if (!this._canPlay()) return;
    const v = this._acquireVoice(0.5);
    if (!v) return;
    const t = this.ctx.currentTime;
    const pan = this._createPan(x);
    const notes = [523, 659, 784, 1047];
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteT = t + i * 0.06;
      osc.type = 'sawtooth';
      osc.frequency.value = notes[i];
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, noteT);
      gain.gain.setValueAtTime(0, noteT);
      gain.gain.linearRampToValueAtTime(0.1, noteT + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.18);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(pan);
      v.addNode(osc);
      v.addNode(filter);
      v.addNode(gain);
      osc.start(noteT);
      osc.stop(noteT + 0.18);
    }
    v.addNode(pan);
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this.enabled ? this.masterVolume : 0,
        this.ctx.currentTime,
        0.05
      );
    }
  }

  setVolume(v) {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.enabled) {
      this.masterGain.gain.setTargetAtTime(
        this.masterVolume,
        this.ctx.currentTime,
        0.05
      );
    }
  }
}
