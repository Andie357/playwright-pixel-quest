"use client";

import QRCode from "qrcode";
import { useMemo } from "react";

/** Crisp pixel QR code rendered as a single SVG path. */
export function QrCode({ value, size = 220, className = "" }: { value: string; size?: number; className?: string }) {
  const { path, modules } = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
    const n = qr.modules.size;
    let d = "";
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (qr.modules.get(x, y)) d += `M${x + 2} ${y + 2}h1v1h-1z`;
      }
    }
    return { path: d, modules: n + 4 };
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${modules} ${modules}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={`pixelated bg-snow ${className}`}
      role="img"
      aria-label={`QR code for ${value}`}
    >
      <path d={path} fill="#0d0e17" />
    </svg>
  );
}
