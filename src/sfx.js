/* Synthesised sound effects (Web Audio, no audio files). Muted state is remembered per device. */
let ctx = null;
const KEY = 'cc_sound';
export const soundOn = () => localStorage.getItem(KEY) !== 'off';
export function setSound(on) { localStorage.setItem(KEY, on ? 'on' : 'off'); document.dispatchEvent(new CustomEvent('cc-sound')); }

function ac() {
  if (!soundOn()) return null;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}
function tone(freq, dur = 0.12, { type = 'sine', vol = 0.15, at = 0, slide = 0 } = {}) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur = 0.2, vol = 0.25, at = 0) {
  const c = ac(); if (!c) return;
  const b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = vol;
  s.buffer = b; s.connect(f).connect(g).connect(c.destination); s.start(c.currentTime + at);
}

export const sfx = {
  tick: () => tone(1500, 0.04, { type: 'square', vol: 0.05 }),
  beep: (hi = false) => tone(hi ? 880 : 520, 0.16, { type: 'triangle', vol: 0.18 }),
  start: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { type: 'triangle', at: i * 0.09 })); },
  wrong: () => { tone(220, 0.25, { type: 'sawtooth', vol: 0.08, slide: -90 }); tone(180, 0.3, { type: 'sawtooth', vol: 0.06, at: 0.12, slide: -60 }); },
  solved: () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.24, { type: 'triangle', vol: 0.16, at: i * 0.08 })); },
  stamp: () => { noise(0.25, 0.4); tone(90, 0.3, { type: 'sine', vol: 0.3, slide: -40 }); },
  sting: () => { tone(196, 0.6, { type: 'sawtooth', vol: 0.07 }); tone(233, 0.6, { type: 'sawtooth', vol: 0.05, at: 0.05 }); tone(277, 0.9, { type: 'sawtooth', vol: 0.05, at: 0.1 }); },
  pop: () => tone(660, 0.07, { type: 'sine', vol: 0.1, slide: 300 }),
  /** Snare-style roll that speeds up, for the build-up before each podium place. */
  drumroll: (secs = 1.2) => { let t = 0, gap = 0.09; while (t < secs) { noise(0.05, 0.12, t); t += gap; gap = Math.max(0.035, gap * 0.94); } },
  /** Short brass-like fanfare for the champions. */
  fanfare: () => {
    [[523, 0], [523, 0.16], [523, 0.32], [659, 0.5], [784, 0.9], [659, 1.15], [784, 1.3], [1047, 1.5]].forEach(([f, at], i) => {
      tone(f, i === 7 ? 1.1 : 0.22, { type: 'sawtooth', vol: 0.07, at });
      tone(f / 2, i === 7 ? 1.1 : 0.22, { type: 'triangle', vol: 0.08, at });
    });
    noise(0.6, 0.18, 1.5);
  },
  /** Crowd-style cheer: a wash of filtered noise. */
  cheer: () => { for (let i = 0; i < 6; i++) noise(0.5, 0.06, i * 0.12); },
};
