export const HAIR_STYLES = [
  { key: "short", label: "Krótkie" },
  { key: "spiky", label: "Nastroszone" },
  { key: "bob", label: "Bob" },
  { key: "long", label: "Długie" },
  { key: "ponytail", label: "Kucyk" },
];

export const PALETTES = {
  hairColor: ["#2B1D14", "#5A3A22", "#A0522D", "#E8C27A", "#1F2A44", "#C0392B", "#EC4899", "#8B5CF6", "#E5E7EB"],
  eyeColor: ["#6B3E26", "#2E86C1", "#27AE60", "#8E44AD", "#C0392B", "#F39C12", "#34495E"],
  skinColor: ["#FDE3CF", "#F6CFAE", "#E8B48F", "#C98E66", "#9C6644", "#6F4430"],
  shirtColor: ["#4C1D95", "#0E7490", "#BE123C", "#1E293B", "#15803D", "#F5F5F4"],
};

export const DEFAULT_CONFIG = {
  hairStyle: "short",
  hairColor: "#2B1D14",
  eyeColor: "#2E86C1",
  skinColor: "#F6CFAE",
  shirtColor: "#4C1D95",
  glasses: false,
  beard: false,
};

export const NEUTRAL_FACE = {
  blinkL: 0, blinkR: 0, lookX: 0, lookY: 0, browRaise: 0, browAngle: 0,
  jaw: 0, smile: 0, frown: 0, pucker: 0,
  pitch: 0, yaw: 0, roll: 0,
  joy: 0, sadness: 0, anger: 0, surprise: 0,
};

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export const EXPRESSIONS = {
  neutral: {},
  joy: { joy: 1, smile: 0.9, browRaise: 0.2 },
  sadness: { sadness: 1, frown: 0.8, browAngle: -16, browRaise: 0.1 },
  anger: { anger: 1, frown: 0.4, browAngle: 22, browRaise: -0.3, jaw: 0.15 },
  surprise: { surprise: 1, jaw: 0.6, browRaise: 1 },
};
