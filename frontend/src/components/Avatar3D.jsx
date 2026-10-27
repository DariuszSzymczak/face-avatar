import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Loader2 } from "lucide-react";
import { loadVrm, collectMaterials, applyColors } from "@/lib/vrm";
import { NEUTRAL_FACE, EXPRESSIONS } from "@/lib/avatarConfig";

const RAD = Math.PI / 180;

function idleFace(t, state, expression) {
  const d = t - state.nextBlink;
  let blink = 0;
  if (d > 0 && d < 0.16) blink = Math.sin((d / 0.16) * Math.PI);
  if (d >= 0.16) state.nextBlink = t + 2.5 + Math.random() * 2.5;
  return { ...NEUTRAL_FACE, blinkL: blink, blinkR: blink, yaw: Math.sin(t / 1.8) * 8, roll: Math.sin(t / 2.3) * 3, ...EXPRESSIONS[expression || "neutral"] };
}

function drive(vrm, f, t, lookTarget) {
  const em = vrm.expressionManager;
  em.setValue("happy", Math.min(1, Math.max(f.joy, f.smile * 0.7)));
  em.setValue("angry", f.anger);
  em.setValue("sad", f.sadness);
  em.setValue("surprised", f.surprise);
  em.setValue("aa", Math.min(1, f.jaw * 0.9));
  em.setValue("ou", Math.min(1, f.pucker * 0.8));
  em.setValue("blinkLeft", f.blinkL);
  em.setValue("blinkRight", f.blinkR);
  const h = vrm.humanoid;
  const head = h.getNormalizedBoneNode("head");
  const neck = h.getNormalizedBoneNode("neck");
  const chest = h.getNormalizedBoneNode("chest") || h.getNormalizedBoneNode("spine");
  const rx = f.pitch * RAD, ry = f.yaw * RAD, rz = f.roll * RAD;
  head.rotation.set(rx * 0.6, ry * 0.6, rz * 0.6);
  neck?.rotation.set(rx * 0.3, ry * 0.3, rz * 0.3);
  chest?.rotation.set(Math.sin(t * 1.6) * 0.01, ry * 0.1, rz * 0.1);
  h.getNormalizedBoneNode("leftUpperArm").rotation.z = -1.25;
  h.getNormalizedBoneNode("rightUpperArm").rotation.z = 1.25;
  lookTarget.position.set(f.lookX * 0.4, lookTarget.userData.y - f.lookY * 0.3, 2);
}

// Real-time 3D anime avatar (VRM). Reads facial state from faceRef every frame without React re-renders.
export const Avatar3D = ({ config, faceRef, expression, className = "relative", testId = "avatar-3d" }) => {
  const mountRef = useRef(null);
  const matsRef = useRef(null);
  const exprRef = useRef(expression);
  exprRef.current = expression;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const el = mountRef.current;
    let disposed = false, raf = 0, vrm = null;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block";
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 20);
    const light = new THREE.DirectionalLight(0xffffff, Math.PI);
    light.position.set(0.5, 1.5, 2);
    scene.add(light, new THREE.AmbientLight(0xffffff, 0.6));
    const rim = new THREE.DirectionalLight(0x8b5cf6, 1.2);
    rim.position.set(-1, 1.5, -1);
    scene.add(rim);
    const lookTarget = new THREE.Object3D();
    scene.add(lookTarget);

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const clock = new THREE.Clock();
    const idle = { nextBlink: 1.5 };
    loadVrm().then((v) => {
      if (disposed) return VRMUtilsDispose(v);
      vrm = v;
      scene.add(vrm.scene);
      matsRef.current = collectMaterials(vrm);
      applyColors(matsRef.current, config);
      vrm.update(0);
      const headY = new THREE.Vector3();
      vrm.humanoid.getNormalizedBoneNode("head").getWorldPosition(headY);
      camera.position.set(0, headY.y + 0.02, 1.15);
      camera.lookAt(0, headY.y - 0.06, 0);
      lookTarget.userData.y = headY.y;
      vrm.lookAt && (vrm.lookAt.target = lookTarget);
      setLoading(false);
    }).catch((e) => console.error("VRM load failed", e));

    const loop = () => {
      const dt = clock.getDelta(), t = clock.elapsedTime;
      if (vrm) {
        drive(vrm, faceRef?.current || idleFace(t, idle, exprRef.current), t, lookTarget);
        vrm.update(dt);
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (vrm) VRMUtilsDispose(vrm);
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (matsRef.current) applyColors(matsRef.current, config); }, [config]);

  return (
    <div ref={mountRef} className={className} data-testid={testId}>
      {loading && <div className="absolute inset-0 grid place-items-center text-slate-400 text-sm" data-testid={`${testId}-loading`}><span className="flex items-center gap-2"><Loader2 className="animate-spin" size={18} /> Ładuję model 3D…</span></div>}
    </div>
  );
};

function VRMUtilsDispose(vrm) {
  vrm.scene.traverse((o) => {
    o.geometry?.dispose();
    (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m) => m.dispose());
  });
}
