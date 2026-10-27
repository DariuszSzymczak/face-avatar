import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/api";
import LiveStudio from "@/components/LiveStudio";
import AvatarCreator from "@/components/AvatarCreator";
import Gallery from "@/components/Gallery";

const TABS = [
  { key: "live", label: "Studio na żywo" },
  { key: "create", label: "Kreator Avatara" },
  { key: "gallery", label: "Moja Galeria" },
];

export default function Studio() {
  const api = useApi();
  const [tab, setTab] = useState("live");
  const [avatars, setAvatars] = useState(null);
  const [activeId, setActiveId] = useState(localStorage.getItem("activeAvatar"));

  const load = useCallback(async () => {
    const list = await api({ url: "/avatars" });
    setAvatars(list);
    if (!list.some((a) => a.status === "ready")) setTab((t) => (t === "live" ? "create" : t));
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const select = (a) => { setActiveId(a.id); localStorage.setItem("activeAvatar", a.id); setTab("live"); };
  const ready = (avatars || []).filter((a) => a.status === "ready");
  const active = ready.find((a) => a.id === activeId) || ready[0] || null;

  const onReady = useCallback((a) => { if (a) { setActiveId(a.id); localStorage.setItem("activeAvatar", a.id); } load(); }, [load]);
  const onDelete = async (a) => { await api({ url: `/avatars/${a.id}`, method: "delete" }); toast.success("Usunięto"); load(); };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0B0E17]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 mr-auto" data-testid="app-logo">
            <span className="logo-mark"><Sparkles size={16} /></span>
            <span className="font-display font-extrabold text-lg tracking-tight">AniEmotion</span>
            <span className="hidden sm:inline text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-400/40 text-cyan-300">BETA</span>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 md:px-6 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} data-testid={`nav-tab-${t.key}`} onClick={() => setTab(t.key)} className={`tab ${tab === t.key ? "on" : ""}`}>{t.label}</button>
          ))}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {avatars === null ? <p className="text-slate-400 text-sm" data-testid="studio-loading">Ładowanie…</p> : (
          <>
            {tab === "live" && <LiveStudio key={active?.id || "none"} avatar={active} />}
            {tab === "create" && <AvatarCreator onReady={onReady} />}
            {tab === "gallery" && <Gallery avatars={avatars} activeId={active?.id} onSelect={select} onDelete={onDelete} />}
          </>
        )}
      </main>
    </div>
  );
}
