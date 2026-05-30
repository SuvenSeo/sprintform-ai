import { frameMetrics, POSE_CONNECTIONS, summarizeMetrics, type PosePoint } from "@/lib/biomechanics";
import { createReportPdf } from "@/lib/pdf";
import type { BrowserAnalysisResult, Report } from "@/lib/types";

const MAX_ANALYSIS_SECONDS = 20;
const MAX_FRAMES = 160;
const TARGET_FPS = 8;
const MEDIAPIPE_POSE_ASSET_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404";

type Progress = {
  stage: string;
  percent: number;
};

type PoseLandmarkerLike = {
  send(inputs: { image: HTMLVideoElement }, at?: number): Promise<void>;
  onResults(listener: (results: { poseLandmarks?: PosePoint[] }) => void): void;
  setOptions(options: Record<string, unknown>): void;
  initialize(): Promise<void>;
  close(): Promise<void>;
};

export async function analyzeVideoInBrowser(file: File, onProgress: (progress: Progress) => void): Promise<BrowserAnalysisResult> {
  onProgress({ stage: "Loading MediaPipe pose model", percent: 2 });
  const { Pose } = await import("@mediapipe/pose");
  onProgress({ stage: "Initializing pose detector", percent: 7 });
  const landmarker = new Pose({
    locateFile: (file: string) => `${MEDIAPIPE_POSE_ASSET_BASE}/${file}`,
  }) as PoseLandmarkerLike;
  landmarker.setOptions({
    modelComplexity: 0,
    smoothLandmarks: false,
    enableSegmentation: false,
    minPoseDetectionConfidence: 0.45,
    minTrackingConfidence: 0.45,
  });
  const detectPose = createPoseDetector(landmarker);
  await withTimeout(landmarker.initialize(), 45000, "MediaPipe model load timed out. Check your connection and retry the upload.");

  const inputUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = inputUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  await waitForMetadata(video);

  const duration = Math.min(video.duration || 0, MAX_ANALYSIS_SECONDS);
  if (!Number.isFinite(duration) || duration <= 0) {
    landmarker.close();
    URL.revokeObjectURL(inputUrl);
    throw new Error("Could not read this video duration. Try an mp4 or mov file exported from a phone/camera.");
  }

  const sourceWidth = video.videoWidth || 960;
  const sourceHeight = video.videoHeight || 540;
  const scale = Math.min(1, 960 / sourceWidth);
  const width = Math.max(320, Math.round(sourceWidth * scale));
  const height = Math.max(180, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is not available in this browser.");

  const recorder = createRecorder(canvas, TARGET_FPS);
  recorder.start();

  const totalFrames = Math.min(MAX_FRAMES, Math.max(1, Math.floor(duration * TARGET_FPS)));
  const detectedFrames = [];
  const poseFrames = [];

  for (let i = 0; i < totalFrames; i++) {
    const timestampSec = totalFrames === 1 ? 0 : (i / (totalFrames - 1)) * duration;
    await seekVideo(video, timestampSec);
    const timestampMs = Math.round(timestampSec * 1000);
    const landmarks = await detectPose(video, timestampMs);

    ctx.drawImage(video, 0, 0, width, height);
    drawOverlay(ctx, landmarks, width, height);
    drawHud(ctx, i, timestampMs, landmarks.length > 0);

    const metrics = landmarks.length ? frameMetrics(landmarks, i, timestampMs) : null;
    if (metrics) {
      detectedFrames.push(metrics);
      poseFrames.push({
        frame: i,
        timestampMs,
        detector: "mediapipe-pose-web",
        landmarks,
      });
    }

    onProgress({ stage: "Detecting pose and rendering overlay", percent: 10 + Math.round((i / totalFrames) * 82) });
    await delay(35);
  }

  landmarker.close();
  URL.revokeObjectURL(inputUrl);
  const annotatedVideoBlob = await recorder.stop();
  if (!detectedFrames.length) {
    throw new Error("No reliable body pose was detected. Try a clearer full-body sprint or jump clip with one athlete visible.");
  }

  const summary = summarizeMetrics(detectedFrames, "mediapipe-pose-web");
  const report: Report = {
    jobId: crypto.randomUUID(),
    sourceName: file.name,
    summary,
    frames: detectedFrames,
    poses: poseFrames,
    artifacts: {},
  };
  const jsonBlob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const pdfBlob = createReportPdf(report);
  const artifacts = {
    annotatedVideo: URL.createObjectURL(annotatedVideoBlob),
    json: URL.createObjectURL(jsonBlob),
    pdf: URL.createObjectURL(pdfBlob),
  };

  onProgress({ stage: "Complete", percent: 100 });
  return {
    report: { ...report, artifacts },
    artifacts,
    artifactNames: {
      annotatedVideo: `${safeName(file.name)}-annotated.webm`,
      json: `${safeName(file.name)}-report.json`,
      pdf: `${safeName(file.name)}-report.pdf`,
    },
  };
}

function drawOverlay(ctx: CanvasRenderingContext2D, landmarks: PosePoint[], width: number, height: number) {
  if (!landmarks.length) return;
  ctx.lineWidth = Math.max(3, width / 260);
  ctx.lineCap = "round";
  ctx.strokeStyle = "#2ad0b4";
  for (const [a, b] of POSE_CONNECTIONS) {
    const start = landmarks[a];
    const end = landmarks[b];
    if (!start || !end || (start.visibility ?? 1) < 0.35 || (end.visibility ?? 1) < 0.35) continue;
    ctx.beginPath();
    ctx.moveTo(start.x * width, start.y * height);
    ctx.lineTo(end.x * width, end.y * height);
    ctx.stroke();
  }
  ctx.fillStyle = "#f8fafc";
  landmarks.forEach((point) => {
    if ((point.visibility ?? 1) < 0.35) return;
    ctx.beginPath();
    ctx.arc(point.x * width, point.y * height, Math.max(3, width / 220), 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHud(ctx: CanvasRenderingContext2D, frame: number, timestampMs: number, detected: boolean) {
  ctx.save();
  ctx.fillStyle = "rgb(15 23 42 / 0.72)";
  ctx.fillRect(14, 14, 360, 38);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "16px Arial";
  ctx.fillText(`Sprintform AI | frame ${frame} | ${timestampMs} ms | ${detected ? "pose" : "no pose"}`, 24, 39);
  ctx.restore();
}

function createRecorder(canvas: HTMLCanvasElement, fps: number) {
  if (!("MediaRecorder" in window) || !canvas.captureStream) {
    return {
      start() {},
      async stop() {
        const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not export canvas.")), "image/png"));
        return png;
      },
    };
  }
  const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
  const stream = canvas.captureStream(fps);
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  return {
    start() {
      recorder.start();
    },
    stop() {
      return new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          resolve(new Blob(chunks, { type: mimeType || "video/webm" }));
        };
        recorder.stop();
      });
    },
  };
}

function waitForMetadata(video: HTMLVideoElement) {
  return new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Could not load this video."));
  });
}

function seekVideo(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve) => {
    const done = () => resolve();
    video.addEventListener("seeked", done, { once: true });
    video.currentTime = Math.min(Math.max(time, 0), Math.max(0, (video.duration || time) - 0.001));
  });
}

function createPoseDetector(landmarker: PoseLandmarkerLike) {
  let resolveNext: ((landmarks: PosePoint[]) => void) | null = null;
  landmarker.onResults((results) => {
    resolveNext?.(results.poseLandmarks ?? []);
    resolveNext = null;
  });
  return async (video: HTMLVideoElement, timestampMs: number) => {
    const next = new Promise<PosePoint[]>((resolve) => {
      resolveNext = resolve;
    });
    await landmarker.send({ image: video }, timestampMs / 1000);
    return withTimeout(next, 5000, "Pose detector did not return frame results.");
  };
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

function safeName(name: string) {
  return name.replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "sprintform";
}
