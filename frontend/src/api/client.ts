import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 300_000,
});

export interface MaskRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UploadResult {
  file_id: string;
  filename: string;
  path: string;
}

export interface VideoInfo {
  file_id: string;
  filename: string;
  width: number;
  height: number;
  fps: number;
  total_frames: number;
  duration: number;
}

export interface ProcessResult {
  job_id: string;
  filename: string;
  output: {
    fps: number;
    width: number;
    height: number;
    total_frames: number;
  };
}

export async function uploadVideo(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/api/upload", form);
  return res.data;
}

export async function getVideoInfo(fileId: string): Promise<VideoInfo> {
  const res = await api.get("/api/video/info", { params: { file_id: fileId } });
  return res.data;
}

export async function processVideo(
  fileId: string,
  trimStart: number,
  trimEnd: number,
  maskRegions: MaskRegion[],
  sourceFps: number,
  outputFps: number,
  outputName: string,
): Promise<ProcessResult> {
  const form = new FormData();
  form.append("file_id", fileId);
  form.append("trim_start", trimStart.toString());
  form.append("trim_end", trimEnd.toString());
  form.append("source_fps", sourceFps.toString());
  form.append("output_fps", outputFps.toString());
  form.append("mask_regions", JSON.stringify(maskRegions));
  form.append("output_name", outputName);
  const res = await api.post("/api/process", form);
  return res.data;
}

export function getDownloadUrl(jobId: string, filename?: string): string {
  const base = `${API_BASE}/api/download/${jobId}`;
  return filename ? `${base}?filename=${encodeURIComponent(filename)}` : base;
}

export function getPreviewUrl(jobId: string): string {
  return `${API_BASE}/api/preview/${jobId}`;
}
