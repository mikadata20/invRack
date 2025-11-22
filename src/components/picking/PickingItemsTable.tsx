import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, XCircle } from "lucide-react";
import { PickingItem } from "@/hooks/usePickingProcess";

interface PickingItemsTableProps {
  pickingItems: PickingItem[];
  currentItemIndex: number;
  kanbanCode: string;
}

const PickingItemsTable = ({ pickingItems, currentItemIndex, kanbanCode }: PickingItemsTableProps) => {
  return (
    <>
      <div className="bg-primary/10 p-4 rounded-lg">
        <p className="font-semibold">Kanban Code: {kanbanCode}</p>
        <p className="text-sm text-muted-foreground">Total Items: {pickingItems.length}</p>
        <p className="text-sm text-muted-foreground">Progress: {pickingItems.filter(i => i.isScanned).length} / {pickingItems.length}</p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Seq</TableHead>
              <TableHead>Child Part</TableHead>
              <TableHead>Part Name</TableHead>
              <TableHead>Exp. Location</TableHead>
              <TableHead>Qty BOM</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead className="text-right">Scanned Qty</TableHead>
              <TableHead className="w-24">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pickingItems.map((item, index) => (
              <TableRow
                key={item.id}
                className={index === currentItemIndex ? "bg-accent" : ""}
              >
                <TableCell className="font-medium">{item.sequence}</TableCell>
                <TableCell>{item.child_part}</TableCell>
                <TableCell>{item.part_name}</TableCell>
                <TableCell>{item.location}</TableCell>
                <TableCell>{item.qty_bom}</TableCell>
                <TableCell>{item.currentStock}</TableCell>
                <TableCell className="text-right">{item.scannedQty || "-"}</TableCell>
                <TableCell>
                  {item.isScanned ? (
                    item.isValid ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <XCircle className="h-5 w-5 text-destructive" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{item.errorMessage}</p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground">Pending</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default PickingItemsTable;