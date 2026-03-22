"""Video upload, info, thumbnail, and processing endpoints."""
import uuid
import json
import traceback
from pathlib import Path

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
import io

from ..config import UPLOAD_DIR, OUTPUT_DIR, ALLOWED_EXTENSIONS

router = APIRouter()


# ── Upload ──────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported format: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    file_id = uuid.uuid4().hex[:12]
    save_dir = UPLOAD_DIR / file_id
    save_dir.mkdir(parents=True, exist_ok=True)
    save_path = save_dir / file.filename

    with open(save_path, "wb") as f:
        f.write(await file.read())

    return {"file_id": file_id, "filename": file.filename, "path": str(save_path)}


# ── Video Info ──────────────────────────────────────────────────────

@router.get("/video/info")
async def video_info(file_id: str):
    vpath = _find_video(file_id)
    cap = cv2.VideoCapture(str(vpath))
    try:
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total / fps if fps > 0 else 0
    finally:
        cap.release()

    return {
        "file_id": file_id,
        "filename": vpath.name,
        "width": w,
        "height": h,
        "fps": fps,
        "total_frames": total,
        "duration": duration,
    }


# ── Thumbnail ───────────────────────────────────────────────────────

@router.get("/video/thumbnail")
async def video_thumbnail(file_id: str, time_sec: float = 0):
    vpath = _find_video(file_id)
    cap = cv2.VideoCapture(str(vpath))
    try:
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_no = int(time_sec * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
        ret, frame = cap.read()
        if not ret:
            raise HTTPException(400, "Could not read frame at specified time")
    finally:
        cap.release()

    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return StreamingResponse(io.BytesIO(buf.tobytes()), media_type="image/jpeg")


# ── Process (trim + mask → mp4) ────────────────────────────────────

@router.post("/process")
async def process_video(
    file_id: str = Form(...),
    trim_start: float = Form(0),
    trim_end: float = Form(-1),
    source_fps: float = Form(0),
    output_fps: float = Form(0),
    mask_regions: str = Form("[]"),
    output_name: str = Form(""),
):
    vpath = _find_video(file_id)
    regions: list[dict] = json.loads(mask_regions)

    job_id = uuid.uuid4().hex[:12]
    job_dir = OUTPUT_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Step 1: Trim
        trimmed_path = str(job_dir / "trimmed.mp4")
        src_fps_val = source_fps if source_fps > 0 else None
        out_fps_val = output_fps if output_fps > 0 else None
        trim_end_val = trim_end if trim_end > 0 else None

        _trim_video(str(vpath), trimmed_path, trim_start, trim_end_val, src_fps_val, out_fps_val)

        # Step 2: Mask (if regions provided)
        if regions:
            masked_path = str(job_dir / "masked.mp4")
            _mask_video(trimmed_path, masked_path, regions)
            final_path = masked_path
        else:
            final_path = trimmed_path

        # Step 3: Copy to output with desired name
        name = output_name.strip() if output_name.strip() else job_id
        ext = ".mp4"
        out_filename = f"{name}{ext}"
        out_path = job_dir / out_filename

        if str(Path(final_path).resolve()) != str(out_path.resolve()):
            import shutil
            shutil.copy2(final_path, str(out_path))

        # Get output info
        cap = cv2.VideoCapture(str(out_path))
        out_info = {
            "fps": cap.get(cv2.CAP_PROP_FPS) or 30.0,
            "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            "total_frames": int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
        }
        cap.release()

        return {
            "job_id": job_id,
            "filename": out_filename,
            "output": out_info,
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"Processing failed: {e}")


# ── Download ────────────────────────────────────────────────────────

@router.get("/download/{job_id}")
async def download(job_id: str, filename: str = ""):
    job_dir = OUTPUT_DIR / job_id
    if not job_dir.exists():
        raise HTTPException(404, "Job not found")

    # Find the output mp4 (not trimmed.mp4 or masked.mp4 intermediates)
    candidates = [
        f for f in job_dir.iterdir()
        if f.suffix == ".mp4" and f.stem not in ("trimmed", "masked")
    ]
    if not candidates:
        # Fallback: any mp4
        candidates = list(job_dir.glob("*.mp4"))

    if not candidates:
        raise HTTPException(404, "No output file found")

    out_file = candidates[0]
    dl_name = filename if filename else out_file.name

    return FileResponse(
        str(out_file),
        media_type="video/mp4",
        filename=dl_name,
    )


# ── Preview processed video ────────────────────────────────────────

@router.get("/preview/{job_id}")
async def preview_video(job_id: str):
    job_dir = OUTPUT_DIR / job_id
    if not job_dir.exists():
        raise HTTPException(404, "Job not found")

    candidates = [
        f for f in job_dir.iterdir()
        if f.suffix == ".mp4" and f.stem not in ("trimmed", "masked")
    ]
    if not candidates:
        candidates = list(job_dir.glob("*.mp4"))
    if not candidates:
        raise HTTPException(404, "No output file found")

    return FileResponse(str(candidates[0]), media_type="video/mp4")


# ── Helpers ─────────────────────────────────────────────────────────

def _find_video(file_id: str) -> Path:
    fdir = UPLOAD_DIR / file_id
    if not fdir.exists():
        raise HTTPException(404, f"File ID not found: {file_id}")
    videos = [f for f in fdir.iterdir() if f.suffix.lower() in ALLOWED_EXTENSIONS]
    if not videos:
        raise HTTPException(404, "No video file in upload directory")
    return videos[0]


def _trim_video(
    src: str, dst: str,
    start: float, end: float | None,
    source_fps: float | None = None,
    output_fps: float | None = None,
):
    """Trim video and optionally resample FPS."""
    cap = cv2.VideoCapture(src)
    meta_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    src_fps = source_fps if source_fps else meta_fps
    out_fps = output_fps if output_fps else src_fps

    duration = total_frames / src_fps if src_fps > 0 else 0
    if end is None or end > duration:
        end = duration

    frame_skip = max(1, round(src_fps / out_fps)) if out_fps < src_fps else 1
    actual_out_fps = src_fps / frame_skip

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(dst, fourcc, actual_out_fps, (w, h))

    start_frame = int(start * src_fps)
    end_frame = int(end * src_fps)

    meta_ratio = meta_fps / src_fps if src_fps > 0 else 1.0
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(start_frame * meta_ratio))

    written = 0
    for i in range(end_frame - start_frame):
        ret, frame = cap.read()
        if not ret:
            break
        if i % frame_skip == 0:
            writer.write(frame)
            written += 1

    cap.release()
    writer.release()
    print(f"[Trim] {src_fps:.0f}fps -> {actual_out_fps:.1f}fps, "
          f"{written} frames ({start:.2f}s - {end:.2f}s)")


def _mask_video(src: str, dst: str, regions: list[dict]):
    """Apply region mask to every frame (black out outside regions)."""
    cap = cv2.VideoCapture(src)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    mask = np.zeros((h, w), dtype=np.uint8)
    for r in regions:
        x1, y1 = int(r["x"] * w), int(r["y"] * h)
        x2, y2 = int((r["x"] + r["width"]) * w), int((r["y"] + r["height"]) * h)
        mask[y1:y2, x1:x2] = 255

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(dst, fourcc, fps, (w, h))

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame[mask == 0] = 0
        writer.write(frame)

    cap.release()
    writer.release()
