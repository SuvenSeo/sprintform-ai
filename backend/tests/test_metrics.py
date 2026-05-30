from app.metrics import frame_metrics, summarize_metrics
from app.models import FramePose
from app.pose import synthetic_sprint_landmarks


def test_frame_metrics_returns_sprint_mechanics_fields() -> None:
    pose = FramePose(0, 0, synthetic_sprint_landmarks(0), "synthetic-test")
    metrics = frame_metrics(pose)

    assert metrics["frame"] == 0
    assert "trunkLeanDeg" in metrics
    assert 0 < metrics["leftKneeDeg"] <= 180
    assert 0 < metrics["rightKneeDeg"] <= 180
    assert metrics["ankleSeparationNorm"] > 0


def test_summary_preserves_limitations_and_detector() -> None:
    frames = [frame_metrics(FramePose(i, i * 40, synthetic_sprint_landmarks(i), "synthetic-test")) for i in range(8)]
    summary = summarize_metrics(frames, "synthetic-test")

    assert summary["detector"] == "synthetic-test"
    assert summary["frameCount"] == 8
    assert summary["peakAnkleSeparationNorm"] > 0
    assert "2D single-camera" in summary["limitations"][0]

