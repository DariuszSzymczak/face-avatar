import { useCallback, useEffect, useRef, useState } from "react";
import { Video, VideoOff, Mic, MicOff, Crosshair, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar3D } from "@/components/Avatar3D";
import { EmotionMeters } from "@/components/EmotionMeters";
import EmotionSettings from "@/components/EmotionSettings";
import { useFaceTracker } from "@/hooks/useFaceTracker";
import { useSpeechAnalyzer } from "@/hooks/useSpeechAnalyzer";
import { faceEmotions, dominant, EMOTIONS, EMOTION_MAP, DEFAULT_PARAMS } from "@/lib/emotions";
import { NEUTRAL_FACE } from "@/lib/avatarConfig";

const ZERO = { joy: 0, sadness: 0, anger: 0, surprise: 0, neutral: 1 };
const loadParams = () => {
  try { return { ...DEFAULT_PARAMS, ...JSON.parse(localStorage.getItem("emotionParams")) }; } catch { return DEFAULT_PARAMS; }
};
const avg = (a, b) => ((a || 0) + (b || 0)) / 2;
const lerp = (a, b, t) => a + (b - a) * t;

// Turns raw blendshapes + smoothed emotions into avatar facial features.
function features(bs, s, talk, autoBlink) {
  const b = (n) => bs?.[n] || 0;
  return {
    blinkL: bs ? b("eyeBlinkLeft") : autoBlink,
    blinkR: bs ? b("eyeBlinkRight") : autoBlink,
    lookX: bs ? (b("eyeLookOutLeft") + b("eyeLookInRight") - b("eyeLookInLeft") - b("eyeLookOutRight")) / 2 : 0,
    lookY: bs ? avg(b("eyeLookDownLeft"), b("eyeLookDownRight")) - avg(b("eyeLookUpLeft"), b("eyeLookUpRight")) : 0,
    browRaise: (avg(b("browOuterUpLeft"), b("browOuterUpRight")) + b("browInnerUp") * 0.5 - avg(b("browDownLeft"), b("browDownRight"))) + s.surprise * 0.9 - s.anger * 0.3,
    browAngle: s.anger * 22 - s.sadness * 16,
    jaw: Math.min(1, Math.max(b("jawOpen") * 1.3, talk, s.surprise * 0.5)),
    smile: Math.max(avg(b("mouthSmileLeft"), b("mouthSmileRight")) * 1.2, s.joy * 0.85),
    frown: Math.max(avg(b("mouthFrownLeft"), b("mouthFrownRight")) * 1.6, s.sadness * 0.7, s.anger * 0.35),
    pucker: b("mouthPucker"),
  };
}

export default function LiveStudio({ avatar }) {
  const videoRef = useRef(null);
  const latest = useRef(null);
  const st = useRef({ ...ZERO, talk: 0, pitch: 0, yaw: 0, roll: 0, ...NEUTRAL_FACE });
  const calib = useRef({ pitch: 0, yaw: 0, roll: 0 });
  const forced = useRef({ emo: null, until: 0 });
  const speech = useRef({ scores: null, at: 0 });
  const [params, setParams] = useState(loadParams);
  const faceRef = useRef({ ...NEUTRAL_FACE });
  const [ui, setUi] = useState({ scores: ZERO, current: "neutral", pose: { pitch: 0, yaw: 0, roll: 0 } });
  const [transcript, setTranscript] = useState([]);
  const pRef = useRef(params);
  pRef.current = params;
  useEffect(() => localStorage.setItem("emotionParams", JSON.stringify(params)), [params]);

  const mic = useSpeechAnalyzer(useCallback((res) => {
    speech.current = { scores: res.scores, at: Date.now() };
    setTranscript((t) => [{ text: res.text, emotion: res.emotion, id: Date.now() }, ...t].slice(0, 8));
  }, []));
  const micActive = useRef(false);
  micActive.current = mic.active;

  const cam = useFaceTracker(videoRef, useCallback((r) => { latest.current = r; }, []));

  useEffect(() => {
    let raf, nextBlink = performance.now() + 2000;
    const loop = (t) => {
      const s = st.current, P = pRef.current, r = latest.current;
      let target = r ? faceEmotions(r.blendshapes, P) : { ...ZERO };
      const sp = speech.current;
      const w = sp.scores ? Math.max(0, 1 - (Date.now() - sp.at) / (P.speechDecay * 1000)) * P.speechWeight : 0;
      if (w > 0) for (const k in target) target[k] = target[k] * (1 - w) + (sp.scores[k] || 0) * w;
      if (forced.current.emo && Date.now() < forced.current.until) target = { joy: 0, sadness: 0, anger: 0, surprise: 0, neutral: 0, [forced.current.emo]: 1 };
      for (const k in ZERO) s[k] += (target[k] - s[k]) * P.smoothing;

      const vol = micActive.current ? mic.volumeRef.current * 8 : 0;
      s.talk += (Math.min(1, vol * P.talkGain) - s.talk) * 0.35;
      const pose = r ? r.pose : { pitch: 0, yaw: 0, roll: 0 };
      for (const k of ["pitch", "yaw", "roll"]) s[k] += ((pose[k] - (r ? calib.current[k] : 0)) * P.headStrength - s[k]) * 0.3;

      let blink = 0;
      const d = t - nextBlink;
      if (d > 0 && d < 160) blink = Math.sin((d / 160) * Math.PI);
      if (d >= 160) nextBlink = t + 2500 + Math.random() * 3000;
      const ft = features(r?.blendshapes, s, s.talk * P.talkGain, blink);
      const out = {};
      for (const k in ft) out[k] = lerp(face0(k), ft[k], k.startsWith("blink") ? 0.75 : 0.45);
      Object.assign(s, out);
      const m = P.mirror ? -1 : 1;
      faceRef.current = { ...out, blinkL: P.mirror ? out.blinkR : out.blinkL, blinkR: P.mirror ? out.blinkL : out.blinkR, lookX: out.lookX * m, yaw: s.yaw * m, pitch: s.pitch, roll: s.roll * m, joy: s.joy, sadness: s.sadness, anger: s.anger, surprise: s.surprise };
      raf = requestAnimationFrame(loop);
    };
    const face0 = (k) => st.current[k] ?? 0;
    raf = requestAnimationFrame(loop);
    const id = setInterval(() => {
      const s = st.current;
      const scores = { joy: s.joy, sadness: s.sadness, anger: s.anger, surprise: s.surprise, neutral: s.neutral };
      setUi({ scores, current: dominant(scores), pose: { pitch: s.pitch, yaw: s.yaw, roll: s.roll } });
    }, 150);
    return () => { cancelAnimationFrame(raf); clearInterval(id); };
  }, [mic.volumeRef]);

  const toggleMic = async () => {
    if (mic.active) return mic.stop();
    try { await mic.start(); } catch { alert("Brak dostępu do mikrofonu"); }
  };

  const cur = EMOTION_MAP[ui.current];
  return (
    <div className="grid grid-cols-12 gap-5">
      <section className="panel col-span-12 md:col-span-4 lg:col-span-3 space-y-4 rise">
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
        <Button data-testid="live-calibrate-button" variant="ghost" className="w-full btn-ghost" onClick={() => (calib.current = { ...(latest.current?.pose || calib.current) })} disabled={cam.status !== "running"}>
          <Crosshair size={16} /> Kalibruj pozycję głowy
        </Button>
        <div>
          <p className="caption mb-2">Test emocji</p>
          <div className="grid grid-cols-2 gap-2">
            {EMOTIONS.filter((e) => e.key !== "neutral").map((e) => (
              <button key={e.key} data-testid={`sim-emotion-${e.key}`} onClick={() => (forced.current = { emo: e.key, until: Date.now() + 2500 })} className="chip" style={{ borderColor: `${e.color}66`, color: e.color }} disabled={!avatar}>{e.label}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="col-span-12 md:col-span-8 lg:col-span-6 rise" style={{ animationDelay: "80ms" }}>
        <div className="stage" data-testid="live-avatar-canvas-element">
          <div className="stage-glow" style={{ background: `radial-gradient(circle at 50% 55%, ${cur.color}44, transparent 65%)` }} />
          <div className="stage-grid" />
          {avatar ? (
            <Avatar3D config={avatar.config} faceRef={faceRef} className="absolute inset-0" testId="live-avatar-3d" />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-slate-400 text-sm px-8 text-center" data-testid="stage-empty">Najpierw stwórz avatara w zakładce „Kreator Avatara”.</div>
          )}
          <div className="absolute top-4 left-4 emotion-chip" style={{ color: cur.color, borderColor: `${cur.color}66` }} data-testid="live-current-emotion">
            <span className="dot" style={{ background: cur.color }} /> {cur.label}
          </div>
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
          {!mic.supported && <p className="text-xs text-amber-300 mb-2" data-testid="speech-unsupported">Rozpoznawanie mowy działa w Chrome i Edge. Tu avatar ruszy tylko ustami.</p>}
          <div className="space-y-2 max-h-56 overflow-auto pr-1" data-testid="live-speech-transcript">
            {mic.interim && <p className="text-sm italic text-slate-400" data-testid="live-speech-interim">{mic.interim}…</p>}
            {!transcript.length && !mic.interim && <p className="text-xs text-slate-500">{mic.active ? "Mów coś po polsku…" : "Włącz mikrofon, aby analizować ton wypowiedzi."}</p>}
            {transcript.map((t) => (
              <div key={t.id} className="rounded-lg bg-white/5 p-2 text-sm">
                <span className="text-[10px] font-mono uppercase mr-2" style={{ color: EMOTION_MAP[t.emotion]?.color }}>{EMOTION_MAP[t.emotion]?.label}</span>
                {t.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="col-span-12">
        <EmotionSettings params={params} setParams={setParams} onReset={() => setParams(DEFAULT_PARAMS)} />
      </div>
    </div>
  );
}
