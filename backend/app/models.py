from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal


JobStatus = Literal["queued", "processing", "complete", "failed"]


@dataclass
class AnalysisJob:
    id: str
    status: JobStatus
    source_name: str
    created_at: str
    updated_at: str
    input_path: Path
    annotated_video_path: Path | None = None
    report_json_path: Path | None = None
    report_pdf_path: Path | None = None
    error: str | None = None
    summary: dict = field(default_factory=dict)


@dataclass(frozen=True)
class Landmark:
    name: str
    x: float
    y: float
    z: float = 0.0
    visibility: float = 1.0


@dataclass(frozen=True)
class FramePose:
    frame_index: int
    timestamp_ms: int
    landmarks: list[Landmark]
    detector: str

