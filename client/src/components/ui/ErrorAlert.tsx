import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function ErrorAlert({ 
  message, 
  onRetry, 
  isRetrying = false,
  className = "mb-4"
}: ErrorAlertProps) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {message}
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2 h-6 px-2 text-xs"
            onClick={onRetry}
            disabled={isRetrying}
          >
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
