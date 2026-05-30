from __future__ import annotations

import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def write_json_report(path: Path, payload: dict) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path


def write_pdf_report(path: Path, payload: dict) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(str(path), pagesize=letter)
    summary = payload["summary"]
    story = [
        Paragraph("Sprintform AI Coaching Report", styles["Title"]),
        Paragraph("Computer vision sprint/jump mechanics analysis", styles["Normal"]),
        Spacer(1, 16),
    ]
    rows = [
        ["Detector", summary["detector"]],
        ["Frames", str(summary["frameCount"])],
        ["Duration", f'{summary["durationMs"]} ms'],
        ["Average trunk lean", f'{summary["avgTrunkLeanDeg"]} deg'],
        ["Peak ankle separation", str(summary["peakAnkleSeparationNorm"])],
        ["Knee angle range", f'{summary["minKneeFlexionDeg"]} - {summary["maxKneeExtensionDeg"]} deg'],
    ]
    table = Table(rows, colWidths=[180, 280])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#e2e8f0")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
                ("PADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.extend([table, Spacer(1, 18), Paragraph("Limitations", styles["Heading2"])])
    for item in summary["limitations"]:
        story.append(Paragraph(item, styles["BodyText"]))
    doc.build(story)
    return path

