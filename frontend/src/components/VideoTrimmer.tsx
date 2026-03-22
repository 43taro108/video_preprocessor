import { useRef, useState, useEffect, useCallback } from "react";

interface Props {
  file: File;
  trimStart: number;
  trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
  onFrameCapture: (canvas: HTMLCanvasElement) => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
}

export default function VideoTrimmer({
  file,
  trimStart,
  trimEnd,
  onTrimChange,
  onFrameCapture,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const captureCurrentFrame = useCallback(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    onFrameCapture(c);
  }, [onFrameCapture]);

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
    onTrimChange(0, v.duration);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const seekTo = (time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time;
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(ratio * duration);
  };

  const handleMouseDown = (handle: "start" | "end") => (e: React.MouseEvent) => {
    e.stopPropagation();
    setDragging(handle);
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      const track = document.getElementById("trim-track");
      if (!track || duration <= 0) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = ratio * duration;

      if (dragging === "start") {
        const ns = Math.min(time, trimEnd - 0.1);
        onTrimChange(Math.max(0, ns), trimEnd);
        seekTo(ns);
      } else {
        const ne = Math.max(time, trimStart + 0.1);
        onTrimChange(trimStart, Math.min(duration, ne));
        seekTo(ne);
      }
    };
    const handleUp = () => {
      setDragging(null);
      captureCurrentFrame();
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, duration, trimStart, trimEnd, onTrimChange, captureCurrentFrame]);

  const startPct = duration > 0 ? (trimStart / duration) * 100 : 0;
  const endPct = duration > 0 ? (trimEnd / duration) * 100 : 100;

  return (
    <div className="video-trimmer">
      <div className="section-title">Trim</div>
      <div className="video-preview-container">
        <video
          ref={videoRef}
          src={videoUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={captureCurrentFrame}
          onTimeUpdate={handleTimeUpdate}
          onSeeked={captureCurrentFrame}
          muted
          className="video-preview"
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>

      <div className="video-controls-row">
        <button
          className="video-btn"
          onClick={() =>
            videoRef.current?.paused
              ? videoRef.current?.play()
              : videoRef.current?.pause()
          }
        >
          Play / Pause
        </button>
        <span className="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="trim-section">
        <div className="trim-label">
          Range: {formatTime(trimStart)} - {formatTime(trimEnd)}
          <span className="trim-duration">
            ({formatTime(trimEnd - trimStart)})
          </span>
        </div>

        <div id="trim-track" className="trim-track" onClick={handleTrackClick}>
          <div
            className="trim-selected"
            style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
          />
          <div
            className="trim-playhead"
            style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
          <div
            className="trim-handle trim-handle-start"
            style={{ left: `${startPct}%` }}
            onMouseDown={handleMouseDown("start")}
          />
          <div
            className="trim-handle trim-handle-end"
            style={{ left: `${endPct}%` }}
            onMouseDown={handleMouseDown("end")}
          />
        </div>
      </div>

      <button className="capture-btn" onClick={captureCurrentFrame}>
        Capture Frame for Mask
      </button>
    </div>
  );
}
