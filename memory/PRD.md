# AniEmotion — PRD

## Original problem statement
"chce taką aplikacje która na podstawie mojego zdjęcia stworzy mojego avatara a potem połączy się z moją kamerką i będzie w czasie rzeczywistym tego avatara tworzyć jak coś mówię i gestykuluje emocje np złość, smutek, radość itp."
Later: "potrzebuje mieć parametryzację emocji, brak logowania tylko normalnie wchodzę i mam jak wyślę photo"

## Choices
Anime style; face + head tracking + emotion switching; speech + face; NO login (anonymous per-browser id).

## Architecture
- Backend FastAPI: /api/avatars (upload photo → Gemini Nano Banana gemini-3.1-flash-image-preview: base anime portrait + 5 variants joy/sadness/anger/surprise/talking, background task), images in Emergent Object Storage, /api/speech/analyze (Whisper pl + gpt-5.4 emotion JSON). Scoped by X-Client-Id header.
- Frontend React: MediaPipe Face Landmarker (local /public/mediapipe), blendshapes → emotions, matrix → head pose, layered emotion images crossfade + CSS 3D transform; mic 4s chunks.
- Emotion parameters (localStorage): per-emotion gain/threshold/enabled, neutral bias, smoothing, speech weight/decay, head strength, mouth sensitivity.

## Implemented
- 2026-10: MVP (Clerk login) → login removed, emotion parametrization added, friendly "no balance" errors. Tested iteration_1 (100%).

## Backlog
- P1: Hand gesture tracking (MediaPipe Hand Landmarker)
- P1: Blink / eye-closed variant
- P2: Presets of parameters, recording avatar video, virtual camera output
- Note: Emergent LLM key balance was exhausted — user must top up.
