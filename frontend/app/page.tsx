"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Activity, Download, FileJson, FileText, Play, Upload } from "lucide-react";
import { FrameDashboard } from "@/components/FrameDashboard";
import { MetricCard } from "@/components/MetricCard";
import { analyzeVideoInBrowser } from "@/lib/browserAnalysis";
import type { Job, Report } from "@/lib/types";

export default function Home() {
  const [job, setJob] = useState<Job | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ stage: string; percent: number } | null>(null);

  useEffect(() => {
    if (!job || job.origin !== "api" || job.status === "complete" || job.status === "failed") return;
    const timer = window.setInterval(async () => {
      const next = await fetch(`/api/jobs/${job.id}`).then((res) => res.json());
      setJob({ ...next, origin: "api" });
      if (next.status === "complete") {
        const reportData = await fetch(`/api/jobs/${job.id}/report`).then((res) => res.json());
        setReport(reportData);
        setSelectedFrame(reportData.frames[0]?.frame ?? 0);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [job]);

  const videoSrc = useMemo(() => {
    if (!job?.artifacts.annotatedVideo) return null;
    if (job.artifacts.annotatedVideo.startsWith("blob:")) return job.artifacts.annotatedVideo;
    return `${job.artifacts.annotatedVideo}?t=${job.updatedAt}`;
  }, [job]);

  async function analyzeSample() {
    setBusy(true);
    setError(null);
    setReport(null);
    setProgress({ stage: "Starting sample analysis", percent: 0 });
    try {
      const response = await fetch("/api/analyze/sample", { method: "POST" });
      if (!response.ok) {
        await loadBundledDemo();
        return;
      }
      const next = await response.json();
      setJob({ ...next, origin: "api" });
    } catch {
      await loadBundledDemo();
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function loadBundledDemo() {
    const reportData: Report = await fetch("/demo/report.json").then((res) => res.json());
    const artifacts = {
      annotatedVideo: "/demo/annotated.mp4",
      json: "/demo/report.json",
      pdf: "/demo/report.pdf",
    };
    setReport({ ...reportData, artifacts });
    setSelectedFrame(reportData.frames[0]?.frame ?? 0);
    setJob({
      id: "public-demo",
      status: "complete",
      origin: "demo",
      sourceName: "bundled-synthetic-sprint-demo.mp4",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: null,
      summary: reportData.summary,
      artifacts,
      artifactNames: {
        annotatedVideo: "sample-annotated.mp4",
        json: "sample-report.json",
        pdf: "sample-report.pdf",
      },
    });
  }

  async function uploadVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setReport(null);
    setProgress({ stage: "Preparing upload", percent: 0 });
    const createdAt = new Date().toISOString();
    setJob({
      id: crypto.randomUUID(),
      status: "processing",
      origin: "browser",
      sourceName: file.name,
      createdAt,
      updatedAt: createdAt,
      error: null,
      artifacts: {},
    });
    try {
      const result = await analyzeVideoInBrowser(file, setProgress);
      const updatedAt = new Date().toISOString();
      setReport(result.report);
      setSelectedFrame(result.report.frames[0]?.frame ?? 0);
      setJob({
        id: result.report.jobId,
        status: "complete",
        origin: "browser",
        sourceName: file.name,
        createdAt,
        updatedAt,
        error: null,
        summary: result.report.summary,
        artifacts: result.artifacts,
        artifactNames: result.artifactNames,
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Upload analysis failed. Try a clear full-body sprint or jump clip.";
      setError(message);
      setJob((current) => current ? { ...current, status: "failed", error: message, updatedAt: new Date().toISOString() } : null);
    } finally {
      setBusy(false);
      setProgress(null);
      event.target.value = "";
    }
  }

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div>
            <h1 className="title">Sprintform AI</h1>
            <p className="subtitle">
              Pose landmark extraction, annotated video, frame metrics, and coaching reports for sprint and jump mechanics.
            </p>
          </div>
          <div className="actions">
            <button
              className="button"
              onClick={analyzeSample}
              disabled={busy}
            >
              <Play size={17} /> Sample
            </button>
            <label className={`upload-button ${busy ? "disabled-control" : ""}`} aria-disabled={busy}>
              <Upload size={17} /> Upload
              <input className="hidden-input" type="file" accept="video/*" onChange={uploadVideo} disabled={busy} />
            </label>
          </div>
        </header>

        {error ? <div className="error">{error}</div> : null}
        {progress ? (
          <div className="progress-panel" aria-live="polite">
            <div className="progress-row">
              <span>{progress.stage}</span>
              <strong>{progress.percent}%</strong>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        ) : null}

        <section className="workstation">
          <div className="main-column">
            <div className="video-panel">
              {videoSrc ? (
                <video className="video" controls src={videoSrc} />
              ) : (
                <div className="empty-video">
                  <div>
                    <Activity size={32} />
                    <p>Run the sample analysis or upload a sprint/jump clip.</p>
                  </div>
                </div>
              )}
            </div>
            {report ? (
              <FrameDashboard frames={report.frames} selectedFrame={selectedFrame} onSelectFrame={setSelectedFrame} />
            ) : (
              <div className="panel muted">
                {job ? `Job ${job.id} is ${job.status}.` : "No job has been started in this browser session."}
              </div>
            )}
          </div>

          <aside className="side-column">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Analysis job</h2>
                  <p className="muted">{job?.sourceName ?? "Waiting for video input"}</p>
                </div>
                <span className="status">
                  {job?.status ?? "idle"}
                </span>
              </div>
            </div>

            {job?.summary ? (
              <div className="metric-grid">
                <MetricCard label="Frames" value={String(job.summary.frameCount)} detail={`${job.summary.durationMs} ms analyzed`} />
                <MetricCard label="Trunk lean" value={`${job.summary.avgTrunkLeanDeg} deg`} detail="Average normalized 2D estimate" />
                <MetricCard label="Stride proxy" value={String(job.summary.peakAnkleSeparationNorm)} detail="Peak ankle separation" />
                <MetricCard label="Knee range" value={`${job.summary.minKneeFlexionDeg}-${job.summary.maxKneeExtensionDeg}`} detail="Flexion to extension angle" />
              </div>
            ) : null}

            <div className="panel">
              <h2>Exports</h2>
              <div className="export-grid">
                <ExportLink href={job?.artifacts.json} download={job?.artifactNames?.json} icon={<FileJson size={17} />} label="JSON report" />
                <ExportLink href={job?.artifacts.pdf} download={job?.artifactNames?.pdf} icon={<FileText size={17} />} label="PDF report" />
                <ExportLink href={job?.artifacts.annotatedVideo} download={job?.artifactNames?.annotatedVideo} icon={<Download size={17} />} label="Annotated video" />
              </div>
            </div>

            <div className="panel limits">
              <h2>Measurement limits</h2>
              <p>
                Metrics are 2D single-camera estimates for coaching review and engineering demonstration. They are not medical-grade or lab biomechanics.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function ExportLink({ href, download, icon, label }: { href?: string | null; download?: string; icon: React.ReactNode; label: string }) {
  const enabled = Boolean(href);
  return (
    <a
      className={`export-link ${enabled ? "" : "disabled"}`}
      href={href ?? "#"}
      download={download}
      target="_blank"
      rel="noreferrer"
    >
      {icon}
      {label}
    </a>
  );
}
