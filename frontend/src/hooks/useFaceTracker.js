import { useCallback, useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let landmarkerPromise = null;
function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks("/mediapipe");
      const opts = (delegate) => ({
        baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });
      try {
        return await FaceLandmarker.createFromOptions(fileset, opts("GPU"));
      } catch {
        return await FaceLandmarker.createFromOptions(fileset, opts("CPU"));
      }
    })();
  }
  return landmarkerPromise;
}

const DEG = 180 / Math.PI;

function poseFromMatrix(m) {
  return {
    pitch: Math.atan2(m[6], m[10]) * DEG,
    yaw: Math.asin(Math.max(-1, Math.min(1, -m[2]))) * DEG,
    roll: Math.atan2(m[1], m[0]) * DEG,
  };
}

// Webcam + MediaPipe face tracking; calls onFrame({blendshapes, pose, landmarks}) every frame.
export function useFaceTracker(videoRef, onFrame) {
  const [status, setStatus] = useState("idle");
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const cbRef = useRef(onFrame);
  cbRef.current = onFrame;

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  }, [videoRef]);

  const start = useCallback(async () => {
    try {
      setStatus("loading");
      const [stream, lm] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } }),
        getLandmarker(),
      ]);
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      setStatus("running");
      let last = -1;
      const loop = () => {
        if (video.readyState >= 2 && video.currentTime !== last) {
          last = video.currentTime;
          const r = lm.detectForVideo(video, performance.now());
          if (r.faceBlendshapes?.length) {
            const blendshapes = Object.fromEntries(r.faceBlendshapes[0].categories.map((c) => [c.categoryName, c.score]));
            const pose = r.facialTransformationMatrixes?.[0] ? poseFromMatrix(r.facialTransformationMatrixes[0].data) : { pitch: 0, yaw: 0, roll: 0 };
            cbRef.current?.({ blendshapes, pose, landmarks: r.faceLandmarks[0] });
          } else {
            cbRef.current?.(null);
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }, [videoRef]);

  useEffect(() => stop, [stop]);
  return { status, start, stop };
}
