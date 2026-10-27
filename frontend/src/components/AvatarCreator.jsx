import { useEffect, useRef, useState } from "react";
import { Upload, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApi, useAvatarImages } from "@/lib/api";
import { STYLES, EMOTION_MAP } from "@/lib/emotions";

const TOTAL = 6;
const LABELS = { ...Object.fromEntries(Object.entries(EMOTION_MAP).map(([k, v]) => [k, v.label])), talking: "Mówienie" };

export default function AvatarCreator({ onReady }) {
  const api = useApi();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [style, setStyle] = useState("classic");
  const [job, setJob] = useState(null);
  const urls = useAvatarImages(job);

  useEffect(() => {
    if (!job || job.status !== "processing") return;
    const id = setInterval(async () => {
      const a = await api({ url: `/avatars/${job.id}` });
      setJob(a);
      if (a.status === "ready") { toast.success("Avatar gotowy!"); onReady(a); }
      if (a.status === "failed") { toast.error(a.error || "Generowanie nie powiodło się"); onReady(null); }
    }, 3000);
    return () => clearInterval(id);
  }, [job, api, onReady]);

  const pick = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const generate = async () => {
    const fd = new FormData();
    fd.append("photo", file);
    fd.append("style", style);
    try {
      setJob(await api({ url: "/avatars", method: "post", data: fd }));
    } catch (e) {
      toast.error(e.response?.data?.detail || "Błąd wysyłania zdjęcia");
    }
  };

  const busy = job?.status === "processing";
  return (
    <div className="grid grid-cols-12 gap-5">
      <section className="panel col-span-12 lg:col-span-5 space-y-5 rise">
        <div>
          <p className="caption">Krok 1</p>
          <h2 className="font-display text-2xl font-bold mt-1">Wgraj swoje zdjęcie</h2>
        </div>
        <button type="button" data-testid="avatar-photo-dropzone" onClick={() => inputRef.current.click()}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
          className="dropzone">
          {preview ? <img src={preview} alt="podgląd" className="h-full w-full object-cover rounded-xl" /> : (
            <span className="flex flex-col items-center gap-2 text-slate-400"><Upload /> Przeciągnij zdjęcie lub kliknij<small className="text-xs">Najlepiej twarz na wprost, dobre światło</small></span>
          )}
        </button>
        <input ref={inputRef} data-testid="avatar-photo-upload-input" type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files[0])} />
        <div>
          <p className="caption mb-2">Krok 2 · Styl anime</p>
          <div className="grid grid-cols-2 gap-2" data-testid="avatar-style-select">
            {STYLES.map((s) => (
              <button key={s.key} data-testid={`avatar-style-${s.key}`} onClick={() => setStyle(s.key)} className={`style-pill ${style === s.key ? "on" : ""}`}>{s.label}</button>
            ))}
          </div>
        </div>
        <Button data-testid="avatar-generate-button" disabled={!file || busy} onClick={generate} className="btn-primary w-full h-12 text-base">
          {busy ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />} {busy ? "Generuję…" : "Generuj Avatara Anime"}
        </Button>
      </section>

      <section className="panel col-span-12 lg:col-span-7 rise" style={{ animationDelay: "80ms" }}>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="caption">Krok 3</p>
            <h2 className="font-display text-2xl font-bold mt-1">Warianty emocji</h2>
          </div>
          {job && <span className="font-mono text-xs text-slate-400" data-testid="avatar-progress">{job.progress}/{TOTAL}</span>}
        </div>
        {job && <div className="h-1.5 rounded-full bg-white/5 mb-5 overflow-hidden"><div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width] duration-700" style={{ width: `${(job.progress / TOTAL) * 100}%` }} /></div>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.keys(LABELS).map((k) => (
            <div key={k} className="variant" data-testid={`avatar-variant-card-${k}`}>
              {urls[k] ? <img src={urls[k]} alt={k} className="w-full h-full object-cover" /> : (
                <div className={`w-full h-full grid place-items-center ${busy ? "shimmer" : ""}`}><span className="text-xs text-slate-500">{busy ? "rysuję…" : "—"}</span></div>
              )}
              <span className="variant-label">{LABELS[k]}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-4">Generowanie trwa ok. 30–90 sekund. Najpierw powstaje portret bazowy, potem warianty emocji.</p>
      </section>
    </div>
  );
}
