import { useEffect, useRef, useState } from "react";
import { NEUTRAL_FACE } from "@/lib/avatarConfig";

// Idle animation for previews: periodic blink + gentle head sway.
export function useIdleFace(enabled = true) {
  const [face, setFace] = useState(NEUTRAL_FACE);
  const raf = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    let nextBlink = performance.now() + 1500;
    const loop = (t) => {
      let blink = 0;
      const d = t - nextBlink;
      if (d > 0 && d < 160) blink = Math.sin((d / 160) * Math.PI);
      if (d >= 160) nextBlink = t + 2500 + Math.random() * 2500;
      setFace({ ...NEUTRAL_FACE, blinkL: blink, blinkR: blink, yaw: Math.sin(t / 1800) * 5, roll: Math.sin(t / 2300) * 2, smile: 0.15 });
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [enabled]);
  return face;
}
