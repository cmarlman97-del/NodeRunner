import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";

interface SortableHeaderProps {
  label: string;
  isActive: boolean;
  dir: 'asc' | 'desc' | null;
  onToggle: () => void;
  ariaLabel: string;
  className?: string;
}

export function SortableHeader({ 
  label, 
  isActive, 
  dir, 
  onToggle, 
  ariaLabel,
  className = ""
}: SortableHeaderProps) {
  // Determine aria-sort value
  const ariaSortValue = isActive 
    ? (dir === 'asc' ? 'ascending' : 'descending')
    : 'none';

  // Choose the appropriate icon
  const SortIcon = () => {
    if (!isActive) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return dir === 'asc' 
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  return (
    <TableHead 
      className={className}
      aria-sort={ariaSortValue as any}
    >
      <button
        type="button"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex items-center gap-2 min-h-[32px] w-full text-left hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm cursor-pointer"
        aria-label={ariaLabel}
        tabIndex={0}
      >
        <span className="font-semibold">{label}</span>
        <SortIcon />
      </button>
    </TableHead>
  );
}
