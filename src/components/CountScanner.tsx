"use client";

import React, { useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScanLine, Camera, AlertCircle, X, Check, RefreshCw, Plus } from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Capacitor } from "@capacitor/core";
import { BarcodeScanner, BarcodeFormat, LensFacing } from "@capacitor-mlkit/barcode-scanning";
import { toast } from "sonner";

interface CountScannerProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onCountComplete: (count: number) => void;
    initialCount?: number;
    title?: string;
    description?: string;
}

const CountScanner = ({
    isOpen,
    onOpenChange,
    onCountComplete,
    initialCount = 0,
    title = "Camera Counting",
    description = "Scan barcodes continuously to count items.",
}: CountScannerProps) => {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentCount, setCurrentCount] = useState(initialCount);
    const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scannerRegionId = "count-scanner-region";
    const isNative = Capacitor.isNativePlatform();

    useEffect(() => {
        if (isOpen) {
            setCurrentCount(initialCount);
            setLastScannedCode(null);
        }
    }, [isOpen, initialCount]);

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
                            handleScan(decodedText);
                        },
                        (errorMessage) => {
                            // ignore frame errors
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
            // Native scanner implementation would be different for continuous scanning 
            // because the plugin typically closes after one scan unless configured otherwise.
            // For this demo, we'll assume we can loop or the plugin supports it.
            // However, standard capacitor-community/barcode-scanner usually scans once.
            // We will simulate continuous scan by restarting or using a specific listener if available.
            // For simplicity in this "Counter" feature on Native, we might need a different UX 
            // (e.g. valid scan -> beep/toast -> immediately restart scan).

            if (isOpen && !isScanning) {
                try {
                    setError(null);
                    const { camera } = await BarcodeScanner.requestPermissions();

                    if (camera === 'granted' || camera === 'limited') {
                        document.body.classList.add('barcode-scanner-active');
                        setIsScanning(true);
                        scanNativeLoop();
                    } else {
                        setError("Izin kamera ditolak.");
                    }
                } catch (err: any) {
                    setError(err.message);
                }
            }
        };

        const scanNativeLoop = async () => {
            try {
                // This loop allows continuous scanning on native
                // Note: This might feel a bit 'jumpy' depending on plugin speed.
                const { barcodes } = await BarcodeScanner.scan({
                    formats: [BarcodeFormat.QrCode, BarcodeFormat.Code128, BarcodeFormat.Code39, BarcodeFormat.Ean13],
                    lensFacing: LensFacing.Back
                });

                if (barcodes.length > 0) {
                    handleScan(barcodes[0].rawValue);
                    // Continue scanning if still open
                    if (isOpen) {
                        scanNativeLoop();
                    }
                }
            } catch (err) {
                console.error("Native scan error", err);
                setIsScanning(false); // Stop on error
            }
        };

        if (isOpen) {
            if (isNative) {
                startNativeScanner();
            } else {
                startWebScanner();
            }
        }

        return () => {
            if (isNative) {
                document.body.classList.remove('barcode-scanner-active');
                // Stop native scan logic if possible
            } else {
                if (scannerRef.current) {
                    scannerRef.current.stop().then(() => {
                        scannerRef.current?.clear();
                        setIsScanning(false);
                    }).catch(err => console.error(err));
                    scannerRef.current = null;
                }
            }
        };
    }, [isOpen, isNative]); // Removing dependency on 'handleScan' to avoid restart loops

    const handleScan = (decodedText: string) => {
        // Logic to prevent double-counting the exact same frame instantly is handled by fps
        // But we might want to enforce a small delay or check equality?
        // For counting: We generally allow counting the same barcode multiple times (e.g. 5 identical boxes).
        // But we should probably debounce slightly to prevent one box registering as 5 counts in 1 second.

        const now = Date.now();
        // Simple debounce for 1 second to avoid accidental double scan of same item
        // But allow fast scanning of DIFFERENT items?
        // Let's just debounce all scans for 500ms
        if (lastScanTime.current && now - lastScanTime.current < 1000) {
            if (decodedText === lastScannedCodeRef.current) {
                return; // Skip identical scan code within 1 second
            }
        }

        lastScanTime.current = now;
        lastScannedCodeRef.current = decodedText;

        setLastScannedCode(decodedText);
        setCurrentCount(prev => prev + 1);
        toast.success(`Scanned! Total: ${currentCount + 1}`);

        // Play a beep sound if possible? (Browser usually blocks without interaction)
    };

    // Refs to access latest state inside callbacks
    const lastScanTime = useRef<number>(0);
    const lastScannedCodeRef = useRef<string | null>(null);

    // Update refs when state changes if needed (actually handleScan uses refs mostly)
    // We used a closure-safe way for setLastScannedCode in UI, but logic uses refs.
    useEffect(() => {
        // Sync refs if we manually reset
        if (currentCount === 0) {
            // lastScanTime.current = 0; // Don't reset time, just logic
        }
    }, [currentCount]);


    const handleClose = () => {
        if (isNative) document.body.classList.remove('barcode-scanner-active');
        onOpenChange(false);
    };

    const handleFinish = () => {
        onCountComplete(currentCount);
        handleClose();
    };

    const handleReset = () => {
        setCurrentCount(0);
        setLastScannedCode(null);
    };

    const handleManualAdd = () => {
        setCurrentCount(prev => prev + 1);
    };

    if (isNative && isOpen) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-between pb-10 bg-transparent">
                <div className="pt-12 px-4 w-full flex justify-between items-start">
                    <div className="bg-black/50 p-2 rounded text-white">
                        <p className="text-xs">LAST SCAN</p>
                        <p className="font-mono font-bold">{lastScannedCode || "-"}</p>
                    </div>
                    <div className="bg-primary p-4 rounded-full text-primary-foreground font-bold text-2xl shadow-lg border-2 border-white">
                        {currentCount}
                    </div>
                </div>

                <div className="flex gap-4 items-center">
                    <Button variant="secondary" onClick={handleReset} className="rounded-full h-12 w-12 p-0">
                        <RefreshCw className="h-6 w-6" />
                    </Button>
                    <Button variant="destructive" size="lg" className="rounded-full h-16 w-16" onClick={handleClose}>
                        <X className="h-8 w-8" />
                    </Button>
                    <Button variant="default" onClick={handleManualAdd} className="rounded-full h-12 w-12 p-0">
                        <Plus className="h-6 w-6" />
                    </Button>
                    <Button variant="default" size="lg" className="rounded-full h-16 w-16 bg-green-600 hover:bg-green-700" onClick={handleFinish}>
                        <Check className="h-8 w-8" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden gap-0">
                <div className="p-4 bg-muted/30 flex justify-between items-center border-b">
                    <div>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <Camera className="h-5 w-5" /> {title}
                        </DialogTitle>
                        <DialogDescription className="text-xs">{description}</DialogDescription>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Count</span>
                        <span className="text-3xl font-bold text-primary leading-none">{currentCount}</span>
                    </div>
                </div>

                <div className="relative w-full aspect-square bg-black flex flex-col items-center justify-center overflow-hidden">
                    <div id={scannerRegionId} className="w-full h-full" />

                    {!isScanning && !error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70">
                            <Camera className="h-12 w-12 mb-2 animate-pulse" />
                            <p>Starting Camera...</p>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-4 text-center">
                            <AlertCircle className="h-12 w-12 mb-2 text-red-500" />
                            <p className="font-medium text-red-400 mb-1">Error</p>
                            <p className="text-sm text-gray-300">{error}</p>
                            <Button variant="outline" className="mt-4" onClick={() => { setError(null); handleClose(); }}>Close</Button>
                        </div>
                    )}

                    {/* Use overlay for scan feedback */}
                    {lastScannedCode && (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                            <div className="bg-green-500/90 text-white px-3 py-1 rounded-full text-xs font-mono shadow-lg animate-in fade-in slide-in-from-bottom-2">
                                {lastScannedCode}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 grid grid-cols-4 gap-2 bg-background">
                    <Button variant="outline" onClick={handleReset} className="flex flex-col h-auto py-2 gap-1 text-xs">
                        <RefreshCw className="h-4 w-4" />
                        Reset
                    </Button>
                    <Button variant="secondary" onClick={handleManualAdd} className="flex flex-col h-auto py-2 gap-1 text-xs">
                        <Plus className="h-4 w-4" />
                        +1 Manual
                    </Button>
                    <Button variant="default" onClick={handleFinish} className="col-span-2 h-auto py-2 gap-1 bg-green-600 hover:bg-green-700 font-bold">
                        <Check className="h-4 w-4" />
                        Finish ({currentCount})
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CountScanner;
