import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { EMOTION_MAP, GLOBAL_PARAMS } from "@/lib/emotions";

const Row = ({ label, value, fmt, testId, ...rest }) => (
  <div>
    <div className="flex justify-between text-xs text-slate-400 mb-2"><span>{label}</span><span className="font-mono text-slate-300">{fmt(value)}</span></div>
    <Slider className="neon-vars" data-testid={testId} value={[value]} {...rest} />
  </div>
);

export default function EmotionSettings({ params, setParams, onReset }) {
  const setEmo = (k, field, v) => setParams((p) => ({ ...p, emotions: { ...p.emotions, [k]: { ...p.emotions[k], [field]: v } } }));
  return (
    <section className="panel rise" data-testid="emotion-settings-panel">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-violet-400" />
          <h2 className="font-display text-xl font-bold">Parametry emocji</h2>
        </div>
        <Button data-testid="emotion-settings-reset-button" variant="ghost" className="btn-ghost" onClick={onReset}><RotateCcw size={14} /> Domyślne</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(params.emotions).map(([k, p]) => {
          const e = EMOTION_MAP[k];
          return (
            <div key={k} className="rounded-xl p-4 space-y-4 border" style={{ borderColor: `${e.color}44`, background: `${e.color}0d` }} data-testid={`emotion-param-card-${k}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: e.color }}>{e.label}</span>
                <Switch className="neon-vars data-[state=checked]:bg-violet-500" data-testid={`emotion-param-enabled-${k}`} checked={p.enabled} onCheckedChange={(v) => setEmo(k, "enabled", v)} />
              </div>
              <Row label="Wzmocnienie" value={p.gain} fmt={(v) => `${v.toFixed(1)}x`} min={0.2} max={4} step={0.1} disabled={!p.enabled} testId={`emotion-param-gain-${k}`} onValueChange={(v) => setEmo(k, "gain", v[0])} />
              <Row label="Próg aktywacji" value={p.threshold} fmt={(v) => `${Math.round(v * 100)}%`} min={0} max={0.6} step={0.01} disabled={!p.enabled} testId={`emotion-param-threshold-${k}`} onValueChange={(v) => setEmo(k, "threshold", v[0])} />
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5 mt-6">
        {GLOBAL_PARAMS.map((g) => (
          <Row key={g.key} label={g.label} value={params[g.key]} fmt={g.fmt} min={g.min} max={g.max} step={g.step} testId={`global-param-${g.key}`} onValueChange={(v) => setParams((p) => ({ ...p, [g.key]: v[0] }))} />
        ))}
      </div>
    </section>
  );
}
