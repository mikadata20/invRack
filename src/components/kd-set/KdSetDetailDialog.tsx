import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useKdSetChildParts } from "@/hooks/useKdSetChildParts"; // Import the new hook

interface KdSetDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  kdSetItem: {
    model: string | null;
    cyl: string | null;
    parent_part: string | null;
  } | null;
}

const KdSetDetailDialog = ({ isOpen, onOpenChange, kdSetItem }: KdSetDetailDialogProps) => {
  const { childParts, loading } = useKdSetChildParts(
    kdSetItem?.model || null,
    kdSetItem?.cyl || null,
    kdSetItem?.parent_part || null,
    isOpen // Enable the hook only when the dialog is open
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Details for KD Part No.: {kdSetItem?.parent_part}</DialogTitle>
          <DialogDescription>
            Model: {kdSetItem?.model} | Cyl: {kdSetItem?.cyl}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading child parts...</div>
          ) : childParts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No child parts found for this KD Set.</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rack Location</TableHead>
                    <TableHead>Part No</TableHead>
                    <TableHead>Part Name</TableHead>
                    <TableHead className="text-right">Sets</TableHead>
                    <TableHead className="text-right">Pcs (Current Stock)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {childParts.map((part, index) => (
                    <TableRow key={part.id || index}>
                      <TableCell>{part.rack_location}</TableCell>
                      <TableCell>{part.part_no}</TableCell>
                      <TableCell>{part.part_name}</TableCell>
                      <TableCell className="text-right">{Math.floor(part.sets || 0)}</TableCell>
                      <TableCell className="text-right">{part.qty}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KdSetDetailDialog;