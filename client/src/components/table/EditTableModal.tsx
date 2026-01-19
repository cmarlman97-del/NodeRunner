import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import { 
  getAvailableColumns,
  getColumnConfig,
  type ColumnKey 
} from "@/components/table/columnRegistry";

interface EditTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibleColumns: ColumnKey[];
  onColumnsChange: (next: ColumnKey[]) => void;
  resource: 'contacts' | 'tasks';
}

export function EditTableModal({
  open,
  onOpenChange,
  visibleColumns,
  onColumnsChange,
  resource,
}: EditTableModalProps) {
  // Temporary state for column selection and ordering within the modal
  const [tempVisibleColumns, setTempVisibleColumns] = useState<ColumnKey[]>(visibleColumns);

  // Initialize temp state when modal opens
  useEffect(() => {
    if (open) {
      setTempVisibleColumns(visibleColumns);
    }
  }, [open, visibleColumns]);

  const handleColumnToggle = (columnKey: ColumnKey) => {
    const isVisible = tempVisibleColumns.includes(columnKey);
    
    if (isVisible) {
      // Prevent removing the last visible column
      if (tempVisibleColumns.length <= 1) {
        return;
      }
      // Remove column from temp state
      const newColumns = tempVisibleColumns.filter(key => key !== columnKey);
      setTempVisibleColumns(newColumns);
    } else {
      // Add column to temp state at the end
      const newColumns = [...tempVisibleColumns, columnKey];
      setTempVisibleColumns(newColumns);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(tempVisibleColumns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    
    if (reorderedItem) {
      items.splice(result.destination.index, 0, reorderedItem);
      setTempVisibleColumns(items);
    }
  };

  const handleSave = () => {
    onColumnsChange(tempVisibleColumns);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setTempVisibleColumns(visibleColumns); // Reset to original state
    onOpenChange(false);
  };

  const availableColumns = getAvailableColumns(resource);
  const totalColumns = availableColumns.length;

  return (
    <Modal 
      open={open} 
      onOpenChange={() => {}} // Disable default close behavior - force use of Save/Cancel
      title="Edit Table Columns"
      size="4xl" // Large size for two-panel layout
      maxHeight="650px" // Fixed height to prevent off-screen growth
      enableScroll={false} // We'll handle scrolling in individual panels
      showCloseButton={false} // Hide the X button to force Save/Cancel usage
    >
      <div className="flex flex-col h-full">
        {/* Description */}
        <div className="flex-shrink-0 mb-4">
          <p className="text-sm text-muted-foreground">
            Select columns on the left to show them in your table. Drag columns on the right to reorder them.
          </p>
        </div>

        {/* Two-Panel Layout */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left Panel: All Columns */}
          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex-shrink-0">All Columns</h3>
            <div className="flex-1 overflow-y-auto border rounded-lg bg-gray-50/50 min-h-0 max-h-[420px]">
              <div className="p-3 space-y-2">
                {availableColumns.map((column) => {
                  const isVisible = tempVisibleColumns.includes(column.key);
                  const isLastColumn = tempVisibleColumns.length === 1 && isVisible;
                  
                  return (
                    <div key={column.key} className="flex items-center space-x-3 p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                      <Checkbox
                        id={`all-column-${column.key}`}
                        checked={isVisible}
                        className="border-[#046E75] data-[state=checked]:bg-[#046E75] data-[state=checked]:border-[#046E75] hover:border-[#2EC4B6] data-[state=checked]:hover:bg-[#2EC4B6]"
                        onCheckedChange={() => handleColumnToggle(column.key)}
                        disabled={isLastColumn}
                      />
                      <Label 
                        htmlFor={`all-column-${column.key}`}
                        className={`text-sm flex-1 ${isLastColumn ? 'text-muted-foreground' : 'cursor-pointer'}`}
                      >
                        {column.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Panel: Visible Columns (Drag to Reorder) */}
          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex-shrink-0">
              Visible Columns 
              <span className="text-xs text-gray-500 font-normal ml-2">
                (Drag to Reorder)
              </span>
            </h3>
            <div className="flex-1 overflow-y-auto border rounded-lg bg-blue-50/30 min-h-0 max-h-[420px]">
              <div className="p-3">
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="visible-columns">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2 min-h-[100px]"
                      >
                        {tempVisibleColumns.map((columnKey, index) => {
                          const column = getColumnConfig(columnKey);
                          
                          if (!column) return null;
                          
                          return (
                            <Draggable key={columnKey} draggableId={columnKey} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`flex items-center space-x-3 p-3 bg-white border rounded-lg shadow-sm ${
                                    snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 rotate-2' : 'hover:shadow-md'
                                  }`}
                                >
                                  <div
                                    {...provided.dragHandleProps}
                                    className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                  <Label className="text-sm flex-1">
                                    {column.label}
                                  </Label>
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    #{index + 1}
                                  </span>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                        {tempVisibleColumns.length === 0 && (
                          <div className="text-center text-gray-500 py-12">
                            <p className="text-sm">No columns selected</p>
                            <p className="text-xs">Check columns on the left to add them</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </div>
          </div>
        </div>

        {/* Status and Action Buttons - Pinned Footer */}
        <div className="flex-shrink-0 mt-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {tempVisibleColumns.length} of {totalColumns} columns shown
            </p>
            
            <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[#2EC4B6] hover:bg-[#24A89C] text-white"
            >
              Save Changes
            </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
