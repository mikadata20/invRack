import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ProcessCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  variant: "supply" | "picking" | "kobetsu" | "dashboard";
}

const ProcessCard = ({ title, description, icon: Icon, onClick, variant }: ProcessCardProps) => {
  const variantStyles = {
    supply: "bg-gradient-to-br from-supply to-supply/80 hover:from-supply/90 hover:to-supply/70",
    picking: "bg-gradient-to-br from-picking to-picking/80 hover:from-picking/90 hover:to-picking/70",
    kobetsu: "bg-gradient-to-br from-kobetsu to-kobetsu/80 hover:from-kobetsu/90 hover:to-kobetsu/70",
    dashboard: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-0 overflow-hidden",
        variantStyles[variant]
      )}
    >
      <div className="p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
            <Icon className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-1">{title}</h3>
            <p className="text-sm text-white/90">{description}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProcessCard;
