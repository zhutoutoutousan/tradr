"use client";

import { useEffect, useRef } from "react";
import {
  BinaryBitmap,
  DecodeHintType,
  HTMLCanvasElementLuminanceSource,
  HybridBinarizer,
  QRCodeReader,
} from "@zxing/library";

// Fraction of the shorter video side that is scanned (matches the on-screen frame).
const SCAN_AREA = 0.85;
// Decoding is done on the camera's own pixels; only very large crops are scaled down.
const MAX_DECODE_SIZE = 900;
// Frames alternate between these scales: full resolution keeps small modules
// sharp, half resolution averages out sensor noise that breaks decoding.
const DECODE_SCALES = [1, 0.5];
const SCAN_INTERVAL_MS = 120;

interface NativeBarcodeDetector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

async function createNativeDetector(): Promise<NativeBarcodeDetector | null> {
  const BD = (window as unknown as {
    BarcodeDetector?: {
      new (opts: { formats: string[] }): NativeBarcodeDetector;
      getSupportedFormats?: () => Promise<string[]>;
    };
  }).BarcodeDetector;
  if (!BD) return null;
  try {
    const formats = (await BD.getSupportedFormats?.()) ?? [];
    return formats.includes("qr_code") ? new BD({ formats: ["qr_code"] }) : null;
  } catch {
    return null;
  }
}

/**
 * Live camera preview that decodes QR codes at camera resolution. Decoding a
 * copy shrunk to the on-screen preview size is too blurry for dense codes on
 * iPhones, which have no native BarcodeDetector.
 * onDecode fires for every decoded frame; callers must ignore repeats.
 */
export default function QrCameraView({
  onDecode,
  onError,
  className = "",
}: {
  onDecode: (text: string) => void;
  onError?: (err: unknown) => void;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDecodeRef = useRef(onDecode);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onDecodeRef.current = onDecode;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stream: MediaStream | null = null;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const reader = new QRCodeReader();
    const hints = new Map([[DecodeHintType.TRY_HARDER, true]]);

    let frame = 0;
    const decodeWithZxing = (video: HTMLVideoElement): string | null => {
      if (!ctx) return null;
      const side = Math.floor(Math.min(video.videoWidth, video.videoHeight) * SCAN_AREA);
      const scale = DECODE_SCALES[frame++ % DECODE_SCALES.length];
      const size = Math.min(Math.round(side * scale), MAX_DECODE_SIZE);
      canvas.width = size;
      canvas.height = size;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, size, size);
      try {
        const bitmap = new BinaryBitmap(new HybridBinarizer(new HTMLCanvasElementLuminanceSource(canvas)));
        return reader.decode(bitmap, hints).getText();
      } catch {
        return null; // no QR in this frame
      } finally {
        reader.reset();
      }
    };

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw Object.assign(new Error("Camera API not supported on this browser"), { name: "NotSupportedError" });
        }
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (stopped || !video) return;
        video.srcObject = stream;
        await video.play();
        const detector = await createNativeDetector();

        const tick = async () => {
          if (stopped) return;
          if (video.readyState >= 2 && video.videoWidth > 0) {
            let text: string | null = null;
            if (detector) {
              try {
                text = (await detector.detect(video))[0]?.rawValue ?? null;
              } catch {
                text = null;
              }
            } else {
              text = decodeWithZxing(video);
            }
            if (text && !stopped) onDecodeRef.current(text);
          }
          if (!stopped) timer = setTimeout(tick, SCAN_INTERVAL_MS);
        };
        tick();
      } catch (err) {
        if (!stopped) onErrorRef.current?.(err);
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
    };
  }, []);

  return (
    <div className={`relative overflow-hidden bg-black ${className}`} data-testid="qr-camera-view">
      <video ref={videoRef} playsInline muted autoPlay className="block w-full" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="aspect-square rounded-xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
          style={{ height: `${SCAN_AREA * 100}%`, maxWidth: `${SCAN_AREA * 100}%` }}
        />
      </div>
    </div>
  );
}
