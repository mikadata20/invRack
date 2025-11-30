"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScanLine, Camera, AlertCircle, X } from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Capacitor } from "@capacitor/core";
import { BarcodeScanner, BarcodeFormat, LensFacing } from "@capacitor-mlkit/barcode-scanning";

interface QrScannerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
  description?: string;
}

const QrScanner = ({
  isOpen,
  onOpenChange,
  onScanSuccess,
  title = "Scan QR/Barcode",
  description = "Arahkan kamera ke kode QR atau barcode.",
}: QrScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerRegionId = "html5qr-code-full-region";
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;

    const startWebScanner = async () => {
      if (isOpen && !isScanning) {
        try {
          setError(null);
          await new Promise(resolve => setTimeout(resolve, 100));

          if (!document.getElementById(scannerRegionId)) {
            console.error("Scanner container not found");
            return;
          }

          scanner = new Html5Qrcode(scannerRegionId);
          scannerRef.current = scanner;

          const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.EAN_13,
            ]
          };

          await scanner.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              onScanSuccess(decodedText);
            },
            (errorMessage) => {
              // console.log(errorMessage);
            }
          );

          setIsScanning(true);
        } catch (err: any) {
          console.error("Error starting web scanner:", err);
          setError(err.message || "Gagal memulai kamera.");
          setIsScanning(false);
        }
      }
    };

    const startNativeScanner = async () => {
      if (isOpen && !isScanning) {
        try {
          setError(null);

          const { camera } = await BarcodeScanner.requestPermissions();

          if (camera === 'granted' || camera === 'limited') {
            document.body.classList.add('barcode-scanner-active');

            // Start scanning
            const { barcodes } = await BarcodeScanner.scan({
              formats: [BarcodeFormat.QrCode, BarcodeFormat.Code128, BarcodeFormat.Code39, BarcodeFormat.Ean13],
              lensFacing: LensFacing.Back
            });

            if (barcodes.length > 0) {
              onScanSuccess(barcodes[0].rawValue);
            }
          } else {
            setError("Izin kamera ditolak.");
          }
        } catch (err: any) {
          console.error("Error starting native scanner:", err);
          setError(err.message || "Gagal memulai scanner native.");
        } finally {
          // Always cleanup on finish or error
          document.body.classList.remove('barcode-scanner-active');
          setIsScanning(false);
          // If native scan finishes (success or cancel), we should probably close the dialog
          // But if it was just an error, maybe keep dialog open to show error?
          // For now, let's keep dialog open if error, close if success (handled by parent usually)
        }
      }
    };

    if (isOpen) {
      if (isNative) {
        startNativeScanner();
      } else {
        startWebScanner();
      }
    }

    // Cleanup function
    return () => {
      if (isNative) {
        document.body.classList.remove('barcode-scanner-active');
        // Stop scan if unmounting while scanning (though scan() is a promise, stopScan() might be needed if we used startScan())
        // BarcodeScanner.stopScan(); // Not needed for scan() method usually, but good practice if supported
      } else {
        if (scannerRef.current) {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
            setIsScanning(false);
          }).catch(err => {
            console.error("Failed to stop scanner", err);
          });
          scannerRef.current = null;
        }
      }
    };
  }, [isOpen, onScanSuccess, isNative]);

  const handleClose = async () => {
    if (isNative) {
      // If native, we might need to cancel the scan
      // BarcodeScanner.stopScan(); // Try to stop if running
      document.body.classList.remove('barcode-scanner-active');
    }
    onOpenChange(false);
  };

  // If native, we render a transparent/minimal UI to allow seeing the camera behind
  if (isNative && isOpen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-end pb-10 bg-transparent">
        {/* We need a close button that is visible on top of the camera feed */}
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full h-16 w-16 shadow-lg border-2 border-white"
          onClick={handleClose}
        >
          <X className="h-8 w-8" />
        </Button>
        <p className="mt-4 text-white font-bold text-lg drop-shadow-md bg-black/50 px-4 py-1 rounded-full">
          Scanning...
        </p>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden gap-0">
        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" /> {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
        </div>

        <div className="relative w-full aspect-square bg-black flex flex-col items-center justify-center overflow-hidden">
          <div id={scannerRegionId} className="w-full h-full" />

          {!isScanning && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70">
              <Camera className="h-12 w-12 mb-2 animate-pulse" />
              <p>Memuat kamera...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-4 text-center">
              <AlertCircle className="h-12 w-12 mb-2 text-red-500" />
              <p className="font-medium text-red-400 mb-1">Error Kamera</p>
              <p className="text-sm text-gray-300">{error}</p>
              <Button
                variant="outline"
                className="mt-4 bg-white/10 border-white/20 hover:bg-white/20 text-white"
                onClick={() => {
                  setError(null);
                  handleClose();
                }}
              >
                Tutup
              </Button>
            </div>
          )}
        </div>

        <div className="p-4 bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground mb-3">
            Pastikan kode berada di dalam kotak area scan.
          </p>
          <Button variant="secondary" onClick={handleClose} className="w-full">
            Batal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QrScanner;