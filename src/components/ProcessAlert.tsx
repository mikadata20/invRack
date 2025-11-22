import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProcessAlertProps {
  type: "success" | "error";
  title: string;
  description?: string;
  onClose: () => void;
}

const ProcessAlert = ({ type, title, description, onClose }: ProcessAlertProps) => {
  const isSuccess = type === "success";
  const Icon = isSuccess ? CheckCircle : AlertTriangle;
  const variant = isSuccess ? "default" : "destructive";

  return (
    <Alert variant={variant} className={isSuccess ? "bg-green-50 border-green-400 text-green-800" : ""}>
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
          <Icon className="h-4 w-4 mt-1 flex-shrink-0" />
          <div>
            <AlertTitle className={isSuccess ? "text-green-800" : ""}>{title}</AlertTitle>
            {description && <AlertDescription className={isSuccess ? "text-green-700" : ""}>{description}</AlertDescription>}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
};

export default ProcessAlert;