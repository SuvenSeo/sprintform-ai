from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Iterable

from app.models import AnalysisJob


ROOT = Path(__file__).resolve().parents[2]
ARTIFACT_ROOT = ROOT / "artifacts"
DB_PATH = ARTIFACT_ROOT / "jobs.sqlite"


def ensure_storage() -> None:
    ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                source_name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                input_path TEXT NOT NULL,
                annotated_video_path TEXT,
                report_json_path TEXT,
                report_pdf_path TEXT,
                error TEXT,
                summary_json TEXT NOT NULL DEFAULT '{}'
            )
            """
        )


def save_job(job: AnalysisJob) -> None:
    import json

    ensure_storage()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO jobs (
                id, status, source_name, created_at, updated_at, input_path,
                annotated_video_path, report_json_path, report_pdf_path, error, summary_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                status=excluded.status,
                updated_at=excluded.updated_at,
                annotated_video_path=excluded.annotated_video_path,
                report_json_path=excluded.report_json_path,
                report_pdf_path=excluded.report_pdf_path,
                error=excluded.error,
                summary_json=excluded.summary_json
            """,
            (
                job.id,
                job.status,
                job.source_name,
                job.created_at,
                job.updated_at,
                str(job.input_path),
                str(job.annotated_video_path) if job.annotated_video_path else None,
                str(job.report_json_path) if job.report_json_path else None,
                str(job.report_pdf_path) if job.report_pdf_path else None,
                job.error,
                json.dumps(job.summary),
            ),
        )


def get_job(job_id: str) -> AnalysisJob | None:
    import json

    ensure_storage()
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    if not row:
        return None
    return AnalysisJob(
        id=row[0],
        status=row[1],
        source_name=row[2],
        created_at=row[3],
        updated_at=row[4],
        input_path=Path(row[5]),
        annotated_video_path=Path(row[6]) if row[6] else None,
        report_json_path=Path(row[7]) if row[7] else None,
        report_pdf_path=Path(row[8]) if row[8] else None,
        error=row[9],
        summary=json.loads(row[10] or "{}"),
    )


def list_jobs() -> Iterable[AnalysisJob]:
    ensure_storage()
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute("SELECT id FROM jobs ORDER BY created_at DESC").fetchall()
    for (job_id,) in rows:
        job = get_job(job_id)
        if job:
            yield job

