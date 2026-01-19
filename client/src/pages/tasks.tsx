import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { TaskCreateDrawer, type TaskCreateInput } from "@/components/tasks/TaskCreateDrawer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getFollowUpDate } from "@/lib/utils";
import { tasksAllKey, type TaskModel } from "@/lib/tasksStore";
import { createTasksService, type TaskCreateInput as ServiceTaskCreateInput } from "@/lib/tasksService";
import type { Contact } from "@shared/schema";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { GlobalTable } from "@/components/table/GlobalTable";
import { EditTableModal } from "@/components/table/EditTableModal";
import { DEFAULT_TASKS_COLUMNS, type ColumnKey } from "@/components/table/columnRegistry";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TableActionsMenu, TableActionsMenuItem } from "@/components/table/TableActionsMenu";

type ContactLite = { id: string; name: string; phone?: string | null; cellPhone?: string | null; company?: string | null; email?: string | null };

// ContactCell component for contact links
function ContactCell({ contact }: { contact: ContactLite | undefined }) {
  if (!contact) {
    return <span className="text-slate-500">—</span>;
  }

  return (
    <Link 
      href={`/contacts/${contact.id}`}
      className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm"
      aria-label={`Open contact: ${contact.name}`}
      title={contact.name}
    >
      {contact.name}
    </Link>
  );
}

// StatusToggle component with deferred completion and follow-up popover
function StatusToggle({ 
  task, 
  isPending,
  onShowFollowUp,
  onCompleteWithFollowUp,
  onCompleteWithoutFollowUp,
  disabled 
}: { 
  task: TaskModel; 
  isPending: boolean;
  onShowFollowUp: (taskId: string) => void;
  onCompleteWithFollowUp: (taskId: string, option: string, customDate?: Date) => void;
  onCompleteWithoutFollowUp: (taskId: string) => void;
  disabled: boolean; 
}) {
  const handleToggle = () => {
    if (disabled || isPending) return;
    onShowFollowUp(task.id);
  };

  const handleFollowUpSelect = (option: string, customDate?: Date) => {
    onCompleteWithFollowUp(task.id, option, customDate);
  };

  const handleDismiss = () => {
    onCompleteWithoutFollowUp(task.id);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled || isPending) return;
    
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <>
      <input 
        type="checkbox" 
        checked={isPending}
        onChange={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled || isPending}
        aria-label="Mark task as complete"
        className={`h-4 w-4 cursor-pointer disabled:cursor-not-allowed ${
          isPending ? 'opacity-60' : ''
        }`}
      />
      
      {/* Follow-up Mini Popover */}
      <Popover 
        open={isPending} 
        onOpenChange={(open) => {
          if (!open && isPending) {
            handleDismiss();
          }
        }}
      >
        <PopoverTrigger asChild>
          <div className="absolute" style={{ left: 0, top: 0 }} />
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-2 z-50" 
          align="start"
          side="right"
          sideOffset={8}
          onEscapeKeyDown={handleDismiss}
        >
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-600 mb-2">Create a follow-up?</div>
            
            <button
              type="button"
              className="block w-full text-left px-2 py-1 text-sm hover:bg-slate-100 rounded"
              onClick={() => handleFollowUpSelect('tomorrow')}
            >
              Tomorrow
            </button>
            
            <button
              type="button"
              className="block w-full text-left px-2 py-1 text-sm hover:bg-slate-100 rounded bg-slate-50"
              onClick={() => handleFollowUpSelect('3-business-days')}
            >
              3 business days (default)
            </button>
            
            <button
              type="button"
              className="block w-full text-left px-2 py-1 text-sm hover:bg-slate-100 rounded"
              onClick={() => handleFollowUpSelect('1-week')}
            >
              1 week
            </button>
            
            <div className="border-t pt-1 mt-1">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="block w-full text-left px-2 py-1 text-sm hover:bg-slate-100 rounded"
                  >
                    Custom...
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={undefined}
                    onSelect={(date) => {
                      if (date) {
                        handleFollowUpSelect('custom', date);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="border-t pt-1 mt-1">
              <button
                type="button"
                className="block w-full text-left px-2 py-1 text-sm hover:bg-slate-100 rounded text-slate-500"
                onClick={handleDismiss}
              >
                No follow-up
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

// NotesCell component for truncated notes with popover reader
function NotesCell({ note }: { note: string | null | undefined }) {
  const [isOpen, setIsOpen] = useState(false);

  // If no note, show dash with no popover
  if (!note || note.trim() === "") {
    return <span className="text-slate-500">—</span>;
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-left w-full hover:underline cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-sm"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onKeyDown={handleKeyDown}
        >
          <div className="min-w-0 max-w-[520px] overflow-hidden text-ellipsis break-words [overflow-wrap:anywhere] whitespace-pre-wrap" style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>
            {note}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="z-50 p-0" 
        align="start"
        side="top"
        sideOffset={8}
        style={{
          width: 'min(80vw, 720px)',
          maxWidth: '80vw',
          minWidth: '360px',
          maxHeight: 'min(70vh, 560px)',
          minHeight: '120px'
        }}
      >
        <div className="p-4 h-full overflow-auto">
          <div className="sr-only" id="note-dialog-title">
            Full note
          </div>
          <div 
            className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm"
            role="dialog"
            aria-labelledby="note-dialog-title"
          >
            {note}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// OwnerCell component for editable owner field
function OwnerCell({ value, onSave }: { value: string; onSave: (value: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onSave(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setIsEditing(false);
      if (editValue !== value) {
        onSave(editValue);
      }
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(value);
    }
  };

  if (isEditing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        className="h-8 w-full border-0 bg-transparent focus:ring-1 px-2"
        placeholder="Enter owner..."
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="text-left w-full hover:bg-slate-100 px-2 py-1 rounded cursor-text min-h-[32px]"
    >
      {value || <span className="text-slate-400">—</span>}
    </button>
  );
}

// Extended task row type for GlobalTable
type TaskRow = TaskModel & {
  contactName: string | null;
  contactEmail: string | null;
  workPhone: string | null;
  cellPhone: string | null;
};

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());
  const [pendingCompleteTaskId, setPendingCompleteTaskId] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_TASKS_COLUMNS);
  const [isEditTableOpen, setIsEditTableOpen] = useState(false);
  
  // Create tasks service instance
  const tasksService = createTasksService(queryClient);

  // Read global tasks from cache; seed with empty in local-only mode
  const { data: globalTasks } = useQuery<{ items: TaskModel[] }>({
    queryKey: tasksAllKey(),
    queryFn: async () => ({ items: [] }),
  });

  // Hydrate contacts using the same key as Dashboard, then fall back to any cache present.
  const { data: fetchedContacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    queryFn: () => fetch("/api/contacts").then((r) => r.json()),
    staleTime: 30_000,
  });
  const contactsDataA = (fetchedContacts as unknown as ContactLite[] | undefined);
  const contactsDataB = queryClient.getQueryData<ContactLite[]>(["contacts"]) as ContactLite[] | undefined;
  const contactsArr: ContactLite[] = contactsDataA ?? contactsDataB ?? [];
  const contactsById = useMemo(() => {
    const map = new Map<string, ContactLite>();
    contactsArr.forEach((c) => map.set(c.id, c));
    return map;
  }, [contactsArr]);

  const createTaskMutation = useMutation({
    mutationFn: async (input: TaskCreateInput) => {
      const serviceInput: ServiceTaskCreateInput = {
        title: input.title,
        notes: input.notes ?? null,
        contactId: input.contactId ?? null,
        source: "manual",
        status: "open",
        dueAt: input.dueAt ? new Date(input.dueAt).toISOString() : null,
        remindAt: input.remindAt ? new Date(input.remindAt).toISOString() : null,
      };
      return await tasksService.create(serviceInput);
    },
    // Service handles optimistic updates, so we don't need onMutate/onError
  });

  // Sort tasks by due date ascending (earliest first), then by creation date for undated tasks
  const sortTasksByDueDate = (a: TaskModel, b: TaskModel): number => {
    const aDate = a.dueAt ? new Date(a.dueAt) : null;
    const bDate = b.dueAt ? new Date(b.dueAt) : null;
    
    // 1. Both have dueAt → sort by dueAt ASC (earliest first)
    if (aDate && bDate) {
      return aDate.getTime() - bDate.getTime();
    }
    
    // 2. Only one has dueAt → the one WITH dueAt comes first
    if (aDate && !bDate) return -1; // a comes first
    if (!aDate && bDate) return 1;  // b comes first
    
    // 3. Neither has dueAt → tie-break by createdAt DESC (newer first)
    const aCreated = new Date(a.createdAt);
    const bCreated = new Date(b.createdAt);
    return bCreated.getTime() - aCreated.getTime();
  };

  const tasks = (globalTasks?.items ?? [])
    .filter((t) => t.status === "open" || t.id === pendingCompleteTaskId)
    .sort(sortTasksByDueDate);

  // Transform tasks to TaskRow format for GlobalTable (flatten contact data)
  const taskRows: TaskRow[] = useMemo(() => {
    return tasks.map((task) => {
      const contact = task.contactId ? contactsById.get(task.contactId) : undefined;
      return {
        ...task,
        contactName: contact?.name || null,
        contactEmail: contact?.email || null,
        workPhone: contact?.phone || null,
        cellPhone: contact?.cellPhone || null,
      };
    });
  }, [tasks, contactsById]);

  const handleCreate = async (data: TaskCreateInput) => {
    try {
      await createTaskMutation.mutateAsync(data);
      setOpen(false);
    } catch (error) {
      console.error('Failed to create task:', error);
      // TODO: Show error toast when error handling is implemented
    }
  };

  const handleShowFollowUp = (taskId: string) => {
    setPendingCompleteTaskId(taskId);
  };

  const handleCompleteWithFollowUp = async (taskId: string, option: string, customDate?: Date) => {
    // First create the follow-up task
    let dueDate: Date;
    
    if (option === 'custom' && customDate) {
      dueDate = customDate;
    } else {
      dueDate = getFollowUpDate(option);
    }
    
    // Set time to 8:00 AM for all options
    dueDate.setHours(8, 0, 0, 0);
    
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      // Create follow-up task using service
      await tasksService.followUp(task, dueDate);
    }
    
    // Then complete the original task
    handleTaskCompletion(taskId);
  };

  const handleCompleteWithoutFollowUp = (taskId: string) => {
    handleTaskCompletion(taskId);
  };

  const handleTaskCompletion = async (taskId: string) => {
    // Clear pending state
    setPendingCompleteTaskId(null);
    
    // Add to completing set to disable interactions and trigger animation
    setCompletingTasks(prev => new Set(prev).add(taskId));
    
    // Complete the task using service
    await tasksService.complete(taskId);
    
    // Remove from completing set after animation
    setTimeout(() => {
      setCompletingTasks(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }, 300);
  };

  // Handle priority update
  const handlePriorityChange = async (taskId: string, value: string) => {
    const priority = value === "none" ? null : value as "low" | "medium" | "high";
    await tasksService.update({ id: taskId, priority });
  };

  // Handle owner update
  const handleOwnerChange = async (taskId: string, value: string) => {
    const owner = value.trim() === "" ? null : value.trim();
    await tasksService.update({ id: taskId, owner });
  };

  // Custom cell renderers for GlobalTable
  const cellRenderers = useMemo(() => ({
    status: (row: TaskRow) => {
      const isCompleting = completingTasks.has(row.id);
      const isPending = pendingCompleteTaskId === row.id;
      return (
        <div className="relative" style={{ opacity: isCompleting ? 0.6 : isPending ? 0.8 : 1 }}>
          <StatusToggle 
            task={row}
            isPending={isPending}
            onShowFollowUp={handleShowFollowUp}
            onCompleteWithFollowUp={handleCompleteWithFollowUp}
            onCompleteWithoutFollowUp={handleCompleteWithoutFollowUp}
            disabled={isCompleting}
          />
        </div>
      );
    },
    priority: (row: TaskRow) => {
      const priorityPillClasses: Record<string, string> = {
        low: "bg-green-100 text-green-800",
        medium: "bg-yellow-100 text-amber-800",
        high: "bg-red-100 text-red-800",
      };
      const priority = row.priority || "none";
      const pillClass = priorityPillClasses[priority] || "";
      
      return (
        <Select
          value={priority}
          onValueChange={(value) => handlePriorityChange(row.id, value)}
        >
          <SelectTrigger className="h-8 w-fit min-w-[70px] border-0 bg-transparent hover:bg-slate-100 focus:ring-1 px-1">
            {priority !== "none" ? (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${pillClass}`}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </span>
            ) : (
              <span className="text-gray-400 px-1">—</span>
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            <SelectItem value="low">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Low</span>
            </SelectItem>
            <SelectItem value="medium">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-amber-800">Medium</span>
            </SelectItem>
            <SelectItem value="high">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">High</span>
            </SelectItem>
          </SelectContent>
        </Select>
      );
    },
    contactName: (row: TaskRow) => {
      const contact = row.contactId ? contactsById.get(row.contactId) : undefined;
      return <ContactCell contact={contact} />;
    },
    dueAt: (row: TaskRow) => {
      const due = row.dueAt ? new Date(row.dueAt) : null;
      const dueStr = due ? format(due, "MMMM d, yyyy h:mm a") : "—";
      return <span title={dueStr !== "—" ? dueStr : undefined}>{dueStr}</span>;
    },
    notes: (row: TaskRow) => {
      return <NotesCell note={row.notes} />;
    },
    taskOwner: (row: TaskRow) => {
      return (
        <OwnerCell 
          value={row.owner || ""} 
          onSave={(value) => handleOwnerChange(row.id, value)} 
        />
      );
    },
  }), [completingTasks, pendingCompleteTaskId, contactsById, handleShowFollowUp, handleCompleteWithFollowUp, handleCompleteWithoutFollowUp, handlePriorityChange]);

  return (
    <AppShell>
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header toolbar - matches dashboard layout */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Tasks</h1>
            <div className="flex items-center gap-2">
              {/* Table actions dropdown */}
              <TableActionsMenu>
                <TableActionsMenuItem onClick={() => setIsEditTableOpen(true)}>
                  Edit table
                </TableActionsMenuItem>
              </TableActionsMenu>
              <Button
                variant="cta"
                onClick={() => setOpen(true)}
              >
                Create Task
              </Button>
            </div>
          </div>

          {/* Table with shadow styling matching dashboard */}
          <GlobalTable
            rows={taskRows}
            columns={visibleColumns}
            onColumnsChange={setVisibleColumns}
            cellRenderers={cellRenderers}
            enableColumnReordering={true}
            emptyState={{
              title: "No open tasks",
              description: "Create a task to get started.",
            }}
          />
        </div>
      </div>

      {/* Right-side drawer */}
      <TaskCreateDrawer
        open={open}
        onOpenChange={setOpen}
        onCreate={handleCreate}
        contacts={contactsArr.map((c) => ({ id: c.id, name: c.name, phone: c.phone ?? null, company: c.company ?? null, email: c.email ?? null }))}
      />

      {/* Edit Table Modal */}
      <EditTableModal
        open={isEditTableOpen}
        onOpenChange={setIsEditTableOpen}
        visibleColumns={visibleColumns}
        onColumnsChange={(newColumns) => {
          setVisibleColumns(newColumns);
          console.log('Task columns updated:', newColumns);
        }}
        resource="tasks"
      />
    </AppShell>
  );
}
