from __future__ import annotations

import math
from statistics import mean

from app.models import FramePose, Landmark


def _point(pose: FramePose, name: str) -> Landmark:
    points = {lm.name: lm for lm in pose.landmarks}
    return points[name]


def _angle(a: Landmark, b: Landmark, c: Landmark) -> float:
    ab = (a.x - b.x, a.y - b.y)
    cb = (c.x - b.x, c.y - b.y)
    dot = ab[0] * cb[0] + ab[1] * cb[1]
    mag = math.hypot(*ab) * math.hypot(*cb)
    if mag == 0:
        return 0.0
    return math.degrees(math.acos(max(-1.0, min(1.0, dot / mag))))


def frame_metrics(pose: FramePose) -> dict:
    shoulder_mid_x = (_point(pose, "left_shoulder").x + _point(pose, "right_shoulder").x) / 2
    shoulder_mid_y = (_point(pose, "left_shoulder").y + _point(pose, "right_shoulder").y) / 2
    hip_mid_x = (_point(pose, "left_hip").x + _point(pose, "right_hip").x) / 2
    hip_mid_y = (_point(pose, "left_hip").y + _point(pose, "right_hip").y) / 2
    trunk_lean = math.degrees(math.atan2(shoulder_mid_x - hip_mid_x, hip_mid_y - shoulder_mid_y))
    left_knee = _angle(_point(pose, "left_hip"), _point(pose, "left_knee"), _point(pose, "left_ankle"))
    right_knee = _angle(_point(pose, "right_hip"), _point(pose, "right_knee"), _point(pose, "right_ankle"))
    left_arm = _angle(_point(pose, "left_shoulder"), _point(pose, "left_elbow"), _point(pose, "left_wrist"))
    right_arm = _angle(_point(pose, "right_shoulder"), _point(pose, "right_elbow"), _point(pose, "right_wrist"))
    ankle_gap = abs(_point(pose, "left_ankle").x - _point(pose, "right_ankle").x)
    hip_height = 1 - hip_mid_y
    return {
        "frame": pose.frame_index,
        "timestampMs": pose.timestamp_ms,
        "trunkLeanDeg": round(trunk_lean, 2),
        "leftKneeDeg": round(left_knee, 2),
        "rightKneeDeg": round(right_knee, 2),
        "leftArmDeg": round(left_arm, 2),
        "rightArmDeg": round(right_arm, 2),
        "ankleSeparationNorm": round(ankle_gap, 3),
        "hipHeightNorm": round(hip_height, 3),
    }


def summarize_metrics(frames: list[dict], detector: str) -> dict:
    if not frames:
        return {}
    knee_min = min(min(row["leftKneeDeg"], row["rightKneeDeg"]) for row in frames)
    knee_max = max(max(row["leftKneeDeg"], row["rightKneeDeg"]) for row in frames)
    return {
        "detector": detector,
        "frameCount": len(frames),
        "durationMs": frames[-1]["timestampMs"],
        "avgTrunkLeanDeg": round(mean(row["trunkLeanDeg"] for row in frames), 2),
        "peakAnkleSeparationNorm": max(row["ankleSeparationNorm"] for row in frames),
        "minKneeFlexionDeg": round(knee_min, 2),
        "maxKneeExtensionDeg": round(knee_max, 2),
        "hipHeightRangeNorm": round(max(row["hipHeightNorm"] for row in frames) - min(row["hipHeightNorm"] for row in frames), 3),
        "limitations": [
            "2D single-camera measurements are normalized image estimates, not lab-grade biomechanics.",
            "Camera angle, lens distortion, clothing, occlusion, and frame rate affect metric reliability.",
            "Use the output for coaching review and engineering demonstration, not medical diagnosis.",
        ],
    }

