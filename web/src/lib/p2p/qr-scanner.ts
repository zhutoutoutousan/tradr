"use client";

import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import type { Html5QrcodeCameraScanConfig } from 'html5-qrcode';

export function createQrScanner(elementId: string): Html5Qrcode {
  return new Html5Qrcode(elementId, {
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    // Native BarcodeDetector (Android Chrome, Safari 17+) decodes far more reliably than the JS fallback.
    experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    verbose: false,
  });
}

export const QR_SCAN_CONFIG: Html5QrcodeCameraScanConfig = {
  fps: 15,
  qrbox: (width, height) => {
    const size = Math.max(150, Math.floor(Math.min(width, height) * 0.8));
    return { width: size, height: size };
  },
};
