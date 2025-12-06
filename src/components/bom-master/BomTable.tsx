import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Pencil, Trash2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { BomData } from "@/components/bom-master/BomFormDialog"; // Import BomData from BomFormDialog

interface BomTableProps {
  boms: BomData[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onEdit: (bom: BomData) => void;
  onDelete: (id: number, unix_no: string) => void;
}

const BomTable = ({ boms, searchTerm, onSearchChange, onEdit, onDelete }: BomTableProps) => {
  const { hasRole } = useUserRole();

  const filteredBoms = boms.filter((bom) =>
    Object.values(bom).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-4">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search BOM data..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-md"
        />
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unix No</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Parent Part</TableHead>
              <TableHead>Child Part</TableHead>
              <TableHead>Part Name</TableHead>
              <TableHead>Picking Qty</TableHead> {/* Changed from 'BOM' to 'Picking Qty' */}
              <TableHead>Qty Per Set</TableHead>
              <TableHead>Safety Stock</TableHead>
              <TableHead>Rack</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
              {hasRole(["admin", "controller"]) && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBoms.map((bom) => (
              <TableRow key={bom.id}>
                <TableCell>{bom.unix_no}</TableCell>
                <TableCell>{bom.model}</TableCell>
                <TableCell>{bom.parent_part}</TableCell>
                <TableCell>{bom.child_part}</TableCell>
                <TableCell>{bom.part_name}</TableCell>
                <TableCell>{bom.qty_bom || "-"}</TableCell> {/* Displays qty_bom */}
                <TableCell>{bom.qty_per_set}</TableCell>
                <TableCell>{bom.safety_stock || "-"}</TableCell>
                <TableCell>{bom.rack || "-"}</TableCell>
                <TableCell>{bom.location || "-"}</TableCell>
                <TableCell>{bom.type || "-"}</TableCell>
                <TableCell>{bom.source}</TableCell>
                {hasRole(["admin", "controller"]) && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onEdit(bom)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {hasRole("admin") && bom.id && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDelete(bom.id!, bom.unix_no)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default BomTable;