import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RackItemDetail {
  parent_part: string | null;
  child_part: string | null;
  part_name: string | null;
  sets: number | null;
  qty: number | null; // Current physical quantity
  safety_stock: number | null;
  model: string | null;
  cyl: string | null;
}

interface RackCardProps {
  rackLocation: string;
  items: RackItemDetail[];
}

const RackCard = ({ rackLocation, items }: RackCardProps) => {
  const hasLowStock = items.some(item => 
    item.qty !== null && item.safety_stock !== null && item.qty < item.safety_stock
  );

  return (
    <Card className={cn(
      "relative overflow-hidden",
      hasLowStock ? "border-destructive ring-2 ring-destructive/50 animate-flash-red" : "border-border" // Apply flash-red animation
    )}>
      {hasLowStock && (
        <Badge variant="destructive" className="absolute top-2 right-2 z-10 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Low Stock
        </Badge>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-primary">{rackLocation}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {items.length === 0 ? (
          <p className="text-muted-foreground italic">No parts in this rack matching filters.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="border-b last:border-b-0 pb-2 last:pb-0">
                <p className="font-semibold text-foreground">{item.parent_part || "N/A"}</p>
                <p className="text-muted-foreground text-xs">
                  {item.child_part} - {item.part_name}
                </p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-sm">
                    Sets: <span className="font-bold text-primary">{Math.floor(item.sets || 0)}</span>
                  </p>
                  <p className="text-sm">
                    Qty: <span className={cn(
                      "font-bold",
                      item.qty !== null && item.safety_stock !== null && item.qty < item.safety_stock ? "text-destructive" : "text-green-600"
                    )}>{item.qty || 0}</span>
                    {item.safety_stock !== null && ` (Min: ${item.safety_stock})`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RackCard;