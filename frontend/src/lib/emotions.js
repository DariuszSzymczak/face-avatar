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

const avg = (...v) => v.reduce((a, b) => a + b, 0) / v.length;
const clamp = (v) => Math.max(0, Math.min(1, v));

// Map MediaPipe blendshapes to emotion scores (0..1).
export function faceEmotions(bs, sensitivity = 1) {
  const s = (n) => (bs[n] || 0) * sensitivity;
  const joy = clamp(avg(s("mouthSmileLeft"), s("mouthSmileRight")) * 1.4 + avg(s("cheekSquintLeft"), s("cheekSquintRight")) * 0.4);
  const sadness = clamp(avg(s("mouthFrownLeft"), s("mouthFrownRight")) * 2 + s("browInnerUp") * 0.6 + avg(s("mouthPressLeft"), s("mouthPressRight")) * 0.4 - joy * 0.5);
  const anger = clamp(avg(s("browDownLeft"), s("browDownRight")) * 1.6 + avg(s("noseSneerLeft"), s("noseSneerRight")) * 1.2 - joy * 0.4);
  const surprise = clamp(avg(s("eyeWideLeft"), s("eyeWideRight")) * 1.6 + avg(s("browOuterUpLeft"), s("browOuterUpRight")) * 1.2 + s("jawOpen") * 0.3 - anger * 0.5);
  const neutral = clamp(1 - Math.max(joy, sadness, anger, surprise) * 1.3);
  return { joy, sadness, anger, surprise, neutral };
}

export function dominant(scores) {
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";
}
