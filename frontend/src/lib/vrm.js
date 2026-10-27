import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

const MODEL_URL = "/models/avatar.vrm";
let gltfPromise = null;
const loadBuffer = () => (gltfPromise ||= fetch(MODEL_URL).then((r) => r.arrayBuffer()));

export async function loadVrm() {
  const buf = await loadBuffer();
  const loader = new GLTFLoader();
  loader.register((p) => new VRMLoaderPlugin(p));
  const gltf = await loader.parseAsync(buf.slice(0), "/models/");
  const vrm = gltf.userData.vrm;
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);
  VRMUtils.rotateVRM0(vrm);
  vrm.scene.traverse((o) => { o.frustumCulled = false; });
  return vrm;
}

// Grayscale copy of a texture so a tint colour shows accurately.
function grayTexture(tex) {
  const img = tex.image;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  let max = 1;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 10) max = Math.max(max, 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]);
  for (let i = 0; i < d.length; i += 4) {
    const l = Math.min(255, ((0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / max) * 255);
    d[i] = d[i + 1] = d[i + 2] = l;
  }
  ctx.putImageData(data, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.flipY = tex.flipY;
  t.colorSpace = tex.colorSpace;
  t.wrapS = tex.wrapS;
  t.wrapT = tex.wrapT;
  return t;
}

const GROUPS = [
  { match: /HAIR|FaceBrow/i, key: "hairColor", gray: true },
  { match: /EyeIris/i, key: "eyeColor", gray: true },
  { match: /Tops/i, key: "shirtColor", gray: true },
  { match: /SKIN/i, key: "skinColor", gray: false, mix: 0.45 },
];

export function collectMaterials(vrm) {
  const list = [];
  const seen = new Set();
  vrm.scene.traverse((o) => {
    if (!o.isMesh) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
      if (seen.has(m)) return;
      seen.add(m);
      const g = GROUPS.find((x) => x.match.test(m.name));
      if (!g) return;
      if (g.gray && m.map?.image) {
        const gt = grayTexture(m.map);
        if (m.shadeMultiplyTexture === m.map) m.shadeMultiplyTexture = gt;
        m.map = gt;
      }
      list.push({ m, g });
    });
  });
  return list;
}

const WHITE = new THREE.Color("#ffffff");

export function applyColors(materials, config) {
  for (const { m, g } of materials) {
    const target = new THREE.Color(config[g.key]);
    const col = g.gray ? target : WHITE.clone().lerp(target, g.mix);
    m.color?.copy(col);
    if (m.shadeColorFactor) m.shadeColorFactor.copy(col.clone().multiplyScalar(g.key === "skinColor" ? 0.85 : 0.6));
  }
}
