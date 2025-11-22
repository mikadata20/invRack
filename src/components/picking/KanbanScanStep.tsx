import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScanLine } from "lucide-react";

interface KanbanScanStepProps {
  kanbanCode: string;
  setKanbanCode: (code: string) => void;
  handleScanKanban: () => void;
  loading: boolean;
  onQrScanClick: () => void; // New prop for QR scan button
}

const KanbanScanStep = ({ kanbanCode, setKanbanCode, handleScanKanban, loading, onQrScanClick }: KanbanScanStepProps) => {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm">
        <p className="font-semibold text-blue-900 dark:text-blue-100">Langkah 1: Scan Kanban Code</p>
        <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">Sistem akan menampilkan daftar material yang perlu dipicking</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="kanbanCode">Kanban Code</Label>
        <div className="flex gap-2">
          <Input
            id="kanbanCode"
            placeholder="Scan atau ketik Kanban Code..."
            value={kanbanCode}
            onChange={(e) => setKanbanCode(e.target.value.toUpperCase())}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleScanKanban();
              }
            }}
            autoFocus
          />
          <Button onClick={onQrScanClick} variant="outline" disabled={loading} className="shrink-0">
            <ScanLine className="h-4 w-4" />
          </Button>
          <Button onClick={handleScanKanban} disabled={loading || !kanbanCode.trim()}>
            {loading ? "Loading..." : "Proses"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default KanbanScanStep;