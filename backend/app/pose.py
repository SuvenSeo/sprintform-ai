from __future__ import annotations

import math
from dataclasses import dataclass

import cv2
import numpy as np

from app.models import FramePose, Landmark


LANDMARK_NAMES = [
    "nose",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
]

SKELETON = [
    ("left_shoulder", "right_shoulder"),
    ("left_shoulder", "left_elbow"),
    ("left_elbow", "left_wrist"),
    ("right_shoulder", "right_elbow"),
    ("right_elbow", "right_wrist"),
    ("left_shoulder", "left_hip"),
    ("right_shoulder", "right_hip"),
    ("left_hip", "right_hip"),
    ("left_hip", "left_knee"),
    ("left_knee", "left_ankle"),
    ("right_hip", "right_knee"),
    ("right_knee", "right_ankle"),
]


@dataclass
class PoseExtractor:
    model_path: str | None = None

    def __post_init__(self) -> None:
        self._landmarker = None
        self.detector_name = "synthetic-fallback"
        if not self.model_path:
            return
        try:
            import mediapipe as mp

            base_options = mp.tasks.BaseOptions(model_asset_path=self.model_path)
            options = mp.tasks.vision.PoseLandmarkerOptions(
                base_options=base_options,
                running_mode=mp.tasks.vision.RunningMode.VIDEO,
                num_poses=1,
            )
            self._mp = mp
            self._landmarker = mp.tasks.vision.PoseLandmarker.create_from_options(options)
            self.detector_name = "mediapipe-pose-landmarker"
        except Exception:
            self._landmarker = None

    def close(self) -> None:
        if self._landmarker:
            self._landmarker.close()

    def extract(self, frame: np.ndarray, frame_index: int, timestamp_ms: int) -> FramePose:
        if self._landmarker:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = self._mp.Image(image_format=self._mp.ImageFormat.SRGB, data=rgb)
            result = self._landmarker.detect_for_video(mp_image, timestamp_ms)
            if result.pose_landmarks:
                landmarks = self._from_mediapipe(result.pose_landmarks[0])
                return FramePose(frame_index, timestamp_ms, landmarks, self.detector_name)
        return FramePose(
            frame_index=frame_index,
            timestamp_ms=timestamp_ms,
            landmarks=synthetic_sprint_landmarks(frame_index),
            detector=self.detector_name,
        )

    @staticmethod
    def _from_mediapipe(raw_landmarks: list) -> list[Landmark]:
        names = {
            0: "nose",
            11: "left_shoulder",
            12: "right_shoulder",
            13: "left_elbow",
            14: "right_elbow",
            15: "left_wrist",
            16: "right_wrist",
            23: "left_hip",
            24: "right_hip",
            25: "left_knee",
            26: "right_knee",
            27: "left_ankle",
            28: "right_ankle",
        }
        return [
            Landmark(name=name, x=raw_landmarks[idx].x, y=raw_landmarks[idx].y, z=raw_landmarks[idx].z, visibility=raw_landmarks[idx].visibility)
            for idx, name in names.items()
        ]


def synthetic_sprint_landmarks(frame_index: int, total_cycle: int = 36) -> list[Landmark]:
    phase = (frame_index % total_cycle) / total_cycle * math.tau
    cx = 0.34 + 0.015 * math.sin(phase)
    hip_y = 0.50 + 0.018 * math.sin(phase * 2)
    shoulder_y = hip_y - 0.20
    lean = 0.055
    left_drive = math.sin(phase)
    right_drive = -left_drive

    points = {
        "nose": (cx + lean + 0.015, shoulder_y - 0.115),
        "left_shoulder": (cx + lean - 0.045, shoulder_y),
        "right_shoulder": (cx + lean + 0.045, shoulder_y + 0.005),
        "left_elbow": (cx + lean - 0.08, shoulder_y + 0.10 + left_drive * 0.025),
        "right_elbow": (cx + lean + 0.09, shoulder_y + 0.10 + right_drive * 0.025),
        "left_wrist": (cx + lean - 0.10, shoulder_y + 0.19 + left_drive * 0.045),
        "right_wrist": (cx + lean + 0.12, shoulder_y + 0.19 + right_drive * 0.045),
        "left_hip": (cx - 0.04, hip_y),
        "right_hip": (cx + 0.04, hip_y + 0.004),
        "left_knee": (cx - 0.075 + left_drive * 0.10, hip_y + 0.20 - abs(left_drive) * 0.05),
        "right_knee": (cx + 0.075 + right_drive * 0.10, hip_y + 0.20 - abs(right_drive) * 0.05),
        "left_ankle": (cx - 0.12 + left_drive * 0.15, hip_y + 0.38 - max(left_drive, 0) * 0.08),
        "right_ankle": (cx + 0.12 + right_drive * 0.15, hip_y + 0.38 - max(right_drive, 0) * 0.08),
    }
    return [Landmark(name=name, x=x, y=y, visibility=0.92) for name, (x, y) in points.items()]


def draw_pose(frame: np.ndarray, pose: FramePose) -> np.ndarray:
    output = frame.copy()
    h, w = output.shape[:2]
    by_name = {lm.name: lm for lm in pose.landmarks}
    for a, b in SKELETON:
        if a in by_name and b in by_name:
            pa = (int(by_name[a].x * w), int(by_name[a].y * h))
            pb = (int(by_name[b].x * w), int(by_name[b].y * h))
            cv2.line(output, pa, pb, (42, 208, 180), 3, cv2.LINE_AA)
    for lm in pose.landmarks:
        cv2.circle(output, (int(lm.x * w), int(lm.y * h)), 5, (248, 250, 252), -1, cv2.LINE_AA)
    cv2.putText(output, f"frame {pose.frame_index} | {pose.detector}", (20, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (15, 23, 42), 3, cv2.LINE_AA)
    cv2.putText(output, f"frame {pose.frame_index} | {pose.detector}", (20, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (248, 250, 252), 1, cv2.LINE_AA)
    return output

