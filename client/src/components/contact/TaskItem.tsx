import { useState } from "react";
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type TaskItemModel = {
  id: string;
  contactId: string;
  title: string;
  description?: string | null;
  dueAt: string | null;
  status: "open" | "done";
  createdAt: string;
  authorName?: string;
};

interface TaskItemProps {
  task: TaskItemModel;
  onEdit?: (task: TaskItemModel) => void;
  onDelete?: (taskId: string) => void;
}

export function TaskItem({ task, onEdit, onDelete }: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const date = task.dueAt ? new Date(task.dueAt) : new Date(task.createdAt);

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 py-4 last:border-0">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* Row A: Activity type pill */}
          <div className="mb-2">
            <span className="inline-block px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-200 rounded-full select-none">
              TASK
            </span>
          </div>

          {/* Row B: Meta line */}
          <div className="text-sm text-muted-foreground mb-2">
            <span>by Unknown</span>
            <span className="mx-1">·</span>
            <time dateTime={date.toISOString()} title={date.toLocaleString()}>
              {format(date, "MMM d, yyyy 'at' h:mm a")}
            </time>
          </div>

          {/* Row C: Title + Status */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-base">{task.title}</h3>
            <span className="mx-1">·</span>
            <span className={cn(
              "text-sm",
              task.status === 'done' ? 'text-green-600' : 'text-muted-foreground'
            )}>
              {task.status === 'done' ? 'Completed' : 'Open'}
            </span>
          </div>

          {/* Row D: Description with truncation/expand */}
          {task.description && (
            <div 
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "prose prose-sm dark:prose-invert max-w-none",
                "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-1 -mx-1 transition-colors",
                "break-words whitespace-pre-wrap",
                !isExpanded && "line-clamp-1"
              )}
              style={{ overflowWrap: 'anywhere' }}
            >
              {task.description}
            </div>
          )}
        </div>

        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                  onClick={() => onDelete(task.id)}
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
