import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TableActionsMenu, TableActionsMenuItem } from "@/components/table/TableActionsMenu";

interface ContactsToolbarProps {
  title?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onAddNew: () => void;
  onEditTable?: () => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function ContactsToolbar({ 
  title = "Contact", 
  searchValue, 
  onSearchChange, 
  onAddNew,
  onEditTable,
  hasActiveFilters = false,
  onClearFilters
}: ContactsToolbarProps) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <div className="flex w-full md:w-auto items-center gap-2">
        {/* Clear Filters text link */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-[#046E75] hover:text-[#2EC4B6] underline cursor-pointer font-medium transition-colors duration-200 text-sm"
            aria-label="Clear all active filters"
          >
            Clear Filters
          </button>
        )}
        
        {/* Table actions button */}
        <TableActionsMenu align="start">
          <TableActionsMenuItem onClick={() => onEditTable?.()}>
            Edit table
          </TableActionsMenuItem>
        </TableActionsMenu>
        
        {/* Search input, width grows on mobile */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search contacts…"
            aria-label="Search contacts"
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <Button 
          onClick={onAddNew} 
          variant="cta"
          className="whitespace-nowrap"
        >
          Add New Contact
        </Button>
      </div>
    </div>
  );
}
