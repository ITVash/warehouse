'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/common';

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
}) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrRegionId = 'html5-barcode-scanner-region';

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current = null;
            setIsScanning(false);
          })
          .catch((err) => console.error('Error stopping scanner:', err));
      }
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      try {
        setErrorMsg(null);
        setIsScanning(true);

        const html5QrCode = new Html5Qrcode(qrRegionId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 260, height: 160 },
            aspectRatio: 1.5,
          },
          (decodedText) => {
            if (isMounted) {
              html5QrCode.stop().then(() => {
                onScanSuccess(decodedText.trim());
                onClose();
              });
            }
          },
          () => {
            // Frame scan without barcode - keep quiet
          }
        );
      } catch (err: any) {
        console.warn('Camera scan failed/declined:', err);
        setErrorMsg(
          'Камера недоступна или нет разрешения. Вы можете ввести штрихкод вручную ниже.'
        );
        setIsScanning(false);
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isOpen, onClose, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">📷</span>
            <h3 className="text-sm font-semibold text-slate-100">Сканер штрихкода</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1 rounded hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4 flex flex-col items-center">
          <div
            id={qrRegionId}
            className="w-full max-w-[320px] aspect-[4/3] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center relative"
          >
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-32 border-2 border-blue-400/80 rounded-md animate-pulse"></div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="mt-3 text-xs text-rose-400 text-center px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="w-full mt-4 pt-3 border-t border-slate-800">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Или введите штрихкод вручную:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualCode.trim()) {
                    onScanSuccess(manualCode.trim());
                    onClose();
                  }
                }}
                placeholder="4600000000000"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (manualCode.trim()) {
                    onScanSuccess(manualCode.trim());
                    onClose();
                  }
                }}
              >
                Применить
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
