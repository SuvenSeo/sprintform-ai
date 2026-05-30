import type { FrameMetric, Summary } from "@/lib/types";

export type PosePoint = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

export const POSE_CONNECTIONS: Array<[number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 29],
  [28, 30],
  [29, 31],
  [30, 32],
];

function angle(a: PosePoint, b: PosePoint, c: PosePoint) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (!mag) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * (180 / Math.PI);
}

function visible(point: PosePoint | undefined) {
  return point && (point.visibility ?? 1) >= 0.35;
}

export function frameMetrics(landmarks: PosePoint[], frame: number, timestampMs: number): FrameMetric | null {
  const required = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
  if (!required.every((index) => visible(landmarks[index]))) return null;

  const shoulderMid = {
    x: (landmarks[11].x + landmarks[12].x) / 2,
    y: (landmarks[11].y + landmarks[12].y) / 2,
  };
  const hipMid = {
    x: (landmarks[23].x + landmarks[24].x) / 2,
    y: (landmarks[23].y + landmarks[24].y) / 2,
  };
  const trunkLean = Math.atan2(shoulderMid.x - hipMid.x, hipMid.y - shoulderMid.y) * (180 / Math.PI);
  const ankleSeparation = Math.abs(landmarks[27].x - landmarks[28].x);
  const hipHeight = 1 - hipMid.y;
  const confidence = required.reduce((sum, index) => sum + (landmarks[index].visibility ?? 1), 0) / required.length;

  return {
    frame,
    timestampMs,
    trunkLeanDeg: round(trunkLean, 2),
    leftKneeDeg: round(angle(landmarks[23], landmarks[25], landmarks[27]), 2),
    rightKneeDeg: round(angle(landmarks[24], landmarks[26], landmarks[28]), 2),
    leftArmDeg: round(angle(landmarks[11], landmarks[13], landmarks[15]), 2),
    rightArmDeg: round(angle(landmarks[12], landmarks[14], landmarks[16]), 2),
    ankleSeparationNorm: round(ankleSeparation, 3),
    hipHeightNorm: round(hipHeight, 3),
    poseConfidence: round(confidence, 3),
  };
}

export function summarizeMetrics(frames: FrameMetric[], detector: string): Summary {
  const frameCount = frames.length;
  const kneeValues = frames.flatMap((frame) => [frame.leftKneeDeg, frame.rightKneeDeg]);
  return {
    detector,
    frameCount,
    durationMs: frames.at(-1)?.timestampMs ?? 0,
    avgTrunkLeanDeg: round(avg(frames.map((frame) => frame.trunkLeanDeg)), 2),
    peakAnkleSeparationNorm: round(Math.max(...frames.map((frame) => frame.ankleSeparationNorm)), 3),
    minKneeFlexionDeg: round(Math.min(...kneeValues), 2),
    maxKneeExtensionDeg: round(Math.max(...kneeValues), 2),
    hipHeightRangeNorm: round(Math.max(...frames.map((frame) => frame.hipHeightNorm)) - Math.min(...frames.map((frame) => frame.hipHeightNorm)), 3),
    avgPoseConfidence: round(avg(frames.map((frame) => frame.poseConfidence ?? 0)), 3),
    limitations: [
      "2D single-camera measurements are normalized image estimates, not lab-grade biomechanics.",
      "Camera angle, lens distortion, clothing, occlusion, and frame rate affect metric reliability.",
      "Browser upload analysis samples frames for responsiveness; use it for coaching review and engineering demonstration, not diagnosis.",
    ],
  };
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

