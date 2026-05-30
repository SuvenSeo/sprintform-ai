from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.models import AnalysisJob
from app.processor import now_iso, process_job
from app.sample import create_sample_video
from app.storage import ARTIFACT_ROOT, ensure_storage, get_job, list_jobs, save_job

app = FastAPI(title="Sprintform AI API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    ensure_storage()


def _public_job(job: AnalysisJob) -> dict:
    return {
        "id": job.id,
        "status": job.status,
        "sourceName": job.source_name,
        "createdAt": job.created_at,
        "updatedAt": job.updated_at,
        "error": job.error,
        "summary": job.summary,
        "artifacts": {
            "annotatedVideo": f"/api/jobs/{job.id}/artifacts/annotated-video" if job.annotated_video_path else None,
            "json": f"/api/jobs/{job.id}/artifacts/report-json" if job.report_json_path else None,
            "pdf": f"/api/jobs/{job.id}/artifacts/report-pdf" if job.report_pdf_path else None,
        },
    }


def _run(job: AnalysisJob) -> None:
    try:
        process_job(job)
    except Exception as exc:
        job.status = "failed"
        job.error = str(exc)
        job.updated_at = now_iso()
        save_job(job)


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "service": "sprintform-ai"}


@app.get("/api/jobs")
def jobs() -> list[dict]:
    return [_public_job(job) for job in list_jobs()]


@app.post("/api/analyze/sample")
def analyze_sample(background_tasks: BackgroundTasks) -> dict:
    job_id = uuid.uuid4().hex
    job_dir = ARTIFACT_ROOT / job_id
    input_path = create_sample_video(job_dir / "sample-sprint.mp4")
    created_at = now_iso()
    job = AnalysisJob(job_id, "queued", "synthetic-sprint-sample.mp4", created_at, created_at, input_path)
    save_job(job)
    background_tasks.add_task(_run, job)
    return _public_job(job)


@app.post("/api/analyze/upload")
def analyze_upload(background_tasks: BackgroundTasks, file: UploadFile = File(...)) -> dict:
    if not file.filename or not file.filename.lower().endswith((".mp4", ".mov", ".avi", ".mkv")):
        raise HTTPException(status_code=400, detail="Upload a video file with mp4, mov, avi, or mkv extension.")
    job_id = uuid.uuid4().hex
    job_dir = ARTIFACT_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    input_path = job_dir / Path(file.filename).name
    with input_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    created_at = now_iso()
    job = AnalysisJob(job_id, "queued", file.filename, created_at, created_at, input_path)
    save_job(job)
    background_tasks.add_task(_run, job)
    return _public_job(job)


@app.get("/api/jobs/{job_id}")
def job_detail(job_id: str) -> dict:
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _public_job(job)


@app.get("/api/jobs/{job_id}/report")
def report(job_id: str) -> FileResponse:
    job = get_job(job_id)
    if not job or not job.report_json_path:
        raise HTTPException(status_code=404, detail="Report not ready")
    return FileResponse(job.report_json_path, media_type="application/json")


@app.get("/api/jobs/{job_id}/artifacts/{artifact}")
def artifact(job_id: str, artifact: str) -> FileResponse:
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    paths = {
        "annotated-video": (job.annotated_video_path, "video/mp4", "annotated.mp4"),
        "report-json": (job.report_json_path, "application/json", "report.json"),
        "report-pdf": (job.report_pdf_path, "application/pdf", "report.pdf"),
    }
    if artifact not in paths:
        raise HTTPException(status_code=404, detail="Artifact not found")
    path, media_type, filename = paths[artifact]
    if not path:
        raise HTTPException(status_code=404, detail="Artifact not ready")
    return FileResponse(path, media_type=media_type, filename=filename)

