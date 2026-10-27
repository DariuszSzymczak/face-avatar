import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/api";

const CHUNK_MS = 4000;
const MIN_PEAK = 0.04;

// Records mic in 4s chunks, measures live volume, sends voiced chunks for transcription + emotion.
export function useSpeechAnalyzer(onResult) {
  const api = useApi();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const volumeRef = useRef(0);
  const ctxRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const runningRef = useRef(false);
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  const send = useCallback(async (blob) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("audio", blob, "chunk.webm");
      const res = await api({ url: "/speech/analyze", method: "post", data: fd });
      if (res.text) cbRef.current?.(res);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }, [api]);

  const recordChunk = useCallback(() => {
    if (!runningRef.current) return;
    const rec = new MediaRecorder(streamRef.current, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "" });
    const parts = [];
    let peak = 0;
    const peakTimer = setInterval(() => { peak = Math.max(peak, volumeRef.current); }, 50);
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    rec.onstop = () => {
      clearInterval(peakTimer);
      if (peak > MIN_PEAK && parts.length) send(new Blob(parts, { type: rec.mimeType || "audio/webm" }));
      recordChunk();
    };
    rec.start();
    timerRef.current = setTimeout(() => rec.state === "recording" && rec.stop(), CHUNK_MS);
  }, [send]);

  const stop = useCallback(() => {
    runningRef.current = false;
    clearTimeout(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close();
    ctxRef.current = null;
    volumeRef.current = 0;
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
    recordChunk();
  }, [recordChunk]);

  useEffect(() => stop, [stop]);
  return { active, busy, volumeRef, start, stop };
}
