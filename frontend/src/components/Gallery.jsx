import { Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAvatarImages } from "@/lib/api";

const GalleryCard = ({ avatar, active, onSelect, onDelete }) => {
  const urls = useAvatarImages(avatar.status === "ready" ? avatar : null);
  return (
    <div className={`panel p-3 space-y-3 ${active ? "ring-2 ring-violet-500" : ""}`} data-testid={`gallery-card-${avatar.id}`}>
      <div className="aspect-square rounded-xl overflow-hidden bg-white/5">
        {urls.neutral ? <img src={urls.neutral} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-xs text-slate-500">{avatar.status === "failed" ? "Nieudane" : "W trakcie…"}</div>}
      </div>
      <div className="flex gap-1">
        {["joy", "sadness", "anger", "surprise"].map((k) => urls[k] && <img key={k} src={urls[k]} alt={k} className="w-1/4 aspect-square rounded-md object-cover" />)}
      </div>
      <div className="flex gap-2">
        <Button data-testid={`select-active-avatar-button-${avatar.id}`} disabled={avatar.status !== "ready"} onClick={() => onSelect(avatar)} className="btn-primary flex-1">
          <Play size={14} /> {active ? "Aktywny" : "Użyj"}
        </Button>
        <Button data-testid={`delete-avatar-button-${avatar.id}`} variant="ghost" className="btn-ghost" onClick={() => onDelete(avatar)}><Trash2 size={14} /></Button>
      </div>
    </div>
  );
};

export default function Gallery({ avatars, activeId, onSelect, onDelete }) {
  if (!avatars.length) return <p className="text-slate-400 text-sm" data-testid="gallery-empty">Nie masz jeszcze żadnych avatarów.</p>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="avatar-gallery-grid">
      {avatars.map((a) => <GalleryCard key={a.id} avatar={a} active={a.id === activeId} onSelect={onSelect} onDelete={onDelete} />)}
    </div>
  );
}
