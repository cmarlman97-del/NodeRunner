import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ 
  icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn("text-center py-8 text-muted-foreground", className)}>
      {icon && (
        <div className="mb-3 flex justify-center">
          {icon}
        </div>
      )}
      {title && (
        <h3 className="font-medium text-foreground mb-1">{title}</h3>
      )}
      <p>{description}</p>
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}
