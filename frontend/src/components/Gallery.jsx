import { Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimeAvatar } from "@/components/AnimeAvatar";
import { NEUTRAL_FACE } from "@/lib/avatarConfig";

const FACE = { ...NEUTRAL_FACE, smile: 0.25 };

export default function Gallery({ avatars, activeId, onSelect, onDelete }) {
  if (!avatars.length) return <p className="text-slate-400 text-sm" data-testid="gallery-empty">Nie masz jeszcze żadnych avatarów.</p>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="avatar-gallery-grid">
      {avatars.map((a) => (
        <div key={a.id} className={`panel p-3 space-y-3 ${a.id === activeId ? "ring-2 ring-violet-500" : ""}`} data-testid={`gallery-card-${a.id}`}>
          <div className="aspect-square rounded-xl overflow-hidden bg-[#070912]">
            <AnimeAvatar config={a.config} face={FACE} className="w-full h-full" testId={`gallery-avatar-${a.id}`} />
          </div>
          <p className="font-semibold truncate text-sm">{a.name}</p>
          <div className="flex gap-2">
            <Button data-testid={`select-active-avatar-button-${a.id}`} onClick={() => onSelect(a)} className="btn-primary flex-1">
              <Play size={14} /> {a.id === activeId ? "Aktywny" : "Użyj"}
            </Button>
            <Button data-testid={`delete-avatar-button-${a.id}`} variant="ghost" className="btn-ghost" onClick={() => window.confirm("Usunąć tego avatara?") && onDelete(a)}><Trash2 size={14} /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}
