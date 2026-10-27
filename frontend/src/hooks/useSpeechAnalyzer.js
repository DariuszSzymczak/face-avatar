import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeText } from "@/lib/speechEmotion";

const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

// Free speech analysis: browser speech recognition (pl-PL) + local keyword emotion model + mic volume.
export function useSpeechAnalyzer(onResult) {
  const [active, setActive] = useState(false);
  const [interim, setInterim] = useState("");
  const volumeRef = useRef(0);
  const ctxRef = useRef(null);
  const streamRef = useRef(null);
  const recRef = useRef(null);
  const runningRef = useRef(false);
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  const stop = useCallback(() => {
    runningRef.current = false;
    recRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close();
    ctxRef.current = null;
    volumeRef.current = 0;
    setInterim("");
    setActive(false);
  }, []);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const tick = () => {
      if (!ctxRef.current) return;
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      volumeRef.current = Math.sqrt(sum / buf.length);
      requestAnimationFrame(tick);
    };
    tick();
    runningRef.current = true;
    setActive(true);

    if (!SR) return;
    const rec = new SR();
    rec.lang = "pl-PL";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript.trim();
        if (e.results[i].isFinal) {
          if (text) cbRef.current?.({ text, ...analyzeText(text) });
        } else live += text;
      }
      setInterim(live);
    };
    rec.onend = () => runningRef.current && setTimeout(() => runningRef.current && rec.start(), 200);
    rec.onerror = (e) => e.error === "not-allowed" && stop();
    recRef.current = rec;
    rec.start();
  }, [stop]);

  useEffect(() => stop, [stop]);
  return { active, interim, supported: !!SR, volumeRef, start, stop };
}
