import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface PickingCompletionProps {
  handleVerifyAndCompletePicking: () => void;
  loading: boolean;
  allItemsValid: boolean;
}

const PickingCompletion = ({ handleVerifyAndCompletePicking, loading, allItemsValid }: PickingCompletionProps) => {
  return (
    <Button
      onClick={handleVerifyAndCompletePicking}
      disabled={loading || !allItemsValid}
      className="w-full bg-green-600 hover:bg-green-700"
      size="lg"
    >
      <CheckCircle className="mr-2 h-5 w-5" />
      {loading ? "Verifying..." : "Verify & Complete Picking"}
    </Button>
  );
};

export default PickingCompletion;