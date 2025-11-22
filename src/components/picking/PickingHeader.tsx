import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Package } from "lucide-react";

interface PickingHeaderProps {
  title: string;
  description: string;
}

const PickingHeader = ({ title, description }: PickingHeaderProps) => {
  const navigate = useNavigate();

  return (
    <CardHeader>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
        <div className="bg-picking/10 p-3 rounded-lg">
          <Package className="h-6 w-6 text-picking" />
        </div>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
  );
};

export default PickingHeader;