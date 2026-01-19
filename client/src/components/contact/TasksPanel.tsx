import { useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksKey, generateLocalTaskId } from "@/lib/utils";
import { createTasksService, type TaskCreateInput } from "@/lib/tasksService";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskModal, type TaskCreateLocal } from "./TaskModal";
import { TaskItem, type TaskItemModel } from "./TaskItem";
import { useToast } from "@/components/ui/use-toast";

interface TasksPanelProps {
  contactId: string;
}

type TaskWithAuthor = TaskItemModel & {
  _optimistic?: boolean;
};

export function TasksPanel({ contactId }: TasksPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItemModel | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Create tasks service instance
  const tasksService = createTasksService(queryClient);

  // Fetch tasks (local-only, no network)
  const {
    data: tasksData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: tasksKey(contactId),
    queryFn: async () => {
      // Local-only mode returns empty structure initially
      return { items: [] as TaskWithAuthor[] };
    },
    enabled: !!contactId,
  });

  // Create task mutation using centralized service
  const createTask = useMutation({
    mutationFn: async (data: TaskCreateLocal) => {
      const serviceInput: TaskCreateInput = {
        title: data.title,
        notes: data.description ?? null, // Map description -> notes
        contactId: data.contactId,
        source: "manual",
        status: data.status ?? "open",
        dueAt: data.dueAt ?? null,
        remindAt: null,
      };
      return await tasksService.create(serviceInput);
    },
    onError: (err) => {
      toast({
        title: "Failed to save task",
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const tasks: TaskWithAuthor[] = tasksData?.items || [];

  // Group tasks by month (use dueAt if present else createdAt)
  const groupedTasks = Object.entries(
    tasks.reduce<Record<string, TaskWithAuthor[]>>((acc, task) => {
      const date = task.dueAt ? new Date(task.dueAt) : new Date(task.createdAt);
      const monthYear = format(date, "MMMM yyyy");
      if (!acc[monthYear]) acc[monthYear] = [];
      acc[monthYear].push(task);
      return acc;
    }, {})
  ).sort(([a], [b]) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return isNaN(dateB.getTime()) ? -1 : isNaN(dateA.getTime()) ? 1 : dateB.getTime() - dateA.getTime();
  });

  const handleCreateTask = async (data: Omit<TaskCreateLocal, "contactId">) => {
    try {
      const payload: TaskCreateLocal = {
        title: data.title,
        description: data.description ?? null,
        dueAt: data.dueAt ?? null, // Don't default to current time
        status: "open",
        contactId,
      };
      await createTask.mutateAsync(payload);
      setIsModalOpen(false);
      toast({ title: "Task saved", description: "Your task has been saved successfully." });
    } catch (error) {
      console.error('Failed to create task:', error);
      // Error toast is handled by mutation onError
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Add Task button */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <Button onClick={() => setIsModalOpen(true)} variant="cta" size="sm" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Error state */}
      {isError && (
        <ErrorAlert
          message={`Failed to load tasks: ${error instanceof Error ? error.message : 'Unknown error'}`}
          onRetry={() => refetch()}
          isRetrying={isLoading}
        />
      )}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-17rem)] overscroll-contain pr-2 -mr-2">
        {/* Loading state */}
        {isLoading && <LoadingSpinner />}

        {/* No tasks yet */}
        {!isLoading && !isError && tasks.length === 0 && (
          <EmptyState description="No tasks yet. Click 'Add Task' to create one." />
        )}

        {/* Tasks list */}
        {!isLoading && !isError && tasks.length > 0 && (
          <div className="space-y-8 pb-4">
            {groupedTasks.map(([monthYear, monthTasks]) => (
              <div key={monthYear} className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">{monthYear}</h3>
                <div className="space-y-4">
                  {(monthTasks as TaskWithAuthor[]).map((task) => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onEdit={() => {
                        setEditingTask(task);
                        setIsModalOpen(true);
                      }} 
                      onDelete={() => tasksService.delete(task.id)} 
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
          if (createTask.error) createTask.reset();
        }}
        onSubmit={async (data) => {
          if (editingTask) {
            // Edit mode: update existing task
            await tasksService.update({
              id: editingTask.id,
              title: data.title,
              notes: data.description ?? null,
              dueAt: data.dueAt ?? null,
              status: data.status ?? editingTask.status,
            });
            setIsModalOpen(false);
            setEditingTask(null);
            toast({ title: 'Task updated', description: 'Your task has been updated successfully.' });
          } else {
            // Create mode: create new task
            await handleCreateTask(data);
          }
        }}
        contactId={contactId}
        isSubmitting={createTask.isPending}
        initialTask={editingTask}
      />
    </div>
  );
}
