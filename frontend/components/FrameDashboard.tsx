"use client";

import type { FrameMetric } from "@/lib/types";

type Props = {
  frames: FrameMetric[];
  selectedFrame: number;
  onSelectFrame: (frame: number) => void;
};

export function FrameDashboard({ frames, selectedFrame, onSelectFrame }: Props) {
  const current = frames.find((frame) => frame.frame === selectedFrame) ?? frames[0];
  if (!current) {
    return <div className="panel muted">No frame data yet.</div>;
  }

  return (
    <section className="frame-dashboard">
      <div className="frame-card">
        <div className="frame-header">
          <div>
            <h2 className="text-lg font-semibold text-ink">Frame timeline</h2>
            <p className="text-sm text-slate-600">Frame {current.frame} at {current.timestampMs} ms</p>
          </div>
          <input
            aria-label="Frame selector"
            className="range"
            type="range"
            min={frames[0].frame}
            max={frames[frames.length - 1].frame}
            value={selectedFrame}
            onChange={(event) => onSelectFrame(Number(event.target.value))}
          />
        </div>
        <div className="frame-stat-grid">
          <FrameStat label="Trunk lean" value={`${current.trunkLeanDeg} deg`} />
          <FrameStat label="Left knee" value={`${current.leftKneeDeg} deg`} />
          <FrameStat label="Right knee" value={`${current.rightKneeDeg} deg`} />
          <FrameStat label="Ankle separation" value={String(current.ankleSeparationNorm)} />
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="text-sm font-semibold text-ink">Knee angle trace</h3>
          <MiniLineChart
            frames={frames}
            series={[
              { key: "leftKneeDeg", color: "#0f766e" },
              { key: "rightKneeDeg", color: "#e11d48" },
            ]}
          />
        </div>
        <div className="chart-card">
          <h3 className="text-sm font-semibold text-ink">Hip height and stride proxy</h3>
          <MiniLineChart
            frames={frames}
            series={[
              { key: "hipHeightNorm", color: "#2563eb" },
              { key: "ankleSeparationNorm", color: "#f97316" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function FrameStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="frame-stat">
      <p className="frame-stat-label">{label}</p>
      <p className="frame-stat-value">{value}</p>
    </div>
  );
}

type NumericMetric = "leftKneeDeg" | "rightKneeDeg" | "hipHeightNorm" | "ankleSeparationNorm";

function MiniLineChart({ frames, series }: { frames: FrameMetric[]; series: Array<{ key: NumericMetric; color: string }> }) {
  const width = 640;
  const height = 190;
  const pad = 18;
  const allValues = series.flatMap((item) => frames.map((frame) => frame[item.key]));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const span = max - min || 1;
  const xFor = (index: number) => pad + (index / Math.max(frames.length - 1, 1)) * (width - pad * 2);
  const yFor = (value: number) => height - pad - ((value - min) / span) * (height - pad * 2);

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Frame metric chart">
      {[0, 1, 2, 3].map((line) => {
        const y = pad + line * ((height - pad * 2) / 3);
        return <line key={line} x1={pad} x2={width - pad} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />;
      })}
      {series.map((item) => {
        const points = frames.map((frame, index) => `${xFor(index)},${yFor(frame[item.key])}`).join(" ");
        return <polyline key={item.key} points={points} fill="none" stroke={item.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />;
      })}
      <text x={pad} y={height - 2} fill="#64748b" fontSize="12">frame 0</text>
      <text x={width - 82} y={height - 2} fill="#64748b" fontSize="12">frame {frames[frames.length - 1]?.frame}</text>
    </svg>
  );
}
