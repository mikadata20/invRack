import { useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle, ScanLine } from "lucide-react"; // Import ScanLine
import { PickingItem } from "@/hooks/usePickingProcess";

interface CurrentItemProcessProps {
  currentItem: PickingItem;
  currentScannedLabel: string;
  setCurrentScannedLabel: (value: string) => void;
  currentScannedLocation: string;
  setCurrentScannedLocation: (value: string) => void;
  currentInputQty: string;
  setCurrentInputQty: (value: string) => void;
  handleProcessCurrentItem: () => void;
  loading: boolean;
  partInputRef: React.RefObject<HTMLInputElement>;
  locationInputRef: React.RefObject<HTMLInputElement>;
  qtyInputRef: React.RefObject<HTMLInputElement>;
  onQrScanClick: (target: "currentScannedLocation" | "currentScannedLabel") => void; // New prop
}

const CurrentItemProcess = ({
  currentItem,
  currentScannedLabel,
  setCurrentScannedLabel,
  currentScannedLocation,
  setCurrentScannedLocation,
  currentInputQty,
  setCurrentInputQty,
  handleProcessCurrentItem,
  loading,
  partInputRef,
  locationInputRef,
  qtyInputRef,
  onQrScanClick, // Destructure new prop
}: CurrentItemProcessProps) => {
  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="text-lg">Current Item - Sequence {currentItem.sequence}</CardTitle>
        <CardDescription>
          {currentItem.child_part} - {currentItem.part_name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Qty BOM:</p>
            <p className="font-bold text-lg">{currentItem.qty_bom}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Expected Part:</p>
            <p className="font-bold text-lg text-picking">{currentItem.child_part}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Expected Location:</p>
            <p className="font-bold text-lg text-picking">{currentItem.location}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Current Stock:</p>
            <p className="font-bold text-lg">{currentItem.currentStock}</p>
          </div>
          {currentItem.scannedPO && ( // Display PO if available
            <div>
              <p className="text-muted-foreground">PO Number:</p>
              <p className="font-bold text-lg">{currentItem.scannedPO}</p>
            </div>
          )}
        </div>

        {/* New Order: 1. Scan/Ketik Lokasi Rak */}
        <div className="space-y-2">
          <Label htmlFor="currentScannedLocation">Scan/Ketik Lokasi Rak</Label>
          <div className="flex gap-2">
            <Input
              id="currentScannedLocation"
              ref={locationInputRef}
              placeholder="Scan atau ketik lokasi rak..."
              value={currentScannedLocation}
              onChange={(e) => setCurrentScannedLocation(e.target.value.toUpperCase())}
              onKeyPress={(e) => {
                if (e.key === "Enter" && currentScannedLocation.trim()) {
                  partInputRef.current?.focus(); // Focus on part input next
                }
              }}
            />
            <Button onClick={() => onQrScanClick("currentScannedLocation")} variant="outline" disabled={loading} className="shrink-0">
              <ScanLine className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* New Order: 2. Scan/Ketik Part Label */}
        <div className="space-y-2">
          <Label htmlFor="currentScannedLabel">Scan/Ketik Part Label</Label>
          <div className="flex gap-2">
            <Input
              id="currentScannedLabel"
              ref={partInputRef}
              placeholder="Scan atau ketik label part number..."
              value={currentScannedLabel}
              onChange={(e) => setCurrentScannedLabel(e.target.value.toUpperCase())}
              onKeyPress={(e) => {
                if (e.key === "Enter" && currentScannedLabel.trim()) {
                  qtyInputRef.current?.focus(); // Focus on quantity input next
                }
              }}
            />
            <Button onClick={() => onQrScanClick("currentScannedLabel")} variant="outline" disabled={loading} className="shrink-0">
              <ScanLine className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* New Order: 3. Input Qty */}
        <div className="space-y-2">
          <Label htmlFor="currentInputQty">Input Qty</Label>
          <div className="flex gap-2">
            <Input
              id="currentInputQty"
              ref={qtyInputRef}
              type="number"
              placeholder="Masukkan qty..."
              value={currentInputQty}
              onChange={(e) => setCurrentInputQty(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && currentInputQty.trim()) {
                  handleProcessCurrentItem();
                }
              }}
            />
            <Button
              onClick={handleProcessCurrentItem}
              disabled={loading || !currentScannedLabel.trim() || !currentScannedLocation.trim() || !currentInputQty.trim()}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm Item
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrentItemProcess;