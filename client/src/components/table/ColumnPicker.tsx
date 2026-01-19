import React, { useState } from "react";
import { Settings, Check } from "lucide-react";
import { getAvailableColumns, type ColumnKey } from "./columnRegistry";
import { useAuth } from "@/providers/AuthContext";
import { can } from "@/lib/authorize";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ColumnPickerProps {
  resource: 'contacts';
  visibleColumns: ColumnKey[];
  onColumnsChange: (columns: ColumnKey[]) => void;
  className?: string;
}

export function ColumnPicker({ 
  resource, 
  visibleColumns, 
  onColumnsChange,
  className = ""
}: ColumnPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  
  // Get all available columns for the resource
  const availableColumns = getAvailableColumns(resource);

  // Handle column visibility toggle
  const handleColumnToggle = (columnKey: ColumnKey) => {
    // Check authorization
    if (!can(user, resource, 'read')) {
      return;
    }

    const isVisible = visibleColumns.includes(columnKey);
    let newColumns: ColumnKey[];

    if (isVisible) {
      // Remove column (but ensure at least one column remains)
      if (visibleColumns.length > 1) {
        newColumns = visibleColumns.filter(key => key !== columnKey);
      } else {
        return; // Don't allow removing the last column
      }
    } else {
      // Add column
      newColumns = [...visibleColumns, columnKey];
    }

    onColumnsChange(newColumns);

    // Log telemetry
    console.log('[Telemetry] table.columns.toggled', {
      column: columnKey,
      visible: !isVisible,
      totalVisible: newColumns.length,
    });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 ${className}`}
          aria-label="Customize columns"
        >
          <Settings className="h-4 w-4" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-sm font-semibold">
          Show Columns
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableColumns.map((column) => {
          const isVisible = visibleColumns.includes(column.key);
          const isLastColumn = visibleColumns.length === 1 && isVisible;
          
          return (
            <DropdownMenuItem
              key={column.key}
              className={`flex items-center justify-between cursor-pointer ${
                isLastColumn ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => !isLastColumn && handleColumnToggle(column.key)}
              disabled={isLastColumn}
            >
              <span className="flex-1">{column.label}</span>
              {isVisible && (
                <Check className="h-4 w-4 text-blue-600" />
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <div className="px-2 py-1 text-xs text-muted-foreground">
          {visibleColumns.length} of {availableColumns.length} columns shown
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
