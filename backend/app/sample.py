from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from app.pose import draw_pose, synthetic_sprint_landmarks
from app.models import FramePose


def create_sample_video(path: Path, frames: int = 72, fps: int = 24) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    width, height = 960, 540
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
    for frame_index in range(frames):
        frame = np.full((height, width, 3), (246, 248, 251), dtype=np.uint8)
        cv2.rectangle(frame, (0, int(height * 0.76)), (width, height), (226, 232, 240), -1)
        cv2.line(frame, (0, int(height * 0.76)), (width, int(height * 0.76)), (71, 85, 105), 2)
        for x in range(-80, width + 120, 160):
            offset = (frame_index * 8) % 160
            cv2.line(frame, (x - offset, int(height * 0.82)), (x + 80 - offset, int(height * 0.82)), (148, 163, 184), 3)
        pose = FramePose(frame_index, int(frame_index * 1000 / fps), synthetic_sprint_landmarks(frame_index), "synthetic-sample")
        frame = draw_pose(frame, pose)
        writer.write(frame)
    writer.release()
    return path

