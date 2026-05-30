export type Job = {
  id: string;
  status: "queued" | "processing" | "complete" | "failed";
  origin?: "api" | "browser" | "demo";
  sourceName: string;
  createdAt: string;
  updatedAt: string;
  error?: string | null;
  summary?: Summary;
  artifacts: {
    annotatedVideo?: string | null;
    json?: string | null;
    pdf?: string | null;
    poster?: string | null;
  };
  artifactNames?: {
    annotatedVideo?: string;
    json?: string;
    pdf?: string;
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
  avgPoseConfidence?: number;
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
  poseConfidence?: number;
};

export type Report = {
  jobId: string;
  sourceName: string;
  summary: Summary;
  frames: FrameMetric[];
  poses?: Array<{
    frame: number;
    timestampMs: number;
    detector: string;
    landmarks: Array<{
      x: number;
      y: number;
      z?: number;
      visibility?: number;
    }>;
  }>;
  artifacts: Job["artifacts"];
};

export type BrowserAnalysisResult = {
  report: Report;
  artifacts: Job["artifacts"];
  artifactNames: NonNullable<Job["artifactNames"]>;
};
