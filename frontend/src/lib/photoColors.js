import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let imageLandmarker = null;
async function getImageLandmarker() {
  if (!imageLandmarker) {
    const fileset = await FilesetResolver.forVisionTasks("/mediapipe");
    imageLandmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate: "CPU" },
      runningMode: "IMAGE",
      numFaces: 1,
    });
  }
  return imageLandmarker;
}

const toHex = ([r, g, b]) => `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb([h, s, l]) {
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

const animeize = (rgb, sat, minL, maxL) => {
  const [h, s, l] = rgbToHsl(rgb);
  return toHex(hslToRgb([h, Math.min(1, s * sat), Math.max(minL, Math.min(maxL, l))]));
};

// Detect the face in a photo and pick skin / hair / eye colours from it (runs fully in the browser).
export async function colorsFromPhoto(file) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = URL.createObjectURL(file);
  });
  const scale = Math.min(1, 720 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const lm = (await getImageLandmarker()).detect(canvas).faceLandmarks?.[0];
  if (!lm) return null;

  const W = canvas.width, H = canvas.height;
  const sample = (x, y, r) => {
    const px = Math.round(x * W), py = Math.round(y * H);
    const x0 = Math.max(0, px - r), y0 = Math.max(0, py - r);
    const d = ctx.getImageData(x0, y0, Math.max(1, Math.min(W - x0, r * 2)), Math.max(1, Math.min(H - y0, r * 2))).data;
    const acc = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) { acc[0] += d[i]; acc[1] += d[i + 1]; acc[2] += d[i + 2]; }
    const n = d.length / 4;
    return acc.map((v) => v / n);
  };
  const avg = (...c) => [0, 1, 2].map((i) => c.reduce((a, v) => a + v[i], 0) / c.length);
  const faceH = lm[152].y - lm[10].y;
  const r = Math.max(2, Math.round(faceH * H * 0.03));

  const skin = avg(sample(lm[50].x, lm[50].y, r), sample(lm[280].x, lm[280].y, r), sample(lm[151].x, lm[151].y, r));
  const hair = avg(
    sample(lm[10].x, lm[10].y - faceH * 0.16, r),
    sample(lm[54].x, lm[54].y - faceH * 0.1, r),
    sample(lm[284].x, lm[284].y - faceH * 0.1, r)
  );
  const eyes = lm.length > 473 ? avg(sample(lm[468].x, lm[468].y, 1), sample(lm[473].x, lm[473].y, 1)) : [80, 50, 30];

  return {
    skinColor: animeize(skin, 0.9, 0.6, 0.9),
    hairColor: animeize(hair, 1.25, 0.1, 0.8),
    eyeColor: animeize(eyes, 1.8, 0.28, 0.5),
  };
}
