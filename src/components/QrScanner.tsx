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
import { ScanLine, Camera, AlertCircle } from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

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

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      if (isOpen && !isScanning) {
        try {
          setError(null);
          // Give the DOM a moment to render the container
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
              // Success callback
              onScanSuccess(decodedText);
              // Stop scanning after success if needed, or let parent handle closing
              // For now we just let parent close the dialog which will trigger cleanup
            },
            (errorMessage) => {
              // Error callback - usually just "no code found", ignore
              // console.log(errorMessage);
            }
          );
          
          setIsScanning(true);
        } catch (err: any) {
          console.error("Error starting scanner:", err);
          setError(err.message || "Gagal memulai kamera.");
          setIsScanning(false);
        }
      }
    };

    if (isOpen) {
      startScanner();
    }

    // Cleanup function
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
          setIsScanning(false);
        }).catch(err => {
          console.error("Failed to stop scanner", err);
        });
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScanSuccess]);

  // Handle manual close to ensure scanner stops
  const handleClose = () => {
    onOpenChange(false);
  };

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
                  // Trigger re-render/re-effect by toggling open state briefly or just let user close and reopen
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