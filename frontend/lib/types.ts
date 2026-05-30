export type Job = {
  id: string;
  status: "queued" | "processing" | "complete" | "failed";
  sourceName: string;
  createdAt: string;
  updatedAt: string;
  error?: string | null;
  summary?: Summary;
  artifacts: {
    annotatedVideo?: string | null;
    json?: string | null;
    pdf?: string | null;
  };
};

export type Summary = {
  detector: string;
  frameCount: number;
  durationMs: number;
  avgTrunkLeanDeg: number;
  peakAnkleSeparationNorm: number;
  minKneeFlexionDeg: number;
  maxKneeExtensionDeg: number;
  hipHeightRangeNorm: number;
  limitations: string[];
};

export type FrameMetric = {
  frame: number;
  timestampMs: number;
  trunkLeanDeg: number;
  leftKneeDeg: number;
  rightKneeDeg: number;
  leftArmDeg: number;
  rightArmDeg: number;
  ankleSeparationNorm: number;
  hipHeightNorm: number;
};

export type Report = {
  jobId: string;
  sourceName: string;
  summary: Summary;
  frames: FrameMetric[];
  artifacts: Job["artifacts"];
};

