import { useRef, useState, useEffect, useCallback } from "react";
import type { MaskRegion } from "../api/client.ts";

interface Props {
  backgroundUrl: string | null;
  regions: MaskRegion[];
  onChange: (regions: MaskRegion[]) => void;
}

export default function RegionMaskEditor({ backgroundUrl, regions, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [previewRect, setPreviewRect] = useState<MaskRegion | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  const bgRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!backgroundUrl) return;
    const img = new Image();
    img.onload = () => {
      bgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = backgroundUrl;
  }, [backgroundUrl]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    if (bgRef.current) {
      ctx.drawImage(bgRef.current, 0, 0, cw, ch);
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, 0, cw, ch);
    } else {
      ctx.fillStyle = "#1b2238";
      ctx.fillRect(0, 0, cw, ch);
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(8, 8, Math.max(0, cw - 16), Math.max(0, ch - 16));
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Capture a frame in Trimmer first", cw / 2, ch / 2);
      return;
    }

    for (const r of regions) {
      const rx = r.x * cw, ry = r.y * ch;
      const rw = r.width * cw, rh = r.height * ch;
      if (bgRef.current) {
        ctx.drawImage(
          bgRef.current,
          r.x * imgSize.w, r.y * imgSize.h,
          r.width * imgSize.w, r.height * imgSize.h,
          rx, ry, rw, rh,
        );
      }
      ctx.strokeStyle = "#4fc3f7";
      ctx.lineWidth = 2;
      ctx.strokeRect(rx, ry, rw, rh);
    }

    if (previewRect) {
      const rx = previewRect.x * cw, ry = previewRect.y * ch;
      const rw = previewRect.width * cw, rh = previewRect.height * ch;
      ctx.strokeStyle = "#fff176";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);
    }
  }, [regions, previewRect, imgSize]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = imgSize.w > 0 && imgSize.h > 0
        ? rect.width * (imgSize.h / imgSize.w)
        : rect.width * 0.5625;
      draw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [imgSize, draw]);

  const getNormCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDrawing(true);
    setDrawStart(getNormCoords(e));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !drawStart) return;
    const pos = getNormCoords(e);
    setPreviewRect({
      x: Math.min(drawStart.x, pos.x),
      y: Math.min(drawStart.y, pos.y),
      width: Math.abs(pos.x - drawStart.x),
      height: Math.abs(pos.y - drawStart.y),
    });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !drawStart) return;
    const pos = getNormCoords(e);
    const newRect: MaskRegion = {
      x: Math.max(0, Math.min(drawStart.x, pos.x)),
      y: Math.max(0, Math.min(drawStart.y, pos.y)),
      width: Math.min(1, Math.abs(pos.x - drawStart.x)),
      height: Math.min(1, Math.abs(pos.y - drawStart.y)),
    };
    if (newRect.width > 0.01 && newRect.height > 0.01) {
      onChange([...regions, newRect]);
    }
    setDrawing(false);
    setDrawStart(null);
    setPreviewRect(null);
  };

  const removeRegion = (index: number) => {
    onChange(regions.filter((_, i) => i !== index));
  };

  return (
    <div className="mask-editor">
      <div className="mask-header">
        <span className="section-title">Mask</span>
        {regions.length > 0 && (
          <button className="clear-btn" onClick={() => onChange([])}>
            Clear All
          </button>
        )}
      </div>

      <p className="mask-hint">
        Draw rectangles to select areas to keep. Areas outside will be blacked out.
      </p>

      <div ref={containerRef} className="mask-canvas-container">
        <canvas
          ref={canvasRef}
          className="mask-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (drawing) {
              setDrawing(false);
              setDrawStart(null);
              setPreviewRect(null);
            }
          }}
        />
      </div>

      {regions.length > 0 && (
        <div className="region-list">
          {regions.map((r, i) => (
            <div key={i} className="region-item">
              <span>
                Region {i + 1}: ({(r.x * 100).toFixed(0)}%, {(r.y * 100).toFixed(0)}%)
                {" "}{(r.width * 100).toFixed(0)}% x {(r.height * 100).toFixed(0)}%
              </span>
              <button onClick={() => removeRegion(i)}>x</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
