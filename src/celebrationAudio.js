import { CONFIG } from './config.js';

const ANTHEM_ROOTS = 196;
const ANTHEM_MODES = [[0, 2, 4, 5, 7, 9, 11], [0, 2, 3, 5, 7, 8, 10]];
const ANTHEM_STEPS = [0, 2, 4, 5, 4, 7, 9, 7];

export function anthemFrequencies(teamId) {
  const seed = Math.max(1, Math.floor(Number(teamId) || 1));
  const root = ANTHEM_ROOTS * Math.pow(2, ((seed - 1) % 7) / 7);
  const mode = ANTHEM_MODES[seed % 2];
  return ANTHEM_STEPS.map((degree) => {
    const octave = Math.floor(degree / mode.length);
    return root * Math.pow(2, (mode[degree % mode.length] + octave * 12) / 12);
  });
}

export function playConfetti(engine, x = CONFIG.CANVAS_WIDTH / 2) {
  if (!engine._canPlay()) return;
  const v = engine._acquireVoice(0.55);
  if (!v) return;
  const t = engine.ctx.currentTime;
  const pan = engine._createPan(x);

  const bufferSize = Math.floor(engine.ctx.sampleRate * 0.45);
  const noiseBuffer = engine.ctx.createBuffer(1, bufferSize, engine.ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = engine.ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const noiseGain = engine.ctx.createGain();
  const filter = engine.ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2400, t);
  filter.frequency.exponentialRampToValueAtTime(500, t + 0.4);
  filter.Q.value = 0.8;
  noiseGain.gain.setValueAtTime(0.16, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(pan);
  v.addNode(noise);
  v.addNode(filter);
  v.addNode(noiseGain);
  v.addNode(pan);
  noise.start(t);
  noise.stop(t + 0.45);
}

export function playReveal(engine, x = CONFIG.CANVAS_WIDTH / 2) {
  if (!engine._canPlay()) return;
  const v = engine._acquireVoice(0.35);
  if (!v) return;
  const t = engine.ctx.currentTime;
  const pan = engine._createPan(x);

  const osc = engine.ctx.createOscillator();
  const gain = engine.ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(240, t);
  osc.frequency.exponentialRampToValueAtTime(920, t + 0.14);
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(gain);
  gain.connect(pan);
  v.addNode(osc);
  v.addNode(gain);
  v.addNode(pan);
  osc.start(t);
  osc.stop(t + 0.3);

  const thump = engine.ctx.createOscillator();
  const thumpGain = engine.ctx.createGain();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(120, t + 0.1);
  thump.frequency.exponentialRampToValueAtTime(60, t + 0.28);
  thumpGain.gain.setValueAtTime(0.2, t + 0.1);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  thump.connect(thumpGain);
  thumpGain.connect(pan);
  v.addNode(thump);
  v.addNode(thumpGain);
  thump.start(t + 0.1);
  thump.stop(t + 0.28);
}

export function playPodium(engine, x = CONFIG.CANVAS_WIDTH / 2) {
  if (!engine._canPlay()) return;
  const t = engine.ctx.currentTime;
  const pan = engine._createPan(x);
  const bells = [
    { note: 659, at: 0 },
    { note: 830, at: 0.12 },
    { note: 988, at: 0.24 },
  ];

  for (const bell of bells) {
    const v = engine._acquireVoice(0.8);
    if (!v) break;
    const noteT = t + bell.at;
    const osc = engine.ctx.createOscillator();
    const osc2 = engine.ctx.createOscillator();
    const gain = engine.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = bell.note;
    osc2.type = 'sine';
    osc2.frequency.value = bell.note * 2.01;
    gain.gain.setValueAtTime(0, noteT);
    gain.gain.linearRampToValueAtTime(0.09, noteT + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.65);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(pan);
    v.addNode(osc);
    v.addNode(osc2);
    v.addNode(gain);
    v.addNode(pan);
    osc.start(noteT);
    osc2.start(noteT);
    osc.stop(noteT + 0.65);
    osc2.stop(noteT + 0.65);
  }
}

export function playAnthem(engine, team) {
  if (!engine._canPlay()) return;
  const freqs = anthemFrequencies(team?.id);
  const t = engine.ctx.currentTime;
  const noteLen = 0.16;

  for (let i = 0; i < freqs.length; i++) {
    const v = engine._acquireVoice(noteLen + 0.2);
    if (!v) return;
    const freq = freqs[i];
    const noteT = t + i * noteLen;
    const last = i === freqs.length - 1;

    const osc = engine.ctx.createOscillator();
    const osc2 = engine.ctx.createOscillator();
    const gain = engine.ctx.createGain();
    const filter = engine.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc2.type = 'sawtooth';
    osc2.frequency.value = freq * 2;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, noteT);
    filter.frequency.exponentialRampToValueAtTime(900, noteT + (last ? 0.5 : 0.14));

    const peak = last ? 0.16 : 0.11;
    const release = last ? 0.5 : 0.14;
    gain.gain.setValueAtTime(0, noteT);
    gain.gain.linearRampToValueAtTime(peak, noteT + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, noteT + release);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(engine.masterGain);

    v.addNode(osc);
    v.addNode(osc2);
    v.addNode(filter);
    v.addNode(gain);

    osc.start(noteT);
    osc2.start(noteT);
    osc.stop(noteT + release);
    osc2.stop(noteT + release);
  }
}

export function playDrumroll(engine, x = CONFIG.CANVAS_WIDTH / 2) {
  if (!engine._canPlay()) return;
  const v = engine._acquireVoice(0.4);
  if (!v) return;
  const t = engine.ctx.currentTime;
  const pan = engine._createPan(x);
  const hits = 18;
  const span = 0.38;

  for (let i = 0; i < hits; i++) {
    const noteT = t + (i / hits) * span;
    const osc = engine.ctx.createOscillator();
    const gain = engine.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, noteT);
    osc.frequency.exponentialRampToValueAtTime(70, noteT + 0.03);
    gain.gain.setValueAtTime(0.001, noteT);
    gain.gain.linearRampToValueAtTime(0.05 + (i / hits) * 0.06, noteT + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.04);
    osc.connect(gain);
    gain.connect(pan);
    v.addNode(osc);
    v.addNode(gain);
    osc.start(noteT);
    osc.stop(noteT + 0.04);
  }
  v.addNode(pan);
}

export function playCrowd(engine, x = CONFIG.CANVAS_WIDTH / 2) {
  if (!engine._canPlay()) return;
  const v = engine._acquireVoice(1.2);
  if (!v) return;
  const t = engine.ctx.currentTime;
  const pan = engine._createPan(x);

  const bufferSize = Math.floor(engine.ctx.sampleRate * 1.1);
  const noiseBuffer = engine.ctx.createBuffer(1, bufferSize, engine.ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = engine.ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const filter = engine.ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(700, t);
  filter.frequency.linearRampToValueAtTime(1400, t + 0.4);
  filter.frequency.linearRampToValueAtTime(600, t + 1.1);
  filter.Q.value = 0.7;
  const gain = engine.ctx.createGain();
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.linearRampToValueAtTime(0.14, t + 0.25);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(pan);
  v.addNode(noise);
  v.addNode(filter);
  v.addNode(gain);
  v.addNode(pan);
  noise.start(t);
  noise.stop(t + 1.1);
}
