import { forwardRef } from "react";
import { EMOTIONS } from "@/lib/emotions";

// Layered emotion images; opacity/transform are driven imperatively via refs for 60fps.
export const AvatarStage = forwardRef(function AvatarStage({ urls, layerRefs, glowRef }, rigRef) {
  const layers = [...EMOTIONS.map((e) => e.key), "talking"].filter((k) => urls[k]);
  return (
    <div className="stage" data-testid="live-avatar-canvas-element">
      <div ref={glowRef} className="stage-glow" />
      <div className="stage-grid" />
      <div ref={rigRef} className="stage-rig">
        {layers.map((k) => (
          <img
            key={k}
            ref={(el) => (layerRefs.current[k] = el)}
            src={urls[k]}
            alt={k}
            className="stage-layer"
            style={{ opacity: k === "neutral" ? 1 : 0 }}
            data-testid={`avatar-layer-${k}`}
            draggable={false}
          />
        ))}
      </div>
      {!layers.length && (
        <div className="absolute inset-0 grid place-items-center text-slate-400 text-sm px-8 text-center" data-testid="stage-empty">
          Najpierw stwórz avatara w zakładce „Kreator Avatara”.
        </div>
      )}
    </div>
  );
});
