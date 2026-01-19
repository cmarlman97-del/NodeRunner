import React, { useState, useMemo, useCallback, useEffect } from "react";
import { SortableHeader } from "./SortableHeader";
import { getColumnConfig, type ColumnKey } from "./columnRegistry";
import { useAuth } from "@/providers/AuthContext";
import { can } from "@/lib/authorize";
import { EditableCell } from "@/components/ui/EditableCell";
import { filterAndRank } from "@/lib/search";
import { useDebounce } from "@/hooks/useDebounce";
import { Link } from "wouter";
import { Users, MoreVertical } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { getPropertyTypeLabel, getPropertyTypeValue } from "@/constants/property-types";
import { formatPhoneNumber } from "@/lib/phone-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SortState {
  key: ColumnKey;
  dir: 'asc' | 'desc';
}

type ColumnFilters = Record<ColumnKey, string[]>;

interface GlobalTableProps {
  rows: any[];
  columns: ColumnKey[];
  onColumnsChange?: (next: ColumnKey[]) => void;
  className?: string;
  // Search functionality
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  // Inline editing
  enableInlineEditing?: boolean;
  onRowUpdate?: (id: string, field: string, value: any) => Promise<void>;
  // Custom cell renderers
  cellRenderers?: Record<ColumnKey, (row: any, value: any) => React.ReactNode>;
  // Loading states
  isLoading?: boolean;
  // Empty state
  emptyState?: {
    icon?: React.ReactNode;
    title: string;
    description?: string;
  };
  // Select options for dropdowns
  selectOptions?: Record<ColumnKey, Array<{ value: string; label: string }>>;
  // Column reordering
  enableColumnReordering?: boolean;
  // Filter callbacks
  onFiltersChange?: (hasActiveFilters: boolean) => void;
  onClearFilters?: (clearFunction: () => void) => void;
}

export function GlobalTable({ 
  rows, 
  columns, 
  onColumnsChange,
  className = "",
  searchQuery = "",
  onSearchChange,
  enableInlineEditing = false,
  onRowUpdate,
  cellRenderers = {},
  isLoading = false,
  emptyState,
  selectOptions = {},
  enableColumnReordering = false,
  onFiltersChange,
  onClearFilters
}: GlobalTableProps) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState<{ columnKey: string; startX: number; startWidth: number } | null>(null);
  const { user } = useAuth();

  // Debounce search query for performance
  const debouncedSearchQuery = useDebounce(searchQuery, 200);

  // Apply search filtering and sorting
  const processedRows = useMemo(() => {
    const hasSearchQuery = debouncedSearchQuery.trim().length >= 3 || 
                          (debouncedSearchQuery.match(/\d/g) || []).length >= 3;
    
    // First apply search filtering with relevance ranking
    let filtered = filterAndRank(rows, debouncedSearchQuery);
    
    // Apply column filters (AND logic across columns)
    const activeFilters = Object.entries(columnFilters);
    
    if (activeFilters.length > 0) {
      filtered = filtered.filter(row => {
        return activeFilters.every(([columnKey, selectedValues]) => {
          // Get the raw value from the row
          const rawValue = (row as any)[columnKey];
          // Convert to string and trim, handling null/undefined
          const cellValue = String(rawValue || '').trim();
          
          // For propertyTypes, convert stored value to label for comparison
          let compareValue = cellValue;
          if (columnKey === 'propertyTypes' && cellValue) {
            compareValue = getPropertyTypeLabel(cellValue);
          }
          
          // Check if this value is in the selected array
          const isSelected = selectedValues.includes(compareValue);
          
          return isSelected;
        });
      });
    }
    
    // Handle sorting behavior:
    // - If no search query: apply column sort (or default name asc)
    // - If search query active and user clicked sort: apply column sort to filtered results
    // - If search query active and no user sort: use relevance ranking from filterAndRank
    
    if (!hasSearchQuery) {
      // No search - use column sorting or default
      if (sort) {
        const columnConfig = getColumnConfig(sort.key);
        if (columnConfig) {
          filtered = [...filtered].sort((a, b) => {
            let aValue = (a as any)[sort.key];
            let bValue = (b as any)[sort.key];

            // Handle null/undefined values
            if (aValue == null && bValue == null) return 0;
            if (aValue == null) return 1;
            if (bValue == null) return -1;

            // Convert to strings for comparison
            aValue = String(aValue).trim();
            bValue = String(bValue).trim();

            // Apply sort comparator logic based on column type
            let result = 0;
            switch (columnConfig.sortComparator) {
              case 'emailLocal':
                // Sort by local part of email (before @)
                const aLocal = aValue.split('@')[0] || '';
                const bLocal = bValue.split('@')[0] || '';
                result = aLocal.localeCompare(bLocal, undefined, { sensitivity: 'base' });
                break;
              case 'phoneDigits':
                // Sort by digits only
                const aDigits = aValue.replace(/\D/g, '');
                const bDigits = bValue.replace(/\D/g, '');
                result = aDigits.localeCompare(bDigits, undefined, { numeric: true });
                break;
              case 'text':
              default:
                result = aValue.localeCompare(bValue, undefined, { 
                  sensitivity: 'base', 
                  numeric: true 
                });
                break;
            }

            return sort.dir === 'desc' ? -result : result;
          });
        }
      } else {
        // Default to name ascending when no search and no sort
        filtered = [...filtered].sort((a, b) => {
          const aName = String(a.name || '').trim();
          const bName = String(b.name || '').trim();
          return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
        });
      }
    } else if (sort) {
      // Search active + user clicked a sort header - override relevance with column sort
      const columnConfig = getColumnConfig(sort.key);
      if (columnConfig) {
        filtered = [...filtered].sort((a, b) => {
          let aValue = (a as any)[sort.key];
          let bValue = (b as any)[sort.key];

          if (aValue == null && bValue == null) return 0;
          if (aValue == null) return 1;
          if (bValue == null) return -1;

          aValue = String(aValue).trim();
          bValue = String(bValue).trim();

          let result = 0;
          switch (columnConfig.sortComparator) {
            case 'emailLocal':
              const aLocal = aValue.split('@')[0] || '';
              const bLocal = bValue.split('@')[0] || '';
              result = aLocal.localeCompare(bLocal, undefined, { sensitivity: 'base' });
              break;
            case 'phoneDigits':
              const aDigits = aValue.replace(/\D/g, '');
              const bDigits = bValue.replace(/\D/g, '');
              result = aDigits.localeCompare(bDigits, undefined, { numeric: true });
              break;
            case 'text':
            default:
              result = aValue.localeCompare(bValue, undefined, { 
                sensitivity: 'base', 
                numeric: true 
              });
              break;
          }

          return sort.dir === 'desc' ? -result : result;
        });
      }
    }
    // If search active and no sort override, filtered already has relevance ranking
    
    return filtered;
  }, [rows, debouncedSearchQuery, sort, columnFilters]);

  // Handle sort with specific direction
  const handleSort = useCallback((columnKey: ColumnKey, direction?: 'asc' | 'desc') => {
    // Check authorization for sorting (future-proofing)
    if (!can(user, 'contacts', 'read')) {
      return;
    }

    let newSort: SortState | null;
    if (direction) {
      // Direct sort from menu
      newSort = { key: columnKey, dir: direction };
    } else {
      // Toggle sort (for backward compatibility)
      newSort = toggleSort(sort, columnKey);
    }
    
    setSort(newSort);

    // Log telemetry (simple console log for now)
    console.log('[Telemetry] table.sort.changed', {
      column: columnKey,
      direction: newSort?.dir || 'none',
    });
  }, [sort, user]);

  // Get distinct values for a column (for filter dropdowns)
  const getDistinctValues = useCallback((columnKey: ColumnKey): string[] => {
    // Start from search-filtered rows
    let filtered = filterAndRank(rows, debouncedSearchQuery);
    
    // Apply all column filters EXCEPT the target column's filter
    const otherFilters = Object.entries(columnFilters).filter(([col]) => col !== columnKey);
    
    if (otherFilters.length > 0) {
      filtered = filtered.filter(row => {
        return otherFilters.every(([otherColumnKey, selectedValues]) => {
          // Get the raw value from the row
          const rawValue = (row as any)[otherColumnKey];
          // Convert to string and trim, handling null/undefined
          const cellValue = String(rawValue || '').trim();
          
          // For propertyTypes, we need to check if the label is selected
          // since selectedValues contains labels but cellValue is the raw value
          if (otherColumnKey === 'propertyTypes') {
            const cellLabel = getPropertyTypeLabel(cellValue);
            return selectedValues.includes(cellLabel);
          }
          
          // For other columns, check the raw value directly
          const isSelected = selectedValues.includes(cellValue);
          
          return isSelected;
        });
      });
    }
    
    // Now collect distinct values for the target column from the filtered set
    const values = new Set<string>();
    
    filtered.forEach(row => {
      // Get the raw value from the row
      const rawValue = (row as any)[columnKey];
      // Convert to string and trim, handling null/undefined
      const cellValue = String(rawValue || '').trim();
      
      // Add non-empty values to the set
      if (cellValue) {
        // For propertyTypes, show the human-friendly label in filters
        if (columnKey === 'propertyTypes') {
          values.add(getPropertyTypeLabel(cellValue));
        } else {
          values.add(cellValue);
        }
      }
    });
    
    return Array.from(values).sort();
  }, [rows, debouncedSearchQuery, columnFilters]);

  // Handle filter changes
  const handleFilterChange = useCallback((columnKey: ColumnKey, selectedValues: string[]) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnKey]: selectedValues
    }));

    // Log telemetry
    console.log('[Telemetry] table.filter.applied', {
      column: columnKey,
      selectedCount: selectedValues.length,
      totalCount: getDistinctValues(columnKey).length
    });
  }, [getDistinctValues]);

  // Track filter changes and notify parent component
  React.useEffect(() => {
    const hasActiveFilters = Object.keys(columnFilters).length > 0;
    onFiltersChange?.(hasActiveFilters);
  }, [columnFilters, onFiltersChange]);

  // Clear all filters function
  const clearAllFilters = useCallback(() => {
    const previousFilterCount = Object.keys(columnFilters).length;
    setColumnFilters({});
    console.log('[Telemetry] table.filters.cleared', {
      previousFilterCount
    });
  }, [columnFilters]);

  // Expose clear filters function to parent via callback
  React.useEffect(() => {
    onClearFilters?.(clearAllFilters);
  }, [onClearFilters, clearAllFilters]);

  // Create a filter signature for React keys to force re-render when filters change
  const filterSignature = useMemo(() => {
    const activeFilters = Object.entries(columnFilters);
    if (activeFilters.length === 0) return '';
    
    return '-filtered-' + activeFilters
      .map(([col, vals]) => `${col}:${vals.length}`)
      .sort()
      .join(',');
  }, [columnFilters]);

  // Get current filter values for a column, defaulting to all values if not set
  const getColumnFilterValues = useCallback((columnKey: ColumnKey): string[] => {
    const filterValues = columnFilters[columnKey];
    if (filterValues !== undefined) {
      return filterValues;
    }
    // Default to all values selected (no filtering)
    return getDistinctValues(columnKey);
  }, [columnFilters, getDistinctValues]);

  // Handle inline editing
  const handleCellClick = useCallback((id: string, field: string) => {
    if (!enableInlineEditing) return;
    // Prevent editing of read-only fields
    if (field === 'createdAt') return;
    setEditingCell({ id, field });
  }, [enableInlineEditing]);

  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleFieldUpdate = useCallback(async (id: string, field: string, value: any) => {
    if (!onRowUpdate) return;
    
    try {
      await onRowUpdate(id, field, value);
      setEditingCell(null);
    } catch (error) {
      // Error handling is done by the parent component
      console.error('Field update failed:', error);
    }
  }, [onRowUpdate]);

  // Handle column drag-and-drop reordering
  const handleColumnDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || !onColumnsChange || !enableColumnReordering) {
      return;
    }

    const newColumns = Array.from(columns);
    const [reorderedColumn] = newColumns.splice(result.source.index, 1);
    
    if (reorderedColumn) {
      newColumns.splice(result.destination.index, 0, reorderedColumn);
      onColumnsChange(newColumns);

      // Log telemetry (simple console log for now)
      console.log('[Telemetry] table.columns.reordered', {
        from: result.source.index,
        to: result.destination.index,
        column: reorderedColumn,
      });
    }
  }, [columns, onColumnsChange, enableColumnReordering]);

  // Handle column reordering (simplified - will add drag-and-drop later)
  const handleColumnReorder = useCallback((fromIndex: number, toIndex: number) => {
    if (!onColumnsChange) return;

    const newColumns = Array.from(columns);
    const [reorderedColumn] = newColumns.splice(fromIndex, 1);
    
    if (reorderedColumn) {
      newColumns.splice(toIndex, 0, reorderedColumn);
      onColumnsChange(newColumns);

      // Log telemetry (simple console log for now)
      console.log('[Telemetry] table.columns.reordered', {
        from: fromIndex,
        to: toIndex,
        column: reorderedColumn,
      });
    }
  }, [columns, onColumnsChange]);

  // Column resizing handlers
  const handleResizeStart = useCallback((columnKey: string, startX: number) => {
    const currentWidth = columnWidths[columnKey] || 150; // Default width
    setIsResizing({ columnKey, startX, startWidth: currentWidth });
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [columnWidths]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - isResizing.startX;
    const newWidth = Math.max(80, isResizing.startWidth + deltaX); // Minimum width of 80px
    
    setColumnWidths(prev => ({
      ...prev,
      [isResizing.columnKey]: newWidth
    }));
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(null);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Global mouse event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Render cell content with inline editing support
  const renderCell = useCallback((row: any, columnKey: ColumnKey) => {
    const value = row[columnKey];
    const columnConfig = getColumnConfig(columnKey);
    
    // Check if custom renderer exists
    if (cellRenderers[columnKey]) {
      return cellRenderers[columnKey](row, value);
    }

    // Check if this cell is being edited
    const isEditing = editingCell?.id === row.id && editingCell?.field === columnKey;
    
    if (isEditing && enableInlineEditing) {
      // Determine cell type and options
      let cellType: 'text' | 'email' | 'phone' | 'select' = 'text';
      let options: Array<{ value: string; label: string }> = [];
      
      if (columnConfig?.type === 'email') {
        cellType = 'email';
      } else if (columnConfig?.type === 'phone') {
        cellType = 'phone';
      } else if (selectOptions[columnKey]) {
        cellType = 'select';
        options = selectOptions[columnKey];
      }
      
      return (
        <EditableCell
          field={columnKey as any}
          value={value}
          onSave={(newValue) => handleFieldUpdate(row.id, columnKey, newValue)}
          onCancel={handleCancelEdit}
          type={cellType}
          options={options}
          ariaLabel={`Edit ${columnConfig?.label || columnKey} for ${row.name || 'item'}`}
        />
      );
    }
    
    // Display mode - Default rendering based on column type
    switch (columnConfig?.type) {
      case 'email':
        if (enableInlineEditing) {
          return (
            <div
              className="cursor-pointer hover:bg-accent/50 rounded px-2 py-1 min-h-[32px] flex items-center"
              onClick={() => handleCellClick(row.id, columnKey)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCellClick(row.id, columnKey);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Edit ${columnConfig?.label || columnKey}`}
            >
              {value ? (
                <a 
                  href={`mailto:${value}`}
                  className="text-blue-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {value}
                </a>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>
          );
        }
        if (!value) return '—';
        return (
          <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
            {value}
          </a>
        );
      case 'phone':
        if (enableInlineEditing) {
          return (
            <div
              className="cursor-pointer hover:bg-accent/50 rounded px-2 py-1 min-h-[32px] flex items-center"
              onClick={() => handleCellClick(row.id, columnKey)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCellClick(row.id, columnKey);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Edit ${columnConfig?.label || columnKey}`}
            >
              {value ? (
                <span className="text-gray-900">
                  {formatPhoneNumber(value)}
                </span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>
          );
        }
        if (!value) return '—';
        return (
          <span className="text-gray-900">
            {formatPhoneNumber(value)}
          </span>
        );
      case 'badge':
        if (enableInlineEditing) {
          return (
            <div
              className="cursor-pointer hover:bg-accent/50 rounded px-2 py-1 min-h-[32px] flex items-center"
              onClick={() => handleCellClick(row.id, columnKey)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCellClick(row.id, columnKey);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Edit ${columnConfig.label}`}
            >
              {value ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {columnKey === 'propertyTypes' ? getPropertyTypeLabel(value) : value}
                </span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>
          );
        }
        if (!value) return '—';
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {columnKey === 'propertyTypes' ? getPropertyTypeLabel(value) : value}
          </span>
        );
      case 'text':
      default:
        if (enableInlineEditing) {
          return (
            <div
              className="cursor-pointer hover:bg-accent/50 rounded px-2 py-1 min-h-[32px] flex items-center"
              onClick={() => handleCellClick(row.id, columnKey)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCellClick(row.id, columnKey);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Edit ${columnConfig?.label || columnKey}`}
            >
              {value != null ? String(value) : <span className="text-gray-400">—</span>}
            </div>
          );
        }
        return value != null ? String(value) : '—';
    }
  }, [editingCell, enableInlineEditing, cellRenderers, selectOptions, handleCellClick, handleFieldUpdate, handleCancelEdit]);

  return (
    <div className={`bg-white rounded-xl shadow-material border border-gray-100 ${className}`}>
      <Table>
        <TableHeader>
          {enableColumnReordering ? (
            <DragDropContext onDragEnd={handleColumnDragEnd}>
              <Droppable droppableId="table-headers" direction="horizontal">
                {(provided) => (
                  <TableRow 
                    className="bg-slate-50"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {columns.map((columnKey, index) => {
                      const columnConfig = getColumnConfig(columnKey);
                      if (!columnConfig) return null;

                      const isActive = sort?.key === columnKey;

                    return (
                      <Draggable key={columnKey} draggableId={columnKey} index={index}>
                        {(provided, snapshot) => {
                          const handleMenuSort = (direction: 'asc' | 'desc') => {
                            handleSort(columnKey, direction);
                            // Log menu usage telemetry
                            console.log('[Telemetry] table.sort.menu.selected', {
                              column: columnKey,
                              direction,
                            });
                          };

                          return (
                            <TableHead
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`text-[#2D5A5A] font-semibold select-none relative ${
                                snapshot.isDragging ? 'bg-blue-50 shadow-lg z-50 cursor-grabbing' : 'hover:bg-slate-100'
                              }`}
                              style={{
                                width: columnWidths[columnKey] ? `${columnWidths[columnKey]}px` : 'auto',
                                minWidth: '80px',
                                ...provided.draggableProps.style
                              }}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div 
                                  {...provided.dragHandleProps}
                                  className="flex-1 py-2 cursor-grab pr-3"
                                  style={{ marginRight: '8px' }}
                                >
                                  <span className="text-[#2D5A5A] font-semibold">
                                    {columnConfig.label}
                                  </span>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        console.log('[Telemetry] table.sort.menu.opened', {
                                          column: columnKey,
                                        });
                                      }}
                                      aria-label={`Sort options for ${columnConfig.label}`}
                                    >
                                      <MoreVertical className="h-4 w-4 text-gray-500" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-64">
                                    <DropdownMenuItem onClick={() => handleMenuSort('asc')}>
                                      Sort A → Z / Smallest to Largest
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleMenuSort('desc')}>
                                      Sort Z → A / Largest to Smallest
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <div className="p-2">
                                      <div className="text-sm font-medium mb-2">Filter</div>
                                      {(() => {
                                        const distinctValues = getDistinctValues(columnKey);
                                        const selectedValues = getColumnFilterValues(columnKey);
                                        // All selected if no filter exists OR all distinct values are selected
                                        const allSelected = !(columnKey in columnFilters) || selectedValues.length === distinctValues.length;
                                        
                                        return (
                                          <div className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                              <Checkbox
                                                id={`select-all-${columnKey}`}
                                                checked={allSelected}
                                                className="border-[#046E75] data-[state=checked]:bg-[#046E75] data-[state=checked]:border-[#046E75] hover:border-[#2EC4B6] data-[state=checked]:hover:bg-[#2EC4B6]"
                                                onCheckedChange={(checked) => {
                                                  if (checked) {
                                                    // Select all - remove filter (show all data)
                                                    setColumnFilters(prev => {
                                                      const newFilters = { ...prev };
                                                      delete newFilters[columnKey];
                                                      return newFilters;
                                                    });
                                                  } else {
                                                    // Deselect all - create empty filter (show no data)
                                                    handleFilterChange(columnKey, []);
                                                  }
                                                  console.log('[Telemetry] table.filter.selectAll', {
                                                    column: columnKey,
                                                    selected: checked
                                                  });
                                                }}
                                              />
                                              <label htmlFor={`select-all-${columnKey}`} className="text-sm">
                                                Select All
                                              </label>
                                            </div>
                                            <ScrollArea className="h-32">
                                              <div className="space-y-1">
                                                {distinctValues.map((value) => (
                                                  <div key={value} className="flex items-center space-x-2">
                                                    <Checkbox
                                                      id={`filter-${columnKey}-${value}`}
                                                      checked={selectedValues.includes(value)}
                                                      className="border-[#046E75] data-[state=checked]:bg-[#046E75] data-[state=checked]:border-[#046E75] hover:border-[#2EC4B6] data-[state=checked]:hover:bg-[#2EC4B6]"
                                                      onCheckedChange={(checked) => {
                                                        const newSelected = [...selectedValues];
                                                        if (checked) {
                                                          if (!newSelected.includes(value)) {
                                                            newSelected.push(value);
                                                          }
                                                        } else {
                                                          const index = newSelected.indexOf(value);
                                                          if (index > -1) {
                                                            newSelected.splice(index, 1);
                                                          }
                                                        }
                                                        handleFilterChange(columnKey, newSelected);
                                                      }}
                                                    />
                                                    <label 
                                                      htmlFor={`filter-${columnKey}-${value}`} 
                                                      className="text-sm truncate flex-1"
                                                      title={value}
                                                    >
                                                      {value || '(Empty)'}
                                                    </label>
                                                  </div>
                                                ))}
                                              </div>
                                            </ScrollArea>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              {/* Resize Handle */}
                              <div
                                className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-blue-200/50 opacity-0 hover:opacity-100 transition-opacity"
                                onMouseDown={(e) => {
                                  // Always handle resize - prevent drag from interfering
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleResizeStart(columnKey, e.clientX);
                                }}
                                onMouseEnter={(e) => {
                                  // Prevent drag events when hovering over resize handle
                                  e.stopPropagation();
                                }}
                                onMouseLeave={(e) => {
                                  e.stopPropagation();
                                }}
                                style={{ zIndex: 10 }}
                              />
                            </TableHead>
                          );
                        }}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </TableRow>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <TableRow className="bg-slate-50">
            {columns.map((columnKey) => {
              const columnConfig = getColumnConfig(columnKey);
              if (!columnConfig) return null;

              const handleMenuSort = (direction: 'asc' | 'desc') => {
                handleSort(columnKey, direction);
                // Log menu usage telemetry
                console.log('[Telemetry] table.sort.menu.selected', {
                  column: columnKey,
                  direction,
                });
              };

              return (
                <TableHead
                  key={columnKey}
                  className="text-[#2D5A5A] font-semibold relative"
                  style={{
                    width: columnWidths[columnKey] ? `${columnWidths[columnKey]}px` : 'auto',
                    minWidth: '80px'
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[#2D5A5A] font-semibold">
                      {columnConfig.label}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('[Telemetry] table.sort.menu.opened', {
                              column: columnKey,
                            });
                          }}
                          aria-label={`Sort options for ${columnConfig.label}`}
                        >
                          <MoreVertical className="h-4 w-4 text-gray-500" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuItem onClick={() => handleMenuSort('asc')}>
                          Sort A → Z / Smallest to Largest
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMenuSort('desc')}>
                          Sort Z → A / Largest to Smallest
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <div className="p-2">
                          <div className="text-sm font-medium mb-2">Filter</div>
                          {(() => {
                            const distinctValues = getDistinctValues(columnKey);
                            const selectedValues = getColumnFilterValues(columnKey);
                            // All selected if no filter exists OR all distinct values are selected
                            const allSelected = !(columnKey in columnFilters) || selectedValues.length === distinctValues.length;
                            
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`select-all-${columnKey}`}
                                    checked={allSelected}
                                    className="border-[#046E75] data-[state=checked]:bg-[#046E75] data-[state=checked]:border-[#046E75] hover:border-[#2EC4B6] data-[state=checked]:hover:bg-[#2EC4B6]"
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        // Select all - remove filter (show all data)
                                        setColumnFilters(prev => {
                                          const newFilters = { ...prev };
                                          delete newFilters[columnKey];
                                          return newFilters;
                                        });
                                      } else {
                                        // Deselect all - create empty filter (show no data)
                                        handleFilterChange(columnKey, []);
                                      }
                                      console.log('[Telemetry] table.filter.selectAll', {
                                        column: columnKey,
                                        selected: checked
                                      });
                                    }}
                                  />
                                  <label htmlFor={`select-all-${columnKey}`} className="text-sm">
                                    Select All
                                  </label>
                                </div>
                                <ScrollArea className="h-32">
                                  <div className="space-y-1">
                                    {distinctValues.map((value) => (
                                      <div key={value} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`filter-${columnKey}-${value}`}
                                          checked={selectedValues.includes(value)}
                                          className="border-[#046E75] data-[state=checked]:bg-[#046E75] data-[state=checked]:border-[#046E75] hover:border-[#2EC4B6] data-[state=checked]:hover:bg-[#2EC4B6]"
                                          onCheckedChange={(checked) => {
                                            const newSelected = [...selectedValues];
                                            if (checked) {
                                              if (!newSelected.includes(value)) {
                                                newSelected.push(value);
                                              }
                                            } else {
                                              const index = newSelected.indexOf(value);
                                              if (index > -1) {
                                                newSelected.splice(index, 1);
                                              }
                                            }
                                            handleFilterChange(columnKey, newSelected);
                                          }}
                                        />
                                        <label 
                                          htmlFor={`filter-${columnKey}-${value}`} 
                                          className="text-sm truncate flex-1"
                                          title={value}
                                        >
                                          {value || '(Empty)'}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </ScrollArea>
                              </div>
                            );
                          })()}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {/* Resize Handle */}
                  <div
                    className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-blue-200/50 opacity-0 hover:opacity-100 transition-opacity"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleResizeStart(columnKey, e.clientX);
                    }}
                    style={{ zIndex: 10 }}
                  />
                </TableHead>
              );
            })}
          </TableRow>
        )}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <LoadingSpinner />
              </TableCell>
            </TableRow>
          ) : processedRows.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={columns.length} 
                className="text-center py-12"
              >
                {emptyState ? (
                  <div>
                    {emptyState.icon && (
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        {emptyState.icon}
                      </div>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{emptyState.title}</h3>
                    {emptyState.description && (
                      <p className="text-gray-600">{emptyState.description}</p>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">No data available</span>
                )}
              </TableCell>
            </TableRow>
          ) : (
            processedRows.map((row: any, index: number) => (
              <TableRow 
                key={`${row.id || index}${filterSignature}`}
                className="bg-white hover:bg-slate-50/50"
              >
                {columns.map((columnKey) => (
                  <TableCell 
                    key={columnKey} 
                    className="py-3 truncate"
                    style={{
                      width: columnWidths[columnKey] ? `${columnWidths[columnKey]}px` : 'auto',
                      minWidth: '80px',
                      maxWidth: columnWidths[columnKey] ? `${columnWidths[columnKey]}px` : 'none'
                    }}
                  >
                    <div className="truncate">
                      {renderCell(row, columnKey)}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      {/* Search results counter */}
      {debouncedSearchQuery.trim() && (
        <div className="text-xs text-gray-500 mt-2 px-1">
          {processedRows.length} result{processedRows.length !== 1 ? 's' : ''} found
        </div>
      )}
      
      
    </div>
  );
}

// Helper function to toggle sort state
function toggleSort(currentSort: SortState | null, key: ColumnKey): SortState | null {
  // If clicking a different column, start with ascending
  if (!currentSort || currentSort.key !== key) {
    return { key, dir: 'asc' };
  }
  
  // Same column - cycle through states
  if (currentSort.dir === 'asc') {
    return { key, dir: 'desc' };
  } else {
    // desc → none (no sort)
    return null;
  }
}
