// Generates a fully original, royalty-free ~15s deep/sexy TECHNO bed as a WAV.
// Pure Node, no ffmpeg. Slower swung groove (123 BPM), rolling sub-bass, deep
// kick, sultry minor pad, echoed arp, sidechain pump, and a climactic impact
// that resolves on a sustained A-minor chord. Heavy low-end via a low-shelf.
import { writeFileSync, mkdirSync } from "node:fs";

const SR = 44100;
const DUR = 15.0; // matches the 450f @ 30fps video exactly
const N = Math.floor(SR * DUR);
const BPM = 123;
const beat = 60 / BPM; // ~0.4878s
const SWING = 0.06 * beat; // push offbeats for a sexy shuffle
const left = new Float64Array(N);
const right = new Float64Array(N);

const noteFreq = (semisFromA4) => 440 * Math.pow(2, semisFromA4 / 12);
const clamp = (v) => Math.max(-1, Math.min(1, v));
function add(idx, l, r) {
  if (idx < 0 || idx >= N) return;
  left[idx] += l;
  right[idx] += r;
}

// Sidechain pump LFO (per beat) applied to tonal/sub elements.
function pump(t) {
  const ph = ((t % beat) + beat) % beat;
  return 0.5 + 0.5 * (ph / beat);
}

// RBJ biquad bandpass — used to tame hissy noise into tight, dark "drum" ticks.
function makeBandpass(f0, Q) {
  const w0 = (2 * Math.PI * f0) / SR;
  const alpha = Math.sin(w0) / (2 * Q);
  const b0 = alpha,
    b1 = 0,
    b2 = -alpha,
    a0 = 1 + alpha,
    a1 = -2 * Math.cos(w0),
    a2 = 1 - alpha;
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  return (x) => {
    const y = (b0 / a0) * x + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
}

function makeLowpass(f0, Q) {
  const w0 = (2 * Math.PI * f0) / SR;
  const alpha = Math.sin(w0) / (2 * Q);
  const cw = Math.cos(w0);
  const b0 = (1 - cw) / 2,
    b1 = 1 - cw,
    b2 = (1 - cw) / 2,
    a0 = 1 + alpha,
    a1 = -2 * cw,
    a2 = 1 - alpha;
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  return (x) => {
    const y = (b0 / a0) * x + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
}

// Deep tom / low drum — sine with pitch drop, lots of body, no hiss.
function tom(t0, freq, gain, decay = 0.22) {
  const s0 = Math.floor(t0 * SR);
  const len = Math.floor(decay * 1.8 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = freq * (1 + 0.6 * Math.exp(-t * 24)); // quick pitch drop
    const s = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / decay) * gain;
    add(s0 + i, s, s);
  }
}

// Snare: a tom body + a short, dark band-passed noise (not white hiss).
function snare(t0, gain = 0.5) {
  const s0 = Math.floor(t0 * SR);
  const len = Math.floor(0.2 * SR);
  const bp = makeBandpass(1900, 1.1);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const body = Math.sin(2 * Math.PI * 180 * (1 + 0.5 * Math.exp(-t * 26)) * t) * Math.exp(-t * 22) * 0.8;
    const noise = bp(Math.random() * 2 - 1) * Math.exp(-t * 26) * 0.5;
    const s = (body + noise) * gain;
    add(s0 + i, s * 0.92, s);
  }
}

// ---- Drums ----
function kick(t0, gain = 1) {
  const s0 = Math.floor(t0 * SR);
  const len = Math.floor(0.42 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 125 * Math.exp(-t * 28) + 42; // deep pitch drop
    const click = i < 70 ? (Math.random() * 2 - 1) * 0.4 * Math.exp(-t * 350) : 0;
    const body = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 6.0);
    const sub = Math.sin(2 * Math.PI * 44 * t) * Math.exp(-t * 5.0) * 0.6; // extra low thump
    const s = (body + sub + click) * gain;
    add(s0 + i, s, s);
  }
}

function clap(t0, gain = 0.5) {
  const s0 = Math.floor(t0 * SR);
  const bursts = [0, 0.011, 0.022];
  const len = Math.floor(0.24 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let amp = 0;
    for (const b of bursts) amp += t >= b ? Math.exp(-(t - b) * 120) : 0;
    amp += Math.exp(-t * 16) * 0.6;
    const s = (Math.random() * 2 - 1) * amp * gain;
    add(s0 + i, s * 0.88, s);
  }
}

function hat(t0, gain, open = false) {
  const s0 = Math.floor(t0 * SR);
  const dec = open ? 0.1 : 0.022;
  const len = Math.floor(dec * 1.6 * SR);
  // Band-passed + low-passed so it reads as a soft "tick", not broadband hiss.
  const bp = makeBandpass(open ? 5200 : 6500, 0.8);
  const lp = makeLowpass(open ? 7000 : 8500, 0.7);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const n = lp(bp(Math.random() * 2 - 1));
    const s = n * Math.exp(-t / dec) * gain;
    add(s0 + i, s, s);
  }
}

// ---- Tonal ----
// Continuous rolling sub-bass — the heavy low end.
function sub(t0, lenSec, freq, gain) {
  const s0 = Math.floor(t0 * SR);
  const len = Math.floor(lenSec * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.02) * Math.min(1, (lenSec - t) / 0.05);
    const s = Math.sin(2 * Math.PI * freq * t) * env * gain * pump(t0 + t);
    add(s0 + i, s, s);
  }
}

function bass(t0, lenSec, freq, gain) {
  const s0 = Math.floor(t0 * SR);
  const len = Math.floor(lenSec * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const saw = 2 * ((freq * t) % 1) - 1;
    const saw2 = 2 * ((freq * 1.006 * t) % 1) - 1;
    const sine = Math.sin(2 * Math.PI * freq * t);
    const subv = Math.sin(2 * Math.PI * freq * 0.5 * t);
    const env = Math.min(1, t / 0.008) * Math.exp(-t * 1.8);
    const s = (saw * 0.3 + saw2 * 0.22 + sine * 0.3 + subv * 0.7) * env * gain * pump(t0 + t);
    add(s0 + i, s, s);
  }
}

function arp(t0, lenSec, freq, gain, panR) {
  const s0 = Math.floor(t0 * SR);
  const len = Math.floor(lenSec * 3.2 * SR); // longer for echo tail
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const tri = 2 * Math.abs(2 * ((freq * t) % 1) - 1) - 1; // soft triangle
    let env = Math.min(1, t / 0.006) * Math.exp(-t * 9);
    // simple echo taps for a dreamy/sexy tail
    env += 0.4 * (t > lenSec ? Math.exp(-(t - lenSec) * 9) : 0);
    env += 0.18 * (t > lenSec * 2 ? Math.exp(-(t - lenSec * 2) * 9) : 0);
    const s = tri * env * gain * pump(t0 + t);
    add(s0 + i, s * (1 - panR), s * panR);
  }
}

function chord(t0, freqs, gain, decay, attack = 0.02, panSpread = 0.2) {
  const s0 = Math.floor(t0 * SR);
  const len = Math.floor(decay * 1.8 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.min(1, t / attack) * Math.exp(-t / decay);
    let l = 0,
      r = 0;
    freqs.forEach((f, k) => {
      const saw = 2 * ((f * t) % 1) - 1;
      const sine = Math.sin(2 * Math.PI * f * t);
      const vib = Math.sin(2 * Math.PI * 5 * t) * 0.004 * f; // subtle vibrato
      const sine2 = Math.sin(2 * Math.PI * (f + vib) * t);
      const v = (saw * 0.25 + sine * 0.4 + sine2 * 0.35) * env;
      const pan = 0.5 + (k - (freqs.length - 1) / 2) * panSpread;
      l += v * (1 - pan);
      r += v * pan;
    });
    add(s0 + i, l * gain, r * gain);
  }
}

function impactSub(t0, gain = 0.95) {
  const s0 = Math.floor(t0 * SR);
  const len = Math.floor(1.1 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 85 * Math.exp(-t * 5) + 36;
    const s = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 2.6) * gain;
    add(s0 + i, s, s);
  }
}

function crash(t0, gain = 0.4, decay = 1.6) {
  const s0 = Math.floor(t0 * SR);
  const len = Math.floor(decay * 1.4 * SR);
  // Darker, low-passed crash so the impact has weight, not white hiss.
  const lpL = makeLowpass(3500, 0.7);
  const lpR = makeLowpass(3500, 0.7);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const n = Math.random() * 2 - 1;
    const e = Math.exp(-t / decay) * gain;
    add(s0 + i, lpL(n) * e * 0.85, lpR(n) * e);
  }
}

// Low rumble that rises in pitch — a deep, drum-like riser (no white sweep).
function subRise(t0, lenSec, gain) {
  const s0 = Math.floor(t0 * SR);
  const len = Math.floor(lenSec * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const p = t / lenSec; // 0..1
    const f = 40 + p * 70; // 40 -> 110 Hz
    const s = Math.sin(2 * Math.PI * f * t) * (0.3 + 0.7 * p) * gain;
    add(s0 + i, s, s);
  }
}

// ---- Arrangement ----
const IMPACT = 12.93;
const progOffsets = [0, 0, -4, -2]; // A, A, F, G per bar (semitones from A)

for (let b = 0; b < 64; b++) {
  const t0 = b * beat;
  if (t0 >= IMPACT - 1.0) break;
  const main = b >= 8;
  const bar = Math.floor(b / 4);
  const root = progOffsets[bar % progOffsets.length];

  if (b >= 1) kick(t0, main ? 1.25 : 0.6 + 0.08 * b);

  // hats with swing on the offbeat (a touch louder/busier = more drums)
  hat(t0, main ? 0.18 : 0.06);
  hat(t0 + beat / 2 + SWING, main ? 0.24 : 0.09, true);
  if (main) {
    hat(t0 + beat / 4, 0.1);
    hat(t0 + (3 * beat) / 4 + SWING, 0.1);
  }

  // Extra deep drum layer: offbeat mid-tom groove + tom body under the backbeat.
  if (main) {
    tom(t0 + beat / 2 + SWING, 96, 0.34, 0.14);
    if (b % 2 === 1) tom(t0, 120, 0.3, 0.13); // thickens the snare hits
    if (b % 4 === 3) tom(t0 + (3 * beat) / 4, 150, 0.3, 0.12); // pickup before the bar
  }

  // Heavy rolling sub-bass on every 8th (the deep low end), swung.
  if (b >= 4) {
    sub(t0, beat * 0.5, noteFreq(root - 36), 0.5);
    sub(t0 + beat / 2 + SWING, beat * 0.5, noteFreq(root - 36), 0.42);
  }

  if (main) {
    if (b % 2 === 1) snare(t0, 0.5); // deep backbeat instead of hissy clap
    bass(t0, beat * 0.46, noteFreq(root - 24), 0.26);
    bass(t0 + beat / 2 + SWING, beat * 0.42, noteFreq(root - 24), 0.24);
    // sexy echoed arp (sparser: 8ths, not 16ths)
    const steps = [12, 15, 19, 14];
    for (let s = 0; s < 2; s++) {
      const off = steps[(b * 2 + s) % steps.length];
      arp(t0 + (s * beat) / 2 + (s ? SWING : 0), beat / 2, noteFreq(root + off), 0.06, s % 2 ? 0.74 : 0.26);
    }
    // sultry sustained pad per bar (minor9 feel), very soft
    if (b % 4 === 0) {
      chord(t0, [root, root + 3, root + 7, root + 10, root + 14].map((o) => noteFreq(o)), 0.035, beat * 3.6, 0.4, 0.22);
    }
  }
}

// ---- Riser into the impact: deep tom roll + rising sub rumble ----
{
  const riseStart = IMPACT - 1.1;
  subRise(riseStart, 1.1, 0.5);
  let t = riseStart;
  let gap = 0.2;
  let pitch = 90;
  for (let k = 0; k < 64 && t < IMPACT - 0.02; k++) {
    tom(t, pitch, 0.45 + 0.04 * k, 0.18);
    t += gap;
    gap = Math.max(0.045, gap * 0.84); // accelerate
    pitch += 6; // tighten upward into the hit
  }
}

// ---- Impact + resolving A-minor chord ----
{
  kick(IMPACT, 1.1);
  crash(IMPACT, 0.45, 1.8);
  impactSub(IMPACT, 1.0);
  const freqs = [-36, -24, -12, -9, -5, 0].map((o) => noteFreq(o)); // deep root + Am
  chord(IMPACT + 0.005, freqs, 0.13, 1.0, 0.015, 0.16);
  chord(IMPACT + 0.45, freqs, 0.055, 0.75, 0.02, 0.24);
}

// ---- Master: low-shelf bass boost, normalize, soft clip, fades ----
// One-pole lowpass, mixed back in to thicken the low end.
const a = 0.06; // ~ lowpass cutoff
let lpL = 0,
  lpR = 0;
for (let i = 0; i < N; i++) {
  lpL += a * (left[i] - lpL);
  lpR += a * (right[i] - lpR);
  left[i] += lpL * 0.9; // bass lift
  right[i] += lpR * 0.9;
}

let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
const norm = peak > 0 ? 1.0 / peak : 1;
const fin = Math.floor(0.12 * SR);
const fout = Math.floor(0.2 * SR);
// Louder: drive into a soft limiter for higher perceived loudness w/o hard clip.
const softclip = (x) => Math.tanh(x * 1.55);

const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + N * 4, 4);
buf.write("WAVE", 8);
buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write("data", 36);
buf.writeUInt32LE(N * 4, 40);

for (let i = 0; i < N; i++) {
  let g = 1;
  if (i < fin) g = i / fin;
  if (i > N - fout) g = (N - i) / fout;
  const l = clamp(softclip(left[i] * norm)) * g;
  const r = clamp(softclip(right[i] * norm)) * g;
  buf.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(r * 32767), 44 + i * 4 + 2);
}

mkdirSync("public", { recursive: true });
writeFileSync("public/music.wav", buf);
console.log("music: public/music.wav", (buf.length / 1024 / 1024).toFixed(2), "MB", DUR + "s @", BPM, "BPM");
