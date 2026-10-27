export const EMOTIONS = [
  { key: "joy", label: "Radość", color: "#10B981" },
  { key: "sadness", label: "Smutek", color: "#3B82F6" },
  { key: "anger", label: "Złość", color: "#EF4444" },
  { key: "surprise", label: "Zaskoczenie", color: "#F59E0B" },
  { key: "neutral", label: "Neutralny", color: "#8B5CF6" },
];

export const EMOTION_MAP = Object.fromEntries(EMOTIONS.map((e) => [e.key, e]));

export const STYLES = [
  { key: "classic", label: "Klasyczne anime" },
  { key: "shonen", label: "Shonen Bold" },
  { key: "pastel", label: "Soft Pastel" },
  { key: "chibi", label: "Chibi" },
];

// Per-emotion: gain (wzmocnienie), threshold (próg martwej strefy), enabled.
export const DEFAULT_PARAMS = {
  emotions: {
    joy: { gain: 1.4, threshold: 0.1, enabled: true },
    sadness: { gain: 1.6, threshold: 0.1, enabled: true },
    anger: { gain: 1.6, threshold: 0.12, enabled: true },
    surprise: { gain: 1.4, threshold: 0.15, enabled: true },
  },
  neutralBias: 1.3,
  smoothing: 0.18,
  speechWeight: 0.4,
  speechDecay: 8,
  headStrength: 1,
  talkGain: 1,
  mirror: true,
};

export const GLOBAL_PARAMS = [
  { key: "neutralBias", label: "Przewaga neutralnego", min: 0.5, max: 3, step: 0.1, fmt: (v) => `${v.toFixed(1)}x` },
  { key: "smoothing", label: "Szybkość reakcji", min: 0.03, max: 0.6, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  { key: "speechWeight", label: "Wpływ mowy na emocję", min: 0, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
  { key: "speechDecay", label: "Czas działania emocji z mowy", min: 2, max: 20, step: 1, fmt: (v) => `${v}s` },
  { key: "headStrength", label: "Siła ruchu głowy", min: 0, max: 2.5, step: 0.1, fmt: (v) => `${v.toFixed(1)}x` },
  { key: "talkGain", label: "Czułość ruchu ust", min: 0, max: 3, step: 0.1, fmt: (v) => `${v.toFixed(1)}x` },
];

const avg = (...v) => v.reduce((a, b) => a + b, 0) / v.length;
const clamp = (v) => Math.max(0, Math.min(1, v));

function rawFace(bs) {
  const s = (n) => bs[n] || 0;
  const joy = avg(s("mouthSmileLeft"), s("mouthSmileRight")) + avg(s("cheekSquintLeft"), s("cheekSquintRight")) * 0.3;
  const sadness = avg(s("mouthFrownLeft"), s("mouthFrownRight")) * 1.3 + s("browInnerUp") * 0.4 + avg(s("mouthPressLeft"), s("mouthPressRight")) * 0.25;
  const anger = avg(s("browDownLeft"), s("browDownRight")) + avg(s("noseSneerLeft"), s("noseSneerRight")) * 0.8;
  const surprise = avg(s("eyeWideLeft"), s("eyeWideRight")) + avg(s("browOuterUpLeft"), s("browOuterUpRight")) * 0.8 + s("jawOpen") * 0.2;
  return { joy, sadness, anger, surprise };
}

// Map MediaPipe blendshapes to emotion scores (0..1) using user parameters.
export function faceEmotions(bs, params) {
  const raw = rawFace(bs);
  const out = {};
  for (const [k, p] of Object.entries(params.emotions)) {
    out[k] = p.enabled ? clamp(((raw[k] - p.threshold) / (1 - p.threshold)) * p.gain) : 0;
  }
  out.sadness = clamp(out.sadness - out.joy * 0.5);
  out.anger = clamp(out.anger - out.joy * 0.4);
  out.surprise = clamp(out.surprise - out.anger * 0.5);
  out.neutral = clamp(1 - Math.max(out.joy, out.sadness, out.anger, out.surprise) * params.neutralBias);
  return out;
}

export function dominant(scores) {
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";
}
