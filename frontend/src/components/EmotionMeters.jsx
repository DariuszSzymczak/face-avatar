import { EMOTIONS } from "@/lib/emotions";

export const EmotionMeters = ({ scores, current }) => (
  <div className="space-y-3">
    {EMOTIONS.map((e) => {
      const v = Math.round((scores[e.key] || 0) * 100);
      return (
        <div key={e.key} data-testid={`emotion-meter-${e.key}`}>
          <div className="flex justify-between text-xs mb-1">
            <span className={current === e.key ? "text-white font-semibold" : "text-slate-400"}>{e.label}</span>
            <span className="font-mono text-slate-400">{v}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${v}%`, background: e.color, boxShadow: `0 0 12px ${e.color}` }} />
          </div>
        </div>
      );
    })}
  </div>
);
