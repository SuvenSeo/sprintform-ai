from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import cv2

from app.metrics import frame_metrics, summarize_metrics
from app.models import AnalysisJob
from app.pose import PoseExtractor, draw_pose
from app.reports import write_json_report, write_pdf_report
from app.storage import ARTIFACT_ROOT, save_job


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def process_job(job: AnalysisJob, model_path: str | None = None) -> AnalysisJob:
    job.status = "processing"
    job.updated_at = now_iso()
    save_job(job)
    job_dir = ARTIFACT_ROOT / job.id
    job_dir.mkdir(parents=True, exist_ok=True)
    annotated_path = job_dir / "annotated.mp4"
    json_path = job_dir / "report.json"
    pdf_path = job_dir / "report.pdf"

    cap = cv2.VideoCapture(str(job.input_path))
    if not cap.isOpened():
        raise RuntimeError(f"Unable to open input video: {job.input_path}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 960)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 540)
    writer = cv2.VideoWriter(str(annotated_path), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
    extractor = PoseExtractor(model_path=model_path)
    poses = []
    metrics = []
    frame_index = 0
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            timestamp_ms = int(frame_index * 1000 / fps)
            pose = extractor.extract(frame, frame_index, timestamp_ms)
            poses.append(
                {
                    "frame": pose.frame_index,
                    "timestampMs": pose.timestamp_ms,
                    "detector": pose.detector,
                    "landmarks": [lm.__dict__ for lm in pose.landmarks],
                }
            )
            metrics.append(frame_metrics(pose))
            writer.write(draw_pose(frame, pose))
            frame_index += 1
    finally:
        extractor.close()
        cap.release()
        writer.release()

    detector = poses[0]["detector"] if poses else "none"
    payload = {
        "jobId": job.id,
        "sourceName": job.source_name,
        "summary": summarize_metrics(metrics, detector),
        "frames": metrics,
        "poses": poses,
        "artifacts": {
            "annotatedVideo": f"/api/jobs/{job.id}/artifacts/annotated-video",
            "json": f"/api/jobs/{job.id}/artifacts/report-json",
            "pdf": f"/api/jobs/{job.id}/artifacts/report-pdf",
        },
    }
    write_json_report(json_path, payload)
    write_pdf_report(pdf_path, payload)
    job.status = "complete"
    job.updated_at = now_iso()
    job.annotated_video_path = annotated_path
    job.report_json_path = json_path
    job.report_pdf_path = pdf_path
    job.summary = payload["summary"]
    save_job(job)
    return job

