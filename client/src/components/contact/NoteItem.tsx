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
import type { NoteWithAuthor } from "@shared/schema";

interface NoteItemProps {
  note: NoteWithAuthor;
  onEdit?: (note: NoteWithAuthor) => void;
  onDelete?: (noteId: string) => void;
}

export function NoteItem({ note, onEdit, onDelete }: NoteItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const date = note.occurredAt ? new Date(note.occurredAt) : new Date(note.createdAt);

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 py-4 last:border-0">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* Row A: Activity type pill */}
          <div className="mb-2">
            <span className="inline-block px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-200 rounded-full select-none">
              NOTE
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

          {/* Row C: Note body with truncation/expand */}
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
              "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-1 -mx-1 transition-colors",
              "break-words",
              !isExpanded && "line-clamp-1"
            )}
            style={{ overflowWrap: 'anywhere' }}
            dangerouslySetInnerHTML={{ __html: note.body }}
          />
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
                <DropdownMenuItem onClick={() => onEdit(note)}>
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                  onClick={() => onDelete(note.id)}
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
