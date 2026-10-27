import { useCallback, useEffect, useRef, useState } from "react";
import { Video, VideoOff, Mic, MicOff, Crosshair, Loader2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AvatarStage } from "@/components/AvatarStage";
import { EmotionMeters } from "@/components/EmotionMeters";
import { useFaceTracker } from "@/hooks/useFaceTracker";
import { useSpeechAnalyzer } from "@/hooks/useSpeechAnalyzer";
import { useAvatarImages } from "@/lib/api";
import { faceEmotions, dominant, EMOTION_MAP } from "@/lib/emotions";

const ZERO = { joy: 0, sadness: 0, anger: 0, surprise: 0, neutral: 1 };
const SPEECH_DECAY_MS = 8000;

export default function LiveStudio({ avatar }) {
  const urls = useAvatarImages(avatar);
  const videoRef = useRef(null);
  const rigRef = useRef(null);
  const glowRef = useRef(null);
  const layerRefs = useRef({});
  const smooth = useRef({ ...ZERO, talk: 0, pitch: 0, yaw: 0, roll: 0 });
  const calib = useRef({ pitch: 0, yaw: 0, roll: 0 });
  const lastPose = useRef({ pitch: 0, yaw: 0, roll: 0 });
  const speech = useRef({ scores: null, at: 0 });
  const [sensitivity, setSensitivity] = useState(1.2);
  const [ui, setUi] = useState({ scores: ZERO, current: "neutral", pose: lastPose.current, face: false });
  const [transcript, setTranscript] = useState([]);
  const sensRef = useRef(sensitivity);
  sensRef.current = sensitivity;

  const mic = useSpeechAnalyzer(useCallback((res) => {
    speech.current = { scores: res.scores, at: Date.now() };
    setTranscript((t) => [{ text: res.text, emotion: res.emotion, id: Date.now() }, ...t].slice(0, 8));
  }, []));

  const onFrame = useCallback((r) => {
    const s = smooth.current;
    let target = { ...ZERO }, jaw = 0, pose = { pitch: 0, yaw: 0, roll: 0 };
    if (r) {
      target = faceEmotions(r.blendshapes, sensRef.current);
      jaw = r.blendshapes.jawOpen || 0;
      pose = r.pose;
      lastPose.current = pose;
    }
    const sp = speech.current;
    const w = sp.scores ? Math.max(0, 1 - (Date.now() - sp.at) / SPEECH_DECAY_MS) * 0.4 : 0;
    if (w > 0) for (const k in target) target[k] = target[k] * (1 - w) + (sp.scores[k] || 0) * w;
    const vol = mic.volumeRef.current;
    const talkTarget = Math.min(1, Math.max(jaw * 2.2, mic.active ? vol * 8 : 0));
    const a = 0.18;
    for (const k in ZERO) s[k] += (target[k] - s[k]) * a;
    s.talk += (talkTarget - s.talk) * 0.35;
    for (const k of ["pitch", "yaw", "roll"]) s[k] += (pose[k] - calib.current[k] - s[k]) * 0.3;
    render(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.active]);

  const render = (s) => {
    const L = layerRefs.current;
    const cur = dominant({ joy: s.joy, sadness: s.sadness, anger: s.anger, surprise: s.surprise, neutral: s.neutral });
    const emoKeys = ["joy", "sadness", "anger", "surprise"];
    emoKeys.forEach((k) => L[k] && (L[k].style.opacity = Math.min(1, s[k] * 1.6).toFixed(3)));
    if (L.talking) L.talking.style.opacity = cur === "neutral" ? Math.min(1, s.talk * 1.5).toFixed(3) : "0";
    if (rigRef.current) {
      const bob = s.talk * 4;
      rigRef.current.style.transform = `perspective(900px) translateX(${(-s.yaw * 0.8).toFixed(1)}px) translateY(${(s.pitch * 0.6 - bob).toFixed(1)}px) rotateY(${(-s.yaw * 0.9).toFixed(1)}deg) rotateX(${(-s.pitch * 0.7).toFixed(1)}deg) rotateZ(${(-s.roll).toFixed(1)}deg) scale(${(1 + s.talk * 0.015).toFixed(3)})`;
    }
    if (glowRef.current) glowRef.current.style.background = `radial-gradient(circle at 50% 55%, ${EMOTION_MAP[cur].color}55, transparent 65%)`;
  };

  const cam = useFaceTracker(videoRef, onFrame);

  useEffect(() => {
    const id = setInterval(() => {
      const s = smooth.current;
      const scores = { joy: s.joy, sadness: s.sadness, anger: s.anger, surprise: s.surprise, neutral: s.neutral };
      setUi({ scores, current: dominant(scores), pose: { pitch: s.pitch, yaw: s.yaw, roll: s.roll } });
    }, 150);
    return () => clearInterval(id);
  }, []);

  const toggleMic = async () => {
    if (mic.active) return mic.stop();
    try { await mic.start(); } catch { alert("Brak dostępu do mikrofonu"); }
  };

  const cur = EMOTION_MAP[ui.current];
  return (
    <div className="grid grid-cols-12 gap-5">
      <section className="panel col-span-12 md:col-span-4 lg:col-span-3 space-y-4 rise" style={{ animationDelay: "0ms" }}>
        <p className="caption">Kamera</p>
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black/60 border border-white/10">
          <video ref={videoRef} data-testid="live-webcam-video-element" playsInline muted className="w-full h-full object-cover -scale-x-100" />
          {cam.status !== "running" && (
            <div className="absolute inset-0 grid place-items-center text-xs text-slate-400 p-4 text-center">
              {cam.status === "loading" ? <Loader2 className="animate-spin" /> : cam.status === "error" ? "Brak dostępu do kamery" : "Kamera wyłączona"}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button data-testid="live-toggle-camera-button" onClick={cam.status === "running" ? cam.stop : cam.start} disabled={!avatar || cam.status === "loading"} className={cam.status === "running" ? "btn-ghost" : "btn-primary"}>
            {cam.status === "running" ? <VideoOff size={16} /> : <Video size={16} />} {cam.status === "running" ? "Stop" : "Kamera"}
          </Button>
          <Button data-testid="live-toggle-mic-button" onClick={toggleMic} disabled={!avatar} className={mic.active ? "btn-ghost" : "btn-cyan"}>
            {mic.active ? <MicOff size={16} /> : <Mic size={16} />} {mic.active ? "Wycisz" : "Mikrofon"}
          </Button>
        </div>
        <Button data-testid="live-calibrate-button" variant="ghost" className="w-full btn-ghost" onClick={() => (calib.current = { ...lastPose.current })} disabled={cam.status !== "running"}>
          <Crosshair size={16} /> Kalibruj pozycję głowy
        </Button>
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-2"><span>Czułość mimiki</span><span className="font-mono">{sensitivity.toFixed(1)}x</span></div>
          <Slider className="neon-vars" data-testid="live-sensitivity-slider" min={0.6} max={2.5} step={0.1} value={[sensitivity]} onValueChange={(v) => setSensitivity(v[0])} />
        </div>
      </section>

      <section className="col-span-12 md:col-span-8 lg:col-span-6 rise" style={{ animationDelay: "80ms" }}>
        <div className="relative">
          <AvatarStage ref={rigRef} urls={urls} layerRefs={layerRefs} glowRef={glowRef} />
          <div className="absolute top-4 left-4 emotion-chip" style={{ color: cur.color, borderColor: `${cur.color}66` }} data-testid="live-current-emotion">
            <span className="dot" style={{ background: cur.color }} /> {cur.label}
          </div>
          {mic.busy && <div className="absolute top-4 right-4 emotion-chip text-cyan-300" data-testid="live-speech-busy"><Activity size={14} className="animate-pulse" /> analizuję mowę</div>}
        </div>
      </section>

      <section className="panel col-span-12 lg:col-span-3 space-y-5 rise" style={{ animationDelay: "160ms" }}>
        <div>
          <p className="caption mb-3">Spektrum emocji</p>
          <EmotionMeters scores={ui.scores} current={ui.current} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center" data-testid="live-head-pose">
          {["pitch", "yaw", "roll"].map((k) => (
            <div key={k} className="rounded-lg bg-white/5 py-2">
              <div className="caption">{k}</div>
              <div className="font-mono text-sm">{ui.pose[k].toFixed(0)}°</div>
            </div>
          ))}
        </div>
        <div>
          <p className="caption mb-2">Transkrypcja mowy</p>
          <div className="space-y-2 max-h-56 overflow-auto pr-1" data-testid="live-speech-transcript">
            {!transcript.length && <p className="text-xs text-slate-500">{mic.active ? "Mów coś… analiza co ~4 sekundy." : "Włącz mikrofon, aby analizować ton wypowiedzi."}</p>}
            {transcript.map((t) => (
              <div key={t.id} className="rounded-lg bg-white/5 p-2 text-sm">
                <span className="text-[10px] font-mono uppercase mr-2" style={{ color: EMOTION_MAP[t.emotion]?.color }}>{EMOTION_MAP[t.emotion]?.label}</span>
                {t.text}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
