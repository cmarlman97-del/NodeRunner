import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "default" | "lg";
  className?: string;
  centered?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4",
  default: "h-8 w-8",
  lg: "h-12 w-12",
};

export function LoadingSpinner({ 
  size = "default", 
  className,
  centered = true 
}: LoadingSpinnerProps) {
  const spinner = (
    <Loader2 
      className={cn(
        sizeClasses[size], 
        "animate-spin text-muted-foreground",
        className
      )} 
    />
  );

  if (centered) {
    return (
      <div className="flex justify-center py-8">
        {spinner}
      </div>
    );
  }

  return spinner;
}
