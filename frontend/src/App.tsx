import { useState, useCallback } from "react";
import VideoTrimmer from "./components/VideoTrimmer.tsx";
import RegionMaskEditor from "./components/RegionMaskEditor.tsx";
import {
  uploadVideo,
  processVideo,
  getDownloadUrl,
  getPreviewUrl,
} from "./api/client.ts";
import type { MaskRegion } from "./api/client.ts";

type Step = "upload" | "edit" | "done";

const FPS_PRESETS = [24, 30, 60, 120, 200, 240, 480, 1000];

export default function App() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState("");
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [maskRegions, setMaskRegions] = useState<MaskRegion[]>([]);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [sourceFps, setSourceFps] = useState(30);
  const [outputFps, setOutputFps] = useState(30);
  const [outputName, setOutputName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [jobId, setJobId] = useState("");
  const [resultFilename, setResultFilename] = useState("");
  const [resultInfo, setResultInfo] = useState<{
    fps: number;
    width: number;
    height: number;
    total_frames: number;
  } | null>(null);

  // ── Upload ──

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) await doUpload(f);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) await doUpload(f);
  };

  const doUpload = async (f: File) => {
    setError("");
    setFile(f);
    try {
      const res = await uploadVideo(f);
      setFileId(res.file_id);
      setStep("edit");
      captureInitialFrame(f);
    } catch (err) {
      setError(`Upload failed: ${err}`);
    }
  };

  const captureInitialFrame = (f: File) => {
    const url = URL.createObjectURL(f);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => { video.currentTime = 0.01; };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setFrameUrl(canvas.toDataURL("image/jpeg", 0.85));
        }
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    video.onerror = () => URL.revokeObjectURL(url);
    video.src = url;
  };

  // ── Trim / Mask callbacks ──

  const handleTrimChange = (start: number, end: number) => {
    setTrimStart(start);
    setTrimEnd(end);
  };

  const handleFrameCapture = useCallback((canvas: HTMLCanvasElement) => {
    setFrameUrl(canvas.toDataURL("image/jpeg", 0.85));
  }, []);

  // ── Process ──

  const handleProcess = async () => {
    if (!fileId) return;
    setProcessing(true);
    setError("");
    try {
      const res = await processVideo(
        fileId,
        trimStart,
        trimEnd,
        maskRegions,
        sourceFps,
        outputFps,
        outputName,
      );
      setJobId(res.job_id);
      setResultFilename(res.filename);
      setResultInfo(res.output);
      setStep("done");
    } catch (err) {
      setError(`Processing failed: ${err}`);
    } finally {
      setProcessing(false);
    }
  };

  // ── Reset ──

  const handleReset = () => {
    setStep("upload");
    setFile(null);
    setFileId("");
    setTrimStart(0);
    setTrimEnd(0);
    setMaskRegions([]);
    setFrameUrl(null);
    setOutputName("");
    setJobId("");
    setResultFilename("");
    setResultInfo(null);
    setError("");
  };

  const frameSkip = Math.max(1, Math.round(sourceFps / outputFps));
  const effectiveFps = sourceFps / frameSkip;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Video Preprocessor</h1>
        <span className="subtitle">Upload / Trim / Mask / Export</span>
      </header>

      <main className="app-main">
        <div className="panel">
          {error && <div className="error-msg">{error}</div>}

          {/* ── Step: Upload ── */}
          {step === "upload" && (
            <div
              className="drop-zone"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <p>Drag & drop a video here, or click to select</p>
              <p className="hint">mp4, avi, mov</p>
              <input
                type="file"
                accept=".mp4,.avi,.mov,video/*"
                onChange={handleFileChange}
                className="file-input"
              />
            </div>
          )}

          {/* ── Step: Edit ── */}
          {step === "edit" && file && (
            <>
              <div className="file-info">
                <span>{file.name}</span>
                <span className="file-size">
                  ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </div>

              {/* FPS Settings */}
              <div className="fps-settings">
                <p className="fps-description">
                  Source FPS: the actual recording frame rate of the camera (e.g. 200 for high-speed cameras, 30 for standard).
                  Output FPS: the frame rate of the exported video.
                  If Output FPS is lower than Source FPS, frames will be skipped to downsample.
                </p>
                <div className="fps-row">
                  <label>
                    Source FPS
                    <div className="fps-input-group">
                      <input
                        type="number"
                        min={1}
                        max={10000}
                        value={sourceFps}
                        onChange={(e) => setSourceFps(Math.max(1, Number(e.target.value)))}
                        className="fps-input"
                      />
                      <div className="fps-presets">
                        {FPS_PRESETS.map((fps) => (
                          <button
                            key={fps}
                            className={`fps-preset-btn ${sourceFps === fps ? "active" : ""}`}
                            onClick={() => setSourceFps(fps)}
                          >
                            {fps}
                          </button>
                        ))}
                      </div>
                    </div>
                  </label>
                </div>
                <div className="fps-row">
                  <label>
                    Output FPS
                    <div className="fps-input-group">
                      <input
                        type="number"
                        min={1}
                        max={sourceFps}
                        value={outputFps}
                        onChange={(e) => setOutputFps(Math.max(1, Math.min(sourceFps, Number(e.target.value))))}
                        className="fps-input"
                      />
                      <div className="fps-presets">
                        {[24, 30, 60, 120, 200].map((fps) => (
                          <button
                            key={fps}
                            className={`fps-preset-btn ${outputFps === fps ? "active" : ""}`}
                            onClick={() => setOutputFps(Math.min(fps, sourceFps))}
                          >
                            {fps}
                          </button>
                        ))}
                      </div>
                    </div>
                  </label>
                </div>
                <div className="fps-summary">
                  {sourceFps}fps &rarr; every {frameSkip} frame &rarr; {effectiveFps.toFixed(1)}fps
                  {trimEnd > trimStart && (
                    <span className="accent">
                      {" "}({Math.round((trimEnd - trimStart) * effectiveFps)} frames)
                    </span>
                  )}
                </div>
              </div>

              <VideoTrimmer
                file={file}
                trimStart={trimStart}
                trimEnd={trimEnd}
                onTrimChange={handleTrimChange}
                onFrameCapture={handleFrameCapture}
              />

              <RegionMaskEditor
                backgroundUrl={frameUrl}
                regions={maskRegions}
                onChange={setMaskRegions}
              />

              <div className="controls">
                <label>
                  Output Name
                  <input
                    type="text"
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    placeholder="default: auto-generated"
                  />
                </label>
              </div>

              <button
                className="submit-btn"
                onClick={handleProcess}
                disabled={processing}
              >
                {processing ? "Processing..." : "Generate Video"}
              </button>

              <button className="reset-btn" onClick={handleReset}>
                Reset
              </button>
            </>
          )}

          {/* ── Step: Done ── */}
          {step === "done" && (
            <div className="result-section">
              <div className="section-title">Complete</div>

              {resultInfo && (
                <div className="result-info">
                  <div>{resultFilename}</div>
                  <div className="result-meta">
                    {resultInfo.width}x{resultInfo.height} | {resultInfo.fps.toFixed(1)}fps | {resultInfo.total_frames} frames
                  </div>
                </div>
              )}

              <div className="result-preview">
                <video
                  src={getPreviewUrl(jobId)}
                  controls
                  className="video-preview"
                />
              </div>

              <div className="result-actions">
                <a
                  href={getDownloadUrl(jobId, resultFilename)}
                  className="download-btn"
                  download
                >
                  Download
                </a>
                <button className="reset-btn" onClick={handleReset}>
                  Process Another Video
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
