# Demo Evidence

This file records local proof from the MVP build.

## Expected Flow

1. Start FastAPI from `backend`.
2. Start Next.js from `frontend`.
3. Open `http://localhost:3000`.
4. Upload a browser-decodable sprint/jump clip or click `Sample`.
5. Wait for a completed job.
6. Confirm the annotated video, frame dashboard, JSON export, and PDF export are available.

## Commands To Re-run

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m pytest
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

```powershell
cd frontend
npm install
npm run build
npm run dev
```

## Local Verification From This Build

- `.\.venv\Scripts\python -m pytest`: 3 passed.
- `npm run lint`: passed.
- `npm run build`: Next.js production build passed.
- Backend smoke processed `demo-smoke` and created `artifacts/demo-smoke/annotated.mp4`, `report.json`, and `report.pdf`.
- Runtime API check on `http://127.0.0.1:8001/api/health`: `{"ok":true,"service":"sprintform-ai"}`.
- Headless Chrome dashboard check on `http://127.0.0.1:3001`: complete job visible, annotated video element present, and JSON/PDF/video export links present.
- Screenshot evidence: `demo/browser-dashboard.png`.
- Browser text evidence: `demo/browser-check.json`.
- Vercel mode uses bundled demo artifacts from `frontend/public/demo` when the local FastAPI API is unavailable.
- `VERCEL=1 npm run dev -- --hostname 127.0.0.1 --port 3002` plus headless Chrome: Sample button loaded `/demo/annotated.mp4`, `/demo/report.json`, and `/demo/report.pdf`.
- Vercel-mode screenshot evidence: `demo/vercel-mode-dashboard.png`.
- Vercel-mode browser text evidence: `demo/vercel-mode-browser-check.json`.
- Browser upload processing was verified with a generated WebM runner clip in headless Chrome: MediaPipe Pose loaded from pinned runtime assets, the upload completed, and JSON/PDF/annotated video export links were created as Blob URLs.
- Browser upload evidence files: `demo/browser-upload-check.json` and `demo/browser-upload-dashboard.png`.
- Public Vercel upload path is expected to produce annotated WebM output because browser-native recording uses `MediaRecorder`.
- Bundled sample fallback uses `frontend/public/demo/annotated.webm` plus `sample-poster.png`; the earlier MP4 fallback used an `FMP4` codec that could show a black/zero-duration video in Chrome.
- Sample fallback browser evidence files: `demo/sample-browser-check.json` and `demo/sample-dashboard.png`.
