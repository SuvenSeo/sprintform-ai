# Sprintform AI

A computer vision sports analytics tool that extracts pose landmarks from athlete videos, computes sprint/jump mechanics, and generates annotated coaching reports.

Sprintform AI is built as a public portfolio MVP. It focuses on practical CV pipeline engineering: video ingestion, pose extraction, biomechanical feature engineering, annotated output video, frame-by-frame dashboard UX, and report exports.

## Scope

This is not medical software and does not claim professional biomechanical accuracy. The MVP reports 2D single-camera normalized estimates. Camera angle, lens distortion, occlusion, clothing, and frame rate can materially affect the numbers.

## Features

- Public Vercel upload analysis runs in the browser with vendored MediaPipe Pose assets.
- FastAPI upload and sample-analysis API.
- OpenCV video decoding and annotated MP4 rendering.
- MediaPipe pose landmark extraction for browser uploads and the local Python worker.
- Synthetic fallback/sample pipeline so the public demo runs without private athlete footage.
- Sprint/jump-focused metrics: trunk lean, knee angles, arm angles, ankle separation proxy, and hip-height rhythm.
- SQLite job metadata.
- JSON and PDF report export.
- Next.js App Router analysis workstation with video, timeline, metrics, charts, and exports.
- Pytest coverage for core metric and API behavior.

## Architecture

```mermaid
flowchart LR
    U["Video Upload"] --> BP["Browser MediaPipe Pose"]
    BP --> BM["Client Metric Computation"]
    BP --> BV["Canvas/WebM Annotated Renderer"]
    BM --> UI["Next.js Analysis Dashboard"]
    BV --> UI
    S["Sample / Local API Flow"] --> API["FastAPI Job API"]
    API --> Q["Local Background Task"]
    Q --> P["Pose Extraction Worker"]
    P --> M["Metric Computation"]
    P --> V["Annotated Video Renderer"]
    M --> DB[("SQLite job metadata")]
    V --> FS["Local artifacts: MP4 / JSON / PDF"]
    DB --> API
    FS --> API
    API --> UI["Next.js Analysis Dashboard"]
```

## Run Locally

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`, then upload a browser-decodable sprint/jump clip or click `Sample` to generate a synthetic sprint clip and a full analysis report.

## Public Deployment

The Vercel deployment hosts the Next.js workstation from `frontend`.

- Upload analysis runs fully in the browser using `@mediapipe/pose` assets vendored under `frontend/public/mediapipe/pose`.
- The browser path samples up to 20 seconds / 160 frames, computes sprint/jump metrics, renders an annotated WebM, and exports JSON/PDF reports.
- The FastAPI/OpenCV worker remains available for local backend processing and annotated MP4 generation.
- The sample button uses the local API when available and falls back to bundled demo artifacts under `frontend/public/demo` on Vercel.

Browser uploads require a video format the browser can decode. Phone/camera H.264 MP4/MOV and WebM files are the intended inputs.

## Tests

```powershell
cd backend
.\.venv\Scripts\python -m pytest
```

```powershell
cd frontend
npm run lint
npm run build
```

## Pose Model Notes

The public upload path uses MediaPipe Pose in the browser. The Python `PoseExtractor` class also uses MediaPipe when the Python dependency is installed, and otherwise falls back to deterministic synthetic landmarks for the bundled sample/demo path. That fallback keeps the public project self-contained and avoids private athlete footage.

Recommended next step: compare MediaPipe against Ultralytics YOLO pose on public sprint/jump clips with documented limitations and confidence scoring.
