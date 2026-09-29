"use client";

import React, { useEffect, useRef, useState } from "react";
import { useUiStore } from "@/src/stores/ui.store";
import { Camera, X, Check, Keyboard, AlertCircle } from "lucide-react";

export const BarcodeScannerModal: React.FC = () => {
  const { scannerOpen, scannerTarget, closeScanner, addToast } = useUiStore();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!scannerOpen) {
      stopCamera();
      setManualCode("");
      setCameraError(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [scannerOpen]);

  const startCamera = async () => {
    setCameraError(null);
    setIsScanning(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Камера не поддерживается вашим браузером или контекстом.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      const BarcodeDetectorClass = (window as unknown as { BarcodeDetector?: any }).BarcodeDetector;
      if (BarcodeDetectorClass) {
        const detector = new BarcodeDetectorClass({
          formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"],
        });

        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              handleDetectedBarcode(barcodes[0].rawValue);
            }
          } catch {
            // detection frame skip
          }
        }, 300);
      }
    } catch (err: unknown) {
      console.warn("Camera access failed or unavailable:", err);
      setCameraError((err as Error)?.message || "Не удалось получить доступ к камере. Используйте ручной ввод.");
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const handleDetectedBarcode = (barcode: string) => {
    stopCamera();
    addToast("success", `Штрихкод считан: ${barcode}`);
    if (scannerTarget?.onScan) {
      scannerTarget.onScan(barcode);
    }
    closeScanner();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetectedBarcode(manualCode.trim());
  };

  if (!scannerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-base">{scannerTarget?.title || "Сканирование штрихкода"}</h3>
          </div>
          <button
            onClick={closeScanner}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-sm text-neutral-300 flex flex-col items-center">
              <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
              <p className="font-medium text-white mb-1">Камера недоступна</p>
              <p className="text-xs text-neutral-400">{cameraError}</p>
              <p className="text-xs text-emerald-400 mt-2">Введите штрихкод вручную ниже или выберите тестовый</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-4/5 h-3/5 border-2 border-dashed border-emerald-400/70 rounded-lg">
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-5 flex flex-col gap-4 bg-neutral-900/90 border-t border-neutral-800">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Ввести штрихкод цифрами..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 pl-9 pr-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Ввод
            </button>
          </form>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-neutral-400">Быстрый выбор для тестирования:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { code: "4600123456789", name: "Бумага А4" },
                { code: "4600123456796", name: "Ручка синяя" },
                { code: "4600123456802", name: "Прогресс 5л" },
                { code: "4600987654321", name: "Степлер №24" },
                { code: "4600987654345", name: "Мешки 120л" },
              ].map((sample) => (
                <button
                  key={sample.code}
                  type="button"
                  onClick={() => handleDetectedBarcode(sample.code)}
                  className="px-2.5 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
                >
                  {sample.name} ({sample.code.slice(-4)})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
