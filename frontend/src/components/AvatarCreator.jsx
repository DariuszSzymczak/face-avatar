import { useRef, useState } from "react";
import { Upload, Save, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar3D } from "@/components/Avatar3D";
import { useApi } from "@/lib/api";
import { DEFAULT_CONFIG, PALETTES } from "@/lib/avatarConfig";
import { colorsFromPhoto } from "@/lib/photoColors";
import { EMOTIONS } from "@/lib/emotions";

const COLOR_FIELDS = [
  { key: "hairColor", label: "Włosy" },
  { key: "eyeColor", label: "Oczy" },
  { key: "skinColor", label: "Skóra" },
  { key: "shirtColor", label: "Ubranie" },
];

const ColorRow = ({ field, value, onChange }) => (
  <div>
    <p className="text-xs text-slate-400 mb-2">{field.label}</p>
    <div className="flex flex-wrap items-center gap-2">
      {PALETTES[field.key].map((c) => (
        <button key={c} type="button" data-testid={`color-${field.key}-${c.slice(1)}`} onClick={() => onChange(c)} className={`swatch ${value.toLowerCase() === c.toLowerCase() ? "on" : ""}`} style={{ background: c }} aria-label={c} />
      ))}
      <input type="color" data-testid={`color-${field.key}-custom`} value={value} onChange={(e) => onChange(e.target.value)} className="swatch-input" />
    </div>
  </div>
);

export default function AvatarCreator({ onSaved }) {
  const api = useApi();
  const inputRef = useRef(null);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [name, setName] = useState("Mój avatar");
  const [photo, setPhoto] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState("neutral");
  const set = (k, v) => setConfig((c) => ({ ...c, [k]: v }));

  const pick = async (file) => {
    if (!file) return;
    setPhoto(URL.createObjectURL(file));
    setAnalyzing(true);
    try {
      const colors = await colorsFromPhoto(file);
      if (colors) { setConfig((c) => ({ ...c, ...colors })); toast.success("Kolory dobrane ze zdjęcia"); }
      else toast.error("Nie znaleziono twarzy na zdjęciu — dobierz kolory ręcznie");
    } catch (e) {
      console.error(e);
      toast.error("Nie udało się przeanalizować zdjęcia");
    } finally {
      setAnalyzing(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const a = await api({ url: "/avatars", method: "post", data: { name: name.trim() || "Avatar", config } });
      toast.success("Avatar zapisany!");
      onSaved(a);
    } catch {
      toast.error("Nie udało się zapisać");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-5">
      <section className="panel col-span-12 lg:col-span-5 space-y-5 rise">
        <div>
          <p className="caption">Krok 1</p>
          <h2 className="font-display text-2xl font-bold mt-1">Wgraj swoje zdjęcie</h2>
          <p className="text-xs text-slate-500 mt-1">Zdjęcie zostaje w Twojej przeglądarce — nic nie jest wysyłane.</p>
        </div>
        <button type="button" data-testid="avatar-photo-dropzone" onClick={() => inputRef.current.click()}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }} className="dropzone relative">
          {photo ? <img src={photo} alt="zdjęcie" className="h-full w-full object-cover rounded-xl" /> : (
            <span className="flex flex-col items-center gap-2 text-slate-400"><Upload /> Przeciągnij zdjęcie lub kliknij<small className="text-xs">Twarz na wprost, dobre światło</small></span>
          )}
          {analyzing && <span className="absolute inset-0 grid place-items-center bg-black/60 rounded-xl text-sm" data-testid="avatar-analyzing"><span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Analizuję twarz…</span></span>}
        </button>
        <input ref={inputRef} data-testid="avatar-photo-upload-input" type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files[0])} />

        <div className="space-y-4">
          <p className="caption">Krok 2 · Kolory {photo && <span className="text-cyan-300 normal-case tracking-normal"><Wand2 size={12} className="inline" /> ze zdjęcia</span>}</p>
          {COLOR_FIELDS.map((f) => <ColorRow key={f.key} field={f} value={config[f.key]} onChange={(v) => set(f.key, v)} />)}
        </div>
      </section>

      <section className="panel col-span-12 lg:col-span-7 space-y-4 rise" style={{ animationDelay: "80ms" }}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="caption">Podgląd</p>
            <h2 className="font-display text-2xl font-bold mt-1">Twój avatar anime 3D</h2>
          </div>
          <div className="flex flex-wrap gap-1 justify-end">
            {EMOTIONS.map((e) => (
              <button key={e.key} data-testid={`creator-preview-${e.key}`} onClick={() => setPreview(e.key)} className={`chip ${preview === e.key ? "on" : ""}`} style={preview === e.key ? { borderColor: e.color, color: e.color } : undefined}>{e.label}</button>
            ))}
          </div>
        </div>
        <div className="stage">
          <div className="stage-glow" style={{ background: "radial-gradient(circle at 50% 55%, #8B5CF633, transparent 65%)" }} />
          <div className="stage-grid" />
          <Avatar3D config={config} expression={preview} className="absolute inset-0" testId="creator-avatar-preview" />
        </div>
        <div className="flex gap-3">
          <Input data-testid="avatar-name-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Nazwa avatara" className="bg-white/5 border-white/10" />
          <Button data-testid="avatar-save-button" onClick={save} disabled={saving} className="btn-primary h-10 px-6">
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Zapisz i użyj
          </Button>
        </div>
      </section>
    </div>
  );
}
